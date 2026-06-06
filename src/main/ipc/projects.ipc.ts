import { ipcMain } from 'electron'
import {
  getAllProjects,
  createProject,
  updateProject,
  deleteProject
} from '../db/projects'
import type { Project } from '../db/schema'

export function registerProjectHandlers() {
  ipcMain.handle('projects:getAll', async () => getAllProjects())
  
  ipcMain.handle('projects:create', async (_, input: Omit<Project, 'id' | 'created_at'>) => 
    createProject(input)
  )
  
  ipcMain.handle('projects:update', async (_, id: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>) => 
    updateProject(id, updates)
  )
  
  ipcMain.handle('projects:delete', async (_, id: string) => 
    deleteProject(id)
  )
}
