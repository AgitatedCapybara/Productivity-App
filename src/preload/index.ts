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
  createTask: async (input: any) => {
    const res = await ipcRenderer.invoke('tasks:create', input)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keystone:task-created', { detail: res }))
    }
    return res
  },
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
  checkInHabit: (habitId: string, date: string) => ipcRenderer.invoke('habits:checkIn', { habitId, date }),
  uncheckInHabit: (habitId: string, date: string) => ipcRenderer.invoke('habits:uncheckIn', { habitId, date }),
  getHabitLogs: (habitId?: string) => ipcRenderer.invoke('habits:getLogs', { habitId }),
  
  getEvents: () => ipcRenderer.invoke('events:getAll'),
  createEvent: (input: any) => ipcRenderer.invoke('events:create', input),
  updateEvent: (input: any) => ipcRenderer.invoke('events:update', input),
  deleteEvent: (id: string) => ipcRenderer.invoke('events:delete', id),
  
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  confirmExit: () => ipcRenderer.invoke('window:confirm-exit'),
  
  onCloseRequested: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('window:close-request', handler)
    return () => ipcRenderer.removeListener('window:close-request', handler)
  },
  
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

  startSession: (payload: string | { taskId?: string | null; projectId?: string | null; targetDurationMins?: number; targetBreakDurationMins?: number }) => {
    if (typeof payload === 'string') {
      return ipcRenderer.invoke('focus-session:start', { taskId: payload })
    }
    return ipcRenderer.invoke('focus-session:start', payload)
  },
  pauseSession: () => ipcRenderer.invoke('focus-session:pause'),
  resumeSession: () => ipcRenderer.invoke('focus-session:resume'),
  stopSession: () => ipcRenderer.invoke('focus-session:stop'),
  resetSessionStartTime: () => ipcRenderer.invoke('focus-session:resetStartTime'),
  getActiveSession: () => ipcRenderer.invoke('focus-session:getActive'),
  getTodaySessions: () => ipcRenderer.invoke('focus-session:getToday'),
  getSessionDistractions: (sessionId: string) => ipcRenderer.invoke('focus-session:getDistractions', sessionId),
  getSessionHistory: () => ipcRenderer.invoke('focus-session:getHistory'),
  deleteSession: (id: string) => ipcRenderer.invoke('focus-session:delete', id),
  clearSessionHistory: () => ipcRenderer.invoke('focus-session:clearHistory'),
  updateSessionReflection: (sessionId: string, reflection: string, clarityRating: number | null, energyRating: number | null) => 
    ipcRenderer.invoke('focus-session:updateReflection', { sessionId, reflection, clarityRating, energyRating }),
  renameSession: (sessionId: string, customName: string) => 
    ipcRenderer.invoke('focus-session:rename', { sessionId, customName }),
  updateSessionTask: (sessionId: string, taskId: string | null) =>
    ipcRenderer.invoke('focus-session:updateTask', { sessionId, taskId }),
  toggleDND: (enable: boolean) =>
    ipcRenderer.invoke('focus-session:toggle-dnd', { enable }),
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
  onTasksStateChanged: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('tasks:state-changed', handler)
    return () => ipcRenderer.removeListener('tasks:state-changed', handler)
  },
  onSessionEnded: (callback: (summary: any) => void) => {
    const handler = (_: any, summary: any) => callback(summary)
    ipcRenderer.on('session:ended', handler)
    return () => ipcRenderer.removeListener('session:ended', handler)
  },
  onSessionTick: (callback: (elapsed: { seconds: number; distractionCount: number; targetDurationMins?: number }) => void) => {
    const handler = (_: any, data: { seconds: number; distractionCount: number; targetDurationMins?: number }) => callback(data)
    ipcRenderer.on('session:tick', handler)
    return () => ipcRenderer.removeListener('session:tick', handler)
  },
  onSessionStopped: (callback: (summary: { durationMins: number; distractionCount: number }) => void) => {
    const handler = (_: any, summary: { durationMins: number; distractionCount: number }) => callback(summary)
    ipcRenderer.on('session:stopped', handler)
    return () => ipcRenderer.removeListener('session:stopped', handler)
  },
  onSessionSystemResumed: (callback: (sessionId: string) => void) => {
    const handler = (_: any, sessionId: string) => callback(sessionId)
    ipcRenderer.on('session:system-resumed', handler)
    return () => ipcRenderer.removeListener('session:system-resumed', handler)
  },
  onTrackerDegraded: (callback: (msg: string) => void) => {
    const handler = (_: any, msg: string) => callback(msg)
    ipcRenderer.on('session:tracker-degraded', handler)
    return () => ipcRenderer.removeListener('session:tracker-degraded', handler)
  },
  getSetting: (key: string, defaultValue: string) => ipcRenderer.invoke('settings:get', key, defaultValue),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  getFirstRunComplete: () => ipcRenderer.invoke('settings:getFirstRunComplete'),
  setFirstRunComplete: (complete: boolean) => ipcRenderer.invoke('settings:setFirstRunComplete', complete),
  getOverlayDiagnostics: () => ipcRenderer.invoke('window:getOverlayDiagnostics'),
  forceShowWidget: () => ipcRenderer.invoke('window:forceShowWidget'),
  forceHideWidget: () => ipcRenderer.invoke('window:forceHideWidget'),

  // Circle Feature APIs
  getCircleProfile: () => ipcRenderer.invoke('circle:profile:get'),
  createCircleProfile: (input: { username: string; displayName: string; avatar: string }) => ipcRenderer.invoke('circle:profile:create', input),
  updateCircleProfile: (input: any) => ipcRenderer.invoke('circle:profile:update', input),
  deleteCircleProfile: () => ipcRenderer.invoke('circle:profile:delete'),
  toggleCircleSharing: (enabled: boolean) => ipcRenderer.invoke('circle:profile:toggle-sharing', enabled),
  searchCircleUser: (searchQuery: string) => ipcRenderer.invoke('circle:friends:search', searchQuery),
  sendCircleFriendRequest: (friendUsername: string) => ipcRenderer.invoke('circle:friends:send-request', friendUsername),
  getCircleFriendRequests: () => ipcRenderer.invoke('circle:friends:get-requests'),
  acceptCircleFriendRequest: (friendUsername: string) => ipcRenderer.invoke('circle:friends:accept-request', friendUsername),
  declineCircleFriendRequest: (friendUsername: string) => ipcRenderer.invoke('circle:friends:decline-request', friendUsername),
  getCircleFriendsList: () => ipcRenderer.invoke('circle:friends:list'),
  getMyCircleAggregateStats: () => ipcRenderer.invoke('circle:stats:get-my-aggregate'),
  syncCircleFriendsStats: () => ipcRenderer.invoke('circle:stats:sync-friends'),
  getCachedCircleFriendStats: () => ipcRenderer.invoke('circle:stats:get-cached'),
  searchQuery: (searchText: string) => ipcRenderer.invoke('search:query', searchText),
  getPerfStats: () => ipcRenderer.invoke('perf:getStats'),
  forceRunMaintenance: () => ipcRenderer.invoke('perf:runMaintenance'),
  createTemplate: (name: string, payloadJson: string) => ipcRenderer.invoke('templates:create', name, payloadJson),
  listTemplates: () => ipcRenderer.invoke('templates:list'),
  deleteTemplate: (id: string) => ipcRenderer.invoke('templates:delete', id),
  applyTemplate: (id: string) => ipcRenderer.invoke('templates:apply', id),

  // Scheduler Features
  generateSuggestions: () => ipcRenderer.invoke('scheduler:generate'),
  acceptSuggestion: (id: string) => ipcRenderer.invoke('scheduler:accept', id),
  declineSuggestion: (id: string) => ipcRenderer.invoke('scheduler:decline', id),
  declineAllSuggestions: () => ipcRenderer.invoke('scheduler:declineAll'),
  snoozeSuggestion: (id: string, until: string) => ipcRenderer.invoke('scheduler:snooze', id, until),
  adjustSuggestion: (id: string, newStart: string, newEnd: string) => ipcRenderer.invoke('scheduler:adjust', id, newStart, newEnd),
  getSchedulingPreferences: () => ipcRenderer.invoke('scheduler:getPreferences'),
  updateSchedulingPreferences: (prefs: any) => ipcRenderer.invoke('scheduler:updatePreferences', prefs),

  // Ritual Features
  saveRitualEntry: (type: 'morning' | 'evening', date: string, payloadJson: string) => ipcRenderer.invoke('rituals:save', type, date, payloadJson),
  getRitualEntriesByDate: (date: string) => ipcRenderer.invoke('rituals:getByDate', date),
  getRitualStreak: () => ipcRenderer.invoke('rituals:getStreak'),
  getCapacityToday: () => ipcRenderer.invoke('rituals:getCapacityToday'),
  getWeeklyRitualSummary: () => ipcRenderer.invoke('rituals:getWeeklySummary'),

  // Wellness Features
  getWellnessSignals: () => ipcRenderer.invoke('wellness:getSignals'),
  dismissWellnessSignal: (id: string) => ipcRenderer.invoke('wellness:dismissSignal', id),
  resetDismissedWellnessSignals: () => ipcRenderer.invoke('wellness:resetDismissed'),
  exportWellnessData: () => ipcRenderer.invoke('wellness:export'),
  getWellnessAnalytics: () => ipcRenderer.invoke('wellness:getAnalytics'),

  // Notes Integration
  listAllNotes: () => ipcRenderer.invoke('notes:listAll'),
  getNoteById: (id: string) => ipcRenderer.invoke('notes:get', id),
  getNotesByParent: (parentType: string, parentId: string) => ipcRenderer.invoke('notes:getByParent', parentType, parentId),
  createNote: async (input: any) => {
    const res = await ipcRenderer.invoke('notes:create', input)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keystone:note-created', { detail: res }))
    }
    return res
  },
  updateNote: (input: any) => ipcRenderer.invoke('notes:update', input),
  deleteNote: (id: string) => ipcRenderer.invoke('notes:delete', id),
  pinNote: (id: string, pinned: boolean) => ipcRenderer.invoke('notes:pin', id, pinned),
  archiveNote: (id: string, archived: boolean) => ipcRenderer.invoke('notes:archive', id, archived),
  getNoteBacklinks: (noteId: string) => ipcRenderer.invoke('notes:getBacklinks', noteId),
  exportAllNotes: () => ipcRenderer.invoke('notes:exportAll'),

  // Views & Spatial Board APIs
  listViews: () => ipcRenderer.invoke('views:list'),
  createView: (preset: any) => ipcRenderer.invoke('views:create', preset),
  updateView: (id: string, updates: any) => ipcRenderer.invoke('views:update', id, updates),
  deleteView: (id: string) => ipcRenderer.invoke('views:delete', id),
  getViewData: (viewId: string) => ipcRenderer.invoke('views:getData', viewId),
  saveViewPlacement: (placement: any) => ipcRenderer.invoke('views:savePlacement', placement),
  deleteViewPlacement: (noteId: string, viewId: string) => ipcRenderer.invoke('views:deletePlacement', noteId, viewId),

  // Actions APIs
  listActions: () => ipcRenderer.invoke('actions:list'),
  createAction: (action: any) => ipcRenderer.invoke('actions:create', action),
  updateAction: (id: string, updates: any) => ipcRenderer.invoke('actions:update', id, updates),
  deleteAction: (id: string) => ipcRenderer.invoke('actions:delete', id),

  // Backup & Privacy Vault APIs
  getBackupStats: () => ipcRenderer.invoke('backup:getStats'),
  runBackupValue: (passphrase?: string, targetPath?: string) => ipcRenderer.invoke('backup:run', passphrase, targetPath),
  restoreBackupValue: (passphrase?: string, targetPath?: string) => ipcRenderer.invoke('backup:restore', passphrase, targetPath),
  verifyBackupValue: (passphrase: string, targetPath: string) => ipcRenderer.invoke('backup:verify', passphrase, targetPath),
  exportBackupJson: () => ipcRenderer.invoke('backup:exportJson'),
  wipeDatabaseData: () => ipcRenderer.invoke('backup:wipe'),
  getAuditLogs: () => ipcRenderer.invoke('audit:getLogs'),

  // Licensing APIs
  getLicenseStatus: () => ipcRenderer.invoke('license:getEntitlements'),
  activateLicense: (key: string) => ipcRenderer.invoke('license:activate', key),
  deactivateLicense: () => ipcRenderer.invoke('license:deactivate'),
  validateLicenseKey: (key: string) => ipcRenderer.invoke('license:validate', key),
  activateTrial: () => ipcRenderer.invoke('license:activateTrial'),
  checkFeature: (feature: string) => ipcRenderer.invoke('license:checkFeature', feature),

  // Error Diagnostics APIs
  getErrorLog: () => ipcRenderer.invoke('errors:getLog'),
  clearErrorLog: () => ipcRenderer.invoke('errors:clearLog'),
  generateDiagnostics: () => ipcRenderer.invoke('errors:generateDiagnostics'),

  // Multi-Format Data Exporter
  exportData: (format: 'json' | 'csv') => ipcRenderer.invoke('data:export', format)
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
