// src/main/db/search.ts
import { getDb } from './database'

export function querySearch(searchText: string): any[] {
  if (!searchText || !searchText.trim()) {
    return []
  }

  const terms = searchText.trim().replace(/["]/g, '""').split(/\s+/).filter(Boolean);
  if (terms.length === 0) return []
  
  // Format for FTS5 prefix querying: "term"*
  const ftsQuery = terms.map(term => `"${term}"*`).join(' AND ');
  const db = getDb()

  try {
    const records = db.prepare(`
      SELECT id, type, title, content 
      FROM search_index 
      WHERE search_index MATCH ?
      LIMIT 100
    `).all(ftsQuery) as { id: string; type: string; title: string; content: string }[]

    // Retrieve full items for enriched UI
    const results = records.map(rec => {
      try {
        if (rec.type === 'task') {
          const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(rec.id);
          if (!task) return null;
          return { type: 'task', id: rec.id, title: rec.title, content: rec.content, data: task };
        } else if (rec.type === 'project') {
          const proj = db.prepare('SELECT * FROM projects WHERE id = ?').get(rec.id);
          if (!proj) return null;
          return { type: 'project', id: rec.id, title: rec.title, content: rec.content, data: proj };
        } else if (rec.type === 'event') {
          const ev = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(rec.id);
          if (!ev) return null;
          return { type: 'event', id: rec.id, title: rec.title, content: rec.content, data: ev };
        } else if (rec.type === 'note') {
          const isEnabled = db.prepare("SELECT value FROM settings WHERE key = 'notes.enabled'").get() as { value: string } | undefined;
          if (isEnabled && isEnabled.value === 'false') return null;
          const note = db.prepare('SELECT * FROM notes WHERE id = ? AND archived = 0').get(rec.id);
          if (!note) return null;
          return { type: 'note', id: rec.id, title: rec.title, content: rec.content, data: note };
        }
      } catch (err) {
        console.error(`Error loading detailed search result for type ${rec.type} id ${rec.id}:`, err);
      }
      return null;
    }).filter((r): r is any => r !== null);

    return results;
  } catch (err) {
    console.error('FTS5 Search query failed, falling back to LIKE:', err);
    // Fallback to simple LIKE search if FTS5 is unhappy or query is malformed
    try {
      const likePattern = `%${searchText}%`;
      const tasks = db.prepare("SELECT id, 'task' as type, title, notes as content FROM tasks WHERE title LIKE ? OR notes LIKE ? LIMIT 20").all(likePattern, likePattern) as any[];
      const projects = db.prepare("SELECT id, 'project' as type, name as title, '' as content FROM projects WHERE name LIKE ? LIMIT 20").all(likePattern) as any[];
      const events = db.prepare("SELECT id, 'event' as type, title, COALESCE(description, '') as content FROM calendar_events WHERE title LIKE ? OR description LIKE ? LIMIT 20").all(likePattern, likePattern) as any[];
      
      let notes: any[] = [];
      const notesEnabled = db.prepare("SELECT value FROM settings WHERE key = 'notes.enabled'").get() as { value: string } | undefined;
      if (!notesEnabled || notesEnabled.value !== 'false') {
        notes = db.prepare("SELECT id, 'note' as type, title, body_md as content FROM notes WHERE (title LIKE ? OR body_md LIKE ?) AND archived = 0 LIMIT 20").all(likePattern, likePattern) as any[];
      }

      const combined = [...tasks, ...projects, ...events, ...notes];
      return combined.map(rec => {
        try {
          if (rec.type === 'task') {
            const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(rec.id);
            if (!task) return null;
            return { type: 'task', id: rec.id, title: rec.title, content: rec.content, data: task };
          } else if (rec.type === 'project') {
            const proj = db.prepare('SELECT * FROM projects WHERE id = ?').get(rec.id);
            if (!proj) return null;
            return { type: 'project', id: rec.id, title: rec.title, content: rec.content, data: proj };
          } else if (rec.type === 'event') {
            const ev = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(rec.id);
            if (!ev) return null;
            return { type: 'event', id: rec.id, title: rec.title, content: rec.content, data: ev };
          } else if (rec.type === 'note') {
            const note = db.prepare('SELECT * FROM notes WHERE id = ? AND archived = 0').get(rec.id);
            if (!note) return null;
            return { type: 'note', id: rec.id, title: rec.title, content: rec.content, data: note };
          }
        } catch (_) {}
        return null;
      }).filter((r): r is any => r !== null);
    } catch (fallbackErr) {
      console.error('Fallback search also failed:', fallbackErr);
      return [];
    }
  }
}
