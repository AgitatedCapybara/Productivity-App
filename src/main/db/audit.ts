// src/main/db/audit.ts
import { getDb } from './database'
import { nanoid } from 'nanoid'

export interface AuditLog {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  timestamp: string
  metadata_json: string
}

export function logAuditEvent(
  action: string,
  entityType: string,
  entityId: string | null = null,
  metadata: Record<string, any> = {}
): void {
  try {
    const db = getDb()
    const id = nanoid()
    const metadataStr = JSON.stringify(metadata)
    const timestamp = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO audit_log (id, action, entity_type, entity_id, timestamp, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    stmt.run(id, action, entityType, entityId, timestamp, metadataStr)

    // Run auto-pruning each time we log to keep the database small
    pruneAuditLogs()
  } catch (err) {
    console.error('Failed to write audit event:', err)
  }
}

export function getAuditLogs(): AuditLog[] {
  try {
    const db = getDb()
    const stmt = db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC')
    return stmt.all() as AuditLog[]
  } catch (err) {
    console.error('Failed to get audit logs:', err)
    return []
  }
}

export function pruneAuditLogs(): number {
  try {
    const db = getDb()
    // Prune entries older than 90 days
    const stmt = db.prepare(`
      DELETE FROM audit_log 
      WHERE datetime(timestamp) < datetime('now', '-90 days')
    `)
    const result = stmt.run()
    return result.changes
  } catch (err) {
    console.error('Failed to prune audit logs:', err)
    return 0
  }
}
