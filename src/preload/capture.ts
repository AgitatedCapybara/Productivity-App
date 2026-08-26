// src/preload/capture.ts
import { contextBridge, ipcRenderer } from 'electron'

const captureAPI = {
  createTask: (title: string, extra?: any) => ipcRenderer.invoke('tasks:create', { title, ...extra }),
  closeWindow: () => ipcRenderer.invoke('capture:close'),
  getProjects: () => ipcRenderer.invoke('projects:getAll'),
  getHabits: () => ipcRenderer.invoke('habits:getAll'),
  listTemplates: () => ipcRenderer.invoke('templates:list'),
  applyTemplate: (id: string) => ipcRenderer.invoke('templates:apply', id)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', captureAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in global)
  window.electronAPI = captureAPI as any
}
    