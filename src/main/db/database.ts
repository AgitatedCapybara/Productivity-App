import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { runMigrations } from './migrations'
import { logPerformance } from '../services/perf-monitor'

// We use `any` here or type it to allow keeping the same type shape.
// The true type is `import('better-sqlite3').Database`.
let dbInstance: any = null

export function checkpoint(): void {
  if (dbInstance) {
    try {
      dbInstance.pragma('wal_checkpoint(TRUNCATE)')
      console.log('[Keystone Service] Database WAL checkpoint completed (TRUNCATE).')
    } catch (err) {
      console.error('Failed to execute WAL checkpoint:', err)
    }
  }
}

export function getDb(): import('better-sqlite3').Database {
  if (dbInstance) {
    return dbInstance
  }

  let dbPath = 'dev.sqlite'
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    dbPath = ':memory:'
  } else if (process.env.NODE_ENV !== 'development') {
    dbPath = join(app.getPath('userData'), 'app.db')
  }

  let initialized = false
  let attempts = 0
  const maxAttempts = 2

  while (!initialized && attempts < maxAttempts) {
    attempts++
    try {
      dbInstance = new Database(dbPath)

      // Run integrity check
      let isCorrupt = false
      try {
        const checkResult = dbInstance.pragma('integrity_check') as any
        const isMockDB = dbInstance.constructor.name === 'MockDatabase' || 
                         (process.env.VITEST === 'true' && (!checkResult || Object.keys(checkResult).length === 0))
        let isOk = false
        if (isMockDB) {
          isOk = true
        } else {
          isOk = Array.isArray(checkResult) && checkResult.length === 1 && checkResult[0]?.integrity_check === 'ok'
        }
        if (!isOk) {
          isCorrupt = true
        }
      } catch (err) {
        console.error('Integrity check failed with error:', err)
        isCorrupt = true
      }

      if (isCorrupt) {
        throw new Error('Database integrity check failed')
      }

      initialized = true
    } catch (err) {
      console.error(`Database glass-box initialization attempt ${attempts} failed:`, err)
      
      // If we are in-memory, we can't rename anything, just throw/bubble
      if (dbPath === ':memory:') {
        throw err
      }

      // Close instance if it was created
      if (dbInstance) {
        try {
          dbInstance.close()
        } catch (_) {}
        dbInstance = null
      }

      if (attempts < maxAttempts) {
        // Try to rename corrupted file
        try {
          const corruptPath = dbPath + '.corrupt'
          console.warn(`Renaming corrupted database file from ${dbPath} to ${corruptPath}`)
          
          if (fs.existsSync(corruptPath)) {
            try { fs.unlinkSync(corruptPath) } catch (_) {}
          }
          if (fs.existsSync(dbPath)) {
            fs.renameSync(dbPath, corruptPath)
          }

          // Rename companion WAL and SHM files
          const walPath = dbPath + '-wal'
          if (fs.existsSync(walPath)) {
            try {
              if (fs.existsSync(walPath + '.corrupt')) {
                fs.unlinkSync(walPath + '.corrupt')
              }
              fs.renameSync(walPath, walPath + '.corrupt')
            } catch (_) {}
          }
          const shmPath = dbPath + '-shm'
          if (fs.existsSync(shmPath)) {
            try {
              if (fs.existsSync(shmPath + '.corrupt')) {
                fs.unlinkSync(shmPath + '.corrupt')
              }
              fs.renameSync(shmPath, shmPath + '.corrupt')
            } catch (_) {}
          }
        } catch (renameErr) {
          console.error('Failed to rename corrupted database files on disk:', renameErr)
        }
      } else {
        throw err
      }
    }
  }

  dbInstance.pragma('journal_mode = WAL')
  dbInstance.pragma('busy_timeout = 5000')
  dbInstance.pragma('foreign_keys = ON')

  // Run migrations
  runMigrations(dbInstance)

  // Run maintenance if necessary
  try {
    runScheduledMaintenance(dbInstance)
  } catch (err) {
    console.error('Scheduled database maintenance failed:', err)
  }

  // Inject performance metrics decoration
  try {
    const originalPrepare = dbInstance.prepare
    dbInstance.prepare = function (sql: string, ...prepArgs: any[]) {
      const stmt = originalPrepare.call(dbInstance, sql, ...prepArgs)
      
      const originalRun = stmt.run
      const originalGet = stmt.get
      const originalAll = stmt.all

      stmt.run = function (...args: any[]) {
        let telemetryEnabled = false
        try {
          // Use originalPrepare to avoid recursion
          const row = originalPrepare.call(dbInstance, "SELECT value FROM settings WHERE key = 'perf.telemetry.enabled'").get() as { value: string } | undefined
          telemetryEnabled = row?.value === 'true'
        } catch (_) {}

        if (!telemetryEnabled) {
          return originalRun.apply(stmt, args)
        }

        const start = process.hrtime.bigint()
        const result = originalRun.apply(stmt, args)
        const end = process.hrtime.bigint()
        logPerformance(sql, Number(end - start) / 1000000)
        return result
      }

      stmt.get = function (...args: any[]) {
        let telemetryEnabled = false
        try {
          // Use originalPrepare to avoid recursion
          const row = originalPrepare.call(dbInstance, "SELECT value FROM settings WHERE key = 'perf.telemetry.enabled'").get() as { value: string } | undefined
          telemetryEnabled = row?.value === 'true'
        } catch (_) {}

        if (!telemetryEnabled) {
          return originalGet.apply(stmt, args)
        }

        const start = process.hrtime.bigint()
        const result = originalGet.apply(stmt, args)
        const end = process.hrtime.bigint()
        logPerformance(sql, Number(end - start) / 1000000)
        return result
      }

      stmt.all = function (...args: any[]) {
        let telemetryEnabled = false
        try {
          // Use originalPrepare to avoid recursion
          const row = originalPrepare.call(dbInstance, "SELECT value FROM settings WHERE key = 'perf.telemetry.enabled'").get() as { value: string } | undefined
          telemetryEnabled = row?.value === 'true'
        } catch (_) {}

        if (!telemetryEnabled) {
          return originalAll.apply(stmt, args)
        }

        const start = process.hrtime.bigint()
        const result = originalAll.apply(stmt, args)
        const end = process.hrtime.bigint()
        logPerformance(sql, Number(end - start) / 1000000)
        return result
      }

      return stmt
    }
  } catch (err) {
    console.error('Failed to setup performance metrics interceptor:', err)
  }

  return dbInstance
}

