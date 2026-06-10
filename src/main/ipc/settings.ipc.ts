// src/main/ipc/settings.ipc.ts
import { ipcMain } from 'electron'
import { getSetting, setSetting } from '../db/settings'

export function registerSettingsHandlers() {
  ipcMain.handle('settings:get', async (_, key: string, defaultValue: string) => {
    return getSetting(key, defaultValue)
  })

  ipcMain.handle('settings:set', async (_, key: string, value: string) => {
    setSetting(key, value)
    return true
  })
}
