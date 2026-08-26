// src/preload/overlay.ts
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getTasks: () => ipcRenderer.invoke('tasks:getAll'),
  getTasksForToday: () => ipcRenderer.invoke('tasks:getForToday'),
  getActiveSession: () => ipcRenderer.invoke('focus-session:getActive'),
  completeTask: (id: string) => ipcRenderer.invoke('tasks:complete', id),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  pauseSession: () => ipcRenderer.invoke('focus-session:pause'),
  resumeSession: () => ipcRenderer.invoke('focus-session:resume'),
  stopSession: () => ipcRenderer.invoke('focus-session:stop'),
  onSessionTick: (callback: (elapsed: { seconds: number; distractionCount: number; targetDurationMins?: number }) => void) => {
    const handler = (_: any, elapsed: { seconds: number; distractionCount: number; targetDurationMins?: number }) => callback(elapsed)
    ipcRenderer.on('session:tick', handler)
    return () => ipcRenderer.removeListener('session:tick', handler)
  },
  onSessionStateChanged: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('session:state-changed', handler)
    return () => ipcRenderer.removeListener('session:state-changed', handler)
  },
  onTasksStateChanged: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('tasks:state-changed', handler)
    return () => ipcRenderer.removeListener('tasks:state-changed', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electronAPI = api as any
}
