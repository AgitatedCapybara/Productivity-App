// src/main/windows/widget-window.ts
import { BrowserWindow } from 'electron'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { getDb } from '../db/database'
import { getActiveSession } from '../db/sessions'
import { getSavedBounds, trackWindowBounds } from './bounds'
import type { Session } from '../db/schema'

const _dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url))

let tickInterval: NodeJS.Timeout | null = null
let lastTrackedSession: Session | null = null

let syncLogs: string[] = []
let forceShowOverride = false

export function getSyncLogs(): string[] {
  return syncLogs
}

export function setForceShowOverride(val: boolean): void {
  forceShowOverride = val
}

export function logSync(msg: string): void {
  const time = new Date().toLocaleTimeString()
  syncLogs.unshift(`[${time}] ${msg}`)
  if (syncLogs.length > 30) {
    syncLogs.pop()
  }
  console.info(`[WIDGET SYNC] ${msg}`)
}

export function clearWidgetTicker(): void {
  if (tickInterval) {
    clearInterval(tickInterval)
    tickInterval = null
    console.info('[WIDGET] Cleared widget ticker timer completely.')
  }
}

export function startWidgetTicker(_win?: BrowserWindow): void {
  console.log('[WIDGET TICKER] startWidgetTicker called.')
  clearWidgetTicker()

  tickInterval = setInterval(() => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length === 0) {
      console.log('[WIDGET TICKER] No windows found, clearing ticker.')
      clearWidgetTicker()
      return
    }

    try {
      const db = getDb()
      const session = db.prepare(`SELECT * FROM sessions ORDER BY started_at DESC LIMIT 1`).get() as Session | undefined
      
      if (!session) {
        console.log('[WIDGET TICKER] No session found in DB.')
        return
      }

      if (session.status === 'active' || session.status === 'paused') {
        const elapsedMs = Date.now() - new Date(session.started_at).getTime()
        const seconds = Math.floor(elapsedMs / 1000)
        
        if (session.status === 'active') {
          console.log(`[WIDGET TICKER] Sending session:tick, status: ${session.status}, seconds: ${seconds}, to ${windows.length} windows`)
          for (const w of windows) {
            if (!w.isDestroyed()) {
              w.webContents.send('session:tick', { 
                seconds, 
                distractionCount: session.distraction_count,
                targetDurationMins: (session as any).target_duration_mins || 25
              })
            }
          }
        }
        lastTrackedSession = session
        
        // Poll visibility regularly during focus cycles
        syncWidgetVisibility()
      } else if (session.status === 'completed' && lastTrackedSession?.id === session.id) {
        console.log('[WIDGET TICKER] Session completed, sending session:stopped')
        for (const w of windows) {
          if (!w.isDestroyed()) {
            w.webContents.send('session:stopped', { 
              durationMins: session.duration_mins, 
              distractionCount: session.distraction_count 
            })
          }
        }
        lastTrackedSession = null
        
        // Poll visibility regularly during focus cycles
        syncWidgetVisibility()
      }
    } catch (err) {
      console.error('[WIDGET TICKER] Error in tick interval:', err)
    }
  }, 1000)
}

