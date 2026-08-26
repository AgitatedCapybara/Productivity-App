// src/main/ipc/backup.ipc.ts
import { ipcMain } from 'electron'
import {
  getDbStats,
  backupDatabase,
  restoreDatabase,
  exportAllDataJson,
  wipeAllDatabaseData,
  verifyBackup
} from '../services/backup'
import { getAuditLogs } from '../db/audit'

export function registerBackupHandlers(): void {
  ipcMain.handle('backup:getStats', async () => {
    return getDbStats()
  })

  ipcMain.handle('backup:run', async (_event, passphrase?: string, targetPath?: string) => {
    return backupDatabase(passphrase || 'keystone-exclusive-offline-secret-auto', targetPath)
  })

  ipcMain.handle('backup:restore', async (_event, passphrase?: string, targetPath?: string) => {
    return restoreDatabase(passphrase || 'keystone-exclusive-offline-secret-auto', targetPath)
  })

  ipcMain.handle('backup:verify', async (_event, passphrase?: string, targetPath?: string) => {
    if (!passphrase || !targetPath) {
      return { success: false, authenticated: false, error: 'Passphrase and file path are required for verification.' }
    }
    return verifyBackup(passphrase, targetPath)
  })

  // Explicit mapping of export all data as json
  ipcMain.handle('backup:exportJson', async () => {
    return exportAllDataJson()
  })

  ipcMain.handle('backup:wipe', async () => {
    return wipeAllDatabaseData()
  })

  // Read-only access to local privacy audit logs
  ipcMain.handle('audit:getLogs', async () => {
    return getAuditLogs()
  })
}
