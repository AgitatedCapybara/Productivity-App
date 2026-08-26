// tests/unit/wellness.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getDb, closeDb } from '../../src/main/db/database'
import { 
  computeWellnessSignals, 
  getWellnessSignals, 
  clearWellnessSignalsCache, 
  exportWellnessDataToJSON
} from '../../src/main/services/wellness'

describe('Wellness & Burnout Signal Analysis Heuristics', () => {
  beforeEach(() => {
    const db = getDb()
    db.prepare("DELETE FROM sessions").run()
    db.prepare("DELETE FROM calendar_events").run()
    db.prepare("DELETE FROM tasks").run()
    db.prepare("DELETE FROM settings").run()
    db.prepare("DELETE FROM distractions").run()
    clearWellnessSignalsCache()
  })

  afterEach(() => {
    closeDb()
  })

  it('generates zero signals on a healthy workspace routine', () => {
    // Brand new DB with no logs returns healthy list (empty output)
    const signals = computeWellnessSignals()
    expect(signals).toEqual([])
  })

  it('triggers Sleep Boundary Erosion signal when late night sessions transcend healthy bounds', () => {
    const db = getDb()
    
    // Seed 4 focus focus sessions completed late at night over the last 5 days
    const today = new Date()
    for (let i = 0; i < 4; i++) {
      const targetDay = new Date(today)
      targetDay.setDate(targetDay.getDate() - i)
      const dayPrefix = targetDay.toLocaleDateString('en-CA')
      
      // Late night: 23:45 (11:45 PM)
      const startedAt = `${dayPrefix}T23:45:00`
      const endedAt = `${dayPrefix}T23:59:00`
      
      db.prepare(`
        INSERT INTO sessions (id, task_id, started_at, ended_at, duration_mins, target_duration_mins, status)
        VALUES (?, 't-dummy', ?, ?, 15, 15, 'completed')
      `).run(`s-late-${i}`, startedAt, endedAt)
    }

    const signals = computeWellnessSignals()
    const sleepErosion = signals.find(s => s.id === 'sleep_erosion')
    
    expect(sleepErosion).toBeDefined()
    expect(sleepErosion?.severity).toBe('warning')
    expect(sleepErosion?.pattern_name).toBe('Sleep Boundary Erosion')
    expect(sleepErosion?.observation).toContain('4 times')
  })

  it('triggers Overtime Focus Habit signal for consecutive early/late working days', () => {
    const db = getDb()
    const today = new Date()

    // Seed 5 consecutive days of early morning focus sessions (7:00 AM)
    for (let i = 0; i < 5; i++) {
      const targetDay = new Date(today)
      targetDay.setDate(targetDay.getDate() - i)
      const yyMMdd = targetDay.toLocaleDateString('en-CA')
      
      const startedAt = `${yyMMdd}T07:15:00` // 7:15 AM
      const endedAt = `${yyMMdd}T07:45:00`

      db.prepare(`
        INSERT INTO sessions (id, task_id, started_at, ended_at, duration_mins, target_duration_mins, status)
        VALUES (?, 't-dummy', ?, ?, 30, 30, 'completed')
      `).run(`s-overtime-${i}`, startedAt, endedAt)
    }

    const signals = computeWellnessSignals()
    const overtimeSig = signals.find(s => s.id === 'overtime_boundaries')
    expect(overtimeSig).toBeDefined()
    expect(overtimeSig?.pattern_name).toBe('Overtime Focus Habit')
  })

  it('triggers Commitment Spillover when task rollbacks/spillovers are excessively high', () => {
    const db = getDb()
    const todayStr = new Date().toLocaleDateString('en-CA')

    // Seed 5 tasks due today, with 4 remaining pending/uncompleted (spillover rate = 80%)
    for (let i = 0; i < 5; i++) {
      const status = i === 0 ? 'done' : 'pending'
      db.prepare(`
        INSERT INTO tasks (id, title, status, priority, due_date, time_estimate_mins, is_archived, sequence)
        VALUES (?, ?, ?, 2, ?, 30, 0, ?)
      `).run(`t-spill-${i}`, `Task ${i}`, status, todayStr, i)
    }

    const signals = computeWellnessSignals()
    const spilloverSig = signals.find(s => s.id === 'task_spillover')
    expect(spilloverSig).toBeDefined()
    expect(spilloverSig?.severity).toBe('caution')
    expect(spilloverSig?.observation).toContain('80% of due tasks')
  })

  it('verifies that all logged recommendation strings contain zero guilt or shame language', () => {
    const db = getDb()
    const today = new Date()
    for (let i = 0; i < 4; i++) {
      const targetDay = new Date(today)
      targetDay.setDate(targetDay.getDate() - i)
      const dayPrefix = targetDay.toLocaleDateString('en-CA')
      db.prepare(`
        INSERT INTO sessions (id, task_id, started_at, ended_at, duration_mins, target_duration_mins, status)
        VALUES (?, 't-dummy', ?, ?, 15, 15, 'completed')
      `).run(`s-late-${i}`, `${dayPrefix}T23:45:00`, `${dayPrefix}T23:59:00`)
    }

    const todayStr = new Date().toLocaleDateString('en-CA')
    for (let i = 0; i < 5; i++) {
      db.prepare(`
        INSERT INTO tasks (id, title, status, priority, due_date, time_estimate_mins, is_archived, sequence)
        VALUES (?, ?, 'pending', 2, ?, 30, 0, ?)
      `).run(`t-spill-words-${i}`, `Task ${i}`, todayStr, i)
    }

    const signals = getWellnessSignals()
    expect(signals.length).toBeGreaterThan(0)

    const blocklist = ["missed", "failed", "declining", "danger", "burnout risk", "you should have"]
    
    for (const sig of signals) {
      const texts = [sig.pattern_name, sig.observation, sig.gentle_suggestion]
      for (const t of texts) {
        for (const badWord of blocklist) {
          expect(t.toLowerCase()).not.toContain(badWord.toLowerCase())
        }
      }
    }
  })

  it('verifies that calling getWellnessSignals() twice within 1 second returns the same cached result', () => {
    clearWellnessSignalsCache()

    // First call
    const signals1 = getWellnessSignals()

    const db = getDb()
    const todayStr = new Date().toLocaleDateString('en-CA')
    for (let i = 0; i < 5; i++) {
      db.prepare(`
        INSERT INTO tasks (id, title, status, priority, due_date, time_estimate_mins, is_archived, sequence)
        VALUES (?, ?, 'pending', 2, ?, 30, 0, ?)
      `).run(`t-spill-rate-${i}`, `Task ${i}`, todayStr, i)
    }

    // Call again within 1 second — should return same cached result reference from memory
    const signals2 = getWellnessSignals()
    expect(signals2).toBe(signals1) 
  })

  it('verifies that export output contains no raw window_title strings longer than 50 characters', () => {
    const db = getDb()
    const longTitle = 'Super Secret Search Query - Google Chrome: https://secret-url.com/session?token=supersecretsensitive1234567890abcdef'
    expect(longTitle.length).toBeGreaterThan(50)

    db.prepare(`
      INSERT INTO tasks (id, title, status, priority, due_date, time_estimate_mins, is_archived, sequence)
      VALUES ('t-dummy', 'Dummy Task', 'pending', 1, ?, 30, 0, 1)
    `).run(new Date().toLocaleDateString('en-CA'))

    db.prepare(`
      INSERT INTO sessions (id, task_id, started_at, ended_at, duration_mins, target_duration_mins, status)
      VALUES (?, 't-dummy', datetime('now'), datetime('now'), 15, 15, 'completed')
    `).run('s-export-test')

    db.prepare(`
      INSERT INTO distractions (id, session_id, app_name, window_title, started_at, ended_at, duration_ms)
      VALUES ('d-export-test', 's-export-test', 'chrome', ?, datetime('now'), datetime('now'), 5000)
    `).run(longTitle)

    const jsonStr = exportWellnessDataToJSON()
    const payload = JSON.parse(jsonStr)
    const distractionsResult = payload.data.distractionsLogged

    expect(distractionsResult.length).toBeGreaterThan(0)
    for (const d of distractionsResult) {
      if (d.window_title) {
        expect(d.window_title.length).toBeLessThanOrEqual(50)
        expect(d.window_title).not.toBe(longTitle)
      }
    }
  })
})
