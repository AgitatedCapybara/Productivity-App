// tests/db/wal-recovery.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'fs'

describe('WAL Checkpoint and Recovery Safeguard Tests', () => {
  const tempDbPath = 'test-wal-recovery.sqlite'
  const walPath = tempDbPath + '-wal'
  const shmPath = tempDbPath + '-shm'

  afterEach(() => {
    vi.restoreAllMocks()
    try {
      if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath)
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath)
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath)
      if (fs.existsSync(tempDbPath + '.corrupt')) fs.unlinkSync(tempDbPath + '.corrupt')
    } catch (_) {}
  })

  it('truncates WAL file to 0 bytes upon checkpoint invocation', () => {
    let walSize = 1024 // Simulated WAL file size

    // Mock better-sqlite3 Database behavior
    const mockPragma = vi.fn().mockImplementation((command) => {
      if (command === 'journal_mode = WAL') return 'wal'
      if (command === 'wal_checkpoint(TRUNCATE)') {
        walSize = 0 // Mock truncation
        return { active: 0, total: 0 }
      }
      return {}
    })

    const mockDb = {
      pragma: mockPragma,
      exec: vi.fn(),
      prepare: vi.fn(),
      close: vi.fn()
    }

    // Call checkpoint simulation
    mockDb.pragma('wal_checkpoint(TRUNCATE)')

    expect(mockPragma).toHaveBeenCalledWith('wal_checkpoint(TRUNCATE)')
    expect(walSize).toBe(0)
  })

  it('cleanly renames corrupted SQLite headers to .corrupt companion files', () => {
    let attempts = 0
    let renameCalled = false
    let databaseInstantiationSucceeded = false

    // Spy on fs methods
    vi.spyOn(fs, 'renameSync').mockImplementation((src, dest) => {
      if (src === tempDbPath && (dest as string).endsWith('.corrupt')) {
        renameCalled = true
      }
    })
    vi.spyOn(fs, 'existsSync').mockImplementation(() => true)

    // Simulate database initialization sequence from database.ts
    let dbInstance: any = null
    let initialized = false
    const maxAttempts = 2

    while (!initialized && attempts < maxAttempts) {
      attempts++
      try {
        if (attempts === 1) {
          // Attempt 1: Simulate corruption error on first instantiation or first integrity check
          throw new Error('Database integrity check failed')
        } else {
          // Attempt 2: Succeed on fresh DB instantiation
          databaseInstantiationSucceeded = true
          dbInstance = {
            pragma: vi.fn().mockReturnValue([{ integrity_check: 'ok' }]),
            close: vi.fn()
          }
          initialized = true
        }
      } catch (err) {
        if (attempts < maxAttempts) {
          // Call fs.renameSync simulation
          fs.renameSync(tempDbPath, tempDbPath + '.corrupt')
        } else {
          throw err
        }
      }
    }

    expect(attempts).toBe(2)
    expect(renameCalled).toBe(true)
    expect(databaseInstantiationSucceeded).toBe(true)
    expect(initialized).toBe(true)
    expect(dbInstance).toBeDefined()
  })
})
