// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  getTasks: () => ipcRenderer.invoke('tasks:getAll'),
  getTasksDueToday: () => ipcRenderer.invoke('tasks:getDueToday'),
  getTasksUpcoming: () => ipcRenderer.invoke('tasks:getUpcoming'),
  getTasksForToday: () => ipcRenderer.invoke('tasks:getForToday'),
  getTodayCompletedTasks: () => ipcRenderer.invoke('tasks:getTodayCompleted'),
  getTasksByProject: (id: string) => ipcRenderer.invoke('tasks:getByProject', id),
  createTask: (input: any) => ipcRenderer.invoke('tasks:create', input),
  updateTask: (input: any) => ipcRenderer.invoke('tasks:update', input),
  deleteTask: (id: string) => ipcRenderer.invoke('tasks:delete', id),
  reorderTasks: (ids: string[]) => ipcRenderer.invoke('tasks:reorder', ids),
  completeTask: (id: string) => ipcRenderer.invoke('tasks:complete', id),
  
  getProjects: () => ipcRenderer.invoke('projects:getAll'),
  createProject: (input: any) => ipcRenderer.invoke('projects:create', input),
  updateProject: (id: string, updates: any) => ipcRenderer.invoke('projects:update', id, updates),
  deleteProject: (id: string) => ipcRenderer.invoke('projects:delete', id),
  
  getHabits: () => ipcRenderer.invoke('habits:getAll'),
  createHabit: (input: any) => ipcRenderer.invoke('habits:create', input),
  updateHabit: (input: any) => ipcRenderer.invoke('habits:update', input),
  deleteHabit: (id: string) => ipcRenderer.invoke('habits:delete', id),
  
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  
  onGlobalShortcutTriggered: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('global-shortcut:quick-add', handler)
    return () => ipcRenderer.removeListener('global-shortcut:quick-add', handler)
  },
  
  onFocusSessionStarted: (cb: (sessionId: string) => void) => {
    const handler = (_: any, sessionId: string) => cb(sessionId)
    ipcRenderer.on('focus-session:started', handler)
    return () => ipcRenderer.removeListener('focus-session:started', handler)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
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
