// src/main/services/backup.ts
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { app, dialog } from 'electron'
import { getDb, closeDb } from '../db/database'
import { logAuditEvent } from '../db/audit'
import { getSetting, setSetting } from '../db/settings'

// Standard AES-256-GCM constants
const ALGORITHM = 'aes-256-gcm'

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(passphrase, salt, 200000, 32, 'sha256')
}

export interface DbStats {
  tasksCount: number
  projectsCount: number
  habitsCount: number
  sessionsCount: number
  notesCount: number
  dbPath: string
  dbSizeKb: number
  lastBackupDate: string
}

export function getDbStats(): DbStats {
  const db = getDb()
  const dbPath = db.name

  let tasksCount = 0
  let projectsCount = 0
  let habitsCount = 0
  let sessionsCount = 0
  let notesCount = 0

  try {
    tasksCount = (db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status != "deleted"').get() as any).count
    projectsCount = (db.prepare('SELECT COUNT(*) as count FROM projects').get() as any).count
    habitsCount = (db.prepare('SELECT COUNT(*) as count FROM habits').get() as any).count
    sessionsCount = (db.prepare('SELECT COUNT(*) as count FROM sessions').get() as any).count
    notesCount = (db.prepare('SELECT COUNT(*) as count FROM notes WHERE archived = 0').get() as any).count
  } catch (err) {
    console.error('Failed to query counts for stats:', err)
  }

  let dbSizeKb = 0
  try {
    if (fs.existsSync(dbPath)) {
      const stat = fs.statSync(dbPath)
      dbSizeKb = Math.round(stat.size / 1024)
    }
  } catch (e) {
    console.error(e)
  }

  let lastBackupDate = 'Never'
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'vault.last_backup_at'").get() as { value: string } | undefined
    if (row) lastBackupDate = row.value
  } catch (_) {}

  return {
    tasksCount,
    projectsCount,
    habitsCount,
    sessionsCount,
    notesCount,
    dbPath,
    dbSizeKb,
    lastBackupDate
  }
}

/**
 * Standard dynamic salt encryption for manual and scheduler backdoors
 */
export function encryptBuffer(data: Buffer, passphrase?: string): Buffer {
  const salt = crypto.randomBytes(16)
  const key = deriveKey(passphrase || 'keystone-exclusive-offline-secret-auto', salt)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()])
  const tag = cipher.getAuthTag()
  
  // Format: Magic 'KEYSTONE' (8-bytes) | Salt (16-bytes) | IV (12-bytes) | Tag (16-bytes) | ciphertext
  const magic = Buffer.from('KEYSTONE')
  return Buffer.concat([magic, salt, iv, tag, ciphertext])
}

export function decryptBuffer(payload: Buffer, passphrase?: string): Buffer {
  if (payload.length < 52) {
    throw new Error('Malformed backup payload: file size is too small')
  }
  const magic = payload.subarray(0, 8).toString()
  if (magic !== 'KEYSTONE') {
    throw new Error('Invalid format: magic header mismatch')
  }
  const salt = payload.subarray(8, 24)
  const iv = payload.subarray(24, 36)
  const tag = payload.subarray(36, 52)
  const ciphertext = payload.subarray(52)
  
  const key = deriveKey(passphrase || 'keystone-exclusive-offline-secret-auto', salt)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

export async function backupDatabase(passphrase: string, targetPath?: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const db = getDb()
    const dbPath = db.name

    if (!fs.existsSync(dbPath)) {
      return { success: false, error: 'Database file does not exist yet.' }
    }

    let filePath = targetPath
    if (!filePath) {
      const result = await dialog.showSaveDialog({
        title: 'Backup Local Privacy Vault',
        defaultPath: path.join(app.getPath('downloads'), `keystone-backup-${Date.now()}.keystone-backup`),
        filters: [{ name: 'Keystone Backup Files', extensions: ['keystone-backup'] }]
      })

      if (result.canceled || !result.filePath) {
        return { success: false }
      }
      filePath = result.filePath
    }

    // Flush WAL log entries to the main app.db before copying buffer
    db.pragma('wal_checkpoint(TRUNCATE)')

    // Read canonical database bytes
    const dbBytes = fs.readFileSync(dbPath)

    // Complete symmetric payload
    const backupPayload = encryptBuffer(dbBytes, passphrase)

    fs.writeFileSync(filePath, backupPayload)

    // Update last backup date in database Settings
    const lastBackupStr = new Date().toLocaleString()
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('vault.last_backup_at', ?)").run(lastBackupStr)

    // Log the backup creation in audit log
    logAuditEvent('backup_created_manual', 'database', null, { filePath })

    return { success: true, filePath }
  } catch (err: any) {
    console.error('Backup operation aborted:', err)
    return { success: false, error: err.message || 'Encryption failure' }
  }
}

