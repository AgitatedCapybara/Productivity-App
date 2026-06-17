// src/main/ipc/events.ipc.ts
import { ipcMain } from 'electron'
import {
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent
} from '../db/events'

export function registerEventHandlers(): void {
  ipcMain.handle('events:getAll', async () => {
    return getAllEvents()
  })

  ipcMain.handle('events:create', async (_, input: any) => {
    return createEvent(input)
  })

  ipcMain.handle('events:update', async (_, input: any) => {
    return updateEvent(input)
  })

  ipcMain.handle('events:delete', async (_, id: string) => {
    return deleteEvent(id)
  })
}
