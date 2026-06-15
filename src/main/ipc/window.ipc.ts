import { ipcMain, BrowserWindow, app } from 'electron'
import { getActiveSession, endSession } from '../db/sessions'
import { getSyncLogs, syncWidgetVisibility, setForceShowOverride } from '../windows/widget-window'

export function registerWindowHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      win.minimize()
    } else {
      mainWindow.minimize()
    }
  })

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const targetWin = win || mainWindow
    if (targetWin.isMaximized()) {
      targetWin.unmaximize()
    } else {
      targetWin.maximize()
    }
  })

  ipcMain.handle('window:restore', () => {
    setForceShowOverride(false)
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
    mainWindow.focus()
  })

  ipcMain.handle('window:toggleFullscreen', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const targetWin = win || mainWindow
    targetWin.setFullScreen(!targetWin.isFullScreen())
  })

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && win !== mainWindow) {
      win.hide() // If widget window seeks to close, just hide it
    } else {
      mainWindow.close()
    }
  })

  ipcMain.handle('window:confirm-exit', async () => {
    // 1. Stop any active focus session cleanest way
    try {
      const active = getActiveSession()
      if (active) {
        // Stop tracker/monitoring
        try {
          const { stopMonitoring } = require('../services/distraction-monitor')
          stopMonitoring()
        } catch (_) {}

        // End session in DB (calculates and updates duration to DB)
        endSession(active.id)
        
        // Write time to task if a task is assigned and duration > 0
        try {
          const { getDb } = require('../db/database')
          const db = getDb()
          const sessionInDb = db.prepare('SELECT * FROM sessions WHERE id = ?').get(active.id)
          if (sessionInDb && sessionInDb.task_id && sessionInDb.duration_mins > 0) {
            const { writeTimeToTask } = require('../db/tasks')
            writeTimeToTask(sessionInDb.task_id, sessionInDb.duration_mins)
          }
        } catch (dbErr) {
          console.error('[CONFIRM EXIT] DB save error', dbErr)
        }
      }
    } catch (err) {
      console.error('[CONFIRM EXIT] Error stopping active session on close', err)
    }

    // 2. Shut down tracker if active and not already closed
    try {
      const { stopMonitoring } = require('../services/distraction-monitor')
      stopMonitoring()
    } catch (_) {}

    // 3. Destroy tray to prevent background ghost process
    try {
      const { tray } = require('../index')
      if (tray) {
        tray.destroy()
      }
    } catch (_) {}

    // 4. Force exit the app immediately by destroying all windows
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.destroy()
    }

    app.quit()
  })

  ipcMain.handle('window:getOverlayDiagnostics', () => {
    try {
      // Force evaluate visibility states before retrieving metrics
      syncWidgetVisibility()

      const activeSession = getActiveSession()
      const windows = BrowserWindow.getAllWindows()
      
      let mainWin: BrowserWindow | null = null
      let widgetWin: BrowserWindow | null = null
      
      for (const win of windows) {
        if (win.isDestroyed()) continue
        if ((win as any).isCompanionWidget) {
          widgetWin = win
        } else if ((win as any).isMainWindow) {
          mainWin = win
        }
      }
      
      return {
        sessionActive: !!activeSession,
        sessionStatus: activeSession ? activeSession.status : null,
        mainWindowFound: !!mainWin,
        mainWindowMinimized: mainWin ? mainWin.isMinimized() : null,
        mainWindowVisible: mainWin ? mainWin.isVisible() : null,
        mainWindowFocused: mainWin ? mainWin.isFocused() : null,
        widgetWindowCreated: !!widgetWin,
        widgetWindowVisible: widgetWin ? widgetWin.isVisible() : null,
        windowsCount: windows.length,
        syncLogs: getSyncLogs(),
        windowsList: windows.map(w => ({
          title: w.getTitle(),
          isDestroyed: w.isDestroyed(),
          isVisible: w.isVisible(),
          isMinimized: w.isMinimized(),
          isFocused: w.isFocused(),
          isMainWindow: !!(w as any).isMainWindow,
          isCompanionWidget: !!(w as any).isCompanionWidget
        }))
      }
    } catch (err: any) {
      return { error: err.message || String(err), syncLogs: getSyncLogs() }
    }
  })

  ipcMain.handle('window:forceShowWidget', () => {
    const windows = BrowserWindow.getAllWindows()
    let widgetWin: BrowserWindow | null = null
    for (const win of windows) {
      if (win.isDestroyed()) continue
      if ((win as any).isCompanionWidget) {
        widgetWin = win
        break
      }
    }
    if (widgetWin) {
      setForceShowOverride(true)
      widgetWin.showInactive()
      widgetWin.setAlwaysOnTop(true, 'screen-saver')
      return { success: true, message: 'Widget shown via force command. Auto-hide sync overridden.' }
    }
    return { success: false, message: 'Widget window was not found or has been destroyed.' }
  })

  ipcMain.handle('window:forceHideWidget', () => {
    const windows = BrowserWindow.getAllWindows()
    let widgetWin: BrowserWindow | null = null
    for (const win of windows) {
      if (win.isDestroyed()) continue
      if ((win as any).isCompanionWidget) {
        widgetWin = win
        break
      }
    }
    if (widgetWin) {
      setForceShowOverride(false)
      widgetWin.hide()
      return { success: true, message: 'Widget hidden and override mode disabled.' }
    }
    return { success: false, message: 'Widget window was not found.' }
  })

  ipcMain.handle('window:setWidgetHeight', (event, height: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      const [w] = win.getSize()
      win.setSize(w, height)
    }
    return { success: true }
  })
}
