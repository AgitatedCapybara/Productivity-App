// src/main/db/sessions.ts
import { getDb } from './database'
import { nanoid } from 'nanoid'
import type { Session, Distraction } from './schema'
import { completeLinkedSessionHabits } from './habits'
import { getSetting, setSetting } from './settings'

export interface SessionWithDistractions extends Session {
  distractions: Distraction[]
}

export function createSession(input: { taskId?: string | null; projectId?: string | null; targetDurationMins?: number; targetBreakDurationMins?: number }): Session {
  const db = getDb()
  const id = nanoid(8)
  const startedAt = new Date().toISOString()
  const taskId = input.taskId || null
  const projectId = input.projectId || null
  const targetDurationMins = input.targetDurationMins || 25
  const targetBreakDurationMins = input.targetBreakDurationMins || 5
  
  const stmt = db.prepare(`
    INSERT INTO sessions (id, task_id, project_id, target_duration_mins, target_break_duration_mins, started_at, status)
    VALUES (@id, @task_id, @project_id, @target_duration_mins, @target_break_duration_mins, @started_at, 'active')
  `)
  
  stmt.run({
    id,
    task_id: taskId,
    project_id: projectId,
    target_duration_mins: targetDurationMins,
    target_break_duration_mins: targetBreakDurationMins,
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
  
  const runTx = db.transaction(() => {
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

    // Completes any linked active habits
    try {
      completeLinkedSessionHabits(session.project_id)
    } catch (err) {
      console.error('Failed to trigger completeLinkedSessionHabits:', err)
    }
  })
  
  runTx()
}

export function pauseSession(sessionId: string): void {
  const db = getDb()
  const stmt = db.prepare(`UPDATE sessions SET status = 'paused' WHERE id = ?`)
  stmt.run(sessionId)
  
  // Track pause timestamp
  setSetting(`session_paused_at_${sessionId}`, new Date().toISOString())
}

export function resumeSession(sessionId: string): void {
  const db = getDb()
  
  // Retrieve the session's current started_at
  const session = db.prepare('SELECT started_at FROM sessions WHERE id = ?').get(sessionId) as { started_at: string } | undefined
  if (session) {
    const pausedAtStr = getSetting(`session_paused_at_${sessionId}`, '')
    if (pausedAtStr) {
      const pausedAt = new Date(pausedAtStr).getTime()
      const now = Date.now()
      const pauseDurationMs = now - pausedAt
      if (pauseDurationMs > 0) {
        const originalStartedAt = new Date(session.started_at).getTime()
        const newStartedAt = new Date(originalStartedAt + pauseDurationMs).toISOString()
        
        // Adjust the start time by adding the duration the session spent in paused state
        db.prepare('UPDATE sessions SET started_at = ? WHERE id = ?').run(newStartedAt, sessionId)
      }
    }
  }

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

export function getSessionDistractions(sessionId: string): Distraction[] {
  const db = getDb()
  const stmt = db.prepare(`SELECT * FROM distractions WHERE session_id = ? ORDER BY started_at DESC`)
  return stmt.all(sessionId) as Distraction[]
}

export function logDistraction(sessionId: string, appName: string, windowTitle: string, startedAt: string): string {
  const db = getDb()
  const id = nanoid(8)
  
  const runTx = db.transaction(() => {
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
  })
  
  runTx()
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

export function deleteSession(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
}

export function clearSessionHistory(): void {
  const db = getDb()
  db.prepare('DELETE FROM sessions').run()
}

export function updateSessionReflection(sessionId: string, reflection: string, clarityRating: number | null, energyRating: number | null): void {
  const db = getDb()
  const stmt = db.prepare(`
    UPDATE sessions 
    SET reflection = @reflection,
        clarity_rating = @clarity_rating,
        energy_rating = @energy_rating
    WHERE id = @id
  `)
  stmt.run({
    id: sessionId,
    reflection,
    clarity_rating: clarityRating,
    energy_rating: energyRating
  })
}

export function renameSession(sessionId: string, customName: string): void {
  const db = getDb()
  const stmt = db.prepare(`
    UPDATE sessions 
    SET custom_name = @custom_name
    WHERE id = @id
  `)
  stmt.run({
    id: sessionId,
    custom_name: customName
  })
}

export function updateSessionTask(sessionId: string, taskId: string | null): void {
  const db = getDb()
  const stmt = db.prepare(`
    UPDATE sessions
    SET task_id = @task_id
    WHERE id = @id
  `)
  stmt.run({
    id: sessionId,
    task_id: taskId
  })
}

export interface DeepWorkDay {
  date: string
  minutes: number
}

export function getDailyDeepWorkMinutes(): DeepWorkDay[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT date(started_at, 'localtime') as date, SUM(duration_mins) as minutes
    FROM sessions
    WHERE status = 'completed' AND duration_mins >= 25 AND distraction_count = 0
      AND started_at >= datetime('now', '-30 days')
    GROUP BY date
    ORDER BY date ASC
  `).all() as { date: string; minutes: number | null }[]
  return rows.map(r => ({ date: r.date, minutes: r.minutes || 0 }))
}

export interface DeepWorkDistribution {
  hour: number
  minutes: number
  count: number
}

export function getWeeklyDeepWorkDistributionByHour(): DeepWorkDistribution[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT strftime('%H', datetime(started_at, 'localtime')) as hr, SUM(duration_mins) as minutes, COUNT(*) as count
    FROM sessions
    WHERE status = 'completed' AND duration_mins >= 25 AND distraction_count = 0
      AND started_at >= datetime('now', '-7 days')
    GROUP BY hr
    ORDER BY hr ASC
  `).all() as { hr: string; minutes: number | null; count: number }[]
  
  const distribution: DeepWorkDistribution[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, minutes: 0, count: 0 }))
  for (const r of rows) {
    const h = parseInt(r.hr, 10)
    if (!isNaN(h) && h >= 0 && h < 24) {
      distribution[h].minutes = r.minutes || 0
      distribution[h].count = r.count || 0
    }
  }
  return distribution
}

export interface PeakFocusWindowInfo {
  peakWindow: string
  startHour: number
  endHour: number
  averageProductivityScore: number
}

export function getPeakFocusWindow(): PeakFocusWindowInfo {
  const db = getDb()
  const rows = db.prepare(`
    SELECT strftime('%H', datetime(started_at, 'localtime')) as hr, SUM(duration_mins) as minutes
    FROM sessions
    WHERE status = 'completed' AND started_at >= datetime('now', '-30 days')
    GROUP BY hr
  `).all() as { hr: string; minutes: number | null }[]

  let maxMinutes = 0
  let peakHour = 9
  const hoursMins = Array(24).fill(0)
  for (const r of rows) {
    const h = parseInt(r.hr, 10)
    if (!isNaN(h) && h >= 0 && h < 24) {
      hoursMins[h] = r.minutes || 0
    }
  }

  for (let h = 0; h < 24; h++) {
    const total = hoursMins[h] + hoursMins[(h + 1) % 24]
    if (total > maxMinutes) {
      maxMinutes = total
      peakHour = h
    }
  }

  const startStr = `${peakHour.toString().padStart(2, '0')}:00`
  const endStr = `${((peakHour + 2) % 24).toString().padStart(2, '0')}:00`
  return {
    peakWindow: `${startStr} - ${endStr}`,
    startHour: peakHour,
    endHour: (peakHour + 2) % 24,
    averageProductivityScore: maxMinutes
  }
}

export interface InterruptionTrend {
  date: string
  avgDistractions: number
  totalDistractions: number
  sessionCount: number
}

export function getInterruptionFrequencyTrends(): InterruptionTrend[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT date(started_at, 'localtime') as date, AVG(distraction_count) as avgDistractions, SUM(distraction_count) as totalDistractions, COUNT(*) as count
    FROM sessions
    WHERE started_at >= datetime('now', '-14 days')
    GROUP BY date
    ORDER BY date ASC
  `).all() as { date: string; avgDistractions: number | null; totalDistractions: number | null; count: number }[]
  
  return rows.map(r => ({
    date: r.date,
    avgDistractions: r.avgDistractions ? parseFloat(r.avgDistractions.toFixed(2)) : 0,
    totalDistractions: r.totalDistractions || 0,
    sessionCount: r.count
  }))
}

export function cleanStaleSessions(): void {
  try {
    const db = getDb()
    const staleSessions = db.prepare(`SELECT * FROM sessions WHERE status IN ('active', 'paused')`).all() as Session[]
    console.log(`[CLEANUP] Found ${staleSessions.length} stale active/paused sessions to clean up on startup.`)
    for (const session of staleSessions) {
      const endedAt = new Date().toISOString()
      const startDate = new Date(session.started_at)
      const endDate = new Date(endedAt)
      const durationMins = Math.floor((endDate.getTime() - startDate.getTime()) / 60000)
      
      db.prepare(`
        UPDATE sessions 
        SET ended_at = ?, duration_mins = ?, status = 'completed'
        WHERE id = ?
      `).run(endedAt, Math.max(0, durationMins), session.id)
      
      if (session.task_id && durationMins > 0) {
        try {
          db.prepare(`
            UPDATE tasks 
            SET time_logged_mins = time_logged_mins + ?,
                updated_at = datetime('now')
            WHERE id = ?
          `).run(durationMins, session.task_id)
        } catch (e) {
          console.error('Failed to write time to task during stale session cleanup:', e)
        }
      }
    }
  } catch (err) {
    console.error('Failed to clean stale sessions on startup:', err)
  }
}

