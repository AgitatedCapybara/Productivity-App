// src/main/db/notes.ts
import { getDb } from './database'
import { nanoid } from 'nanoid'
import type { Note, CreateNoteInput, UpdateNoteInput } from './schema'

export function listAllNotes(): Note[] {
  const stmt = getDb().prepare('SELECT * FROM notes WHERE archived = 0 ORDER BY pinned DESC, updated_at DESC')
  return stmt.all() as Note[]
}

export function getNoteById(id: string): Note | null {
  const stmt = getDb().prepare('SELECT * FROM notes WHERE id = ?')
  const note = stmt.get(id) as Note | undefined
  return note || null
}

export function getNotesByParent(parentType: string, parentId: string): Note[] {
  const stmt = getDb().prepare('SELECT * FROM notes WHERE parent_type = ? AND parent_id = ? AND archived = 0 ORDER BY pinned DESC, updated_at DESC')
  return stmt.all(parentType, parentId) as Note[]
}

export function pinNote(id: string, pinned: boolean): void {
  getDb().prepare('UPDATE notes SET pinned = ?, updated_at = datetime(\'now\') WHERE id = ?').run(pinned ? 1 : 0, id)
}

export function archiveNote(id: string, archived: boolean): void {
  getDb().prepare('UPDATE notes SET archived = ?, updated_at = datetime(\'now\') WHERE id = ?').run(archived ? 1 : 0, id)
}

export function deleteNote(id: string): void {
  const db = getDb()
  const runTx = db.transaction(() => {
    db.prepare('DELETE FROM note_links WHERE source_note_id = ? OR target_note_id = ?').run(id, id)
    db.prepare('DELETE FROM notes WHERE id = ?').run(id)
  })
  runTx()
}

export function parseAndSyncBacklinks(sourceNoteId: string, bodyMd: string): void {
  const db = getDb()
  // 1. Delete old links where source_note_id = sourceNoteId
  db.prepare('DELETE FROM note_links WHERE source_note_id = ?').run(sourceNoteId)

  // 2. Find all [[Wiki Links]]
  const regex = /\[\[(.*?)\]\]/g
  const matches: string[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(bodyMd)) !== null) {
    if (match[1] && match[1].trim()) {
      matches.push(match[1].trim())
    }
  }

  if (matches.length === 0) return

  // 3. Resolve target note ids and insert links
  const findNoteStmt = db.prepare('SELECT id FROM notes WHERE LOWER(title) = LOWER(?) AND archived = 0 LIMIT 1')
  const insertLinkStmt = db.prepare('INSERT OR IGNORE INTO note_links (id, source_note_id, target_note_id) VALUES (?, ?, ?)')

  for (const title of matches) {
    const target = findNoteStmt.get(title) as { id: string } | undefined
    if (target && target.id !== sourceNoteId) {
      insertLinkStmt.run(nanoid(), sourceNoteId, target.id)
    }
  }
}

export function createNote(input: CreateNoteInput): Note {
  const db = getDb()
  const id = nanoid()
  const title = input.title.trim()
  const body_md = input.body_md || ''
  const parent_type = input.parent_type
  const parent_id = input.parent_id || null
  const pinned = input.pinned || 0
  const archived = input.archived || 0

  const stmt = db.prepare(`
    INSERT INTO notes (id, parent_type, parent_id, title, body_md, pinned, archived)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  let resultNote: Note | null = null

  // Wrap insertions and backlinks parsing in transaction
  const tx = db.transaction(() => {
    stmt.run(id, parent_type, parent_id, title, body_md, pinned, archived)
    parseAndSyncBacklinks(id, body_md)
    resultNote = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Note
  })

  tx()

  if (!resultNote) {
    throw new Error('Failed to create note')
  }
  return resultNote
}

export function updateNote(input: UpdateNoteInput): Note {
  const db = getDb()
  const id = input.id
  const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Note | undefined
  if (!existing) {
    throw new Error(`Note not found: ${id}`)
  }

  const title = input.title !== undefined ? input.title.trim() : existing.title
  const body_md = input.body_md !== undefined ? input.body_md : existing.body_md
  const parent_type = input.parent_type !== undefined ? input.parent_type : existing.parent_type
  const parent_id = input.parent_id !== undefined ? input.parent_id : existing.parent_id
  const pinned = input.pinned !== undefined ? input.pinned : existing.pinned
  const archived = input.archived !== undefined ? input.archived : existing.archived

  const updateStmt = db.prepare(`
    UPDATE notes 
    SET parent_type = ?, parent_id = ?, title = ?, body_md = ?, pinned = ?, archived = ?, updated_at = datetime('now')
    WHERE id = ?
  `)

  let resultNote: Note | null = null

  // Wrap update and backlinks update in transaction
  const tx = db.transaction(() => {
    updateStmt.run(parent_type, parent_id, title, body_md, pinned, archived, id)
    parseAndSyncBacklinks(id, body_md)
    resultNote = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Note
  })

  tx()

  if (!resultNote) {
    throw new Error('Failed to update note')
  }
  return resultNote
}

export function getBacklinks(noteId: string): Note[] {
  const stmt = getDb().prepare(`
    SELECT n.* 
    FROM notes n
    JOIN note_links nl ON n.id = nl.source_note_id
    WHERE nl.target_note_id = ? AND n.archived = 0
    ORDER BY n.pinned DESC, n.updated_at DESC
  `)
  return stmt.all(noteId) as Note[]
}
