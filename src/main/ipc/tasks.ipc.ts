// src/main/ipc/tasks.ipc.ts
import { ipcMain, BrowserWindow } from 'electron'
import {
  getAllTasks,
  getDeletedTasks,
  getTasksDueToday,
  getTasksUpcoming,
  getTasksForToday,
  getTodayCompletedTasks,
  getTasksByProject,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  completeTask,
  purgeAllDeletedTasks
} from '../db/tasks'
import { getActiveSession, endSession } from '../db/sessions'
import { stopMonitoring } from '../services/distraction-monitor'
import type { CreateTaskInput, UpdateTaskInput } from '../db/schema'

export function registerTaskHandlers() {
  ipcMain.handle('tasks:getAll', async () => getAllTasks())
  ipcMain.handle('tasks:getDeleted', async () => getDeletedTasks())
  ipcMain.handle('tasks:purgeDeleted', async () => purgeAllDeletedTasks())
  ipcMain.handle('tasks:getDueToday', async () => getTasksDueToday())
  ipcMain.handle('tasks:getUpcoming', async () => getTasksUpcoming())
  ipcMain.handle('tasks:getForToday', async () => getTasksForToday())
  ipcMain.handle('tasks:getTodayCompleted', async () => getTodayCompletedTasks())
  ipcMain.handle('tasks:getByProject', async (_, projectId: string) => getTasksByProject(projectId))
  
  ipcMain.handle('tasks:create', async (_, input: CreateTaskInput) => createTask(input))
  ipcMain.handle('tasks:update', async (_, input: UpdateTaskInput) => updateTask(input))
  
  ipcMain.handle('tasks:delete', async (_, id: string) => {
    // 1. Prevent running session continuing forever: check if there's an active session matching the task
    try {
      const active = getActiveSession()
      if (active && active.task_id === id) {
        stopMonitoring()
        endSession(active.id)
        
        // Notify windows of the change immediately
        const windows = BrowserWindow.getAllWindows()
        for (const win of windows) {
          if (!win.isDestroyed()) {
            win.webContents.send('session:state-changed')
          }
        }
      }
    } catch (err) {
      console.error('Failed to auto-cleanup active session during task deletion:', err)
    }

    // 2. Perform task deletion
    return deleteTask(id)
  })
  
  ipcMain.handle('tasks:reorder', async (_, ids: string[]) => reorderTasks(ids))
  ipcMain.handle('tasks:complete', async (_, id: string) => completeTask(id))
}