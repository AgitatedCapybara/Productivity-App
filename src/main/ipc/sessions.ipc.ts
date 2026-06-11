// src/main/ipc/sessions.ipc.ts
import { ipcMain, BrowserWindow } from 'electron'
import {
  createSession,
  pauseSession,
  resumeSession,
  endSession,
  getActiveSession,
  getTodaySessions,
  getSessionDistractions,
  writeTimeToTask,
  deleteSession,
  clearSessionHistory,
  updateSessionReflection,
  renameSession
} from '../db/sessions'
import { startMonitoring, stopMonitoring } from '../services/distraction-monitor'
import { getDb } from '../db/database'
import type { Session } from '../db/schema'

function notifyWindowsOfStateChange() {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('session:state-changed')
    }
  }
}

function notifyWindowsOfSessionEnded(summary: any) {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('session:ended', summary)
    }
  }
}

function mapSessionToDualCase(session: any): any {
  if (!session) return null
  return {
    ...session,
    taskId: session.task_id,
    projectId: session.project_id,
    targetDurationMins: session.target_duration_mins,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    durationMins: session.duration_mins,
    distractionCount: session.distraction_count,
    customName: session.custom_name,
    
    task_id: session.task_id,
    project_id: session.project_id,
    target_duration_mins: session.target_duration_mins,
    started_at: session.started_at,
    ended_at: session.ended_at,
    duration_mins: session.duration_mins,
    distraction_count: session.distraction_count,
    custom_name: session.custom_name
  }
}

function calculateSessionMetrics(session: any, distractionsList: any[]): any {
  const startMs = new Date(session.started_at || session.startedAt).getTime()
  const endMs = session.ended_at || session.endedAt 
    ? new Date(session.ended_at || session.endedAt).getTime() 
    : Date.now()
  const durationSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000))

  let totalDistractedMs = 0
  for (const d of distractionsList) {
    const dStart = new Date(d.started_at || d.startedAt).getTime()
    const dEnd = d.ended_at || d.endedAt ? new Date(d.ended_at || d.endedAt).getTime() : endMs
    const dur = d.duration_ms || d.durationMs || Math.max(0, dEnd - dStart)
    totalDistractedMs += dur
  }
  const totalDistractedSeconds = Math.min(durationSeconds, Math.floor(totalDistractedMs / 1000))
  const productiveSeconds = Math.max(0, durationSeconds - totalDistractedSeconds)
  
  const productivePercent = durationSeconds > 0 
    ? Math.round((productiveSeconds / durationSeconds) * 100) 
    : 100

  const distractionCount = distractionsList.length
  const averageFocusStreakSeconds = distractionCount > 0
    ? Math.round(productiveSeconds / (distractionCount + 1))
    : productiveSeconds

  // Top distractions: group by app_name
  const grouping: Record<string, { appName: string; durationMs: number; count: number }> = {}
  for (const d of distractionsList) {
    const app = d.app_name || d.appName || 'Unknown App'
    if (!grouping[app]) {
      grouping[app] = { appName: app, durationMs: 0, count: 0 }
    }
    const dStart = new Date(d.started_at || d.startedAt).getTime()
    const dEnd = d.ended_at || d.endedAt ? new Date(d.ended_at || d.endedAt).getTime() : endMs
    const dur = d.duration_ms || d.durationMs || Math.max(0, dEnd - dStart)
    grouping[app].durationMs += dur
    grouping[app].count += 1
  }

  const topDistractions = Object.values(grouping)
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 10)

  return {
    sessionId: session.id,
    taskId: session.task_id || session.taskId,
    projectId: session.project_id || session.projectId,
    status: session.status,
    startedAt: session.started_at || session.startedAt,
    endedAt: session.ended_at || session.endedAt,
    targetDurationMins: session.target_duration_mins || session.targetDurationMins || 25,
    durationMins: session.duration_mins || session.durationMins || Math.floor(durationSeconds / 60),
    durationSeconds,
    productiveSeconds,
    totalDistractedSeconds,
    productivePercent,
    averageFocusStreakSeconds,
    distractionCount,
    topDistractions,
    reflection: session.reflection ?? '',
    clarityRating: session.clarity_rating ?? null,
    energyRating: session.energy_rating ?? null,
    clarity_rating: session.clarity_rating ?? null,
    energy_rating: session.energy_rating ?? null,
    customName: session.custom_name ?? null,
    custom_name: session.custom_name ?? null,
    distractions: distractionsList.map(d => ({
      id: d.id,
      sessionId: d.session_id || d.sessionId,
      appName: d.app_name || d.appName,
      windowTitle: d.window_title || d.windowTitle,
      startedAt: d.started_at || d.startedAt,
      endedAt: d.ended_at || d.endedAt,
      durationMs: d.duration_ms || d.durationMs || (d.ended_at ? (new Date(d.ended_at).getTime() - new Date(d.started_at).getTime()) : 0)
    }))
  }
}

