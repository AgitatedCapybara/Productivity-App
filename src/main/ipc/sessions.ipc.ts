// src/main/ipc/sessions.ipc.ts
import { ipcMain } from 'electron'
import {
  createSession,
  pauseSession,
  resumeSession,
  endSession,
  getActiveSession,
  getTodaySessions,
  writeTimeToTask
} from '../db/sessions'
import { startMonitoring, stopMonitoring } from '../services/distraction-monitor'
import { getDb } from '../db/database'
import type { Session } from '../db/schema'

export function registerSessionHandlers() {
  ipcMain.handle('focus-session:start', async (_, payload: { taskId: string }) => {
    const session = createSession(payload.taskId)
    startMonitoring(session.id)
    return session
  })

  ipcMain.handle('focus-session:pause', async () => {
    const session = getActiveSession()
    if (session) {
      pauseSession(session.id)
      stopMonitoring()
    }
  })

  ipcMain.handle('focus-session:resume', async () => {
    const session = getActiveSession()
    if (session) {
      resumeSession(session.id)
      startMonitoring(session.id)
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
    
    return {
      sessionId: updatedSession.id,
      taskId: updatedSession.task_id,
      durationMins: updatedSession.duration_mins,
      distractionCount: updatedSession.distraction_count
    }
  })

  ipcMain.handle('focus-session:getActive', async () => {
    return getActiveSession()
  })

  ipcMain.handle('focus-session:getToday', async () => {
    return getTodaySessions()
  })
}
