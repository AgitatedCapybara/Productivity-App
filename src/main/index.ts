import { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, Notification } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { createMainWindow, setTrayRef } from './windows/main-window'
import { createWidgetWindow, syncWidgetVisibility } from './windows/widget-window'
import { createCaptureWindow, registerCaptureIPC, toggleCaptureWindow } from './windows/capture-window'
import { createOverlayWindow, toggleOverlayWindow } from './windows/overlay-window'
import { registerAllHandlers, registerWindowHandlers } from './ipc'
import { startMonitoring, stopMonitoring } from './services/distraction-monitor'
import { startAutoBackupScheduler } from './services/backup'
import { getActiveSession, pauseSession, resumeSession, endSession, writeTimeToTask, cleanStaleSessions } from './db/sessions'
import { getDb } from './db/database'

let lastAlertTimestamp = 0

export function sendThrottledNotification(title: string, body: string, isCritical: boolean = false): void {
  const now = Date.now()
  if (!isCritical && (now - lastAlertTimestamp < 300000)) {
    console.log(`[NOTIFICATION] Suppressing throttled notification: ${title} - ${body}`)
    return
  }

  lastAlertTimestamp = now

  try {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title,
        body,
      })
      notification.show()
      console.log(`[NOTIFICATION] Emitted alert: ${title} - ${body}`)
    } else {
      console.log(`[NOTIFICATION] Native notifications not supported in this OS environment. Console fallback: ${title} - ${body}`)
    }
  } catch (err) {
    console.warn('[NOTIFICATION] Failed to display native notification:', err)
  }
}

export function updateTrayMenu(): void {
  if (!tray) return

  let activeSession: any = null
  try {
    activeSession = getActiveSession()
  } catch (err) {
    console.error('Failed to get active session for tray menu:', err)
  }

  const isFocusing = activeSession !== null

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Show',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore()
          }
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: 'Quick Add',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show()
          mainWindow.focus()
          mainWindow.webContents.send('global-shortcut:quick-add')
        }
      }
    },
    { type: 'separator' }
  ]

  if (isFocusing) {
    const isPaused = activeSession.status === 'paused'
    template.push({
      label: isPaused ? 'Resume Session' : 'Pause Session',
      click: async () => {
        try {
          const session = getActiveSession()
          if (session) {
            if (isPaused) {
              resumeSession(session.id)
              startMonitoring(session.id)
            } else {
              pauseSession(session.id)
              stopMonitoring()
            }
            
            // Broadcast state change
            const windows = BrowserWindow.getAllWindows()
            for (const win of windows) {
              if (!win.isDestroyed()) {
                win.webContents.send('session:state-changed')
              }
            }
            try {
              const { syncWidgetVisibility } = await import('./windows/widget-window')
              syncWidgetVisibility()
            } catch (err) {
              console.error('Failed to sync widget visibility:', err)
            }
            updateTrayMenu()
          }
        } catch (err) {
          console.error('Failed to pause/resume from tray menu:', err)
        }
      }
    })

    template.push({
      label: 'Stop Session',
      click: async () => {
        try {
          const session = getActiveSession()
          if (session) {
            stopMonitoring()
            endSession(session.id)
            
            const db = getDb()
            const updatedSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id) as any
            
            if (updatedSession.task_id && updatedSession.duration_mins > 0) {
              writeTimeToTask(updatedSession.task_id, updatedSession.duration_mins)
            }
            
            // Broadcast state change
            const windows = BrowserWindow.getAllWindows()
            for (const win of windows) {
              if (!win.isDestroyed()) {
                win.webContents.send('session:state-changed')
              }
            }
            try {
              const { syncWidgetVisibility } = await import('./windows/widget-window')
              syncWidgetVisibility()
            } catch (err) {
              console.error('Failed to sync widget visibility:', err)
            }
            updateTrayMenu()
            
            // Send session ended event with summary metrics
            const { getSessionDistractions } = await import('./db/sessions')
            const distractionsList = getSessionDistractions(updatedSession.id)
            const { calculateSessionMetrics } = await import('./ipc/sessions.ipc')
            const summary = calculateSessionMetrics(updatedSession, distractionsList)
            
            for (const win of windows) {
              if (!win.isDestroyed()) {
                win.webContents.send('session:ended', summary)
              }
            }

            // Trigger Focus Complete notification
            sendThrottledNotification(
              'Focus Complete',
              `Well done! Your focus session is complete. Productive time: ${summary.productiveSeconds}s.`,
              true
            )
          }
        } catch (err) {
          console.error('Failed to stop session from tray menu:', err)
        }
      }
    })
    template.push({ type: 'separator' })
  }

  template.push({
    label: 'Quit',
    click: () => {
      setTrayRef(null)
      tray?.destroy()
      app.quit()
    }
  })

  const contextMenu = Menu.buildFromTemplate(template)
  tray.setContextMenu(contextMenu)
}



