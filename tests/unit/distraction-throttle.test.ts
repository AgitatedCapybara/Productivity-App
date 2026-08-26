// tests/unit/distraction-throttle.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Distraction Update Throttle Engine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetModules()
  })

  it('allows resetting distraction count to 0 instantly', async () => {
    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    
    // Reset to 0 initially
    useAppStore.getState().setSessionDistractionCount(0)
    expect(useAppStore.getState().activeSessionDistractionCount).toBe(0)
  })

  it('throttles rapid sequential updates to once every 5 minutes', async () => {
    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    
    // Ensure starting at 0 is instant
    useAppStore.getState().setSessionDistractionCount(0)
    expect(useAppStore.getState().activeSessionDistractionCount).toBe(0)

    // First distraction update (should be throttled / not instant because we just updated at t=0)
    useAppStore.getState().setSessionDistractionCount(1)
    // At t=0, 1 is scheduled but not applied yet
    expect(useAppStore.getState().activeSessionDistractionCount).toBe(0)

    // Rapid input (increase to 5)
    useAppStore.getState().setSessionDistractionCount(5)
    expect(useAppStore.getState().activeSessionDistractionCount).toBe(0)

    // Advance time by 4 minutes (240,000 ms)
    vi.advanceTimersByTime(240000)
    expect(useAppStore.getState().activeSessionDistractionCount).toBe(0)

    // Advance time by another 1 minute (total 5 minutes since t=0)
    vi.advanceTimersByTime(60000)
    // Trailing edge triggers and applies the latest value (5)
    expect(useAppStore.getState().activeSessionDistractionCount).toBe(5)
  })
})
