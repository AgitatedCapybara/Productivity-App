// tests/unit/shortcuts.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Keyboard Shortcuts Store State Transitions', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('defaults isShortcutsOpen to false on store instantiation', async () => {
    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    const state = useAppStore.getState()
    
    expect(state.isShortcutsOpen).toBe(false)
  })

  it('correctly transitions state when setShortcutsOpen is called with true', async () => {
    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    
    useAppStore.getState().setShortcutsOpen(true)
    expect(useAppStore.getState().isShortcutsOpen).toBe(true)
  })

  it('correctly transitions state when setShortcutsOpen is called with false after true', async () => {
    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    
    useAppStore.getState().setShortcutsOpen(true)
    expect(useAppStore.getState().isShortcutsOpen).toBe(true)

    useAppStore.getState().setShortcutsOpen(false)
    expect(useAppStore.getState().isShortcutsOpen).toBe(false)
  })
})
