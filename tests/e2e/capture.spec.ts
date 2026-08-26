// tests/e2e/capture.spec.ts
import { test, expect, _electron as electron } from '@playwright/test'

test.describe('Keystone Rapid Capture Integration', () => {
  test('handles global shortcut activation and NLP capture inputs cleanly', async () => {
    const electronApp = await electron.launch({ args: ['out/main/index.js'] })
    const window = await electronApp.firstWindow()

    // 1. Simulate the Global Hotkey trigger (Alt+Shift+K or Cmd+K) to open the Quick Add panel
    await window.keyboard.press('Alt+Shift+K')

    const quickAddPanel = await window.locator('#quick-add-container')
    await expect(quickAddPanel).toBeVisible()

    // 2. Type natural-language task with priority and tags
    const inputField = await window.locator('#quick-add-input-field')
    await inputField.fill('Complete Vitest infrastructure tests p1 #dev for 45m')

    // Expecting instant NLP preview to highlight recognized options
    const parsedPriority = await window.locator('#nlp-tag-indicator-priority')
    await expect(parsedPriority).toHaveText('P3 / HIGH')

    const parsedDuration = await window.locator('#nlp-tag-indicator-duration')
    await expect(parsedDuration).toHaveText('45 M')

    // 3. Press Enter to dispatch task
    await window.keyboard.press('Enter')

    // Task is saved; input field is cleared
    await expect(inputField).toHaveText('')

    // Assert that the new item is rendered securely inside Today View
    const latestTask = await window.locator('.task-item-title').first()
    await expect(latestTask).toContainText('Complete Vitest infrastructure tests')

    await electronApp.close()
  })
})
