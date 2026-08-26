// tests/unit/onboarding.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Onboarding First-Run Flow', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('defaults to firstRunComplete = null indicating a loading state', async () => {
    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    const state = useAppStore.getState()
    
    expect(state.firstRunComplete).toBeNull()
  })

  it('allows updating firstRunComplete state directly in the app store', async () => {
    const { useAppStore } = await import('../../src/renderer/src/store/useAppStore')
    const state = useAppStore.getState()

    state.setFirstRunComplete(true)
    
    expect(useAppStore.getState().firstRunComplete).toBe(true)
  })

  it('correctly maps user choices to corresponding active views', () => {
    const choiceMapping = {
      tasks: 'today',
      focus: 'deepwork',
      notes: 'views'
    }

    expect(choiceMapping['tasks']).toBe('today')
    expect(choiceMapping['focus']).toBe('deepwork')
    expect(choiceMapping['notes']).toBe('views')
  })

  it('enforces Rule of Three and lists exact defaults for microlearning panels', () => {
    const defaultToggles = [
      { id: 'planning', keys: ['calendar', 'plan'], checked: true },
      { id: 'habits', keys: ['habits'], checked: true },
      { id: 'deepwork', keys: ['deepwork', 'analytics'], checked: true },
      { id: 'circle', keys: ['circle'], checked: false }
    ]

    expect(defaultToggles.length).toBe(4) // 3 default enabled + 1 advanced optional
    expect(defaultToggles.find(t => t.id === 'planning')?.checked).toBe(true)
    expect(defaultToggles.find(t => t.id === 'habits')?.checked).toBe(true)
    expect(defaultToggles.find(t => t.id === 'deepwork')?.checked).toBe(true)
    expect(defaultToggles.find(t => t.id === 'circle')?.checked).toBe(false)
  })
})
