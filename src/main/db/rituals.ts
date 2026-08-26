// src/main/db/rituals.ts
import { getDb } from './database'
import { nanoid } from 'nanoid'

export interface RitualEntry {
  id: string
  type: 'morning' | 'evening'
  date: string
  payload_json: string
  created_at: string
}

export function saveRitualEntry(type: 'morning' | 'evening', date: string, payloadJson: string): void {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM ritual_entries WHERE type = ? AND date = ?').get(type, date) as { id: string } | undefined
  if (existing) {
    db.prepare('UPDATE ritual_entries SET payload_json = ?, created_at = datetime(\'now\') WHERE id = ?').run(payloadJson, existing.id)
  } else {
    const id = nanoid(8)
    db.prepare('INSERT INTO ritual_entries (id, type, date, payload_json, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').run(id, type, date, payloadJson)
  }
}

export function getRitualEntriesByDate(date: string): RitualEntry[] {
  const db = getDb()
  return db.prepare('SELECT * FROM ritual_entries WHERE date = ?').all(date) as RitualEntry[]
}

export function getRitualStreak(): { currentStreak: number; longestStreak: number; completionRate: number } {
  const db = getDb()
  const rows = db.prepare('SELECT DISTINCT date FROM ritual_entries ORDER BY date ASC').all() as { date: string }[]
  
  if (rows.length === 0) {
    return { currentStreak: 0, longestStreak: 0, completionRate: 0 }
  }

  const dates = rows.map(r => r.date)
  const dSet = new Set(dates)

  // Longest streak
  let longest = 0
  let currentRun = 0
  let prevDate: Date | null = null

  for (const dStr of dates) {
    // using local date noon representation to avoid zone shifts
    const currDate = new Date(dStr + 'T12:00:00')
    if (!prevDate) {
      currentRun = 1
    } else {
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24))
      if (diffDays <= 1) {
        currentRun++
      } else {
        if (currentRun > longest) longest = currentRun
        currentRun = 1
      }
    }
    prevDate = currDate
  }
  if (currentRun > longest) longest = currentRun

  // Current streak walking backward
  let currentStreak = 0
  const today = new Date()
  const todayStr = today.toLocaleDateString('en-CA')
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toLocaleDateString('en-CA')

  let startFromToday = dSet.has(todayStr)
  let startFromYesterday = dSet.has(yesterdayStr)

  if (startFromToday || startFromYesterday) {
    currentStreak = 0
    const temp = startFromToday ? today : yesterday
    // Guard against sanity of infinity loops
    for (let count = 0; count < 1000; count++) {
      const tempStr = temp.toLocaleDateString('en-CA')
      if (dSet.has(tempStr)) {
        currentStreak++
        temp.setDate(temp.getDate() - 1)
      } else {
        break
      }
    }
  }

  // Completion rate in last 30 days
  let completedInLast30 = 0
  for (let i = 0; i < 30; i++) {
    const loopDate = new Date()
    loopDate.setDate(loopDate.getDate() - i)
    if (dSet.has(loopDate.toLocaleDateString('en-CA'))) {
      completedInLast30++
    }
  }
  const completionRate = Math.round((completedInLast30 / 30) * 100)

  return { currentStreak, longestStreak: Math.max(longest, currentStreak), completionRate }
}

export function getWeeklyRitualSummary(): {
  completionRate: number
  avgTasksCommitted: number
  avgTasksCompleted: number
  capacityAccuracy: number
} {
  const db = getDb()
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toLocaleDateString('en-CA'))
  }

  // Query ritual_entries for last 7 days
  const rows = db.prepare(`
    SELECT * FROM ritual_entries 
    WHERE date IN (${days.map(() => '?').join(',')})
  `).all(...days) as any[]

  const dSet = new Set(rows.map(r => r.date))
  const completionRate = Math.round((dSet.size / 7) * 100)

  let morningCount = 0
  let totalCommitted = 0

  let eveningCount = 0
  let totalCompleted = 0

  let totalEst = 0
  let totalAct = 0

  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload_json)
      if (row.type === 'morning') {
        morningCount++
        if (payload.tasksCommitted) {
          totalCommitted += Array.isArray(payload.tasksCommitted) 
            ? payload.tasksCommitted.length 
            : (Number(payload.tasksCommitted) || 0)
        }
        if (payload.capacity && typeof payload.capacity.committed === 'number') {
          totalEst += payload.capacity.committed
        }
      } else if (row.type === 'evening') {
        eveningCount++
        if (typeof payload.completedTasksCount === 'number') {
          totalCompleted += payload.completedTasksCount
        }
        if (typeof payload.actualFocusTimeHrs === 'number') {
          totalAct += payload.actualFocusTimeHrs
        }
      }
    } catch (_) {}
  }

  const avgTasksCommitted = morningCount > 0 ? parseFloat((totalCommitted / morningCount).toFixed(1)) : 0
  const avgTasksCompleted = eveningCount > 0 ? parseFloat((totalCompleted / eveningCount).toFixed(1)) : 0

  let capacityAccuracy = 100
  if (totalEst > 0) {
    const diff = Math.abs(totalEst - totalAct)
    capacityAccuracy = Math.max(0, Math.round((1 - diff / totalEst) * 100))
  } else if (totalAct > 0) {
    capacityAccuracy = 0
  } else {
    capacityAccuracy = 100
  }

  return {
    completionRate,
    avgTasksCommitted,
    avgTasksCompleted,
    capacityAccuracy
  }
}
