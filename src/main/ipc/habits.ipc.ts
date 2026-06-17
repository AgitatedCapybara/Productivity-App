import { ipcMain } from 'electron'
import {
  getAllHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  checkInHabit,
  uncheckInHabit,
  getHabitLogs
} from '../db/habits'

export function registerHabitHandlers(): void {
  ipcMain.handle('habits:getAll', async () => {
    return getAllHabits()
  })
  
  ipcMain.handle('habits:create', async (_, input: any) => {
    return createHabit(input)
  })
  
  ipcMain.handle('habits:update', async (_, input: any) => {
    return updateHabit(input)
  })
  
  ipcMain.handle('habits:delete', async (_, id: string) => {
    return deleteHabit(id)
  })

  ipcMain.handle('habits:checkIn', async (_, { habitId, date }: { habitId: string; date: string }) => {
    return checkInHabit(habitId, date)
  })

  ipcMain.handle('habits:uncheckIn', async (_, { habitId, date }: { habitId: string; date: string }) => {
    return uncheckInHabit(habitId, date)
  })

  ipcMain.handle('habits:getLogs', async (_, { habitId }: { habitId?: string }) => {
    return getHabitLogs(habitId)
  })
}
