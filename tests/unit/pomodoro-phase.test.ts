// tests/unit/pomodoro-phase.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
class LocalStorageMock {
  private store: Record<string, string> = {}

  clear() {
    this.store = {}
  }

  getItem(key: string) {
    return this.store[key] || null
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value)
  }

  removeItem(key: string) {
    delete this.store[key]
  }
}

const localStorageMock = new LocalStorageMock()
vi.stubGlobal('localStorage', localStorageMock)

// Mock electronAPI
const electronAPIMock = {
  resetSessionStartTime: vi.fn().mockResolvedValue(true)
}
vi.stubGlobal('electronAPI', electronAPIMock)
vi.stubGlobal('window', { electronAPI: electronAPIMock })

describe('Pomodoro Study/Break Timer Phase Transitions', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('initializes study/break values correctly and supports state updates', async () => {
    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    
    // Default values
    expect(useAppStore.getState().targetStudyDurationMins).toBe(25)
    expect(useAppStore.getState().targetBreakDurationMins).toBe(5)
    expect(useAppStore.getState().currentPhase).toBe('study')

    // Set values
    useAppStore.getState().setTargetStudyDurationMins(45)
    useAppStore.getState().setTargetBreakDurationMins(15)

    expect(useAppStore.getState().targetStudyDurationMins).toBe(45)
    expect(useAppStore.getState().targetBreakDurationMins).toBe(15)
  })

  it('seamlessly transitions from study to break phase at boundary completion', async () => {
    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    
    // Set explicit study duration and break duration
    useAppStore.getState().setTargetStudyDurationMins(25)
    useAppStore.getState().setTargetBreakDurationMins(5)
    useAppStore.getState().setCurrentPhase('study')
    
    // Set a session ID to simulate an active session
    useAppStore.setState({ activeSessionId: 'session-123' })

    // Set elapsed seconds just before completion (25 * 60 - 1)
    useAppStore.getState().setSessionElapsedSeconds(25 * 60 - 1)
    expect(useAppStore.getState().currentPhase).toBe('study')

    // Tick exactly to boundary completion (25 * 60)
    useAppStore.getState().setSessionElapsedSeconds(25 * 60)

    // Current phase must transition to break
    expect(useAppStore.getState().currentPhase).toBe('break')
    // Elapsed seconds must reset to 0
    expect(useAppStore.getState().activeSessionElapsedSeconds).toBe(0)
    // Target duration mins must update to break duration (5)
    expect(useAppStore.getState().activeSessionTargetDurationMins).toBe(5)
  })

  it('seamlessly transitions from break to study phase at boundary completion', async () => {
    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    
    // Set explicit durations
    useAppStore.getState().setTargetStudyDurationMins(25)
    useAppStore.getState().setTargetBreakDurationMins(5)
    useAppStore.getState().setCurrentPhase('break')
    
    useAppStore.setState({ activeSessionId: 'session-123' })

    // Tick exactly to boundary completion (5 * 60)
    useAppStore.getState().setSessionElapsedSeconds(5 * 60)

    // Current phase must transition back to study
    expect(useAppStore.getState().currentPhase).toBe('study')
    expect(useAppStore.getState().activeSessionElapsedSeconds).toBe(0)
    expect(useAppStore.getState().activeSessionTargetDurationMins).toBe(25)
  })
})
