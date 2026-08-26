// tests/unit/scheduler.test.ts
import { describe, it, expect } from 'vitest'
import { parseTaskMetadata, getSuggestionsForTask } from '../../src/main/services/scheduler'
import type { Task } from '../../src/main/db/schema'

describe('Scheduler Suggestion Engine & Metadata parser', () => {
  it('correctly parses task titles and notes into metadata', () => {
    const mockTask: Task = {
      id: 'task-1',
      project_id: null,
      title: 'Draft retrospective and write code #documentation high focus',
      notes: 'Make sure to handle edge-cases for sprint prep work',
      status: 'todo',
      priority: 3,
      due_date: '2026-06-25',
      due_time: '14:00:00',
      time_estimate_mins: 45,
      completed_at: null,
      created_at: '2026-06-19T10:00:00Z',
      updated_at: '2026-06-19T10:00:00Z',
      sort_order: 1000,
      time_logged_mins: 0,
      recurrence: null
    }

    const meta = parseTaskMetadata(mockTask)
    expect(meta.isHighFocus).toBe(true)
    expect(meta.isLowEnergy).toBe(false)
    expect(meta.labels).toContain('documentation')
    expect(meta.timeEstimateMins).toBe(45)
    expect(meta.dueDate?.getFullYear()).toBe(2026)
    expect(meta.dueDate?.getMonth()).toBe(5) // June is 5
    expect(meta.dueDate?.getDate()).toBe(25)
    expect(meta.dueDate?.getHours()).toBe(14)
    expect(meta.dueDate?.getMinutes()).toBe(0)
  })

  it('correctly scores candidate slots for suggestions', () => {
    const mockTask: Task = {
      id: 'high-focus-retrospective',
      project_id: null,
      title: 'Code review #pr-check high focus for 60m',
      notes: '',
      status: 'todo',
      priority: 2,
      due_date: null,
      due_time: null,
      time_estimate_mins: 60,
      completed_at: null,
      created_at: '2026-06-19T10:00:00Z',
      updated_at: '2026-06-19T10:00:00Z',
      sort_order: 1000,
      time_logged_mins: 0,
      recurrence: null
    }

    const currentMockTime = new Date('2026-06-20T08:00:00') // 8 AM on June 20th
    const prefs = {
      work_hours_start: '09:00',
      work_hours_end: '17:00',
      deep_work_window_start: '09:00',
      deep_work_window_end: '12:00',
      ignore_energy_patterns: 'false'
    }

    const events = [
      {
        id: 'ev-1',
        title: 'Daily Standup Meeting',
        start_at: '2026-06-20T09:30:00',
        end_at: '2026-06-20T10:00:00',
        source: 'local',
        location: null,
        description: null,
        project_id: null,
        recurrence: '',
        created_at: '2026-06-19T10:00:00Z',
        updated_at: '2026-06-19T10:00:00Z'
      }
    ]

    const historySessions = [
      { hour: 10, rating: 5 },
      { hour: 10, rating: 4 }
    ]

    const suggestions = getSuggestionsForTask(mockTask, events, prefs, historySessions, currentMockTime)
    
    // We should receive candidate slot suggestions
    expect(suggestions.length).toBeGreaterThan(0)
    
    const highScored = suggestions[0]
    expect(highScored.task_id).toBe('high-focus-retrospective')
    expect(highScored.confidence).toBeGreaterThanOrEqual(0)
  })
})
