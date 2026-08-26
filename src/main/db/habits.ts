// src/main/db/habits.ts
import { getDb } from './database'
import { nanoid } from 'nanoid'
import type { Habit, HabitLog, CreateHabitInput, UpdateHabitInput } from './schema'

export function getAllHabits(): Habit[] {
  const stmt = getDb().prepare('SELECT * FROM habits ORDER BY created_at ASC')
  return stmt.all() as Habit[]
}

export function createHabit(input: CreateHabitInput): Habit {
  const db = getDb()
  const id = nanoid(8)
  
  const stmt = db.prepare(`
    INSERT INTO habits (id, name, frequency, project_id, is_paused, session_link)
    VALUES (@id, @name, @frequency, @project_id, @is_paused, @session_link)
  `)
  
  stmt.run({
    id,
    name: input.name,
    frequency: input.frequency ?? 'daily',
    project_id: input.project_id ?? null,
    is_paused: input.is_paused ?? 0,
    session_link: input.session_link ?? 0
  })
  
  const getStmt = db.prepare('SELECT * FROM habits WHERE id = ?')
  return getStmt.get(id) as Habit
}

export function updateHabit(input: UpdateHabitInput): Habit {
  const db = getDb()
  const { id, ...updates } = input
  const keys = Object.keys(updates)
  
  if (keys.length === 0) {
    const getStmt = db.prepare('SELECT * FROM habits WHERE id = ?')
    return getStmt.get(id) as Habit
  }

  const setClauses = keys.map((k) => `${k} = @${k}`).join(', ')
  const stmt = db.prepare(`
    UPDATE habits
    SET ${setClauses}
    WHERE id = @id
  `)

  stmt.run({ ...updates, id })

  // Trigger streak recalculation on pause status change or general update
  recalculateStreak(db, id)

  const getStmt = db.prepare('SELECT * FROM habits WHERE id = ?')
  return getStmt.get(id) as Habit
}

export function deleteHabit(id: string): void {
  const db = getDb()
  const runTx = db.transaction(() => {
    db.prepare('DELETE FROM habit_logs WHERE habit_id = ?').run(id)
    db.prepare('DELETE FROM habits WHERE id = ?').run(id)
  })
  runTx()
}

export function checkInHabit(habitId: string, dateStr: string): HabitLog {
  const db = getDb()
  
  const runTx = db.transaction(() => {
    // Check if log already exists for this date to support idempotency
    const existStmt = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?')
    const existing = existStmt.get(habitId, dateStr) as HabitLog | undefined
    if (existing) {
      return existing
    }

    const logId = nanoid(8)
    const stmt = db.prepare(`
      INSERT INTO habit_logs (id, habit_id, date)
      VALUES (@id, @habit_id, @date)
    `)
    stmt.run({
      id: logId,
      habit_id: habitId,
      date: dateStr
    })

    // Recalculate streak after checking in
    recalculateStreak(db, habitId)

    return { id: logId, habit_id: habitId, date: dateStr, created_at: new Date().toISOString() }
  })

  return runTx() as HabitLog
}

export function uncheckInHabit(habitId: string, dateStr: string): void {
  const db = getDb()
  const runTx = db.transaction(() => {
    const stmt = db.prepare('DELETE FROM habit_logs WHERE habit_id = ? AND date = ?')
    stmt.run(habitId, dateStr)

    // Recalculate streak after unchecking
    recalculateStreak(db, habitId)
  })
  runTx()
}

export function getHabitLogs(habitId?: string): HabitLog[] {
  const db = getDb()
  if (habitId) {
    const stmt = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY date ASC')
    return stmt.all(habitId) as HabitLog[]
  } else {
    const stmt = db.prepare('SELECT * FROM habit_logs ORDER BY date ASC')
    return stmt.all() as HabitLog[]
  }
}

/**
 * Automatically completes connected focus-session habits.
 * Completing any focus session completes linked habits (linked by session_link).
 * If project_id is set on the habit, it must match the session's project.
 */
