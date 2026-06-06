import { BrowserWindow } from 'electron'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const _dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url))

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
    win.loadURL(process.env.ELECTRON_RENDERER_URL + '#/widget')
  } else {
    win.loadFile(join(_dirname, '../renderer/index.html'), { hash: '/widget' })
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
