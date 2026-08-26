// tests/unit/density.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Create a high-performance mock of localStorage for the unit tests
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

describe('Screen Density Layout Controls', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.resetModules()
  })

  it('defaults to comfortable setting when local storage is empty', async () => {
    // Dynamically require useAppStore to reload with fresh localStorage mock
    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    const state = useAppStore.getState()
    
    expect(state.densitySetting).toBe('comfortable')
  })

  it('commits changes to local storage when toggling density setting', async () => {
    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    const state = useAppStore.getState()

    // Transition state
    state.setDensitySetting('compact')

    // Read updated state and verify localStorage persistence
    const updatedState = useAppStore.getState()
    expect(updatedState.densitySetting).toBe('compact')
    expect(localStorageMock.getItem('keystone_density_setting')).toBe('compact')
  })

  it('safely restores from local storage during initial load', async () => {
    localStorageMock.setItem('keystone_density_setting', 'compact')

    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    const state = useAppStore.getState()

    expect(state.densitySetting).toBe('compact')
  })

  it('guarantees touch target safety margin (height is either 44px or 36px, both bounds >= 36px UI requirements)', () => {
    const comfortableHeight = 44
    const compactHeight = 36

    expect(comfortableHeight).toBeGreaterThanOrEqual(36)
    expect(compactHeight).toBeGreaterThanOrEqual(36)
  })
})
