// src/main/ipc/search.ipc.ts
import { ipcMain } from 'electron'
import { querySearch } from '../db/search'

export function registerSearchHandlers(): void {
  ipcMain.handle('search:query', async (_event: unknown, searchText: string): Promise<any[]> => {
    return querySearch(searchText)
  })
}
