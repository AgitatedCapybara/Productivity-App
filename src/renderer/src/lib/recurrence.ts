// src/renderer/src/lib/recurrence.ts

/**
 * Calculates the next occurrence date for a recurring task based on its frequency.
 * @param baseDateStr The current due date of the task, in YYYY-MM-DD format.
 * @param recurrence The recurrence pattern (e.g. 'daily', 'weekly', 'every weekday', 'custom_weekly:1,3', etc.)
 * @returns The next occurrence date as a YYYY-MM-DD string.
 */
export function getNextOccurrenceDate(baseDateStr: string | null, recurrence: string): string {
  let date: Date
  if (!baseDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(baseDateStr)) {
    const d = new Date()
    date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  } else {
    const parts = baseDateStr.split('-').map(Number)
    date = new Date(parts[0], parts[1] - 1, parts[2])
  }

  if (isNaN(date.getTime())) {
    const d = new Date()
    date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  const recLower = recurrence.trim().toLowerCase()

  if (recLower === 'daily' || recLower === 'every day' || recLower === 'everyday') {
    date.setDate(date.getDate() + 1)
  } else if (recLower === 'every weekday' || recLower === 'weekday') {
    do {
      date.setDate(date.getDate() + 1)
    } while (date.getDay() === 0 || date.getDay() === 6)
  } else if (recLower === 'weekly' || recLower === 'every week') {
    date.setDate(date.getDate() + 7)
  } else if (recLower === 'monthly' || recLower === 'every month') {
    date.setMonth(date.getMonth() + 1)
  } else if (/every \d+ (day|week|month)s?/.test(recLower)) {
    const numberMatch = recLower.match(/every (\d+) (day|week|month)s?/)
    if (numberMatch) {
      const amount = parseInt(numberMatch[1], 10)
      const unit = numberMatch[2]
      if (unit === 'day') {
        date.setDate(date.getDate() + amount)
      } else if (unit === 'week') {
        date.setDate(date.getDate() + amount * 7)
      } else if (unit === 'month') {
        date.setMonth(date.getMonth() + amount)
      } else {
        date.setDate(date.getDate() + 1)
      }
    } else {
      date.setDate(date.getDate() + 1)
    }
  } else if (recLower.startsWith('every ')) {
    const weekdayName = recLower.substring(6).toLowerCase().trim()
    const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const targetDayIndex = DAYS.indexOf(weekdayName)
    if (targetDayIndex !== -1) {
      do {
        date.setDate(date.getDate() + 1)
      } while (date.getDay() !== targetDayIndex)
    } else {
      date.setDate(date.getDate() + 1)
    }
  } else if (recLower.startsWith('custom_weekly:')) {
    const days = recLower.substring('custom_weekly:'.length).split(',').map(Number)
    if (days.length > 0 && days.every(d => !isNaN(d))) {
      let found = false
      let iterations = 0
      while (!found && iterations < 365) {
        iterations++
        date.setDate(date.getDate() + 1)
        if (days.includes(date.getDay())) {
          found = true
        }
      }
    } else {
      date.setDate(date.getDate() + 7)
    }
  } else if (recLower.startsWith('custom_monthly:')) {
    const days = recLower.substring('custom_monthly:'.length).split(',').map(Number)
    if (days.length > 0 && days.every(d => !isNaN(d))) {
      let found = false
      let iterations = 0
      while (!found && iterations < 365) {
        iterations++
        date.setDate(date.getDate() + 1)
        if (days.includes(date.getDate())) {
          found = true
        }
      }
    } else {
      date.setMonth(date.getMonth() + 1)
    }
  } else {
    date.setDate(date.getDate() + 1)
  }

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
