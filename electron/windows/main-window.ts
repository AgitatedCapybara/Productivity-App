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
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(_dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  win.on('close', (e) => {
    if (trayRef) {
      e.preventDefault()
      win.hide()
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(join(_dirname, '../index.html'))
  }

  return win
}