const _dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url))

// Disable disk and GPU caching to prevent file lock "Access is denied (0x5)" errors on Windows,
// and disable Autofill to resolve Chromium devtools protocol warnings.
app.commandLine.appendSwitch('disable-http-cache')
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
app.commandLine.appendSwitch('disable-autofill')

export let mainWindow: BrowserWindow | null = null
export let widgetWindow: BrowserWindow | null = null
export let tray: Tray | null = null

export function setWidgetWindow(win: BrowserWindow | null): void {
  widgetWindow = win
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // Register non-window handlers before ready
  registerAllHandlers()
  registerCaptureIPC()

  app.whenReady().then(() => {
    // Set application user model id for Windows 10/11 taskbar icons
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.keystone.Keystone')
    }

    // Clean up any stale active/paused sessions left over from abrupt exit
    cleanStaleSessions()

    mainWindow = createMainWindow()
    if (process.platform === 'darwin') {
      try {
        let dockIconPath = ''
        if (app.isPackaged) {
          const prodPath1 = join(process.resourcesPath, 'icon.png')
          const prodPath2 = join(process.resourcesPath, 'resources', 'icon.png')
          const prodPath3 = join(app.getAppPath(), 'resources', 'icon.png')
          if (fs.existsSync(prodPath1)) {
            dockIconPath = prodPath1
          } else if (fs.existsSync(prodPath2)) {
            dockIconPath = prodPath2
          } else {
            dockIconPath = prodPath3
          }
        } else {
          dockIconPath = join(app.getAppPath(), 'resources/icon.png')
          if (!fs.existsSync(dockIconPath)) {
            dockIconPath = join(_dirname, '../../resources/icon.png')
          }
        }

        if (fs.existsSync(dockIconPath)) {
          app.dock.setIcon(nativeImage.createFromPath(dockIconPath))
        }
      } catch (err) {
        console.warn('Failed to set macOS dock icon:', err)
      }
    }
    registerWindowHandlers(mainWindow)
    widgetWindow = createWidgetWindow()
    createCaptureWindow()
    createOverlayWindow()

    // Dynamic overlay triggering on minimize/restore/focus/blur
    mainWindow.on('minimize', () => {
      syncWidgetVisibility()
    })
    mainWindow.on('restore', () => {
      syncWidgetVisibility()
    })
    mainWindow.on('show', () => {
      syncWidgetVisibility()
    })
    mainWindow.on('hide', () => {
      syncWidgetVisibility()
    })
    mainWindow.on('focus', () => {
      syncWidgetVisibility()
    })
    mainWindow.on('blur', () => {
      syncWidgetVisibility()
    })

    let trayIcon: Electron.NativeImage
    try {
      // Self-healing icon fallback creation
      const isPackaged = app.isPackaged
      const resourcesDir = isPackaged
        ? join(app.getPath('userData'), 'tray-assets')
        : join(_dirname, '../../resources')
      const assetsBaseDir = isPackaged
        ? (() => {
            const externalAssetsDir = join(process.resourcesPath, 'assets')
            const asarAssetsDir = join(app.getAppPath(), 'assets')
            return fs.existsSync(externalAssetsDir) ? externalAssetsDir : asarAssetsDir
          })()
        : join(_dirname, '../../assets')

      if (!fs.existsSync(resourcesDir)) {
        fs.mkdirSync(resourcesDir, { recursive: true })
      }
      const iconPath = join(resourcesDir, 'icon.png')
      const templatePath = join(resourcesDir, 'iconTemplate.png')
      const trayIconPngPath = join(resourcesDir, 'tray-icon.png')
      const trayIconIcoPath = join(resourcesDir, 'tray-icon.ico')
      const svgPath = join(resourcesDir, 'tray-icon.svg')
      const templateSvgPath = join(resourcesDir, 'tray-iconTemplate.svg')
      const templatePngPath = join(resourcesDir, 'tray-iconTemplate.png')

      const traySourceIcoPath = join(assetsBaseDir, 'trayicon.ico')
      const traySourcePngPath = join(assetsBaseDir, 'trayicon.png')
      const customSourceIcoPath = join(assetsBaseDir, 'icon.ico')
      const customSourcePngPath = join(assetsBaseDir, 'icon.png')
      const trayIconSize = 128
      let hasCustomIcon = false

      const copyTrayIco = (sourcePath: string, sourceLabel: string) => {
        try {
          fs.copyFileSync(sourcePath, trayIconIcoPath)
          console.log(`[TRAY] Copied ICO tray icon from assets/${sourceLabel} to resources/tray-icon.ico`)
          return true
        } catch (err) {
          console.warn(`[TRAY] Failed to copy ICO tray icon from assets/${sourceLabel}:`, err)
          return false
        }
      }

      const generateTrayFromSource = (sourcePath: string, sourceLabel: string) => {
        const sourceImg = nativeImage.createFromPath(sourcePath)
        if (sourceImg.isEmpty()) return false

        const resizedTray = sourceImg.resize({ width: trayIconSize, height: trayIconSize, quality: 'good' })
        fs.writeFileSync(trayIconPngPath, resizedTray.toPNG())
        fs.writeFileSync(iconPath, resizedTray.toPNG())

        const templateImg = sourceImg.resize({ width: trayIconSize, height: trayIconSize, quality: 'good' })
        fs.writeFileSync(templatePngPath, templateImg.toPNG())
        fs.writeFileSync(templatePath, templateImg.toPNG())

        console.log(`[TRAY] Successfully generated tray and template icons from custom assets/${sourceLabel}`)
        return true
      }

      if (!hasCustomIcon && fs.existsSync(traySourceIcoPath)) {
        hasCustomIcon = copyTrayIco(traySourceIcoPath, 'trayicon.ico')
      }

      if (!hasCustomIcon && fs.existsSync(traySourcePngPath)) {
        try {
          hasCustomIcon = generateTrayFromSource(traySourcePngPath, 'trayicon.png')
        } catch (err) {
          console.warn('Failed to generate tray icons from assets/trayicon.png:', err)
        }
      }

      if (!hasCustomIcon && fs.existsSync(customSourceIcoPath)) {
        hasCustomIcon = copyTrayIco(customSourceIcoPath, 'icon.ico')
      }

      if (!hasCustomIcon && fs.existsSync(customSourcePngPath)) {
        try {
          hasCustomIcon = generateTrayFromSource(customSourcePngPath, 'icon.png')
        } catch (err) {
          console.warn('Failed to generate tray icons from assets/icon.png:', err)
        }
      }

      if (!hasCustomIcon) {
        // 1. Create a beautiful, razor-sharp vector SVG icon for the system tray (translucent purple/white theme)
        const traySvg = `<svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g stroke="#8b5cf6" stroke-width="8" stroke-linecap="round">
    <path d="M 38 82 L 38 52 A 12 12 0 0 1 62 52 L 62 82" />
    <path d="M 33 82 L 33 52 A 17 17 0 0 1 67 52 L 67 82" />
    <path d="M 28 82 L 28 52 A 22 22 0 0 1 72 52 L 72 82" />
    <path d="M 23 82 L 23 52 A 27 27 0 0 1 77 52 L 77 82" />
    <path d="M 18 82 L 18 52 A 32 32 0 0 1 82 52 L 82 82" />
  </g>
</svg>`
        fs.writeFileSync(svgPath, traySvg, 'utf8')

        // Create a solid black template SVG for macOS dark/light mode menu bar
        const templateSvg = `<svg width="22" height="22" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g stroke="#000000" stroke-width="8" stroke-linecap="round">
    <path d="M 38 82 L 38 52 A 12 12 0 0 1 62 52 L 62 82" />
    <path d="M 33 82 L 33 52 A 17 17 0 0 1 67 52 L 67 82" />
    <path d="M 28 82 L 28 52 A 22 22 0 0 1 72 52 L 72 82" />
    <path d="M 23 82 L 23 52 A 27 27 0 0 1 77 52 L 77 82" />
    <path d="M 18 82 L 18 52 A 32 32 0 0 1 82 52 L 82 82" />
  </g>
</svg>`
        fs.writeFileSync(templateSvgPath, templateSvg, 'utf8')

        // 2. Heal existing JPG files that are mislabeled as .png (common in setup-icons.mjs output)
        const healImageFile = (filePath: string) => {
          if (fs.existsSync(filePath)) {
            try {
              const rawBuffer = fs.readFileSync(filePath)
              // If it starts with JPEG magic bytes or is not a valid PNG
              const isJpeg = rawBuffer.length > 3 && rawBuffer[0] === 0xff && rawBuffer[1] === 0xd8
              if (isJpeg) {
                const decodedImg = nativeImage.createFromBuffer(rawBuffer)
                if (!decodedImg.isEmpty()) {
                  fs.writeFileSync(filePath, decodedImg.toPNG())
                  console.log(`[SELF-HEALING] Successfully converted JPEG image to real PNG at: ${filePath}`)
                }
              }
            } catch (err) {
              console.error(`[SELF-HEALING] Failed to heal image at ${filePath}:`, err)
            }
          }
        }

        healImageFile(iconPath)
        healImageFile(templatePath)
        healImageFile(trayIconPngPath)

        // 3. Fallback 1x1 png creation if needed
        const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        const pngBuffer = Buffer.from(pngBase64, 'base64')
        
        if (!fs.existsSync(iconPath)) {
          fs.writeFileSync(iconPath, pngBuffer)
        }
        if (!fs.existsSync(templatePath)) {
          fs.writeFileSync(templatePath, pngBuffer)
        }
        if (!fs.existsSync(trayIconPngPath)) {
          fs.writeFileSync(trayIconPngPath, pngBuffer)
        }

        // Rasterize SVGs to PNGs for flawless OS-level display
        try {
          const tempSvgImage = nativeImage.createFromPath(svgPath)
          if (!tempSvgImage.isEmpty()) {
            fs.writeFileSync(trayIconPngPath, tempSvgImage.toPNG())
          }
          const tempTemplateImage = nativeImage.createFromPath(templateSvgPath)
          if (!tempTemplateImage.isEmpty()) {
            fs.writeFileSync(templatePngPath, tempTemplateImage.toPNG())
            fs.writeFileSync(templatePath, tempTemplateImage.toPNG())
          }
        } catch (rasterError) {
          console.warn('Failed to pre-rasterize SVG tray assets:', rasterError)
        }
      }

      // 4. Load the highest resolution vector or rasterized template tray icon
      let targetIconPath: string
      if (process.platform === 'darwin') {
        targetIconPath = fs.existsSync(templatePngPath) ? templatePngPath : (fs.existsSync(templatePath) ? templatePath : templateSvgPath)
      } else {
        if (fs.existsSync(trayIconIcoPath)) {
          targetIconPath = trayIconIcoPath
          console.log('[TRAY] Using copied/generated tray ICO:', trayIconIcoPath)
        } else if (fs.existsSync(traySourceIcoPath)) {
          targetIconPath = traySourceIcoPath
          console.log('[TRAY] Using source tray ICO (fallback):', traySourceIcoPath)
        } else if (fs.existsSync(customSourceIcoPath)) {
          targetIconPath = customSourceIcoPath
          console.log('[TRAY] Using source app ICO (fallback):', customSourceIcoPath)
        } else if (fs.existsSync(trayIconPngPath)) {
          targetIconPath = trayIconPngPath
          console.log('[TRAY] Using generated tray PNG fallback:', trayIconPngPath)
        } else if (fs.existsSync(svgPath)) {
          targetIconPath = svgPath
          console.log('[TRAY] Using generated tray SVG fallback:', svgPath)
        } else {
          targetIconPath = iconPath
          console.log('[TRAY] Using generic icon PNG fallback:', iconPath)
        }
      }

      if (process.platform === 'darwin' || !targetIconPath.toLowerCase().endsWith('.ico')) {
        trayIcon = nativeImage.createFromPath(targetIconPath)
        if (trayIcon.isEmpty()) {
          trayIcon = nativeImage.createEmpty()
        } else if (process.platform === 'darwin') {
          trayIcon.setTemplateImage(true)
        }
        tray = new Tray(trayIcon)
      } else {
        tray = new Tray(targetIconPath)
      }
    } catch (error) {
      console.warn('Failed to setup native tray icon assets, falling back to empty icon:', error)
      tray = new Tray(nativeImage.createEmpty())
    }
    
    // Tray tooltip configuration: guaranteed under 127 characters
    const tooltipText = 'Keystone - Focus Companion'.substring(0, 127)
    tray.setToolTip(tooltipText)

    // macOS menu bar label: limited to 3-5 characters ('Echo' is 4 chars)
    if (process.platform === 'darwin') {
      tray.setTitle('Echo')
    }

    updateTrayMenu()

    const restoreMainWindow = () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        mainWindow.show()
        mainWindow.focus()
      }
    }

    // Windows standard click to restore/maximize (or toggle overlay)
    tray.on('click', toggleOverlayWindow)
    tray.on('double-click', restoreMainWindow)

    setTrayRef(tray)

    const isMac = process.platform === 'darwin'

    // 1. Capture Window - Hyper Key (VK codes / Virtual Space with uncommon modifier stack)
    try {
      const captureHyper = isMac ? 'Cmd+Opt+Ctrl+Shift+Space' : 'Super+Alt+Ctrl+Shift+Space'
      let success = globalShortcut.register(captureHyper, () => {
        toggleCaptureWindow()
      })
      if (success && globalShortcut.isRegistered(captureHyper)) {
        console.log(`[HOTKEY AUDIT] Premium Capture Hyper shortcut '${captureHyper}' registered successfully.`)
      } else {
        if (!isMac) {
          const captureHyperAlt = 'Ctrl+Alt+Shift+Space'
          success = globalShortcut.register(captureHyperAlt, () => {
            toggleCaptureWindow()
          })
          if (success && globalShortcut.isRegistered(captureHyperAlt)) {
            console.log(`[HOTKEY AUDIT] Premium Capture Hyper fallback shortcut '${captureHyperAlt}' registered successfully.`)
          } else {
            console.warn(`[HOTKEY AUDIT] Conflict: Failed to register Premium Capture Hyper shortcuts '${captureHyper}' and '${captureHyperAlt}'.`)
          }
        } else {
          console.warn(`[HOTKEY AUDIT] Conflict: Failed to register Premium Capture Hyper shortcut '${captureHyper}'.`)
        }
      }
    } catch (err) {
      console.error(`[HOTKEY AUDIT] Exception registering Capture Hyper shortcut:`, err)
    }

    // 2. Capture Window - Standard / Existing Fallback (Ctrl+Shift+Space)
    try {
      const captureFallback = 'CommandOrControl+Shift+Space'
      const success = globalShortcut.register(captureFallback, () => {
        toggleCaptureWindow()
      })
      if (success && globalShortcut.isRegistered(captureFallback)) {
        console.log(`[HOTKEY AUDIT] Standard Capture fallback shortcut '${captureFallback}' registered successfully.`)
      } else {
        console.warn(`[HOTKEY AUDIT] Conflict: Failed to register Standard Capture fallback shortcut '${captureFallback}'.`)
      }
    } catch (err) {
      console.error(`[HOTKEY AUDIT] Exception registering Capture fallback shortcut:`, err)
    }

    // 3. Overlay Window - Hyper Key (VK codes / Virtual O with uncommon modifier stack)
    try {
      const overlayHyper = isMac ? 'Cmd+Opt+Ctrl+Shift+O' : 'Super+Alt+Ctrl+Shift+O'
      let success = globalShortcut.register(overlayHyper, () => {
        toggleOverlayWindow()
      })
      if (success && globalShortcut.isRegistered(overlayHyper)) {
        console.log(`[HOTKEY AUDIT] Premium Overlay Hyper shortcut '${overlayHyper}' registered successfully.`)
      } else {
        if (!isMac) {
          const overlayHyperAlt = 'Ctrl+Alt+Shift+O'
          success = globalShortcut.register(overlayHyperAlt, () => {
            toggleOverlayWindow()
          })
          if (success && globalShortcut.isRegistered(overlayHyperAlt)) {
            console.log(`[HOTKEY AUDIT] Premium Overlay Hyper fallback shortcut '${overlayHyperAlt}' registered successfully.`)
          } else {
            console.warn(`[HOTKEY AUDIT] Conflict: Failed to register Premium Overlay Hyper shortcuts '${overlayHyper}' and '${overlayHyperAlt}'.`)
          }
        } else {
          console.warn(`[HOTKEY AUDIT] Conflict: Failed to register Premium Overlay Hyper shortcut '${overlayHyper}'.`)
        }
      }
    } catch (err) {
      console.error(`[HOTKEY AUDIT] Exception registering Overlay Hyper shortcut:`, err)
    }

    // 4. Overlay Window - Standard / Existing Fallback (CmdOrCtrl+Shift+O)
    try {
      const overlayFallback = 'CommandOrControl+Shift+O'
      const success = globalShortcut.register(overlayFallback, () => {
        toggleOverlayWindow()
      })
      if (success && globalShortcut.isRegistered(overlayFallback)) {
        console.log(`[HOTKEY AUDIT] Standard Overlay fallback shortcut '${overlayFallback}' registered successfully.`)
      } else {
        console.warn(`[HOTKEY AUDIT] Conflict: Failed to register Standard Overlay fallback shortcut '${overlayFallback}'.`)
      }
    } catch (err) {
      console.error(`[HOTKEY AUDIT] Exception registering Overlay fallback shortcut:`, err)
    }

    // Start auto backup scheduler
    startAutoBackupScheduler()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow()
        registerWindowHandlers(mainWindow)
      } else if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show()
      }
    })
  })
}

app.on('window-all-closed', () => {
  // Do NOT quit here - tray keeps app alive
})

app.on('before-quit', () => {
  // Safety check: end any active focus session cleanly
  try {
    const active = getActiveSession()
    if (active) {
      console.log('[BEFORE-QUIT] Ending active focus session cleanly before quitting.')
      stopMonitoring()
      endSession(active.id)
      
      const db = getDb()
      const sessionInDb = db.prepare('SELECT * FROM sessions WHERE id = ?').get(active.id) as any
      if (sessionInDb && sessionInDb.task_id && sessionInDb.duration_mins > 0) {
        try {
          writeTimeToTask(sessionInDb.task_id, sessionInDb.duration_mins)
        } catch (dbErr) {
          console.error('[BEFORE-QUIT] DB save error', dbErr)
        }
      }
    }
  } catch (err) {
    console.error('[BEFORE-QUIT] Error cleanly ending active focus session:', err)
  }

  try {
    stopMonitoring()
  } catch (err) {
    // Quiet
  }
  globalShortcut.unregisterAll()

  // Explicitly destroy all browser windows to force full heap release and prevent ghost / dangling processes
  try {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        try {
          win.destroy()
        } catch (_) {}
      }
    }
  } catch (_) {}
})
