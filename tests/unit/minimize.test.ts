import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import * as electron from 'electron'
import { getSetting, setSetting } from '../../src/main/db/settings'
import { createMainWindow } from '../../src/main/windows/main-window'
import { getDb } from '../../src/main/db/database'

const OriginalBrowserWindow = electron.BrowserWindow

describe('Window Minimize and Close Behavior Settings', () => {
  let closeListener: Function | null = null
  let spyHide: any
  let spyMinimize: any

  beforeEach(() => {
    const db = getDb()
    db.prepare("DELETE FROM settings WHERE key = 'minimizeTo'").run()
    closeListener = null
    spyHide = vi.fn()
    spyMinimize = vi.fn()

    // Override the exported BrowserWindow class with a mocked subclass
    const MockBrowserWindow = class extends OriginalBrowserWindow {
      constructor(opts: any) {
        super(opts)
        
        // Intercept instance-level handlers
        this.on = (event: string, cb: any) => {
          if (event === 'close') {
            closeListener = cb
          }
          return this
        }
        
        this.hide = spyHide
        this.minimize = spyMinimize
      }
    }

    // Set it on the electron namespace
    Object.defineProperty(electron, 'BrowserWindow', {
      value: MockBrowserWindow,
      configurable: true,
      writable: true
    })
  })

  afterEach(() => {
    Object.defineProperty(electron, 'BrowserWindow', {
      value: OriginalBrowserWindow,
      configurable: true,
      writable: true
    })
  })

  it('defaults to taskbar for minimizeTo setting', () => {
    const value = getSetting('minimizeTo', 'taskbar')
    expect(value).toBe('taskbar')
  })

  it('saves and retrieves minimizeTo setting successfully', () => {
    setSetting('minimizeTo', 'tray')
    const value = getSetting('minimizeTo', 'taskbar')
    expect(value).toBe('tray')
  })

  it('registers window close event that hides when tray is configured', () => {
    setSetting('minimizeTo', 'tray')
    createMainWindow()
    
    expect(closeListener).toBeDefined()
    
    const mockEvent = { preventDefault: vi.fn() }
    closeListener!(mockEvent)
    
    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(spyHide).toHaveBeenCalled()
    expect(spyMinimize).not.toHaveBeenCalled()
  })

  it('registers window close event that minimizes when taskbar is configured', () => {
    setSetting('minimizeTo', 'taskbar')
    createMainWindow()
    
    expect(closeListener).toBeDefined()
    
    const mockEvent = { preventDefault: vi.fn() }
    closeListener!(mockEvent)
    
    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(spyMinimize).toHaveBeenCalled()
    expect(spyHide).not.toHaveBeenCalled()
  })
})
