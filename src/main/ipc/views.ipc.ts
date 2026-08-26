// src/main/ipc/views.ipc.ts
import { ipcMain } from 'electron'
import {
  listViews,
  createView,
  updateView,
  deleteView,
  getViewData,
  saveCardPlacement,
  deleteCardPlacement,
  listActions,
  createAction,
  updateAction,
  deleteAction
} from '../services/views'

export function registerViewsHandlers(): void {
  ipcMain.handle('views:list', async () => {
    return listViews()
  })

  ipcMain.handle('views:create', async (_event, preset) => {
    return createView(preset)
  })

  ipcMain.handle('views:update', async (_event, id, updates) => {
    return updateView(id, updates)
  })

  ipcMain.handle('views:delete', async (_event, id) => {
    return deleteView(id)
  })

  ipcMain.handle('views:getData', async (_event, viewId) => {
    return getViewData(viewId)
  })

  ipcMain.handle('views:savePlacement', async (_event, placement) => {
    saveCardPlacement(placement)
    return { success: true }
  })

  ipcMain.handle('views:deletePlacement', async (_event, noteId, viewId) => {
    deleteCardPlacement(noteId, viewId)
    return { success: true }
  })

  // Actions
  ipcMain.handle('actions:list', async () => {
    return listActions()
  })

  ipcMain.handle('actions:create', async (_event, action) => {
    return createAction(action)
  })

  ipcMain.handle('actions:update', async (_event, id, updates) => {
    return updateAction(id, updates)
  })

  ipcMain.handle('actions:delete', async (_event, id) => {
    deleteAction(id)
    return { success: true }
  })
}
