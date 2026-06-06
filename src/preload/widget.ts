// src/preload/widget.ts
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getTasks: () => ipcRenderer.invoke('tasks:getAll'),
  getTasksDueToday: () => ipcRenderer.invoke('tasks:getDueToday'),
  completeTask: (id: string) => ipcRenderer.invoke('tasks:complete', id),
  createTask: (input: any) => ipcRenderer.invoke('tasks:create', input),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electronAPI = api
}