export function closeDb(): void {
  if (dbInstance) {
    try {
      checkpoint()
    } catch (err) {
      console.error('Failed to checkpoint WAL on database close:', err)
    }
    try {
      dbInstance.close()
    } catch (err) {
      console.error('Failed to close database strictly:', err)
    }
    dbInstance = null
  }
}

function runScheduledMaintenance(db: import('better-sqlite3').Database): void {
  try {
    // Check if settings table exists first
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get()
    if (!tableExists) return

    const row = db.prepare("SELECT value FROM settings WHERE key = 'last_maintenance_at'").get() as { value: string } | undefined
    const now = Date.now()
    let shouldRun = false

    if (!row) {
      shouldRun = true
    } else {
      const lastRun = parseInt(row.value, 10)
      if (isNaN(lastRun) || now - lastRun > 7 * 24 * 60 * 60 * 1000) {
        shouldRun = true
      }
    }

    if (shouldRun) {
      console.log('[Keystone Service] Running database maintenance (VACUUM + ANALYZE)...')
      db.exec('VACUUM;')
      db.exec('ANALYZE;')
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_maintenance_at', ?)").run(now.toString())
      console.log('[Keystone Service] Database maintenance completed successfully.')
    }
  } catch (err) {
    console.error('[Keystone Service] Error during database maintenance:', err)
  }
}

process.on('exit', () => {
  if (dbInstance) {
    try {
      dbInstance.pragma('wal_checkpoint(TRUNCATE)')
    } catch (_) {}
    try {
      dbInstance.close()
    } catch (_) {}
  }
})

// Hook app lifecycle event when running in Electron
try {
  if (app && typeof app.on === 'function') {
    app.on('before-quit', () => {
      console.log('[Keystone Service] Electron before-quit event triggered, checkpointing DB.')
      checkpoint()
    })
  }
} catch (_) {
  // Safe fallback for testing or non-electron environments
}
