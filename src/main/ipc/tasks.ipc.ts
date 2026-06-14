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

function broadcastTasksChanged(senderWebContents?: Electron.WebContents) {
  try {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed() && win.webContents !== senderWebContents) {
        win.webContents.send('tasks:state-changed')
      }
    }
  } catch (err) {
    console.error('Failed to broadcast tasks change:', err)
  }
}

export function registerTaskHandlers() {
  ipcMain.handle('tasks:getAll', async () => getAllTasks())
  ipcMain.handle('tasks:getDeleted', async () => getDeletedTasks())
  ipcMain.handle('tasks:purgeDeleted', async (event) => {
    const result = purgeAllDeletedTasks()
    broadcastTasksChanged(event.sender)
    return result
  })
  ipcMain.handle('tasks:getDueToday', async () => getTasksDueToday())
  ipcMain.handle('tasks:getUpcoming', async () => getTasksUpcoming())
  ipcMain.handle('tasks:getForToday', async () => getTasksForToday())
  ipcMain.handle('tasks:getTodayCompleted', async () => getTodayCompletedTasks())
  ipcMain.handle('tasks:getByProject', async (_, projectId: string) => getTasksByProject(projectId))
  
  ipcMain.handle('tasks:create', async (event, input: CreateTaskInput) => {
    const result = createTask(input)
    broadcastTasksChanged(event.sender)
    return result
  })
  ipcMain.handle('tasks:update', async (event, input: UpdateTaskInput) => {
    const result = updateTask(input)
    broadcastTasksChanged(event.sender)
    return result
  })
  
  ipcMain.handle('tasks:delete', async (event, id: string) => {
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
    const result = deleteTask(id)
    broadcastTasksChanged(event.sender)
    return result
  })
  
  ipcMain.handle('tasks:reorder', async (event, ids: string[]) => {
    const result = reorderTasks(ids)
    broadcastTasksChanged(event.sender)
    return result
  })
  ipcMain.handle('tasks:complete', async (event, id: string) => {
    const result = completeTask(id)
    broadcastTasksChanged(event.sender)
    return result
  })
}