// tests/unit/capacity.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getDb, closeDb } from '../../src/main/db/database'
import { getCapacityToday } from '../../src/main/services/scheduler'

describe('Capacity Heuristics Engine', () => {
  beforeEach(() => {
    // Obtain a clean in-memory database before each test
    const db = getDb()
    
    // Clear dynamic tables to isolate tests
    db.prepare("DELETE FROM calendar_events").run()
    db.prepare("DELETE FROM tasks").run()
    db.prepare("DELETE FROM sessions").run()
    db.prepare("DELETE FROM scheduling_preferences").run()
  })

  afterEach(() => {
    closeDb()
  })

  it('computes basic working/available hours correctly without events or tasks', () => {
    const db = getDb()
    
    // Seed preferences
    db.prepare("INSERT INTO scheduling_preferences (key, value) VALUES ('rituals.capacity.working_hours', '8')").run()
    db.prepare("INSERT INTO scheduling_preferences (key, value) VALUES ('rituals.capacity.break_buffer', '1.5')").run()
    db.prepare("INSERT INTO scheduling_preferences (key, value) VALUES ('rituals.capacity.default_duration', '30')").run()

    const capacity = getCapacityToday()
    // Available = 8 - 0 (events) - 1.5 (buffer) = 6.5
    expect(capacity.available).toBe(6.5)
    expect(capacity.committed).toBe(0)
    expect(capacity.ratio).toBe(0)
    expect(capacity.status).toBe('light')
  })

  it('computes correct ratio and status when loaded with tasks and meetings', () => {
    const db = getDb()
    const todayStr = new Date().toLocaleDateString('en-CA')

    // Seed preferences
    db.prepare("INSERT INTO scheduling_preferences (key, value) VALUES ('rituals.capacity.working_hours', '8')").run()
    db.prepare("INSERT INTO scheduling_preferences (key, value) VALUES ('rituals.capacity.break_buffer', '1')").run()
    db.prepare("INSERT INTO scheduling_preferences (key, value) VALUES ('rituals.capacity.default_duration', '30')").run()

    // Seed a 3-hour meeting starting today
    const meetingStart = `${todayStr}T10:00:00`
    const meetingEnd = `${todayStr}T13:00:00`
    db.prepare(`
      INSERT INTO calendar_events (id, title, start_at, end_at, source, created_at, updated_at)
      VALUES ('ev-meeting-1', 'Strategy Review', ?, ?, 'local', datetime('now'), datetime('now'))
    `).run(meetingStart, meetingEnd)

    // Seed tasks due today: 1 task of 120 mins (2h), 1 task of 180 mins (3h). Total committed = 5 hours
    db.prepare(`
      INSERT INTO tasks (id, title, status, priority, due_date, time_estimate_mins, is_archived, sequence)
      VALUES ('t-1', 'Code database integrations', 'pending', 2, ?, 120, 0, 1)
    `).run(todayStr)

    db.prepare(`
      INSERT INTO tasks (id, title, status, priority, due_date, time_estimate_mins, is_archived, sequence)
      VALUES ('t-2', 'Refactor UI layers', 'pending', 1, ?, 180, 0, 2)
    `).run(todayStr)

    const capacity = getCapacityToday()

    // Available = 8 - 3 (meeting) - 1 (buffer) = 4 hours
    expect(capacity.available).toBe(4)
    // Committed = (120 + 180) / 60 = 5 hours
    expect(capacity.committed).toBe(5)
    // Ratio = 5 / 4 = 1.25
    expect(capacity.ratio).toBe(1.25)
    // 1.25 is in (1.0, 1.3] range => tight
    expect(capacity.status).toBe('tight')
  })

  it('declares overload when committed load significantly exceeds availabilities', () => {
    const db = getDb()
    const todayStr = new Date().toLocaleDateString('en-CA')

    db.prepare("INSERT INTO scheduling_preferences (key, value) VALUES ('rituals.capacity.working_hours', '6')").run()
    db.prepare("INSERT INTO scheduling_preferences (key, value) VALUES ('rituals.capacity.break_buffer', '1')").run()
    db.prepare("INSERT INTO scheduling_preferences (key, value) VALUES ('rituals.capacity.default_duration', '30')").run()

    // 10 hours committed tasks
    db.prepare(`
      INSERT INTO tasks (id, title, status, priority, due_date, time_estimate_mins, is_archived, sequence)
      VALUES ('t-overload', 'Huge mega audit', 'pending', 3, ?, 600, 0, 1)
    `).run(todayStr)

    const capacity = getCapacityToday()
    // Available = 6 - 0 (events) - 1 = 5 hours
    expect(capacity.available).toBe(5)
    expect(capacity.committed).toBe(10)
    expect(capacity.ratio).toBe(2.0)
    expect(capacity.status).toBe('overloaded')
  })
})
