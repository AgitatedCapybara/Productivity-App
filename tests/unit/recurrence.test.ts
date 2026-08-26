// tests/unit/recurrence.test.ts
import { describe, it, expect } from 'vitest'
import { getNextOccurrenceDate } from '../../src/renderer/src/lib/recurrence'

describe('Recurrence Calculations', () => {
  it('correctly adds a day for daily recurrence', () => {
    expect(getNextOccurrenceDate('2026-06-30', 'daily')).toBe('2026-07-01')
    expect(getNextOccurrenceDate('2026-06-30', 'every day')).toBe('2026-07-01')
  })

  it('correctly skips weekend days for every weekday', () => {
    // 2026-07-03 is a Friday. Next weekday should be Monday, 2026-07-06
    expect(getNextOccurrenceDate('2026-07-03', 'every weekday')).toBe('2026-07-06')
    // 2026-07-01 is a Wednesday. Next weekday should be Thursday, 2026-07-02
    expect(getNextOccurrenceDate('2026-07-01', 'every weekday')).toBe('2026-07-02')
  })

  it('correctly adds 7 days for weekly recurrence', () => {
    expect(getNextOccurrenceDate('2026-06-25', 'weekly')).toBe('2026-07-02')
  })

  it('correctly adds a month for monthly recurrence', () => {
    expect(getNextOccurrenceDate('2026-01-15', 'monthly')).toBe('2026-02-15')
  })

  it('handles specific weekdays (e.g. every monday)', () => {
    // 2026-07-02 is Thursday. Next Monday is 2026-07-06
    expect(getNextOccurrenceDate('2026-07-02', 'every monday')).toBe('2026-07-06')
  })

  it('handles custom weekly days (e.g. custom_weekly:1,3)', () => {
    // 2026-07-02 is Thursday (4). Next Mon (1) or Wed (3) is Monday 2026-07-06 (since it checks days sequentially starting next day)
    expect(getNextOccurrenceDate('2026-07-02', 'custom_weekly:1,3')).toBe('2026-07-06')
  })

  it('handles custom monthly days', () => {
    expect(getNextOccurrenceDate('2026-07-10', 'custom_monthly:15,30')).toBe('2026-07-15')
    expect(getNextOccurrenceDate('2026-07-16', 'custom_monthly:15,30')).toBe('2026-07-30')
  })

  it('handles numeric phrases (e.g. every 3 days)', () => {
    expect(getNextOccurrenceDate('2026-07-01', 'every 3 days')).toBe('2026-07-04')
  })
})
