import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { runMigrations } from './migrations'

// We use `any` here or type it to allow keeping the same type shape.
// The true type is `import('better-sqlite3').Database`.
let dbInstance: any = null

export function getDb(): import('better-sqlite3').Database {
  if (dbInstance) {
    return dbInstance
  }

  const dbPath = process.env.NODE_ENV === 'development' 
    ? 'dev.sqlite' 
    : join(app.getPath('userData'), 'app.db')

  dbInstance = new Database(dbPath)

  dbInstance.pragma('journal_mode = WAL')
  dbInstance.pragma('busy_timeout = 5000')
  dbInstance.pragma('foreign_keys = ON')

  // Run migrations
  runMigrations(dbInstance)

  return dbInstance
}

process.on('exit', () => {
  if (dbInstance) {
    dbInstance.close()
  }
})
