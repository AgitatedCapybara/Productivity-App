// tests/unit/overlay-window.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import * as electron from 'electron'
import { createOverlayWindow, toggleOverlayWindow, resetOverlayWindowForTesting } from '../../src/main/windows/overlay-window'

const OriginalBrowserWindow = electron.BrowserWindow

describe('Overlay Window', () => {
  let spyShow: any
  let spyHide: any
  let spySetBounds: any
  let isVisibleValue = false

  beforeEach(() => {
    resetOverlayWindowForTesting()
    spyShow = vi.fn().mockImplementation(() => { isVisibleValue = true })
    spyHide = vi.fn().mockImplementation(() => { isVisibleValue = false })
    spySetBounds = vi.fn()
    isVisibleValue = false

    const MockBrowserWindow = class extends OriginalBrowserWindow {
      constructor(opts: any) {
        super(opts)
        this.show = spyShow
        this.hide = spyHide
        this.setBounds = spySetBounds
        this.isVisible = () => isVisibleValue
        this.isDestroyed = () => false
        this.focus = vi.fn()
        this.on = vi.fn()
      }
    }

    Object.defineProperty(electron, 'BrowserWindow', {
      value: MockBrowserWindow,
      configurable: true,
      writable: true
    })

    // Mock electron screen
    vi.spyOn(electron.screen, 'getCursorScreenPoint').mockReturnValue({ x: 100, y: 100 })
    vi.spyOn(electron.screen, 'getDisplayNearestPoint').mockReturnValue({
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1080 }
    } as any)
  })

  afterEach(() => {
    Object.defineProperty(electron, 'BrowserWindow', {
      value: OriginalBrowserWindow,
      configurable: true,
      writable: true
    })
    vi.restoreAllMocks()
  })

  it('creates the overlay window with correct configuration', () => {
    const win = createOverlayWindow()
    expect(win).toBeDefined()
    expect(win.show).toBeDefined()
  })

  it('toggles visibility and repositions the window to the right edge', () => {
    toggleOverlayWindow()
    expect(spySetBounds).toHaveBeenCalledWith({
      x: 1600, // 1920 - 320
      y: 0,
      width: 320,
      height: 1080
    })
    expect(spyShow).toHaveBeenCalled()

    // Toggle again should hide it
    toggleOverlayWindow()
    expect(spyHide).toHaveBeenCalled()
  })
})