export function createWidgetWindow(): BrowserWindow {
  const preloadPath = process.env.ELECTRON_RENDERER_URL
    ? join(_dirname, '../preload/widget.mjs')
    : join(_dirname, '../preload/widget.js')

  logSync(`Creating companion widget with preload route: ${preloadPath}`)

  const bounds = getSavedBounds('widget', { width: 440, height: 52 })

  const win = new BrowserWindow({
    title: 'companion-widget',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      partition: 'companion-widget'
    }
  })

  // Tag window to robustly identify it in the main process
  ;(win as any).isCompanionWidget = true

  trackWindowBounds(win, 'widget')

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL + '/widget.html')
  } else {
    win.loadFile(join(_dirname, '../renderer/widget.html'))
  }

  // Ticker for session state
  const activeSession = getActiveSession()
  if (activeSession && (activeSession.status === 'active' || activeSession.status === 'paused')) {
    startWidgetTicker(win)
  }

  win.on('close', (e) => {
    e.preventDefault()
    clearWidgetTicker()
    if (!win.isDestroyed()) {
      win.destroy()
    }
  })

  win.on('closed', () => {
    import('../index')
      .then(({ setWidgetWindow }) => {
        setWidgetWindow(null)
      })
      .catch((err) => {
        console.error('[WIDGET] Failed to dynamically import index for setWidgetWindow(null):', err)
      })
  })

  import('../index')
    .then(({ setWidgetWindow }) => {
      setWidgetWindow(win)
    })
    .catch((err) => {
      console.error('[WIDGET] Failed to dynamically import index for setWidgetWindow(win):', err)
    })

  return win
}

export function getWidgetWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed() && ((win as any).isCompanionWidget || win.getTitle() === 'companion-widget')) {
      return win
    }
  }
  return null
}

export function startWidgetTickerForActiveWindow(): void {
  const win = getWidgetWindow()
  startWidgetTicker(win || undefined)
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

export function syncWidgetVisibility(): void {
  try {
    const windows = BrowserWindow.getAllWindows()
    let mainWin: BrowserWindow | null = null
    let widgetWin: BrowserWindow | null = null

    for (const win of windows) {
      if (win.isDestroyed()) continue
      
      const isWidget = !!(win as any).isCompanionWidget || 
                       win.getTitle() === 'companion-widget' || 
                       win.getTitle() === 'Echoes Widget'
      
      const isMain = !!(win as any).isMainWindow || 
                     win.getTitle() === 'Productivity App'

      if (isWidget) {
        widgetWin = win
      } else if (isMain) {
        mainWin = win
      }
    }

    const activeSession = getActiveSession()
    const isSessionActive = activeSession && (activeSession.status === 'active' || activeSession.status === 'paused')

    // Safe self-healing: recreate companion widget if it was closed/destroyed on focus activity
    if (!widgetWin && (isSessionActive || forceShowOverride)) {
      logSync(`Companion widget window was closed/destroyed, but focus session or override is active. Re-creating now!`)
      widgetWin = createWidgetWindow()
    }

    if (!mainWin || !widgetWin) {
      logSync(`Cancelled sync. Reason: mainWin exists: ${!!mainWin}, widgetWin exists: ${!!widgetWin}`)
      return
    }

    const isMainMinimized = mainWin.isMinimized() || !mainWin.isVisible() || !mainWin.isFocused()

    logSync(`Sync stats - Session active: ${isSessionActive} (status: ${activeSession ? activeSession.status : 'none'}), Main minimized/hidden/unfocused: ${isMainMinimized} (isMinimized: ${mainWin.isMinimized()}, isVisible: ${mainWin.isVisible()}, isFocused: ${mainWin.isFocused()}), Widget visible: ${widgetWin.isVisible()}, Override active: ${forceShowOverride}`)

    if (forceShowOverride) {
      if (!widgetWin.isVisible()) {
        logSync('Decision (Override): SHOWING widget overlay.')
        widgetWin.showInactive()
        widgetWin.setAlwaysOnTop(true, 'screen-saver')
      }
      return
    }

    if (isSessionActive && isMainMinimized) {
      if (!widgetWin.isVisible()) {
        logSync('Decision: SHOWING widget overlay.')
        widgetWin.showInactive()
        widgetWin.setAlwaysOnTop(true, 'screen-saver')
      }
    } else {
      if (widgetWin.isVisible()) {
        logSync(`Decision: HIDING widget overlay. ActiveSession: ${isSessionActive}, MainMinimizedOrUnfocused: ${isMainMinimized}`)
        widgetWin.hide()
      }
    }
  } catch (err: any) {
    logSync(`Failed to sync widget visibility: ${err.message || err}`)
  }
}

