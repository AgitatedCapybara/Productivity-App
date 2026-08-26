// tests/unit/bounds.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { screen, BrowserWindow } from 'electron'
import { getDb } from '../../src/main/db/database'
import { getSavedBounds, trackWindowBounds } from '../../src/main/windows/bounds'

describe('Multi-Monitor Window Bounds Persistence', () => {
  let listeners: Record<string, Function[]> = {}

  beforeEach(() => {
    const db = getDb()
    db.prepare("DELETE FROM settings WHERE key LIKE 'window:%'").run()

    listeners = {}
    vi.restoreAllMocks()
    vi.useFakeTimers()

    // Mock screen defaults
    vi.spyOn(screen, 'getPrimaryDisplay').mockReturnValue({
      id: 1,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1040 }
    } as any)

    vi.spyOn(screen, 'getAllDisplays').mockReturnValue([
      {
        id: 1,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1040 }
      } as any
    ])

    vi.spyOn(screen, 'getDisplayMatching').mockImplementation((rect: any) => {
      const activeScreens = screen.getAllDisplays()
      const primary = activeScreens[0]
      const secondary = activeScreens.find(d => d.id === 2)
      if (secondary && rect && rect.x >= 1920) {
        return secondary
      }
      return primary
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('falls back to centering on primary display when no stored bounds exist', () => {
    const result = getSavedBounds('main', { width: 900, height: 680 })
    expect(result.width).toBe(900)
    expect(result.height).toBe(680)
    // Primary display is 1920x1080, workArea.width/height is 1920x1040.
    // Centering calculation: x = (1920 - 900) / 2 = 510. y = (1040 - 680) / 2 = 180.
    expect(result.x).toBe(510)
    expect(result.y).toBe(180)
  })

  it('restores valid saved bounds from database', () => {
    const db = getDb()
    const testBounds = { x: 300, y: 200, width: 900, height: 680 }
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
      .run('window:main:bounds', JSON.stringify(testBounds))

    const result = getSavedBounds('main', { width: 900, height: 680 })
    expect(result).toEqual(testBounds)
  })

  it('re-centers stored bounds when they are completely off-screen on a disconnected display', () => {
    const db = getDb()
    const secondaryBounds = { x: 2000, y: 150, width: 800, height: 600 }
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
      .run('window:main:bounds', JSON.stringify(secondaryBounds))

    // Scenario 1: Dual monitor setup (getAllDisplays includes secondary)
    const primary = {
      id: 1,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1040 }
    }
    const secondary = {
      id: 2,
      bounds: { x: 1920, y: 0, width: 1920, height: 1080 },
      workArea: { x: 1920, y: 0, width: 1920, height: 1080 }
    }

    vi.spyOn(screen, 'getAllDisplays').mockReturnValue([primary as any, secondary as any])

    let result = getSavedBounds('main', { width: 800, height: 600 })
    expect(result).toEqual(secondaryBounds)

    // Scenario 2: Disconnected second monitor (getAllDisplays only has primary)
    vi.spyOn(screen, 'getAllDisplays').mockReturnValue([primary as any])

    result = getSavedBounds('main', { width: 800, height: 600 })
    expect(result.width).toBe(800)
    expect(result.height).toBe(600)
    // Centering calculation: x = (1920 - 800)/2 = 560, y = (1040 - 600)/2 = 220
    expect(result.x).toBe(560)
    expect(result.y).toBe(220)
  })

  it('handles negative stored positions gracefully if they still overlap display bounds', () => {
    const db = getDb()
    const partialNegBounds = { x: -50, y: -50, width: 800, height: 600 }
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
      .run('window:main:bounds', JSON.stringify(partialNegBounds))

    const result = getSavedBounds('main', { width: 800, height: 600 })
    expect(result).toEqual(partialNegBounds)
  })

  it('re-centers completely out of bounds negative stored positions', () => {
    const db = getDb()
    const offscreenNegBounds = { x: -1000, y: -1000, width: 800, height: 600 }
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
      .run('window:main:bounds', JSON.stringify(offscreenNegBounds))

    const result = getSavedBounds('main', { width: 800, height: 600 })
    expect(result.x).toBe(560)
    expect(result.y).toBe(220)
  })

  it('re-centers zero-dimension or invalid stored window sizes', () => {
    const db = getDb()
    const zeroBounds = { x: 100, y: 100, width: 0, height: 0 }
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
      .run('window:main:bounds', JSON.stringify(zeroBounds))

    const result = getSavedBounds('main', { width: 800, height: 600 })
    expect(result.width).toBe(800)
    expect(result.height).toBe(600)
    expect(result.x).toBe(560)
    expect(result.y).toBe(220)
  })

  it('debounces writes and stores window coordinates correctly during relocation', () => {
    const win = new BrowserWindow()
    
    vi.spyOn(win, 'isDestroyed').mockReturnValue(false)
    vi.spyOn(win, 'getBounds').mockReturnValue({ x: 250, y: 250, width: 800, height: 600 })
    
    vi.spyOn(win, 'on').mockImplementation((event: string, cb: any) => {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(cb)
      return win
    })

    trackWindowBounds(win, 'main')

    // Trigger moved
    if (listeners['moved']) {
      listeners['moved'].forEach(cb => cb())
    }

    // Expect no database write yet
    const db = getDb()
    let row: any = db.prepare("SELECT value FROM settings WHERE key = 'window:main:bounds'").get()
    expect(row).toBeFalsy()

    // Advance 500ms
    vi.advanceTimersByTime(500)

    row = db.prepare("SELECT value FROM settings WHERE key = 'window:main:bounds'").get() as any
    expect(row).toBeDefined()
    expect(JSON.parse(row.value)).toEqual({ x: 250, y: 250, width: 800, height: 600 })
  })

  it('saves immediately when window is closed', () => {
    const win = new BrowserWindow()
    
    vi.spyOn(win, 'isDestroyed').mockReturnValue(false)
    vi.spyOn(win, 'getBounds').mockReturnValue({ x: 400, y: 400, width: 800, height: 600 })
    
    vi.spyOn(win, 'on').mockImplementation((event: string, cb: any) => {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(cb)
      return win
    })

    trackWindowBounds(win, 'main')

    if (listeners['moved']) {
      listeners['moved'].forEach(cb => cb())
    }
    if (listeners['close']) {
      listeners['close'].forEach(cb => cb())
    }

    const db = getDb()
    const row = db.prepare("SELECT value FROM settings WHERE key = 'window:main:bounds'").get() as any
    expect(row).toBeDefined()
    expect(JSON.parse(row.value)).toEqual({ x: 400, y: 400, width: 800, height: 600 })
  })
})
