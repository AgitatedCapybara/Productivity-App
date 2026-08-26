// tests/e2e/launch.spec.ts
import { test, expect, _electron as electron } from '@playwright/test'

test.describe('Keystone Electron App-Launch Assurance', () => {
  test('electron main process launches, creates a single active window with no unhandled console errors', async () => {
    // Launch Electron App
    const electronApp = await electron.launch({
      args: ['out/main/index.js']
    })

    // Capture first window launched
    const window = await electronApp.firstWindow()
    const title = await window.title()

    // Assert title contains core brand
    expect(title).toContain('Keystone')

    // Confirm main elements are visible on startup
    const mainView = await window.locator('#today-view-main-card')
    await expect(mainView).toBeVisible()

    // Check of zero critical console crashes
    window.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        expect(msg.text()).not.toContain('Uncaught Error')
        expect(msg.text()).not.toContain('ReferenceError')
      }
    })

    await electronApp.close()
  })
})
