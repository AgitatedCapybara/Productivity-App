import { ipcMain, BrowserWindow } from 'electron'

export function registerWindowHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.handle('window:toggleFullscreen', () => {
    mainWindow.setFullScreen(!mainWindow.isFullScreen())
  })

  ipcMain.handle('window:close', () => {
    mainWindow.close()
  })
}
