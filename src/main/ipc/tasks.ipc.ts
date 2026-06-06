import { ipcMain } from 'electron'
import {
  getAllTasks,
  getTasksDueToday,
  getTasksUpcoming,
  getTasksForToday,
  getTodayCompletedTasks,
  getTasksByProject,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  completeTask
} from '../db/tasks'
import type { CreateTaskInput, UpdateTaskInput } from '../db/schema'

export function registerTaskHandlers() {
  ipcMain.handle('tasks:getAll', async () => getAllTasks())
  ipcMain.handle('tasks:getDueToday', async () => getTasksDueToday())
  ipcMain.handle('tasks:getUpcoming', async () => getTasksUpcoming())
  ipcMain.handle('tasks:getForToday', async () => getTasksForToday())
  ipcMain.handle('tasks:getTodayCompleted', async () => getTodayCompletedTasks())
  ipcMain.handle('tasks:getByProject', async (_, projectId: string) => getTasksByProject(projectId))
  
  ipcMain.handle('tasks:create', async (_, input: CreateTaskInput) => createTask(input))
  ipcMain.handle('tasks:update', async (_, input: UpdateTaskInput) => updateTask(input))
  ipcMain.handle('tasks:delete', async (_, id: string) => deleteTask(id))
  ipcMain.handle('tasks:reorder', async (_, ids: string[]) => reorderTasks(ids))
  ipcMain.handle('tasks:complete', async (_, id: string) => completeTask(id))
}
