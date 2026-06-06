import { ipcMain } from 'electron'
import {
  getAllHabits,
  createHabit,
  updateHabit,
  deleteHabit
} from '../db/habits'

export function registerHabitHandlers() {
  ipcMain.handle('habits:getAll', async () => getAllHabits())
  
  ipcMain.handle('habits:create', async (_, input: any) => 
    createHabit(input)
  )
  
  ipcMain.handle('habits:update', async (_, input: any) => 
    updateHabit(input)
  )
  
  ipcMain.handle('habits:delete', async (_, id: string) => 
    deleteHabit(id)
  )
}
