// tests/integration/optimistic.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../../src/renderer/src/store/useAppStore'

describe('Optimistic Task State & Temp-ID Reconciliation Protocol', () => {
  beforeEach(() => {
    // Reset Zustand store state before each run
    useAppStore.setState({
      tasks: [],
      completedTasks: [],
      deletedTasks: []
    })
  })

  it('correctly reconciles client-side temporary tasks with server-settled instances', () => {
    const store = useAppStore.getState()
    const tempId = 'temp-892348a'

    // Simulate clicking "Add Task" to generate an optimistic item immediately in the UI
    const tempTask = {
      id: tempId,
      client_id: tempId,
      title: 'Synchronize cloud calendars',
      status: 'todo' as const,
      priority: 2 as const,
      project_id: 'inbox-default',
      due_date: '2026-06-20',
      due_time: null,
      time_estimate_mins: 45,
      time_logged_mins: 0,
      notes: '',
      is_archived: 0 as const,
      sequence: 0,
      sort_order: 1000,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      energy_tag: null,
      location: null,
      reminder: null,
      recurrence: null
    }

    store.addTask(tempTask)
    expect(useAppStore.getState().tasks.length).toBe(1)
    expect(useAppStore.getState().tasks[0].id).toBe(tempId)

    // Simulate backend response payload (real ID, matching properties)
    const backendTask = {
      id: 'db-real-97123984',
      title: 'Synchronize cloud calendars',
      status: 'todo' as const,
      priority: 2 as const,
      project_id: 'inbox-default',
      due_date: '2026-06-20',
      due_time: null,
      time_estimate_mins: 45,
      time_logged_mins: 0,
      notes: '',
      is_archived: 0 as const,
      sequence: 0,
      sort_order: 1000,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      energy_tag: null,
      location: null,
      reminder: null,
      recurrence: null
    }

    // Call setTasks to reconcile
    store.setTasks([backendTask])

    const updatedTasks = useAppStore.getState().tasks
    // Output should contain only ONE task (reconciled), not duplicates
    expect(updatedTasks.length).toBe(1)
    
    const finalTask = updatedTasks[0]
    expect(finalTask.id).toBe('db-real-97123984')
    expect(finalTask.client_id).toBe(tempId) // Preserved client_id link!
  })
})
