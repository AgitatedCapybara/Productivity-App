// tests/db/sessions.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getDb, closeDb } from '../../src/main/db/database'
import { createSession, getActiveSession, updateSessionReflection } from '../../src/main/db/sessions'

describe('Sessions Database Operations', () => {
  beforeEach(() => {
    const db = getDb()
    db.prepare("DELETE FROM sessions").run()
    db.prepare("DELETE FROM tasks").run()
    db.prepare("DELETE FROM projects").run()
  })

  afterEach(() => {
    closeDb()
  })

  it('correctly creates a focus session with a custom target duration', () => {
    // 1. Create session with default duration
    const session1 = createSession({})
    expect(session1.id).toBeDefined()
    expect(session1.target_duration_mins).toBe(25)
    expect(session1.status).toBe('active')

    // 2. Create session with a custom self-regulated duration
    const session2 = createSession({ targetDurationMins: 45 })
    expect(session2.id).toBeDefined()
    expect(session2.target_duration_mins).toBe(45)

    // 3. Create session with a custom self-regulated duration of 90 minutes and a task ID
    const session3 = createSession({ taskId: 'task-abc', targetDurationMins: 90 })
    expect(session3.id).toBeDefined()
    expect(session3.task_id).toBe('task-abc')
    expect(session3.target_duration_mins).toBe(90)
  })

  it('correctly retrieves the active focus session', () => {
    // Start a session
    createSession({ targetDurationMins: 60 })

    const active = getActiveSession()
    expect(active).not.toBeNull()
    expect(active?.target_duration_mins).toBe(60)
    expect(active?.status).toBe('active')
  })

  it('correctly updates reflection notes and ratings for a session', () => {
    const session = createSession({ targetDurationMins: 30 })
    
    // Perform update reflection
    updateSessionReflection(session.id, 'Feeling clear-headed and ready to design.', 5, 4)

    // Verify database row state
    const db = getDb()
    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id) as any
    expect(row).toBeDefined()
    expect(row.reflection).toBe('Feeling clear-headed and ready to design.')
    expect(row.clarity_rating).toBe(5)
    expect(row.energy_rating).toBe(4)

    // Verify empty optional fields save cleanly
    updateSessionReflection(session.id, '', null, null)
    const updatedRow = db.prepare('SELECT reflection, clarity_rating, energy_rating FROM sessions WHERE id = ?').get(session.id) as any
    expect(updatedRow.reflection).toBe('')
    expect(updatedRow.clarity_rating).toBeNull()
    expect(updatedRow.energy_rating).toBeNull()
  })
})
