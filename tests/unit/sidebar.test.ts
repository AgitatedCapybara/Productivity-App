// tests/unit/sidebar.test.ts
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

describe('Collapsible Sidebar Layout Controls', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.resetModules()
  })

  it('defaults to collapsed (false) when local storage is empty', async () => {
    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    const state = useAppStore.getState()
    
    expect(state.sidebarExpanded).toBe(false)
  })

  it('commits changes to local storage when toggling sidebar expanded setting', async () => {
    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    const state = useAppStore.getState()

    // Transition state
    state.toggleSidebarExpanded()

    // Read updated state and verify localStorage persistence
    const updatedState = useAppStore.getState()
    expect(updatedState.sidebarExpanded).toBe(true)
    expect(localStorageMock.getItem('keystone_sidebar_expanded')).toBe('true')

    // Transition state back
    updatedState.toggleSidebarExpanded()
    const finalState = useAppStore.getState()
    expect(finalState.sidebarExpanded).toBe(false)
    expect(localStorageMock.getItem('keystone_sidebar_expanded')).toBe('false')
  })

  it('safely restores from local storage during initial load', async () => {
    localStorageMock.setItem('keystone_sidebar_expanded', 'true')

    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    const state = useAppStore.getState()

    expect(state.sidebarExpanded).toBe(true)
  })
})
