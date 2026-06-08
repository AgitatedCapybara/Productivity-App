// src/main/db/sessions.ts
import { getDb } from './database'
import { nanoid } from 'nanoid'
import type { Session, Distraction } from './schema'

export interface SessionWithDistractions extends Session {
  distractions: Distraction[]
}

export function createSession(taskId: string): Session {
  const db = getDb()
  const id = nanoid(8)
  const startedAt = new Date().toISOString()
  
  const stmt = db.prepare(`
    INSERT INTO sessions (id, task_id, started_at, status)
    VALUES (@id, @task_id, @started_at, 'active')
  `)
  
  stmt.run({
    id,
    task_id: taskId,
    started_at: startedAt
  })
  
  const getStmt = db.prepare('SELECT * FROM sessions WHERE id = ?')
  return getStmt.get(id) as Session
}

export function endSession(sessionId: string): void {
  const db = getDb()
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as Session
  if (!session) return

  const endedAt = new Date().toISOString()
  const startDate = new Date(session.started_at)
  const endDate = new Date(endedAt)
  const durationMins = Math.floor((endDate.getTime() - startDate.getTime()) / 60000)
  
  const stmt = db.prepare(`
    UPDATE sessions 
    SET ended_at = @ended_at, duration_mins = @duration_mins, status = 'completed'
    WHERE id = @id
  `)
  
  stmt.run({
    id: sessionId,
    ended_at: endedAt,
    duration_mins: durationMins
  })
}

export function pauseSession(sessionId: string): void {
  const db = getDb()
  const stmt = db.prepare(`UPDATE sessions SET status = 'paused' WHERE id = ?`)
  stmt.run(sessionId)
}

export function resumeSession(sessionId: string): void {
  const db = getDb()
  const stmt = db.prepare(`UPDATE sessions SET status = 'active' WHERE id = ?`)
  stmt.run(sessionId)
}

export function cancelSession(sessionId: string): void {
  const db = getDb()
  const stmt = db.prepare(`UPDATE sessions SET status = 'cancelled' WHERE id = ?`)
  stmt.run(sessionId)
}

export function getActiveSession(): Session | null {
  const db = getDb()
  const stmt = db.prepare(`SELECT * FROM sessions WHERE status IN ('active', 'paused') ORDER BY started_at DESC LIMIT 1`)
  return (stmt.get() as Session) || null
}

export function getTodaySessions(): SessionWithDistractions[] {
  const db = getDb()
  const sessionsStmt = db.prepare(`
    SELECT * FROM sessions 
    WHERE date(started_at, 'localtime') = date('now', 'localtime') AND status = 'completed'
    ORDER BY started_at DESC
  `)
  const sessions = sessionsStmt.all() as Session[]
  
  const distStmt = db.prepare(`SELECT * FROM distractions WHERE session_id = ? ORDER BY started_at ASC`)
  
  return sessions.map((session) => {
    return {
      ...session,
      distractions: distStmt.all(session.id) as Distraction[]
    }
  })
}

export function logDistraction(sessionId: string, appName: string, windowTitle: string, startedAt: string): string {
  const db = getDb()
  const id = nanoid(8)
  
  const stmt = db.prepare(`
    INSERT INTO distractions (id, session_id, app_name, window_title, started_at)
    VALUES (@id, @session_id, @app_name, @window_title, @started_at)
  `)
  
  stmt.run({
    id,
    session_id: sessionId,
    app_name: appName,
    window_title: windowTitle,
    started_at: startedAt
  })
  
  const updateCountStmt = db.prepare(`UPDATE sessions SET distraction_count = distraction_count + 1 WHERE id = ?`)
  updateCountStmt.run(sessionId)
  
  return id
}

export function endDistraction(distractionId: string, endedAt: string, durationMs: number): void {
  const db = getDb()
  const stmt = db.prepare(`
    UPDATE distractions 
    SET ended_at = @ended_at, duration_ms = @duration_ms
    WHERE id = @id
  `)
  
  stmt.run({
    id: distractionId,
    ended_at: endedAt,
    duration_ms: durationMs
  })
}

export function writeTimeToTask(taskId: string, additionalMins: number): void {
  const db = getDb()
  const stmt = db.prepare(`
    UPDATE tasks 
    SET time_logged_mins = time_logged_mins + @additional_mins,
        updated_at = datetime('now')
    WHERE id = @id
  `)
  stmt.run({ id: taskId, additional_mins: additionalMins })
}