export async function verifyBackup(passphrase: string, filePath: string): Promise<{ success: boolean; authenticated: boolean; error?: string }> {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, authenticated: false, error: 'File path does not exist.' }
    }

    const payload = fs.readFileSync(filePath)
    if (payload.length < 52) {
      return { success: false, authenticated: false, error: 'Malformed backup file size. Integrity validation check failed.' }
    }

    const decrypted = decryptBuffer(payload, passphrase)
    const sqliteHeader = decrypted.subarray(0, 15).toString()
    if (sqliteHeader === 'SQLite format 3') {
      return { success: true, authenticated: true }
    } else {
      return { success: false, authenticated: false, error: 'Decrypted bytes did not contain valid SQLite header.' }
    }
  } catch (err: any) {
    return { success: false, authenticated: false, error: err.message || 'Incorrect passphrase or corrupted payload.' }
  }
}

export async function restoreDatabase(passphrase: string, targetPath?: string): Promise<{ success: boolean; error?: string }> {
  try {
    let filePath = targetPath
    if (!filePath) {
      const { filePaths, canceled } = await dialog.showOpenDialog({
        title: 'Restore Local Privacy Vault',
        filters: [{ name: 'Keystone Backup Files', extensions: ['keystone-backup'] }],
        properties: ['openFile']
      })

      if (canceled || filePaths.length === 0) {
        return { success: false }
      }
      filePath = filePaths[0]
    }

    // Run verification first to uphold strict integrity parameters!
    const integrityCheck = await verifyBackup(passphrase, filePath)
    if (!integrityCheck.success || !integrityCheck.authenticated) {
      return { success: false, error: integrityCheck.error || 'Integrity checked: Invalid passphrase or signature mismatch.' }
    }

    const payload = fs.readFileSync(filePath)
    const decryptedDb = decryptBuffer(payload, passphrase)

    // Decryption successful. Gracefully disconnect the active DB and replace the physical file.
    const activeDb = getDb()
    const activeDbPath = activeDb.name

    closeDb()

    // Overwrite the database
    fs.writeFileSync(activeDbPath, decryptedDb)

    // Delete WAL leftovers to ensure pristine clean reload from the new db content
    try {
      if (fs.existsSync(activeDbPath + '-wal')) fs.unlinkSync(activeDbPath + '-wal')
      if (fs.existsSync(activeDbPath + '-shm')) fs.unlinkSync(activeDbPath + '-shm')
    } catch (_) {}

    // Boot back SQLITE instance
    getDb()

    // Record the restore success event
    logAuditEvent('restore_success_manual', 'database', null, { filePath })

    return { success: true }
  } catch (err: any) {
    console.error('Restore operation aborted:', err)
    return { success: false, error: err.message || 'Signature mismatch or corrupted file payload.' }
  }
}

export async function exportAllDataJson(): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const db = getDb()
    const schemaTables = ['tasks', 'projects', 'habits', 'sessions', 'notes', 'view_presets', 'actions', 'audit_log']
    const exportData: Record<string, any[]> = {}

    schemaTables.forEach(table => {
      try {
        exportData[table] = db.prepare(`SELECT * FROM ${table}`).all()
      } catch (_) {
        exportData[table] = []
      }
    })

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export All Data',
      defaultPath: path.join(app.getPath('downloads'), `keystone-data-export-${Date.now()}.json`),
      filters: [{ name: 'JSON Dataset Files', extensions: ['json'] }]
    })

    if (canceled || !filePath) {
      return { success: false }
    }

    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8')

    // Print audit trace of user-triggered data export
    logAuditEvent('data_export_json', 'system', null, { filePath })

    return { success: true, filePath }
  } catch (err: any) {
    console.error('JSON export error:', err)
    return { success: false, error: err.message || 'Failed to print serializable records.' }
  }
}

