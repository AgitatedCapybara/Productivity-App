// src/main/db/settings.ts
import { getDb } from './database'

export function getSetting(key: string, defaultValue: string): string {
  try {
    const db = getDb()
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?')
    const row = stmt.get(key) as { value: string } | undefined
    return row ? row.value : defaultValue
  } catch (err) {
    console.error(`Error getting setting for ${key}:`, err)
    return defaultValue
  }
}

export function setSetting(key: string, value: string): void {
  try {
    const db = getDb()
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    stmt.run(key, value)
  } catch (err) {
    console.error(`Error setting ${key}:`, err)
  }
}
