// src/main/ipc/perf.ipc.ts
import { ipcMain } from 'electron'
import { getPerfStats } from '../services/perf-monitor'
import { getDb } from '../db/database'

export function registerPerfHandlers(): void {
  ipcMain.handle('perf:getStats', async (): Promise<any> => {
    return getPerfStats()
  })

  ipcMain.handle('perf:runMaintenance', async (): Promise<boolean> => {
    try {
      const db = getDb()
      db.exec('VACUUM;')
      db.exec('ANALYZE;')
      return true
    } catch (err) {
      console.error('Manual vacuum failed:', err)
      return false
    }
  })
}
