import { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createMainWindow, setTrayRef } from './windows/main-window'
import { createWidgetWindow, syncWidgetVisibility } from './windows/widget-window'
import { registerAllHandlers, registerWindowHandlers } from './ipc'
import { stopMonitoring } from './services/distraction-monitor'

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

  app.whenReady().then(() => {
    mainWindow = createMainWindow()
    registerWindowHandlers(mainWindow)
    widgetWindow = createWidgetWindow()

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
      trayIcon = nativeImage.createFromPath(join(_dirname, '../../resources/icon.png'))
      if (trayIcon.isEmpty()) {
        trayIcon = nativeImage.createEmpty()
      }
    } catch (error) {
      trayIcon = nativeImage.createEmpty()
    }

    tray = new Tray(trayIcon)
    tray.setToolTip('Productivity App')

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
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
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          setTrayRef(null)
          tray?.destroy()
          app.quit()
        }
      }
    ])

    tray.setContextMenu(contextMenu)
    tray.on('double-click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show()
        mainWindow.focus()
      }
    })

    setTrayRef(tray)

    globalShortcut.register('CommandOrControl+Shift+Space', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('global-shortcut:quick-add')
      }
    })

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
  try {
    stopMonitoring()
  } catch (err) {
    // Quiet
  }
  globalShortcut.unregisterAll()
})
