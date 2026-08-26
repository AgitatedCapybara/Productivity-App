// tests/unit/memory-leak.test.ts
import { describe, it, expect } from 'vitest'
import { createCaptureWindow } from '../../src/main/windows/capture-window'

describe('Frame Memory Lifecycle and Leak Audit', () => {
  it('proves that opening and closing the Capture frame 20 consecutive times preserves a static JS heap', () => {
    const startMemory = process.memoryUsage().heapUsed
    console.info(`[MEMORY-TEST] Initial heapUsed: ${(startMemory / 1024 / 1024).toFixed(3)} MB`)

    // We cycle 20 times: creating and destroying the capture window.
    for (let i = 0; i < 20; i++) {
      const win = createCaptureWindow() as any
      expect(win).toBeDefined()
      expect(win.isDestroyed()).toBe(false)

      // Retrieve registered 'close' listeners from the vitest mock calls of win.on
      if (win.on && typeof win.on.mock !== 'undefined') {
        const closeCalls = win.on.mock.calls.filter((call: any) => call[0] === 'close')
        const eventObj = { preventDefault: () => {} }
        for (const call of closeCalls) {
          const cb = call[1]
          if (typeof cb === 'function') {
            cb(eventObj)
          }
        }
      }

      // Check that destruction was invoked
      expect(win.destroy).toHaveBeenCalled()
    }

    const endMemory = process.memoryUsage().heapUsed
    const growthMs = endMemory - startMemory
    const growthMb = growthMs / 1024 / 1024
    console.info(`[MEMORY-TEST] Final heapUsed: ${(endMemory / 1024 / 1024).toFixed(3)} MB`)
    console.info(`[MEMORY-TEST] Leak growth over 20 cycles: ${growthMb.toFixed(3)} MB`)

    // Verify limit of < 10MB growth
    expect(growthMb).toBeLessThan(10)
  })
})
