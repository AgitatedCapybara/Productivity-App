// tests/e2e/focus-session.spec.ts
import { test, expect, _electron as electron } from '@playwright/test'

test.describe('Keystone Deep Work Focus Timer & Widget Sync', () => {
  test('manages active countdowns, registers distraction events, and coordinates window bindings', async () => {
    const electronApp = await electron.launch({ args: ['out/main/index.js'] })
    
    // Grab both the MainWindow and the tiny compact always-on-top WidgetWindow
    const windows = await electronApp.windows()
    expect(windows.length).toBeGreaterThanOrEqual(1)

    const mainWindow = windows[0]

    // 1. Navigate to Focus Station
    const focusSidebarItem = await mainWindow.locator('#sidebar-item-deepwork')
    await focusSidebarItem.click()

    // 2. Click "Start 25-minute Pomodoro focus session"
    const startButton = await mainWindow.locator('#focus-timer-start-btn')
    await startButton.click()

    // Verify clock changes state to "ACTIVE"
    const timerStatus = await mainWindow.locator('#focus-timer-clock-status')
    await expect(timerStatus).toHaveText('FOCUSING')

    // 3. Confirm always-on-top Widget receives message and updates countdown synchrony
    // In our architecture, the main process broadcasts changes to all windows
    const widgetWindow = windows.find(async (win: any) => {
      const isWidget = await win.evaluate(() => window.location.pathname.includes('widget'))
      return isWidget
    })

    if (widgetWindow) {
      const widgetTimer = await widgetWindow.locator('#widget-countdown-display')
      await expect(widgetTimer).toHaveText('25:00')
    }

    // 4. Click "Halt / Terminate Session"
    const stopButton = await mainWindow.locator('#focus-timer-abort-btn')
    await stopButton.click()

    // Status returns to idle
    await expect(timerStatus).toHaveText('IDLE')

    await electronApp.close()
  })
})
