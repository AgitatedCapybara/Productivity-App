// src/main/windows/capture-window.ts
import { BrowserWindow, ipcMain, globalShortcut, screen } from 'electron'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { getSavedBounds, trackWindowBounds } from './bounds'

const _dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url))

let captureWindow: BrowserWindow | null = null

export function createCaptureWindow(): BrowserWindow {
  if (captureWindow && !captureWindow.isDestroyed()) {
    return captureWindow
  }

  const preloadPath = process.env.ELECTRON_RENDERER_URL
    ? join(_dirname, '../preload/capture.mjs')
    : join(_dirname, '../preload/capture.js')

  const bounds = getSavedBounds('capture', { width: 620, height: 480 })

  // Center window on the active display (nearest to cursor) and offset vertically toward top third
  const cursorPoint = screen.getCursorScreenPoint()
  const activeDisplay = screen.getDisplayNearestPoint(cursorPoint)
  const { x: dispX, y: dispY, width: dispWidth, height: dispHeight } = activeDisplay.bounds
  const width = bounds.width
  const height = bounds.height
  const targetX = Math.round(dispX + (dispWidth - width) / 2)
  const targetY = Math.round(dispY + (dispHeight / 3) - (height / 2))

  captureWindow = new BrowserWindow({
    title: 'Keystone Capture',
    x: targetX,
    y: targetY,
    width: width,
    height: height, // Allow enough space for matches options or templates lists
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
      partition: 'capture-window'
    }
  })

  ;(captureWindow as any).isCaptureWindow = true

  trackWindowBounds(captureWindow, 'capture')

  if (process.env.ELECTRON_RENDERER_URL) {
    captureWindow.loadURL(process.env.ELECTRON_RENDERER_URL + '/capture.html')
  } else {
    captureWindow.loadFile(join(_dirname, '../renderer/capture.html'))
  }

  captureWindow.on('blur', () => {
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.hide()
    }
  })

  captureWindow.on('close', (e) => {
    e.preventDefault()
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.destroy()
    }
  })

  captureWindow.on('closed', () => {
    captureWindow = null
  })

  return captureWindow
}

export function registerCaptureIPC(): void {
  ipcMain.handle('capture:close', async () => {
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.destroy()
      captureWindow = null
    }
    return true
  })
}

export function toggleCaptureWindow(): void {
  if (!captureWindow || captureWindow.isDestroyed()) {
    createCaptureWindow()
  }

  if (captureWindow) {
    if (captureWindow.isVisible()) {
      captureWindow.hide()
    } else {
      // Reposition on current active display dynamically before showing
      const cursorPoint = screen.getCursorScreenPoint()
      const activeDisplay = screen.getDisplayNearestPoint(cursorPoint)
      const { x: dispX, y: dispY, width: dispWidth, height: dispHeight } = activeDisplay.bounds
      
      const [w, h] = captureWindow.getSize()
      const targetX = Math.round(dispX + (dispWidth - w) / 2)
      const targetY = Math.round(dispY + (dispHeight / 3) - (h / 2))

      captureWindow.setBounds({
        x: targetX,
        y: targetY,
        width: w,
        height: h
      })

      captureWindow.show()
      captureWindow.focus()
    }
  }
}

export function setupGlobalShortcut(shortcut = 'Ctrl+Shift+Space'): void {
  try {
    try {
      if (globalShortcut.isRegistered(shortcut)) {
        globalShortcut.unregister(shortcut)
      }
    } catch (unregErr) {
      // ignore
    }
    const registered = globalShortcut.register(shortcut, () => {
      toggleCaptureWindow()
    })
    
    if (!registered) {
      console.warn(`Global shortcut registration failed for: ${shortcut}`)
    }
  } catch (err) {
    console.error('Failed to register global shortcut:', err)
  }
}
