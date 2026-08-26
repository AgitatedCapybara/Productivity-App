// src/main/db/events.ts
import { getDb } from './database'
import { nanoid } from 'nanoid'
import type { CalendarEvent, CreateCalendarEventInput, UpdateCalendarEventInput } from './schema'

export function getAllEvents(): CalendarEvent[] {
  const stmt = getDb().prepare('SELECT * FROM calendar_events ORDER BY start_at ASC')
  return stmt.all() as CalendarEvent[]
}

export function createEvent(input: CreateCalendarEventInput): CalendarEvent {
  const db = getDb()
  const id = nanoid(8)
  const stmt = db.prepare(`
    INSERT INTO calendar_events (id, title, description, start_at, end_at, project_id, recurrence)
    VALUES (@id, @title, @description, @start_at, @end_at, @project_id, @recurrence)
  `)
  stmt.run({
    id,
    title: input.title,
    description: input.description ?? null,
    start_at: input.start_at,
    end_at: input.end_at,
    project_id: input.project_id ?? null,
    recurrence: input.recurrence ?? 'none'
  })

  return db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id) as CalendarEvent
}

export function updateEvent(input: UpdateCalendarEventInput): CalendarEvent {
  const db = getDb()
  const { id, ...updates } = input
  const keys = Object.keys(updates)

  if (keys.length === 0) {
    return db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id) as CalendarEvent
  }

  const setClauses = keys.map((k) => `${k} = @${k}`).join(', ')
  const stmt = db.prepare(`
    UPDATE calendar_events
    SET ${setClauses}, updated_at = datetime('now')
    WHERE id = @id
  `)

  stmt.run({ ...updates, id })

  return db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id) as CalendarEvent
}

export function deleteEvent(id: string): void {
  const db = getDb()
  
  // Look up event details before deletion to check for matching suggestions
  const event = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id) as CalendarEvent | undefined
  if (event) {
    const suggestion = db.prepare(`
      SELECT id FROM suggestions
      WHERE status = 'accepted'
      AND suggested_start = ?
      AND suggested_end = ?
    `).get(event.start_at, event.end_at) as { id: string } | undefined

    if (suggestion) {
      db.prepare(`
        UPDATE suggestions
        SET status = 'pending', resolved_at = NULL
        WHERE id = ?
      `).run(suggestion.id)
    }
  }

  db.prepare('DELETE FROM calendar_events WHERE id = ?').run(id)
}
