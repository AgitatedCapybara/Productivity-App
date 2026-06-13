// src/preload/widget.ts
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getTasks: () => ipcRenderer.invoke('tasks:getAll'),
  getTasksDueToday: () => ipcRenderer.invoke('tasks:getDueToday'),
  completeTask: (id: string) => ipcRenderer.invoke('tasks:complete', id),
  createTask: (input: any) => ipcRenderer.invoke('tasks:create', input),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  restoreMainWindow: () => ipcRenderer.invoke('window:restore'),
}

const widgetAPI = {
  getActiveSession: () => ipcRenderer.invoke('focus-session:getActive'),
  pauseSession: () => ipcRenderer.invoke('focus-session:pause'),
  resumeSession: () => ipcRenderer.invoke('focus-session:resume'),
  stopSession: () => ipcRenderer.invoke('focus-session:stop'),
  getTasksForToday: () => ipcRenderer.invoke('tasks:getForToday'),
  completeTask: (id: string) => ipcRenderer.invoke('tasks:complete', id),
  onSessionTick: (callback: (elapsed: { seconds: number, distractionCount: number, targetDurationMins?: number }) => void) => {
    const handler = (_: any, elapsed: { seconds: number, distractionCount: number, targetDurationMins?: number }) => callback(elapsed)
    ipcRenderer.on('session:tick', handler)
    return () => ipcRenderer.removeListener('session:tick', handler)
  },
  onSessionStopped: (callback: (summary: { durationMins: number, distractionCount: number }) => void) => {
    const handler = (_: any, summary: { durationMins: number, distractionCount: number }) => callback(summary)
    ipcRenderer.on('session:stopped', handler)
    return () => ipcRenderer.removeListener('session:stopped', handler)
  },
  onSessionStateChanged: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('session:state-changed', handler)
    return () => ipcRenderer.removeListener('session:state-changed', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
    contextBridge.exposeInMainWorld('widgetAPI', widgetAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electronAPI = api
  // @ts-ignore
  window.widgetAPI = widgetAPI
}

