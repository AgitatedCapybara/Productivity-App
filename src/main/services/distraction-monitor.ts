// src/main/services/distraction-monitor.ts
import { logDistraction, endDistraction } from '../db/sessions'

// Mock activeWin since we cannot install the native module in the web preview container
const activeWin = async (): Promise<any> => {
  return null;
}

let trackingInterval: NodeJS.Timeout | null = null
let currentSessionId: string | null = null
let activeDistraction: { id: string; startedAt: number; appKey: string } | null = null

const isEchoesApp = (ownerName: string) => {
  const lower = ownerName.toLowerCase()
  return lower.includes('echoes') || lower.includes('electron')
}

export function startMonitoring(sessionId: string) {
  if (trackingInterval) {
    stopMonitoring()
  }
  
  currentSessionId = sessionId
  activeDistraction = null

  trackingInterval = setInterval(async () => {
    try {
      const windowInfo = await activeWin()
      if (!windowInfo) return
      
      const { owner, title } = windowInfo
      
      // If we switched to Echoes app, end the tracking of previous distraction
      if (isEchoesApp(owner.name)) {
        if (activeDistraction) {
          const endedAt = new Date()
          const durationMs = endedAt.getTime() - activeDistraction.startedAt
          endDistraction(activeDistraction.id, endedAt.toISOString(), durationMs)
          activeDistraction = null
        }
        return
      }
      
      const appKey = `${owner.name}::${title}`
      
      // Still looking at same distraction
      if (activeDistraction && activeDistraction.appKey === appKey) {
        return 
      }
      
      const now = new Date()
      
      // App switched, end previous distraction
      if (activeDistraction) {
        const durationMs = now.getTime() - activeDistraction.startedAt
        endDistraction(activeDistraction.id, now.toISOString(), durationMs)
      }
      
      // Start new distraction
      const id = logDistraction(currentSessionId!, owner.name, title, now.toISOString())
      activeDistraction = {
        id,
        startedAt: now.getTime(),
        appKey
      }
      
    } catch (err) {
      console.error('Distraction monitor error:', err)
    }
  }, 500)
}

export function stopMonitoring() {
  if (trackingInterval) {
    clearInterval(trackingInterval)
    trackingInterval = null
  }
  
  if (activeDistraction) {
    const endedAt = new Date()
    const durationMs = endedAt.getTime() - activeDistraction.startedAt
    endDistraction(activeDistraction.id, endedAt.toISOString(), durationMs)
    activeDistraction = null
  }
  
  currentSessionId = null
}

export function isMonitoring(): boolean {
  return trackingInterval !== null
}
