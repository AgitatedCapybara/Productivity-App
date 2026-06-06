import { getDb } from './database'
import { nanoid } from 'nanoid'
import type { Habit } from './schema'

export function getAllHabits(): Habit[] {
  const stmt = getDb().prepare('SELECT * FROM habits ORDER BY created_at ASC')
  return stmt.all() as Habit[]
}

export function createHabit(input: Omit<Habit, 'id' | 'current_streak' | 'longest_streak' | 'created_at'>): Habit {
  const db = getDb()
  const id = nanoid(8)
  
  const stmt = db.prepare(`
    INSERT INTO habits (id, name, frequency)
    VALUES (@id, @name, @frequency)
  `)
  
  stmt.run({
    id,
    name: input.name,
    frequency: input.frequency ?? 'daily'
  })
  
  const getStmt = db.prepare('SELECT * FROM habits WHERE id = ?')
  return getStmt.get(id) as Habit
}

export function updateHabit(input: Partial<Habit> & { id: string }): Habit {
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

  const getStmt = db.prepare('SELECT * FROM habits WHERE id = ?')
  return getStmt.get(id) as Habit
}

export function deleteHabit(id: string): void {
  const stmt = getDb().prepare('DELETE FROM habits WHERE id = ?')
  stmt.run(id)
}
