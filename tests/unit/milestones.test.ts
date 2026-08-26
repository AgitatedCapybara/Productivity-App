// tests/unit/milestones.test.ts
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

describe('Usage Milestones Event Listeners', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.resetModules()
  })

  it('increments tasksCreated milestone when keystone:task-created event is received', async () => {
    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    const stateBefore = useAppStore.getState().usageMilestones.tasksCreated
    expect(stateBefore).toBe(0)

    // Dispatch the CustomEvent on the window
    window.dispatchEvent(new CustomEvent('keystone:task-created'))

    // Expect tasksCreated to be incremented
    const stateAfter = useAppStore.getState().usageMilestones.tasksCreated
    expect(stateAfter).toBe(1)
  })

  it('increments notesCreated milestone when keystone:note-created event is received', async () => {
    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    const stateBefore = useAppStore.getState().usageMilestones.notesCreated
    expect(stateBefore).toBe(0)

    // Dispatch the CustomEvent on the window
    window.dispatchEvent(new CustomEvent('keystone:note-created'))

    // Expect notesCreated to be incremented
    const stateAfter = useAppStore.getState().usageMilestones.notesCreated
    expect(stateAfter).toBe(1)
  })
})
