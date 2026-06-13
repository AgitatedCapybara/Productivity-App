// src/main/ipc/settings.ipc.ts
import { ipcMain } from 'electron'
import { getSetting, setSetting } from '../db/settings'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async (_event: unknown, key: string, defaultValue: string): Promise<string> => {
    return getSetting(key, defaultValue)
  })

  ipcMain.handle('settings:set', async (_event: unknown, key: string, value: string): Promise<boolean> => {
    setSetting(key, value)
    return true
  })
}

