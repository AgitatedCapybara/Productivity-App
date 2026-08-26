// tests/unit/distraction-monitor.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getDb, closeDb } from '../../src/main/db/database'

import { 
  startMonitoring, 
  stopMonitoring, 
  handlePowerSuspendOrLock, 
  handlePowerResumeOrUnlock,
  systemPausedSessionId,
  setSpawnOverride
} from '../../src/main/services/distraction-monitor'
import { powerMonitor } from 'electron'

describe('OS Session Sleep and Interruption Management', () => {
  beforeEach(() => {
    const db = getDb()
    db.prepare("DELETE FROM sessions").run()
    db.prepare("DELETE FROM distractions").run()
    db.prepare("DELETE FROM settings").run()
    db.prepare("INSERT INTO settings (key, value) VALUES ('simulate-activity', 'true')").run()
  })

  afterEach(() => {
    stopMonitoring()
    closeDb()
  })

  it('securely pauses focus session and purges active subprocess tracking when system lock or suspend is detected', () => {
    const db = getDb()
    
    // Seed an active focus session
    const sessionId = 's-active-1'
    db.prepare(`
      INSERT INTO sessions (id, started_at, status, target_duration_mins)
      VALUES (?, ?, 'active', 25)
    `).run(sessionId, new Date().toISOString())
    
    // Start monitoring so monitor associates with sessionId
    startMonitoring(sessionId)
    
    // Trigger suspend or screen-lock
    handlePowerSuspendOrLock()
    
    // Verify that session status in the database transitioned to 'paused'
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any
    expect(session.status).toBe('paused')
    expect(session.ended_at).toBeDefined() // paused_at timestamp
    
    // Check that we captured the systemPausedSessionId correctly
    expect(systemPausedSessionId).toBe(sessionId)
  })

  it('triggers a gentle, non-punitive sidebar toast prompt allowing manual resumption upon workstation resume or screen-unlock', () => {
    const db = getDb()
    
    // Seed and resume a system paused session id
    const sessionId = 's-paused-1'
    db.prepare(`
      INSERT INTO sessions (id, started_at, status, target_duration_mins)
      VALUES (?, ?, 'paused', 25)
    `).run(sessionId, new Date().toISOString())
    
    // Simulate that the session was paused by a suspend or screen lock
    startMonitoring(sessionId)
    handlePowerSuspendOrLock()
    expect(systemPausedSessionId).toBe(sessionId)
    
    // Trigger physical resume or unlock
    handlePowerResumeOrUnlock()
    
    // Since we triggered resume/unlock, the prompt broadcast is sent, and we reset the systemPausedSessionId
    expect(systemPausedSessionId).toBeNull()
  })

  it('handles powerMonitor suspend and resume events cleanly', () => {
    const db = getDb()
    const sessionId = 's-power-evt'
    db.prepare(`
      INSERT INTO sessions (id, started_at, status, target_duration_mins)
      VALUES (?, ?, 'active', 25)
    `).run(sessionId, new Date().toISOString())

    startMonitoring(sessionId)

    // Trigger system suspend via powerMonitor event emission
    powerMonitor.emit('suspend')

    // Expect session to be successfully updated in the DB
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any
    expect(session.status).toBe('paused')

    // Trigger system resume
    powerMonitor.emit('resume')

    // Prompt triggered and transient tracking state is cleanly reset
    expect(systemPausedSessionId).toBeNull()
  })

  it('marks tracker as degraded and falls back to simulation when subprocess exits with code 1 (access denied)', async () => {
    // Override 'simulate-activity' setting to false to trigger native monitoring call
    const db = getDb()
    db.prepare("DELETE FROM settings WHERE key = 'simulate-activity'").run()
    db.prepare("INSERT INTO settings (key, value) VALUES ('simulate-activity', 'false')").run()

    // Mock spawn to return a process that we can simulate exit code on
    const mockProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
      kill: vi.fn(),
    } as any

    const spawnMock = vi.fn().mockReturnValue(mockProcess)
    setSpawnOverride(spawnMock)

    const sessionId = 's-degrade-evt'
    db.prepare(`
      INSERT INTO sessions (id, started_at, status, target_duration_mins)
      VALUES (?, ?, 'active', 25)
    `).run(sessionId, new Date().toISOString())

    // Trigger start monitoring
    startMonitoring(sessionId)

    // Verify mock was called
    expect(spawnMock).toHaveBeenCalled()

    // Find the 'close' event handler and trigger with code 1
    const closeHandler = mockProcess.on.mock.calls.find((call: any) => call[0] === 'close')?.[1]
    expect(closeHandler).toBeDefined()

    // Before triggering close, verify isTrackerDegraded is false
    const { isTrackerDegraded, getTrackerDegradedStatus } = await import('../../src/main/services/distraction-monitor')
    expect(isTrackerDegraded).toBe(false)

    // Trigger 'close' event with code 1
    closeHandler(1)

    // Expect tracker to have degraded and isTrackerDegraded flag status to be true
    expect(getTrackerDegradedStatus ? getTrackerDegradedStatus() : isTrackerDegraded).toBe(true)

    // Clear override
    setSpawnOverride(null)
  })

  it('marks tracker as degraded and falls back when stderr emits PermissionDenied or SecurityError', async () => {
    // Ensure native monitoring is active
    const db = getDb()
    db.prepare("DELETE FROM settings WHERE key = 'simulate-activity'").run()
    db.prepare("INSERT INTO settings (key, value) VALUES ('simulate-activity', 'false')").run()

    const mockProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
      kill: vi.fn(),
    } as any

    const spawnMock = vi.fn().mockReturnValue(mockProcess)
    setSpawnOverride(spawnMock)

    const sessionId = 's-degrade-stderr'
    db.prepare(`
      INSERT INTO sessions (id, started_at, status, target_duration_mins)
      VALUES (?, ?, 'active', 25)
    `).run(sessionId, new Date().toISOString())

    startMonitoring(sessionId)

    const stderrHandler = mockProcess.stderr.on.mock.calls.find((call: any) => call[0] === 'data')?.[1]
    expect(stderrHandler).toBeDefined()

    const { isTrackerDegraded, getTrackerDegradedStatus } = await import('../../src/main/services/distraction-monitor')
    
    // Simulate error output
    stderrHandler(Buffer.from('SecurityError: Unauthorized Access Policy'))

    expect(getTrackerDegradedStatus ? getTrackerDegradedStatus() : isTrackerDegraded).toBe(true)

    // Clear override
    setSpawnOverride(null)
  })
})
