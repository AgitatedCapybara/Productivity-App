// src/main/ipc/scheduler.ipc.ts
import { ipcMain } from 'electron'
import {
  generateSuggestionsController,
  acceptSuggestionController,
  declineSuggestionController,
  declineAllSuggestionsController,
  snoozeSuggestionController,
  adjustAndAcceptSuggestionController,
  getAllSchedulingPrefsInDb,
  updateSchedulingPrefsInDb
} from '../services/scheduler'

export function registerSchedulerHandlers(): void {
  ipcMain.handle('scheduler:generate', async () => {
    return generateSuggestionsController()
  })

  ipcMain.handle('scheduler:accept', async (_, id: string) => {
    return acceptSuggestionController(id)
  })

  ipcMain.handle('scheduler:decline', async (_, id: string) => {
    return declineSuggestionController(id)
  })

  ipcMain.handle('scheduler:declineAll', async () => {
    return declineAllSuggestionsController()
  })

  ipcMain.handle('scheduler:snooze', async (_, id: string, until: string) => {
    return snoozeSuggestionController(id, until)
  })

  ipcMain.handle('scheduler:adjust', async (_, id: string, newStart: string, newEnd: string) => {
    return adjustAndAcceptSuggestionController(id, newStart, newEnd)
  })

  ipcMain.handle('scheduler:getPreferences', async () => {
    return getAllSchedulingPrefsInDb()
  })

  ipcMain.handle('scheduler:updatePreferences', async (_, prefs: Record<string, string>) => {
    updateSchedulingPrefsInDb(prefs)
    return true
  })
}
