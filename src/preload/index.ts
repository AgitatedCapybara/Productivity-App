// src/preload/index.ts
import { contextBridge, ipcRenderer, webFrame } from 'electron'

// Increase EventEmitter limit on the frontend to avoid cosmetic warnings during hot-reloads or multi-component subscriptions
ipcRenderer.setMaxListeners(50)

// Custom APIs for renderer
const api = {
  setZoomRatio: (ratio: number) => webFrame.setZoomFactor(ratio),
  getTasks: () => ipcRenderer.invoke('tasks:getAll'),
  getDeletedTasks: () => ipcRenderer.invoke('tasks:getDeleted'),
  purgeDeletedTasks: () => ipcRenderer.invoke('tasks:purgeDeleted'),
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
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
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
  },

  startSession: (payload: string | { taskId?: string | null; projectId?: string | null; targetDurationMins?: number }) => {
    if (typeof payload === 'string') {
      return ipcRenderer.invoke('focus-session:start', { taskId: payload })
    }
    return ipcRenderer.invoke('focus-session:start', payload)
  },
  pauseSession: () => ipcRenderer.invoke('focus-session:pause'),
  resumeSession: () => ipcRenderer.invoke('focus-session:resume'),
  stopSession: () => ipcRenderer.invoke('focus-session:stop'),
  getActiveSession: () => ipcRenderer.invoke('focus-session:getActive'),
  getTodaySessions: () => ipcRenderer.invoke('focus-session:getToday'),
  getSessionDistractions: (sessionId: string) => ipcRenderer.invoke('focus-session:getDistractions', sessionId),
  getSessionHistory: () => ipcRenderer.invoke('focus-session:getHistory'),
  deleteSession: (id: string) => ipcRenderer.invoke('focus-session:delete', id),
  clearSessionHistory: () => ipcRenderer.invoke('focus-session:clearHistory'),
  updateSessionReflection: (sessionId: string, reflection: string, clarityRating: number, energyRating: number) => 
    ipcRenderer.invoke('focus-session:updateReflection', { sessionId, reflection, clarityRating, energyRating }),
  renameSession: (sessionId: string, customName: string) => 
    ipcRenderer.invoke('focus-session:rename', { sessionId, customName }),
  onSessionDistractionUpdate: (callback: (count: number) => void) => {
    const handler = (_: any, count: number) => callback(count)
    ipcRenderer.on('session:distraction-update', handler)
    return () => ipcRenderer.removeListener('session:distraction-update', handler)
  },
  onSessionDebugCheckTick: (callback: (checksCount: number, isSimulated: boolean) => void) => {
    const handler = (_: any, data: any) => {
      if (typeof data === 'object' && data !== null) {
        callback(data.count, !!data.isSimulated)
      } else {
        callback(Number(data) || 0, true)
      }
    }
    ipcRenderer.on('session:debug-check-tick', handler)
    return () => ipcRenderer.removeListener('session:debug-check-tick', handler)
  },
  onSessionStateChanged: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('session:state-changed', handler)
    return () => ipcRenderer.removeListener('session:state-changed', handler)
  },
  onSessionEnded: (callback: (summary: any) => void) => {
    const handler = (_: any, summary: any) => callback(summary)
    ipcRenderer.on('session:ended', handler)
    return () => ipcRenderer.removeListener('session:ended', handler)
  },
  getSetting: (key: string, defaultValue: string) => ipcRenderer.invoke('settings:get', key, defaultValue),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  getOverlayDiagnostics: () => ipcRenderer.invoke('window:getOverlayDiagnostics'),
  forceShowWidget: () => ipcRenderer.invoke('window:forceShowWidget'),
  forceHideWidget: () => ipcRenderer.invoke('window:forceHideWidget')
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
