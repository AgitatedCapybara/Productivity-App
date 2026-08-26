import { BrowserWindow, Tray, app, nativeImage } from 'electron'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { getSavedBounds, trackWindowBounds } from './bounds'
import { getSetting } from '../db/settings'

const _dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url))

let trayRef: Tray | null = null

export function setTrayRef(t: Tray | null): void {
  trayRef = t
  void trayRef
}

export function createMainWindow(): BrowserWindow {
  const bounds = getSavedBounds('main', { width: 900, height: 680 })
  let iconPath = ''
  if (app.isPackaged) {
    const prodPath1 = join(process.resourcesPath, 'icon.png')
    const prodPath2 = join(process.resourcesPath, 'resources', 'icon.png')
    const prodPath3 = join(app.getAppPath(), 'resources', 'icon.png')
    
    const prodIco1 = join(process.resourcesPath, 'icon.ico')
    const prodIco2 = join(process.resourcesPath, 'resources', 'icon.ico')
    const prodIco3 = join(app.getAppPath(), 'resources', 'icon.ico')

    if (process.platform === 'win32') {
      if (fs.existsSync(prodIco1)) {
        iconPath = prodIco1
      } else if (fs.existsSync(prodIco2)) {
        iconPath = prodIco2
      } else if (fs.existsSync(prodIco3)) {
        iconPath = prodIco3
      } else if (fs.existsSync(prodPath1)) {
        iconPath = prodPath1
      } else {
        iconPath = prodPath3
      }
    } else {
      if (fs.existsSync(prodPath1)) {
        iconPath = prodPath1
      } else if (fs.existsSync(prodPath2)) {
        iconPath = prodPath2
      } else {
        iconPath = prodPath3
      }
    }
  } else {
    if (process.platform === 'win32') {
      iconPath = join(app.getAppPath(), 'resources/icon.ico')
      if (!fs.existsSync(iconPath)) {
        iconPath = join(_dirname, '../../resources/icon.ico')
      }
      if (!fs.existsSync(iconPath)) {
        iconPath = join(app.getAppPath(), 'resources/icon.png')
      }
      if (!fs.existsSync(iconPath)) {
        iconPath = join(_dirname, '../../resources/icon.png')
      }
    } else {
      iconPath = join(app.getAppPath(), 'resources/icon.png')
      if (!fs.existsSync(iconPath)) {
        iconPath = join(_dirname, '../../resources/icon.png')
      }
    }
  }

  let winIcon: any = undefined
  if (iconPath && fs.existsSync(iconPath)) {
    try {
      const img = nativeImage.createFromPath(iconPath)
      if (!img.isEmpty()) {
        winIcon = img
      }
    } catch (err) {
      console.warn('[MainWindow] Failed to create nativeImage from path:', iconPath, err)
    }
  }

  const win = new BrowserWindow({
    icon: winIcon || iconPath,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 720,
    minHeight: 500,
    frame: true, // Keep standard Windows snap and edges, hidden titlebar still hides the frame visually on Win
    transparent: false,
    backgroundColor: '#00000000',
    backgroundMaterial: 'mica',
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#A0A0A5',
      height: 32
    },
    webPreferences: {
      preload: join(_dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Tag window to robustly identify it in the main process
  ;(win as any).isMainWindow = true

  if (winIcon) {
    try {
      win.setIcon(winIcon)
    } catch (err) {
      console.warn('[MainWindow] Failed to set window icon explicitly via setIcon:', err)
    }
  }

  trackWindowBounds(win, 'main')

  win.once('ready-to-show', () => {
    win.show()
  })

  win.on('close', (e) => {
    e.preventDefault()
    try {
      const minimizeTo = getSetting('minimizeTo', 'taskbar')
      if (minimizeTo === 'tray') {
        win.hide()
      } else {
        win.minimize()
      }
    } catch (err) {
      console.error('Failed to get minimizeTo setting on window close:', err)
      win.minimize()
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(join(_dirname, '../renderer/index.html'))
  }

  return win
}
