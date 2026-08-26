// tests/integration/ipc-regression.test.ts
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { registerAllHandlers } from '../../src/main/ipc/index'
import { ipcMain, BrowserWindow } from 'electron'

describe('IPC Contract Regression Test Suite', () => {
  beforeAll(() => {
    // Mock BrowserWindow static methods to prevent test errors during broadcasts
    BrowserWindow.getAllWindows = vi.fn().mockReturnValue([])
  })

  it('verifies registration of all vital channels and non-empty responses/clean handling', async () => {
    const handleMock = ipcMain.handle as any
    handleMock.mockClear()

    // Register all IPC handlers in the main process
    registerAllHandlers()

    // Build the handler registry map
    const handlers: Record<string, Function> = {}
    for (const call of handleMock.mock.calls) {
      const [channel, callback] = call
      handlers[channel] = callback
    }

    // Verify all core namespaces are represented
    const vitalNamespaces = [
      'tasks:',
      'projects:',
      'habits:',
      'settings:',
      'events:',
      'focus-session:',
      'circle:',
      'search:',
      'perf:',
      'templates:',
      'scheduler:',
      'rituals:',
      'wellness:',
      'notes:',
      'views:',
      'backup:',
      'license:',
      'errors:'
    ]

    const registeredChannels = Object.keys(handlers)
    for (const ns of vitalNamespaces) {
      const matches = registeredChannels.filter(c => c.startsWith(ns))
      expect(matches.length).toBeGreaterThan(0)
    }

    // A fake Electron Event object to pass as the first argument to IPC handlers
    const fakeEvent = {
      sender: {
        send: vi.fn(),
        isDestroyed: vi.fn().mockReturnValue(false)
      }
    } as any

    // 1. Validate Tasks Registry & Invocation
    expect(handlers['tasks:getAll']).toBeDefined()
    const taskList = await handlers['tasks:getAll'](fakeEvent)
    expect(Array.isArray(taskList)).toBe(true)

    expect(handlers['tasks:getDeleted']).toBeDefined()
    const deletedTaskList = await handlers['tasks:getDeleted'](fakeEvent)
    expect(Array.isArray(deletedTaskList)).toBe(true)

    // 2. Validate Settings Registry & Invocation
    expect(handlers['settings:get']).toBeDefined()
    const themeSetting = await handlers['settings:get'](fakeEvent, 'theme', 'dark')
    expect(themeSetting).toBe('dark') // Should return default in standard mocked DB

    expect(handlers['settings:set']).toBeDefined()
    const setStatus = await handlers['settings:set'](fakeEvent, 'theme', 'light')
    expect(setStatus).toBe(true)

    // 3. Validate Projects Registry & Invocation
    expect(handlers['projects:getAll']).toBeDefined()
    const projectList = await handlers['projects:getAll'](fakeEvent)
    expect(Array.isArray(projectList)).toBe(true)

    // 4. Validate License Registry & Invocation
    expect(handlers['license:getEntitlements']).toBeDefined()
    const entitlementsStatus = await handlers['license:getEntitlements'](fakeEvent)
    expect(entitlementsStatus).toBeDefined()

    // 5. Validate Scheduler Registry & Invocation
    expect(handlers['scheduler:getPreferences']).toBeDefined()
    const schedPrefs = await handlers['scheduler:getPreferences'](fakeEvent)
    expect(schedPrefs).toBeDefined()

    // 6. Validate Notes Registry & Invocation
    expect(handlers['notes:listAll']).toBeDefined()
    const notesList = await handlers['notes:listAll'](fakeEvent)
    expect(Array.isArray(notesList)).toBe(true)

    // 7. Validate Views Registry & Invocation
    expect(handlers['views:list']).toBeDefined()
    const viewsList = await handlers['views:list'](fakeEvent)
    expect(Array.isArray(viewsList)).toBe(true)
  })
})