export function registerSessionHandlers() {
  ipcMain.handle('focus-session:start', async (_, payload: { taskId?: string | null; projectId?: string | null; targetDurationMins?: number }) => {
    console.log('[SESSIONS IPC] focus-session:start called with payload:', JSON.stringify(payload))
    const session = createSession(payload)
    console.log('[SESSIONS IPC] focus-session:start created session successfully in DB:', JSON.stringify(session))
    startMonitoring(session.id)
    notifyWindowsOfStateChange()
    const mapped = mapSessionToDualCase(session)
    console.log('[SESSIONS IPC] focus-session:start returning mapped payload:', JSON.stringify(mapped))
    return mapped
  })

  ipcMain.handle('focus-session:pause', async () => {
    const session = getActiveSession()
    if (session) {
      pauseSession(session.id)
      stopMonitoring()
      notifyWindowsOfStateChange()
    }
  })

  ipcMain.handle('focus-session:resume', async () => {
    const session = getActiveSession()
    if (session) {
      resumeSession(session.id)
      startMonitoring(session.id)
      notifyWindowsOfStateChange()
    }
  })

  ipcMain.handle('focus-session:stop', async () => {
    const session = getActiveSession()
    if (!session) return null
    
    stopMonitoring()
    endSession(session.id)
    
    const updatedSession = getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(session.id) as Session
    
    if (updatedSession.task_id && updatedSession.duration_mins > 0) {
      writeTimeToTask(updatedSession.task_id, updatedSession.duration_mins)
    }
    
    notifyWindowsOfStateChange()
    
    const distractionsList = getSessionDistractions(updatedSession.id)
    const summary = calculateSessionMetrics(updatedSession, distractionsList)
    notifyWindowsOfSessionEnded(summary)
    return summary
  })

  ipcMain.handle('focus-session:getActive', async () => {
    const active = getActiveSession()
    console.log('[SESSIONS IPC] focus-session:getActive retrieved raw from DB:', JSON.stringify(active))
    const mapped = mapSessionToDualCase(active)
    console.log('[SESSIONS IPC] focus-session:getActive mapped dual-case payload:', JSON.stringify(mapped))
    return mapped
  })

  ipcMain.handle('focus-session:getDistractions', async (_, sessionId: string) => {
    const list = getSessionDistractions(sessionId)
    return list.map(d => ({
      id: d.id,
      sessionId: d.session_id,
      appName: d.app_name,
      windowTitle: d.window_title,
      startedAt: d.started_at,
      endedAt: d.ended_at,
      durationMs: d.duration_ms
    }))
  })

  ipcMain.handle('focus-session:getHistory', async () => {
    const db = getDb()
    // Fetch all completed or cancelled sessions to generate overall stats
    const sessions = db.prepare(`
      SELECT * FROM sessions 
      ORDER BY started_at DESC
    `).all() as Session[]

    const distStmt = db.prepare(`SELECT * FROM distractions WHERE session_id = ? ORDER BY started_at ASC`)

    return sessions.map((s) => {
      const distractionsList = distStmt.all(s.id)
      return calculateSessionMetrics(s, distractionsList)
    })
  })

  ipcMain.handle('focus-session:getToday', async () => {
    const sessions = getTodaySessions()
    return sessions.map(s => {
      const mapped = mapSessionToDualCase(s)
      if (s.distractions) {
        mapped.distractions = s.distractions.map((d: any) => ({
          ...d,
          sessionId: d.session_id,
          appName: d.app_name,
          windowTitle: d.window_title,
          startedAt: d.started_at,
          endedAt: d.ended_at,
          durationMs: d.duration_ms,
          
          session_id: d.session_id,
          app_name: d.app_name,
          window_title: d.window_title,
          started_at: d.started_at,
          ended_at: d.ended_at,
          duration_ms: d.duration_ms
        }))
      }
      return mapped
    })
  })

  ipcMain.handle('focus-session:delete', async (_, id: string) => {
    deleteSession(id)
    notifyWindowsOfStateChange()
  })

  ipcMain.handle('focus-session:clearHistory', async () => {
    clearSessionHistory()
    notifyWindowsOfStateChange()
  })

  ipcMain.handle('focus-session:updateReflection', async (_, payload: { sessionId: string; reflection: string; clarityRating: number; energyRating: number }) => {
    updateSessionReflection(payload.sessionId, payload.reflection, payload.clarityRating, payload.energyRating)
    notifyWindowsOfStateChange()
  })

  ipcMain.handle('focus-session:rename', async (_, payload: { sessionId: string; customName: string }) => {
    renameSession(payload.sessionId, payload.customName)
    notifyWindowsOfStateChange()
    return { success: true }
  })
}
