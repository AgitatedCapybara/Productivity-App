import { BrowserWindow } from 'electron'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { getDb } from '../db/database'
import type { Session } from '../db/schema'

const _dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url))

let tickInterval: NodeJS.Timeout | null = null
let lastTrackedSession: Session | null = null

export function createWidgetWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 380,
    height: 320,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: join(_dirname, '../preload/widget.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL + '/widget.html')
  } else {
    win.loadFile(join(_dirname, '../renderer/widget.html'))
  }

  // Ticker for session state
  if (!tickInterval) {
    tickInterval = setInterval(() => {
      if (win.isDestroyed()) {
        if (tickInterval) clearInterval(tickInterval)
        tickInterval = null
        return
      }

      try {
        const db = getDb()
        const session = db.prepare(`SELECT * FROM sessions ORDER BY started_at DESC LIMIT 1`).get() as Session | undefined
        
        if (!session) return

        if (session.status === 'active' || session.status === 'paused') {
          const elapsedMs = Date.now() - new Date(session.started_at).getTime()
          const seconds = Math.floor(elapsedMs / 1000)
          
          if (session.status === 'active') {
            win.webContents.send('session:tick', { 
              seconds, 
              distractionCount: session.distraction_count,
              targetDurationMins: (session as any).target_duration_mins || 25
            })
          }
          lastTrackedSession = session
        } else if (session.status === 'completed' && lastTrackedSession?.id === session.id) {
          win.webContents.send('session:stopped', { durationMins: session.duration_mins, distractionCount: session.distraction_count })
          lastTrackedSession = null
        }
      } catch (err) {
        // Ignore DB uninitialized errors
      }
    }, 1000)
  }

  return win
}

export function showWidget(win: BrowserWindow) {
  if (win && !win.isDestroyed()) {
    win.show()
    win.focus()
  }
}

export function hideWidget(win: BrowserWindow) {
  if (win && !win.isDestroyed()) {
    win.hide()
  }
}
