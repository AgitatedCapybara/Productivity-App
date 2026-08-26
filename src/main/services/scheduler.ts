// src/main/services/scheduler.ts
import { getDb } from '../db/database'
import { nanoid } from 'nanoid'
import type { Task, CalendarEvent } from '../db/schema'

export interface SuggestedBlock {
  id: string
  task_id: string
  suggested_start: string
  suggested_end: string
  rationale: string
  confidence: number
  status: 'pending' | 'accepted' | 'declined' | 'snoozed'
  created_at: string
  resolved_at: string | null
  conflict_risks?: string[]
}

// Helper to parse date strings nicely without crashing
function parseDateSafe(dStr: string | null): Date | null {
  if (!dStr) return null
  try {
    const d = new Date(dStr)
    return isNaN(d.getTime()) ? null : d
  } catch (_) {
    return null
  }
}

// Extract tags and features from task directly for scheduling heuristics
interface TaskParsedMetadata {
  isHighFocus: boolean
  isLowEnergy: boolean
  labels: string[]
  timeEstimateMins: number
  dueDate: Date | null
}

export function parseTaskMetadata(task: Task): TaskParsedMetadata {
  const text = `${task.title} ${task.notes || ''}`.toLowerCase()
  
  const isHighFocus = /\b(high focus|high energy|deep work)\b/i.test(text)
  const isLowEnergy = /\b(low energy|low focus|easy|wind[- ]?down)\b/i.test(text)
  
  // Extract #labels
  const labelMatches = [...text.matchAll(/#([\w-]+)/g)]
  const labels = labelMatches.map(m => m[1])

  // Parse due date
  let dueDate: Date | null = null
  if (task.due_date) {
    const timePart = task.due_time || '23:59:00'
    dueDate = parseDateSafe(`${task.due_date}T${timePart}`)
  }

  return {
    isHighFocus,
    isLowEnergy,
    labels,
    timeEstimateMins: task.time_estimate_mins || 30, // Default to 30 mins
    dueDate
  }
}

// Load scheduling preferences from DB
export function getSchedulingPref(key: string, defaultValue: string): string {
  try {
    const db = getDb()
    const row = db.prepare('SELECT value FROM scheduling_preferences WHERE key = ?').get(key) as { value: string } | undefined
    return row ? row.value : defaultValue
  } catch (_) {
    return defaultValue
  }
}

export function getAllSchedulingPrefsInDb(): Record<string, string> {
  const prefs: Record<string, string> = {}
  try {
    const db = getDb()
    const rows = db.prepare('SELECT key, value FROM scheduling_preferences').all() as { key: string; value: string }[]
    for (const r of rows) {
      prefs[r.key] = r.value
    }
  } catch (_) {}
  return prefs
}

// Save preferences
export function updateSchedulingPrefsInDb(prefs: Record<string, string>): void {
  const db = getDb()
  const stmt = db.prepare('INSERT OR REPLACE INTO scheduling_preferences (key, value) VALUES (?, ?)')
  const transaction = db.transaction((p: Record<string, string>) => {
    for (const [k, v] of Object.entries(p)) {
      stmt.run(k, v)
    }
  })
  transaction(prefs)
}

// Core scheduling logic (deterministic pure-ish calculation for testability)
export function getSuggestionsForTask(
  task: Task,
  events: CalendarEvent[],
  prefs: Record<string, string>,
  historySessions: { hour: number; rating: number }[],
  now: Date,
  allocatedSlots?: { start: number; end: number }[],
  declinedSlots?: { task_id: string; start: number; end: number }[]
): SuggestedBlock[] {
  const meta = parseTaskMetadata(task)
  
  const workStartStr = prefs['work_hours_start'] || '09:00'
  const workEndStr = prefs['work_hours_end'] || '17:00'
  const deepStartStr = prefs['deep_work_window_start'] || '09:00'
  const deepEndStr = prefs['deep_work_window_end'] || '12:00'
  const isIgnoreEnergy = prefs['ignore_energy_patterns'] === 'true'

  // Onboarding questions parameters: wake/sleep boundary, custom busy blocks
  const wakeStartStr = prefs['wake_up_time'] || '07:00'
  const sleepEndStr = prefs['sleep_time'] || '23:00'

  const [workStartHour, workStartMin] = workStartStr.split(':').map(Number)
  const [workEndHour, workEndMin] = workEndStr.split(':').map(Number)
  const [deepStartHour, _deepStartMin] = deepStartStr.split(':').map(Number)
  const [deepEndHour, _deepEndMin] = deepEndStr.split(':').map(Number)
  const [wakeStartHour, wakeStartMin] = wakeStartStr.split(':').map(Number)
  const [sleepEndHour, sleepEndMin] = sleepEndStr.split(':').map(Number)

  // Parse no-meeting blocks
  let noMeetingBlocks: { start: string; end: string }[] = []
  try {
    noMeetingBlocks = JSON.parse(prefs['no_meeting_blocks'] || '[]')
  } catch (_) {}

  // Parse custom busy periods (onboarding question)
  let busyPeriods: { id: string; name: string; start: string; end: string; linkedEventId?: string | null }[] = []
  try {
    busyPeriods = JSON.parse(prefs['busy_periods'] || '[]')
  } catch (_) {}

  // Analyze focus session logs for peak high quality hours
  // Find hours with above average energy ratings
  const peakHours = new Set<number>()
  if (!isIgnoreEnergy && historySessions.length > 0) {
    const avgRating = historySessions.reduce((acc, h) => acc + h.rating, 0) / historySessions.length
    // Group by hour
    const hourRatings: Record<number, number[]> = {}
    historySessions.forEach(s => {
      hourRatings[s.hour] = hourRatings[s.hour] || []
      hourRatings[s.hour].push(s.rating)
    })
    for (const [hStr, ratings] of Object.entries(hourRatings)) {
      const h = Number(hStr)
      const hAvg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      if (hAvg >= avgRating && hAvg >= 3.0) {
        peakHours.add(h)
      }
    }
  }

  // Generate candidate slots over the next 7 days
  const candidateSlots: { start: Date; end: Date }[] = []
  const daysToSchedule = 6 // today + next 5 days
  const durationMs = meta.timeEstimateMins * 60 * 1000

  for (let offset = 0; offset <= daysToSchedule; offset++) {
    const d = new Date(now)
    d.setDate(d.getDate() + offset)
    d.setHours(0, 0, 0, 0)

    // Build day bounds using wake & sleep boundary
    const dayStart = new Date(d)
    dayStart.setHours(wakeStartHour, wakeStartMin || 0, 0, 0)
    
    const dayEnd = new Date(d)
    dayEnd.setHours(sleepEndHour, sleepEndMin || 0, 0, 0)

    // Step in 30 minutes increments
    let currentStart = new Date(dayStart)
    while (currentStart.getTime() + durationMs <= dayEnd.getTime()) {
      const currentEnd = new Date(currentStart.getTime() + durationMs)
      
      // Candidate slot must be in the future!
      if (currentStart.getTime() > now.getTime()) {
        candidateSlots.push({ start: new Date(currentStart), end: currentEnd })
      }
      currentStart.setMinutes(currentStart.getMinutes() + 30)
    }
  }

  // Score candidate slots
  const scoredSlots: { start: Date; end: Date; score: number; rationales: string[]; hazards: string[] }[] = []

  for (const slot of candidateSlots) {
    let score = 0.5 // Start baseline
    const rationales: string[] = []
    const hazards: string[] = []
    let isDiscarded = false

    const slotStartMs = slot.start.getTime()
    const slotEndMs = slot.end.getTime()

    // 1. HARD CONFLICT CHECK - Overlap with existing calendar events
    for (const ev of events) {
      const evStart = new Date(ev.start_at).getTime()
      const evEnd = new Date(ev.end_at).getTime()
      if (slotStartMs < evEnd && slotEndMs > evStart) {
        isDiscarded = true
        break
      }
    }

    if (isDiscarded) continue

    // 1.5 GLOBAL ALLOCATED SLOTS CHECK (Avoid overlap with other tasks' slots)
    if (allocatedSlots) {
      for (const alloc of allocatedSlots) {
        if (slotStartMs < alloc.end && slotEndMs > alloc.start) {
          isDiscarded = true
          break
        }
      }
    }

    if (isDiscarded) continue

    // 1.7 DECLINED SLOTS CHECK (Do not suggest recently declined slots for this task)
    if (declinedSlots) {
      const isDeclined = declinedSlots.some(ds => 
        ds.task_id === task.id &&
        ds.start === slotStartMs &&
        ds.end === slotEndMs
      )
      if (isDeclined) {
        isDiscarded = true
      }
    }

    if (isDiscarded) continue

    // 2. DEADLINE AWARENESS
    if (meta.dueDate) {
      const dueMs = meta.dueDate.getTime()
      if (slotEndMs > dueMs) {
        // Late slot! Massively penalized or discarded
        isDiscarded = true
        continue
      }
      
      const timeRemainingMs = dueMs - slotStartMs
      const daysRemaining = timeRemainingMs / (24 * 3600 * 1000)
      
      if (daysRemaining <= 2) {
        // High urgency proximity bonus
        score += 0.35
        rationales.push(`Secures time 48h before your deadline on ${task.due_date}`)
      } else if (daysRemaining <= 4) {
        score += 0.15
        rationales.push(`Maintains a comfortable safe distance before deadline`)
      } else {
        score += 0.05
      }
    }

    // 3. PRIORITIZED DISPATCH
    // Earlier days get priority bonuses specifically scaled by task priority to sequence work correctly
    const dayOffset = Math.floor((slotStartMs - now.getTime()) / (24 * 3600 * 1000))
    if (task.priority > 0) {
      // 3 = highest priority, earlier dayOffset gets a boost
      const recencyBoost = Math.max(0, (5 - dayOffset) * (task.priority * 0.04))
      score += recencyBoost
      if (dayOffset <= 1 && task.priority >= 2) {
        rationales.push('High priority item sequenced early for fast dispatch')
      }
    }

    // 4. ENERGY MATCH & PREFERENCES
    const slotHour = slot.start.getHours()
    const slotMin = slot.start.getMinutes()
    const isDeepWorkHour = (slotHour >= deepStartHour && slotHour < deepEndHour)

    if (meta.isHighFocus) {
      if (!isIgnoreEnergy && peakHours.has(slotHour)) {
        score += 0.3
        rationales.push('Matches high focus tasks with your proven historical energy peaks')
      } else if (isDeepWorkHour) {
        score += 0.2
        rationales.push('Scheduled inside your preferred deep focus window')
      } else {
        score -= 0.1 // penalty for low energy hours
      }
    } else if (meta.isLowEnergy) {
      if (isDeepWorkHour) {
        // Avoid scheduling low focus items during primary deep focus times
        score -= 0.2
        hazards.push('Using core deep work window for low energy tasks')
      } else if (slotHour >= 14 && slotHour < 17) {
        score += 0.25
        rationales.push('Matches typical afternoon focus wind-down hours')
      } else {
        score += 0.1
      }
    }

    // Preferred productive work hours bonus
    const slotStartMinVal = slotHour * 60 + slotMin
    const slotEndMinVal = slotStartMinVal + meta.timeEstimateMins
    const workStartMinVal = workStartHour * 60 + workStartMin
    const workEndMinVal = workEndHour * 60 + workEndMin

    if (slotStartMinVal >= workStartMinVal && slotEndMinVal <= workEndMinVal) {
      score += 0.25
      rationales.push('Aligns perfectly with your preferred productive working hours')
    }

    // 5. EVENT BUFFER / CONFLICT DISTANCE
    let minDistanceMs = Infinity
    for (const ev of events) {
      const evStart = new Date(ev.start_at).getTime()
      const evEnd = new Date(ev.end_at).getTime()
      const d1 = Math.abs(slotStartMs - evEnd)
      const d2 = Math.abs(slotEndMs - evStart)
      minDistanceMs = Math.min(minDistanceMs, d1, d2)
    }

    if (minDistanceMs !== Infinity && minDistanceMs < 15 * 60 * 1000) {
      // Tightly close to other meetings
      score -= 0.15
      hazards.push('Starts back-to-back with another event')
    } else if (minDistanceMs !== Infinity && minDistanceMs >= 30 * 60 * 1000) {
      score += 0.1
      rationales.push('Generous buffers around adjacent calendar events')
    }

    // 6. NO-MEETING INTRUSIONS
    for (const block of noMeetingBlocks) {
      const [bStartH, bStartM] = block.start.split(':').map(Number)
      const [bEndH, bEndM] = block.end.split(':').map(Number)
      
      const bStartMinUTC = bStartH * 60 + (bStartM || 0)
      const bEndMinUTC = bEndH * 60 + (bEndM || 0)
      const slotStartMinUTC = slot.start.getHours() * 60 + slot.start.getMinutes()
      const slotEndMinUTC = slot.end.getHours() * 60 + slot.end.getMinutes()

      if (slotStartMinUTC < bEndMinUTC && slotEndMinUTC > bStartMinUTC) {
        score -= 0.4
        hazards.push(`Overlaps with your no-meeting preference: ${block.start}-${block.end}`)
      }
    }

    // 7. CUSTOM BUSY PERIODS
    for (const period of busyPeriods) {
      const [pStartH, pStartM] = period.start.split(':').map(Number)
      const [pEndH, pEndM] = period.end.split(':').map(Number)
      
      const pStartMin = pStartH * 60 + (pStartM || 0)
      const pEndMin = pEndH * 60 + (pEndM || 0)
      const slotStartMin = slot.start.getHours() * 60 + slot.start.getMinutes()
      const slotEndMin = slot.end.getHours() * 60 + slot.end.getMinutes()

      if (slotStartMin < pEndMin && slotEndMin > pStartMin) {
        isDiscarded = true
        break
      }
    }

    if (isDiscarded) continue

    // Cap confidence scoring
    const confidence = Math.max(0.1, Math.min(0.99, score))

    // Fallback general rationale if empty
    if (rationales.length === 0) {
      rationales.push('Fits neatly during optimal working hours with clear buffer spacing')
    }

    scoredSlots.push({
      start: slot.start,
      end: slot.end,
      score: confidence,
      rationales,
      hazards
    })
  }

  // Sort and select top candidates
  scoredSlots.sort((a, b) => b.score - a.score)

  // Take top suggestions for this task
  const topSuggestions: SuggestedBlock[] = []
  for (const s of scoredSlots) {
    if (topSuggestions.length >= 3) break
    
    // Make sure we don't suggest overlapping slots *for the exact same task*
    const hasOverlap = topSuggestions.some(existing => {
      const eStart = new Date(existing.suggested_start).getTime()
      const eEnd = new Date(existing.suggested_end).getTime()
      return s.start.getTime() < eEnd && s.end.getTime() > eStart
    })

    if (!hasOverlap) {
      topSuggestions.push({
        id: nanoid(8),
        task_id: task.id,
        suggested_start: s.start.toISOString(),
        suggested_end: s.end.toISOString(),
        rationale: s.rationales[0] || 'Optimal time slot aligned with rules.',
        confidence: s.score,
        status: 'pending',
        created_at: new Date().toISOString(),
        resolved_at: null,
        conflict_risks: s.hazards
      })
    }
  }

  return topSuggestions
}

// Generate Suggestions controller (IPC entry)
export async function generateSuggestionsController(): Promise<SuggestedBlock[]> {
  const db = getDb()
  const now = new Date()

  // 1. Get all pending active tasks (todo or in_progress, not done/deleted)
  const tasks = db.prepare(`
    SELECT * FROM tasks 
    WHERE status NOT IN ('done', 'deleted')
  `).all() as Task[]

  // 2. Get calendar events for the next 7 days
  const events = db.prepare(`
    SELECT * FROM calendar_events 
    WHERE start_at >= datetime('now', '-1 day') 
      AND start_at <= datetime('now', '+8 days')
  `).all() as CalendarEvent[]

  // 3. Load scheduling preferences
  const prefs = getAllSchedulingPrefsInDb()

  // 4. Load Focus session histories for energy peak discovery (past 30 days)
  const historySessionsRaw = db.prepare(`
    SELECT started_at, energy_rating 
    FROM sessions 
    WHERE energy_rating IS NOT NULL 
      AND status = 'completed'
      AND started_at > datetime('now', '-30 days')
  `).all() as { started_at: string; energy_rating: number }[]

  const historySessions = historySessionsRaw.map(s => {
    const d = new Date(s.started_at)
    return {
      hour: d.getHours(),
      rating: s.energy_rating
    }
  })

  // Load declined suggestions to avoid scheduling identical slots
  const declinedSuggestionsRaw = db.prepare(`
    SELECT task_id, suggested_start, suggested_end FROM suggestions
    WHERE status = 'declined'
  `).all() as { task_id: string; suggested_start: string; suggested_end: string }[]

  const declinedSlots = declinedSuggestionsRaw.map(ds => ({
    task_id: ds.task_id,
    start: new Date(ds.suggested_start).getTime(),
    end: new Date(ds.suggested_end).getTime()
  }))

  // Deduplicate tasks by name/title (case-insensitive and trimmed)
  // to avoid duplication issues highlighted by user!
  const seenTitles = new Set<string>()
  const uniqueTasks: Task[] = []

  // Sort tasks so we schedule high-priority, high-urgency, and newer items first!
  const sortedTasks = [...tasks].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority
    }
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
    if (a.due_date) return -1
    if (b.due_date) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  for (const t of sortedTasks) {
    const normTitle = t.title.toLowerCase().trim()
    if (!seenTitles.has(normTitle)) {
      seenTitles.add(normTitle)
      uniqueTasks.push(t)
    }
  }

  // 5. Generate for each unique task, ensuring NO overlapping slots globally (fully sequenced)!
  let finalSuggestions: SuggestedBlock[] = []
  const allocatedSlots: { start: number; end: number }[] = []

  for (const task of uniqueTasks) {
    const taskSuggestions = getSuggestionsForTask(task, events, prefs, historySessions, now, allocatedSlots, declinedSlots)
    if (taskSuggestions.length > 0) {
      const best = taskSuggestions[0]
      finalSuggestions.push(best)
      allocatedSlots.push({
        start: new Date(best.suggested_start).getTime(),
        end: new Date(best.suggested_end).getTime()
      })
    }
  }

  // 6. DB operations: delete old/exist pending suggestions & insert new pending inside transaction
  const deleteOldStmt = db.prepare("DELETE FROM suggestions WHERE status = 'pending'")
  const insertStmt = db.prepare(`
    INSERT INTO suggestions (
      id, task_id, suggested_start, suggested_end, rationale, 
      confidence, status, created_at, resolved_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `)

  const transaction = db.transaction((suggs: SuggestedBlock[]) => {
    deleteOldStmt.run()
    for (const s of suggs) {
      insertStmt.run(
        s.id,
        s.task_id,
        s.suggested_start,
        s.suggested_end,
        s.rationale,
        s.confidence,
        s.status,
        s.created_at,
        s.resolved_at
      )
    }
  })

  transaction(finalSuggestions)

  // Retrieve current active pending suggestions with tasks and projects details
  const result = db.prepare(`
    SELECT s.*, 
           t.title as task_title, 
           t.priority as task_priority,
           p.name as project_name,
           p.color as project_color,
           p.icon as project_icon
    FROM suggestions s
    JOIN tasks t ON s.task_id = t.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE s.status = 'pending'
    ORDER BY s.confidence DESC
  `).all() as any[]

  return result
}

// Accept suggestion handler (IPC entry)
// Accepts a suggestion, creates a linked event, marks accepted inside transaction
export async function acceptSuggestionController(suggestionId: string): Promise<boolean> {
  const db = getDb()
  
  // 1. Fetch suggestions details
  const sugg = db.prepare('SELECT * FROM suggestions WHERE id = ?').get(suggestionId) as SuggestedBlock | undefined
  if (!sugg) {
    throw new Error('Suggestion not found')
  }

  // 2. Fetch task details
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(sugg.task_id) as Task | undefined
  if (!task) {
    throw new Error('Task associated with this suggestion was not found')
  }

  // 3. Detect overlaps immediately before writing inside the transaction
  const overlaps = db.prepare(`
    SELECT id FROM calendar_events 
    WHERE (start_at < ? AND end_at > ?)
  `).all(sugg.suggested_end, sugg.suggested_start)

  if (overlaps.length > 0) {
    throw new Error('Conflict detected: This slot overlaps with an existing calendar event')
  }

  // 4. Create event + Update suggestion in a secure transaction
  const insertEventStmt = db.prepare(`
    INSERT INTO calendar_events (id, title, description, start_at, end_at, project_id, recurrence, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'none', datetime('now'), datetime('now'))
  `)
  
  const updateSuggestionStmt = db.prepare(`
    UPDATE suggestions 
    SET status = 'accepted', resolved_at = datetime('now')
    WHERE id = ?
  `)

  const eventId = nanoid(8)

  const transaction = db.transaction(() => {
    insertEventStmt.run(
      eventId,
      task.title,
      task.notes || `Scheduled via Keystone AI Suggestion. Task ID: ${task.id}`,
      sugg.suggested_start,
      sugg.suggested_end,
      task.project_id
    )

    updateSuggestionStmt.run(suggestionId)
  })

  transaction()
  return true
}

// Adjust and accept suggestion
export async function adjustAndAcceptSuggestionController(
  suggestionId: string, 
  newStart: string, 
  newEnd: string
): Promise<boolean> {
  const db = getDb()

  const sugg = db.prepare('SELECT * FROM suggestions WHERE id = ?').get(suggestionId) as SuggestedBlock | undefined
  if (!sugg) {
    throw new Error('Suggestion not found')
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(sugg.task_id) as Task | undefined
  if (!task) {
    throw new Error('Task associated with this suggestion was not found')
  }

  // Overlap verification
  const overlaps = db.prepare(`
    SELECT id FROM calendar_events 
    WHERE (start_at < ? AND end_at > ?)
  `).all(newEnd, newStart)

  if (overlaps.length > 0) {
    throw new Error('Conflict detected: This adjusted slot overlaps with an existing calendar event')
  }

  const insertEventStmt = db.prepare(`
    INSERT INTO calendar_events (id, title, description, start_at, end_at, project_id, recurrence, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'none', datetime('now'), datetime('now'))
  `)

  const updateSuggestionStmt = db.prepare(`
    UPDATE suggestions 
    SET status = 'accepted', suggested_start = ?, suggested_end = ?, resolved_at = datetime('now')
    WHERE id = ?
  `)

  const eventId = nanoid(8)

  const transaction = db.transaction(() => {
    insertEventStmt.run(
      eventId,
      task.title,
      task.notes || `Scheduled via Keystone AI Suggestion (Adjusted). Task ID: ${task.id}`,
      newStart,
      newEnd,
      task.project_id
    )
    updateSuggestionStmt.run(newStart, newEnd, suggestionId)
  })

  transaction()
  return true
}

// Decline suggestion
export async function declineSuggestionController(suggestionId: string): Promise<boolean> {
  const db = getDb()
  const stmt = db.prepare(`
    UPDATE suggestions 
    SET status = 'declined', resolved_at = datetime('now')
    WHERE id = ?
  `)
  const info = stmt.run(suggestionId)
  return info.changes > 0
}

// Decline all pending suggestions helper (IPC entry)
export async function declineAllSuggestionsController(): Promise<boolean> {
  const db = getDb()
  const stmt = db.prepare(`
    UPDATE suggestions 
    SET status = 'declined', resolved_at = datetime('now')
    WHERE status = 'pending'
  `)
  const info = stmt.run()
  return info.changes > 0
}

// Snooze suggestion
export async function snoozeSuggestionController(suggestionId: string, _until: string): Promise<boolean> {
  const db = getDb()
  const stmt = db.prepare(`
    UPDATE suggestions 
    SET status = 'snoozed', resolved_at = datetime('now')
    WHERE id = ?
  `)
  const info = stmt.run(suggestionId)
  return info.changes > 0
}

// Calculates capacity heuristic today
export function getCapacityToday(): {
  available: number
  committed: number
  ratio: number
  status: 'light' | 'balanced' | 'tight' | 'overloaded'
} {
  const todayStr = new Date().toLocaleDateString('en-CA')
  const db = getDb()

  // 1. Calculate events hours
  let existingEventsHrs = 0
  try {
    const events = db.prepare("SELECT start_at, end_at FROM calendar_events").all() as { start_at: string; end_at: string }[]
    for (const val of events) {
      if (val.start_at.startsWith(todayStr)) {
        const start = new Date(val.start_at)
        const end = new Date(val.end_at)
        const diffHrs = (end.getTime() - start.getTime()) / (1000 * 3600)
        if (diffHrs > 0) {
          existingEventsHrs += diffHrs
        }
      }
    }
  } catch (err) {
    console.error('Error fetching events for capacity heuristic:', err)
  }

  // 2. Calculate task committed hours
  let committed = 0
  try {
    const activeTasks = db.prepare(`
      SELECT id, time_estimate_mins FROM tasks 
      WHERE status NOT IN ('done', 'deleted')
      AND (
        due_date <= ? 
        OR (due_date IS NULL AND (project_id IS NULL OR project_id = 'inbox-default'))
      )
    `).all(todayStr) as { id: string; time_estimate_mins: number }[]

    const defaultEstMins = parseFloat(getSchedulingPref('rituals.capacity.default_duration', '30'))
    let totalTaskMins = 0
    for (const task of activeTasks) {
      totalTaskMins += (task.time_estimate_mins && task.time_estimate_mins > 0) ? task.time_estimate_mins : defaultEstMins
    }
    committed = totalTaskMins / 60
  } catch (err) {
    console.error('Error fetching tasks for capacity heuristic:', err)
  }

  const workingHours = parseFloat(getSchedulingPref('rituals.capacity.working_hours', '8'))
  const breakBuffer = parseFloat(getSchedulingPref('rituals.capacity.break_buffer', '1.5'))
  const baseAvailable = Math.max(0, workingHours - existingEventsHrs - breakBuffer)

  // Account for historical actual vs planned focus block completion ratio (last 7 days focus sessions)
  let historicalMultiplier = 1.0
  try {
    const historicalStats = db.prepare(`
      SELECT SUM(target_duration_mins) as total_target, SUM(duration_mins) as total_duration 
      FROM sessions 
      WHERE status = 'completed' 
      AND started_at >= datetime('now', '-7 days')
    `).get() as { total_target: number | null; total_duration: number | null }

    if (historicalStats && historicalStats.total_target && historicalStats.total_target > 0) {
      const dur = historicalStats.total_duration || 0
      const tgt = historicalStats.total_target
      // Bound focus accuracy multiplier between 0.5 (prevent infinite squeeze) and 1.0 (limit to max physical hours)
      historicalMultiplier = Math.max(0.5, Math.min(1.0, dur / tgt))
    }
  } catch (err) {
    console.error('Failed computing historical capacity multiplier:', err)
  }

  const available = baseAvailable * historicalMultiplier

  const ratio = available > 0 ? (committed / available) : 0

  let status: 'light' | 'balanced' | 'tight' | 'overloaded' = 'light'
  if (available === 0 && committed > 0) {
    status = 'overloaded'
  } else if (ratio <= 0.6) {
    status = 'light'
  } else if (ratio > 0.6 && ratio <= 1.0) {
    status = 'balanced'
  } else if (ratio > 1.0 && ratio <= 1.3) {
    status = 'tight'
  } else {
    status = 'overloaded'
  }

  return {
    available: parseFloat(available.toFixed(1)),
    committed: parseFloat(committed.toFixed(1)),
    ratio: parseFloat(ratio.toFixed(2)),
    status
  }
}

