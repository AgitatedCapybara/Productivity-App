// src/main/ipc/settings.ipc.ts
import { ipcMain } from 'electron'
import { getSetting, setSetting } from '../db/settings'
import { getLocalErrorLog, clearLocalErrorLog, generateRedactedDiagnostics } from '../services/error-reporter'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async (_event: unknown, key: string, defaultValue: string): Promise<string> => {
    return getSetting(key, defaultValue)
  })

  ipcMain.handle('settings:set', async (_event: unknown, key: string, value: string): Promise<boolean> => {
    setSetting(key, value)
    return true
  })

  ipcMain.handle('settings:getFirstRunComplete', async (): Promise<boolean> => {
    const val = getSetting('app.first_run_complete', 'false')
    return val === 'true'
  })

  ipcMain.handle('settings:setFirstRunComplete', async (_event: unknown, complete: boolean): Promise<boolean> => {
    setSetting('app.first_run_complete', complete ? 'true' : 'false')
    return true
  })

  ipcMain.handle('errors:getLog', async (): Promise<string> => {
    return getLocalErrorLog()
  })

  ipcMain.handle('errors:clearLog', async (): Promise<boolean> => {
    return clearLocalErrorLog()
  })

  ipcMain.handle('errors:generateDiagnostics', async (): Promise<string> => {
    return generateRedactedDiagnostics()
  })
}


