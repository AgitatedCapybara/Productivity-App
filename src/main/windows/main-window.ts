import { BrowserWindow, Tray } from 'electron'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const _dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url))

let trayRef: Tray | null = null

export function setTrayRef(t: Tray | null) {
  trayRef = t
}

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 900,
    height: 680,
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

  win.once('ready-to-show', () => {
    win.show()
  })

  win.on('close', (e) => {
    if (trayRef) {
      e.preventDefault()
      win.hide()
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
