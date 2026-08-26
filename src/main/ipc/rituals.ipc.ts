// src/main/ipc/rituals.ipc.ts
import { ipcMain } from 'electron'
import {
  saveRitualEntry,
  getRitualEntriesByDate,
  getRitualStreak,
  getWeeklyRitualSummary
} from '../db/rituals'
import { getCapacityToday } from '../services/scheduler'

export function registerRitualHandlers(): void {
  ipcMain.handle('rituals:save', async (_, type: 'morning' | 'evening', date: string, payloadJson: string) => {
    saveRitualEntry(type, date, payloadJson)
    return true
  })

  ipcMain.handle('rituals:getByDate', async (_, date: string) => {
    return getRitualEntriesByDate(date)
  })

  ipcMain.handle('rituals:getStreak', async () => {
    return getRitualStreak()
  })

  ipcMain.handle('rituals:getCapacityToday', async () => {
    return getCapacityToday()
  })

  ipcMain.handle('rituals:getWeeklySummary', async () => {
    return getWeeklyRitualSummary()
  })
}
