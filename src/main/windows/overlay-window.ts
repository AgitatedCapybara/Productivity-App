// src/main/windows/overlay-window.ts
import { BrowserWindow, screen } from 'electron'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const _dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url))

let overlayWindow: BrowserWindow | null = null

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow
}

export function createOverlayWindow(): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow
  }

  const preloadPath = process.env.ELECTRON_RENDERER_URL
    ? join(_dirname, '../preload/overlay.mjs')
    : join(_dirname, '../preload/overlay.js')

  const cursorPoint = screen.getCursorScreenPoint()
  const activeDisplay = screen.getDisplayNearestPoint(cursorPoint)
  const { x: dispX, y: dispY, width: dispWidth, height: dispHeight } = activeDisplay.bounds

  const width = 320
  const height = dispHeight
  const targetX = dispX + dispWidth - width
  const targetY = dispY

  overlayWindow = new BrowserWindow({
    title: 'Keystone Overlay',
    x: targetX,
    y: targetY,
    width: width,
    height: height,
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
      partition: 'overlay-window'
    }
  })

  ;(overlayWindow as any).isOverlayWindow = true

  if (process.env.ELECTRON_RENDERER_URL) {
    overlayWindow.loadURL(process.env.ELECTRON_RENDERER_URL + '/overlay.html')
  } else {
    overlayWindow.loadFile(join(_dirname, '../renderer/overlay.html'))
  }

  // Keep the overlay window always-on-top until closed or tray clicked.
  // We removed the hide on blur listener to fulfill the user request.

  overlayWindow.on('close', (e) => {
    e.preventDefault()
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.hide()
    }
  })

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })

  return overlayWindow
}

export function resetOverlayWindowForTesting(): void {
  overlayWindow = null
}

export function toggleOverlayWindow(): void {
  const cursorPoint = screen.getCursorScreenPoint()
  const activeDisplay = screen.getDisplayNearestPoint(cursorPoint)
  const { x: dispX, y: dispY, width: dispWidth, height: dispHeight } = activeDisplay.bounds

  const width = 320
  const height = dispHeight
  const targetX = dispX + dispWidth - width
  const targetY = dispY

  if (!overlayWindow || (typeof overlayWindow.isDestroyed === 'function' && overlayWindow.isDestroyed())) {
    createOverlayWindow()
  }

  if (overlayWindow) {
    if (overlayWindow.isVisible()) {
      overlayWindow.hide()
    } else {
      overlayWindow.setBounds({
        x: targetX,
        y: targetY,
        width: width,
        height: height
      })
      overlayWindow.show()
      overlayWindow.focus()
    }
  }
}