export function completeLinkedSessionHabits(projectId: string | null): void {
  const db = getDb()
  
  // Find all active focus-session linked habits
  const linkedHabitsStmt = db.prepare(`
    SELECT id, project_id FROM habits 
    WHERE session_link = 1 AND is_paused = 0
  `)
  const linkedHabits = linkedHabitsStmt.all() as { id: string, project_id: string | null }[]
  
  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
  
  for (const habit of linkedHabits) {
    // If project_id is null on the habit, ANY project / independent completes it.
    // If project_id is specified on the habit, it must match the session's project.
    if (habit.project_id === null || habit.project_id === projectId) {
      checkInHabit(habit.id, todayStr)
    }
  }
}

/**
 * Calculates and saves the actual current and longest streaks to the database for a habit.
 */
function recalculateStreak(db: any, habitId: string): void {
  const logs = db.prepare('SELECT date FROM habit_logs WHERE habit_id = ? ORDER BY date ASC').all(habitId) as { date: string }[]
  const habit = db.prepare('SELECT is_paused, current_streak, longest_streak FROM habits WHERE id = ?').get(habitId) as { is_paused: number, current_streak: number, longest_streak: number } | undefined

  if (!habit) return

  if (logs.length === 0) {
    db.prepare('UPDATE habits SET current_streak = 0, longest_streak = 0 WHERE id = ?').run(habitId)
    return
  }

  // Parse checked-in dates
  const datesSet = new Set(logs.map(l => l.date))
  const sortedDates = logs.map(l => l.date).sort()
  
  // 1. Calculate longest streak historically from logs
  let longest = 0
  if (sortedDates.length > 0) {
    let tempStreak = 1
    let prevDate = new Date(sortedDates[0])
    longest = 1
    
    for (let i = 1; i < sortedDates.length; i++) {
      const currDate = new Date(sortedDates[i])
      const diffTime = Math.abs(currDate.getTime() - prevDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays <= 1) {
        tempStreak += 1
      } else {
        if (tempStreak > longest) {
          longest = tempStreak
        }
        tempStreak = 1
      }
      prevDate = currDate
    }
    if (tempStreak > longest) {
      longest = tempStreak
    }
  }

  // 2. Calculate current streak walking backward from today / yesterday
  let current = 0
  const todayStr = new Date().toLocaleDateString('en-CA')
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toLocaleDateString('en-CA')

  const isCheckedToday = datesSet.has(todayStr)
  const isCheckedYesterday = datesSet.has(yesterdayStr)

  if (habit.is_paused === 1) {
    // Walk back from the latest available check-in log (freeze streak on pause)
    const lastLogDateStr = sortedDates[sortedDates.length - 1]
    if (lastLogDateStr) {
      let walk = new Date(lastLogDateStr)
      let streakLive = true
      while (streakLive) {
        const walkStr = walk.toLocaleDateString('en-CA')
        if (datesSet.has(walkStr)) {
          current++
          walk.setDate(walk.getDate() - 1)
        } else {
          streakLive = false
        }
      }
    }
  } else {
    // Standard active tracking: check if checked-in today or yesterday
    if (isCheckedToday || isCheckedYesterday) {
      let walk = isCheckedToday ? new Date() : yesterday
      let streakLive = true
      while (streakLive) {
        const walkStr = walk.toLocaleDateString('en-CA')
        if (datesSet.has(walkStr)) {
          current++
          walk.setDate(walk.getDate() - 1)
        } else {
          streakLive = false
        }
      }
    } else {
      current = 0
    }
  }

  const finalLongest = Math.max(longest, current, habit.longest_streak)

  db.prepare(`
    UPDATE habits 
    SET current_streak = @current, longest_streak = @longest
    WHERE id = @id
  `).run({
    id: habitId,
    current,
    longest: finalLongest
  })
}
