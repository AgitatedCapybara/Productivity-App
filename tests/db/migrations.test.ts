// tests/db/migrations.test.ts
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'

describe('SQLite Migrations System', () => {
  it('applies all migrations incrementally to a clean database sandbox', () => {
    // Open a completely vanilla, empty database in memory
    const db = new Database(':memory:')
    
    // Query initial user_version (should be 0)
    let versionRow = db.prepare('PRAGMA user_version').get() as { user_version: number }
    expect(versionRow.user_version).toBe(0)

    // Execute migrations
    expect(() => runMigrations(db)).not.toThrow()

    // Query final user_version (should be > 0, indicating schema advancement)
    versionRow = db.prepare('PRAGMA user_version').get() as { user_version: number }
    expect(versionRow.user_version).toBeGreaterThanOrEqual(1)

    // Inspect list of tables in sqlite_master to verify structural compliance
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
    const tableNames = tables.map(t => t.name)

    expect(tableNames).toContain('projects')
    expect(tableNames).toContain('tasks')
    expect(tableNames).toContain('sessions')
    expect(tableNames).toContain('habits')
    expect(tableNames).toContain('settings')
    expect(tableNames).toContain('calendar_events')
    
    db.close()
  })
})
