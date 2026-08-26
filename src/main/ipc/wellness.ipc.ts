// src/main/ipc/wellness.ipc.ts
import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as fs from 'fs'
import { 
  getWellnessSignals, 
  dismissWellnessSignal, 
  resetDismissedSignals, 
  exportWellnessDataToJSON,
  getWellnessAnalytics
} from '../services/wellness'

export function registerWellnessHandlers(): void {
  // Get active wellness signals matching heuristics (with emission frequency limiting)
  ipcMain.handle('wellness:getSignals', async () => {
    return getWellnessSignals()
  })

  // Dismiss a specific wellness signal
  ipcMain.handle('wellness:dismissSignal', async (_, signalId: string) => {
    dismissWellnessSignal(signalId)
    return { success: true }
  })

  // Reset all dismissals
  ipcMain.handle('wellness:resetDismissed', async () => {
    resetDismissedSignals()
    return { success: true }
  })

  // Export wellness logs data to JSON with user consent via Electron save dialog
  ipcMain.handle('wellness:export', async () => {
    const rawJson = exportWellnessDataToJSON()
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (!focusedWindow) {
      return { success: false, error: 'No focused window found' }
    }

    const { filePath, canceled } = await dialog.showSaveDialog(focusedWindow, {
      title: 'Export Local Wellness & Deep Work History',
      defaultPath: 'keystone-wellness-export.json',
      filters: [
        { name: 'JSON files', extensions: ['json'] }
      ]
    })

    if (canceled || !filePath) {
      return { success: false, canceled: true }
    }

    try {
      fs.writeFileSync(filePath, rawJson, 'utf-8')
      return { success: true, filePath }
    } catch (err: any) {
      console.error('Failed to write exported safety wellness data to disk:', err)
      return { success: false, error: err.message || 'Write error' }
    }
  })

  // Get deep work and focused session analytical aggregate bundle with constructive positive framing
  ipcMain.handle('wellness:getAnalytics', async () => {
    return getWellnessAnalytics()
  })
}
