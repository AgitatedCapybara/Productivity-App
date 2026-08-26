// src/main/ipc/templates.ipc.ts
import { ipcMain } from 'electron'
import {
  createTemplate,
  listTemplates,
  deleteTemplate,
  applyTemplate
} from '../db/templates'

export function registerTemplateHandlers(): void {
  ipcMain.handle('templates:create', async (_, name: string, payloadJson: string) => {
    return createTemplate(name, payloadJson)
  })

  ipcMain.handle('templates:list', async () => {
    return listTemplates()
  })

  ipcMain.handle('templates:delete', async (_, id: string) => {
    deleteTemplate(id)
    return true
  })

  ipcMain.handle('templates:apply', async (_, id: string) => {
    return applyTemplate(id)
  })
}
