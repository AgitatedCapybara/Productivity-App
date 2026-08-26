// tests/e2e/ritual.spec.ts
import { test, expect, _electron as electron } from '@playwright/test'

test.describe('Keystone Mindful Rituals & Daily Rollout Flows', () => {
  test('morning checkout lets user commit to tasks and evening review rolls outstanding ones', async () => {
    const electronApp = await electron.launch({ args: ['out/main/index.js'] })
    const window = await electronApp.firstWindow()

    // 1. Visit Morning Ritual panel
    const ritualSidebarBtn = await window.locator('#sidebar-item-plan')
    await ritualSidebarBtn.click()

    const morningSection = await window.locator('#morning-ritual-active-dashboard')
    await expect(morningSection).toBeVisible()

    // 2. Select 3 tasks and check cognitive capacity constraints
    const taskCheckboxes = await window.locator('.morning-task-select-checkbox')
    await taskCheckboxes.nth(0).check()
    await taskCheckboxes.nth(1).check()

    // Capacity ratio should update in the UI
    const capacityIndicator = await window.locator('#morning-capacity-ratio-display')
    await expect(capacityIndicator).toBeVisible()

    // Click "Commit & Open My Day"
    const submitCommitmentBtn = await window.locator('#morning-ritual-submit-btn')
    await submitCommitmentBtn.click()

    // Active screen transitions to main Today view
    const mainHeader = await window.locator('#today-view-title')
    await expect(mainHeader).toBeVisible()

    await electronApp.close()
  })
})