export async function wipeAllDatabaseData(): Promise<{ success: boolean }> {
  try {
    const db = getDb()
    const tables = [
      'tasks', 'projects', 'habits', 'sessions', 'notes', 'card_placements', 
      'actions', 'audit_log', 'suggestions', 'friend_stats_cache', 'friends', 
      'ritual_entries', 'distractions', 'calendar_events', 'task_templates'
    ]

    tables.forEach(table => {
      try {
        db.prepare(`DELETE FROM ${table}`).run()
      } catch (e) {
        console.error(`Wipe table failure on ${table}:`, e)
      }
    })

    // Seed default projects since they are required for app lifecycle
    try {
      const insertDefaultProject = db.prepare(`
        INSERT OR IGNORE INTO projects (id, name, color, icon, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `)
      insertDefaultProject.run('inbox-default', 'Inbox', '#6366f1', 'inbox', 0)
    } catch (_) {}

    // Optimize page layouts and shrink sqlite file size
    db.pragma('wal_checkpoint(TRUNCATE)')
    db.exec('VACUUM;')

    // Write audit event inside fresh database log trail
    logAuditEvent('factory_reset_wipe', 'database', null, { userInitiated: true })

    return { success: true }
  } catch (err) {
    console.error('Factory reset failure:', err)
    return { success: false }
  }
}

/**
 * Weekly rotating retention auto-backup rotation engine:
 * Keeps last 4 weekly and last 3 monthly files
 */
export function pruneRotatedBackups(backupDir: string): void {
  try {
    if (!fs.existsSync(backupDir)) return
    const files = fs.readdirSync(backupDir)
    
    // Process weekly auto backups
    const weeklyFiles = files
      .filter(f => f.startsWith('keystone-auto-weekly-') && f.endsWith('.keystone-backup'))
      .map(f => path.join(backupDir, f))
      .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs) // oldest first
      
    while (weeklyFiles.length > 4) {
      const oldest = weeklyFiles.shift()
      if (oldest) {
        try { fs.unlinkSync(oldest) } catch (_) {}
      }
    }

    // Process monthly auto backups
    const monthlyFiles = files
      .filter(f => f.startsWith('keystone-auto-monthly-') && f.endsWith('.keystone-backup'))
      .map(f => path.join(backupDir, f))
      .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs)

    while (monthlyFiles.length > 3) {
      const oldest = monthlyFiles.shift()
      if (oldest) {
        try { fs.unlinkSync(oldest) } catch (_) {}
      }
    }
  } catch (err) {
    console.error('Failed to prune rotated backups:', err)
  }
}

/**
 * Checks and runs background automatic backup scheduler based on frequency settings
 */
export function checkAndRunAutoBackup(): void {
  try {
    const isEnabled = getSetting('backup.auto.enabled', 'false') === 'true'
    if (!isEnabled) return

    const backupDir = getSetting('backup.auto.path', '')
    if (!backupDir || !fs.existsSync(backupDir)) {
      console.warn('Keystone Auto-backup: Target directory does not exist or empty:', backupDir)
      return
    }

    const frequency = getSetting('backup.auto.frequency', 'weekly') // 'weekly' or 'monthly'
    const lastRunStr = getSetting('backup.auto.last_run', '')
    const now = new Date()

    let shouldRun = false
    let type: 'weekly' | 'monthly' = 'weekly'

    if (!lastRunStr) {
      shouldRun = true
    } else {
      const lastRun = new Date(lastRunStr)
      const diffMs = now.getTime() - lastRun.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)

      if (frequency === 'monthly') {
        type = 'monthly'
        if (diffDays >= 30) shouldRun = true
      } else {
        type = 'weekly'
        if (diffDays >= 7) shouldRun = true
      }
    }

    if (shouldRun) {
      const db = getDb()
      const dbPath = db.name
      db.pragma('wal_checkpoint(TRUNCATE)')
      const dbBytes = fs.readFileSync(dbPath)
      
      const payload = encryptBuffer(dbBytes, undefined) // encrypt using auto-backup offline key block
      const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
      const filename = `keystone-auto-${type}-${dateStr}.keystone-backup`
      const targetFilePath = path.join(backupDir, filename)

      fs.writeFileSync(targetFilePath, payload)
      
      // Update scheduler settings
      setSetting('backup.auto.last_run', now.toISOString())
      
      // Rotate backup limits
      pruneRotatedBackups(backupDir)
      
      // Log event
      logAuditEvent('backup_auto_success', 'database', null, { 
        filePath: targetFilePath, 
        type, 
        frequency 
      })
      console.log(`Keystone Scheduler: Successfully created rotated auto-backup: ${filename}`)
    }
  } catch (err: any) {
    console.error('Auto backup execution failure:', err)
    logAuditEvent('backup_auto_failure', 'database', null, { error: err.message || 'Unknown scheduler error' })
  }
}

/**
 * Initializes background auto-backup scheduler inside the Electron main process cycle
 */
export function startAutoBackupScheduler(): void {
  // Let the system settle, run first scan 15 seconds after app starts
  setTimeout(() => {
    checkAndRunAutoBackup()
  }, 15000)

  // Scan settings hourly in the background
  setInterval(() => {
    checkAndRunAutoBackup()
  }, 60 * 60 * 1000)
}
