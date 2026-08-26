// tests/unit/parser.test.ts
import { describe, it, expect } from 'vitest'
import { parseTaskInput } from '../../src/renderer/src/hooks/useTasks'

describe('parseTaskInput Natural Language Processing Heuristics', () => {
  it('correctly parses simple tasks with no specifiers', () => {
    const result = parseTaskInput('Buy groceries')
    expect(result.title).toBe('Buy groceries')
    expect(result.priority).toBe(0)
    expect(result.due_date).toBeNull()
  })

  it('parses priority and removes the syntax from main title', () => {
    // p1 corresponds to priority level 3 in the custom logic inside useTasks
    const result = parseTaskInput('Fix critical bug p1')
    expect(result.priority).toBe(3)
    expect(result.title).toBe('Fix critical bug')
  })

  it('parses labels (hashtags) and stores them in labels list', () => {
    const result = parseTaskInput('Draft sprint retrospective #work #meeting')
    expect(result.labels).toContain('work')
    expect(result.labels).toContain('meeting')
    expect(result.title).toBe('Draft sprint retrospective')
  })

  it('differentiates known @project tags from general @locations', () => {
    const knownProjects = ['Vapor', 'Keystone', 'Apollo']
    const result = parseTaskInput('Write testing config @Keystone @home', false, [], knownProjects)
    expect(result.projectTag).toBe('Keystone')
    expect(result.location).toBe('home')
    expect(result.title).toBe('Write testing config')
  })

  it('correctly extracts energy requirement and duration estimate', () => {
    const result = parseTaskInput('Database maintenance low energy for 30m')
    expect(result.energy_tag).toBe('low energy')
    expect(result.time_estimate_mins).toBe(30)
    expect(result.title).toBe('Database maintenance')
  })

  it('correctly parses durations in hours', () => {
    const result = parseTaskInput('Write technical documentation for 2h')
    expect(result.time_estimate_mins).toBe(120)
    expect(result.title).toBe('Write technical documentation')
  })

  it('extracts reminder cues and recurrences', () => {
    const result = parseTaskInput('Review compliance audit every Monday remind 1h before')
    expect(result.recurrence).toBe('every Monday')
    expect(result.reminder).toBe('1h')
  })
})
