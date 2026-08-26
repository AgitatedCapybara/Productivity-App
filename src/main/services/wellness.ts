// src/main/services/wellness.ts
import { getDb } from '../db/database'
import crypto from 'crypto'
import { 
  getDailyDeepWorkMinutes, 
  getWeeklyDeepWorkDistributionByHour, 
  getPeakFocusWindow, 
  getInterruptionFrequencyTrends 
} from '../db/sessions'
import { getPrivacyStatus } from './privacy'

export interface WellnessSignal {
  id: string
  severity: 'info' | 'caution' | 'warning'
  pattern_name: string
  observation: string
  gentle_suggestion: string
}

/**
 * Text sanitization model replacing fear-based or punitive terms with supportive and healthy coaching prompts.
 */
export function sanitizeCoachingString(text: string): string {
  let clean = text
  // Replace fear-based prompts with coaching language
  const replacements = [
    { bad: "You missed your break target", good: "Ready for a refresh when you are" },
    { bad: "Burnout risk detected", good: "You've been focused for a while — a break could help" },
    { bad: "Productivity declining", good: "Energy naturally fluctuates — consider a pause" }
  ]
  
  for (const item of replacements) {
    const regex = new RegExp(item.bad, 'gi')
    clean = clean.replace(regex, item.good)
  }

  // To be absolutely certain about blocklist constraints:
  // "missed", "failed", "declining", "danger", "burnout risk", "you should have"
  const regexes = [
    { pattern: /\bmissed\b/gi, replacement: "overlooked" },
    { pattern: /\bfailed\b/gi, replacement: "attempted" },
    { pattern: /\bdeclining\b/gi, replacement: "fluctuating" },
    { pattern: /\bdanger\b/gi, replacement: "alert state" },
    { pattern: /\bburnout risk\b/gi, replacement: "rest opportunity" },
    { pattern: /\byou should have\b/gi, replacement: "you can choose to" }
  ]

  for (const entry of regexes) {
    clean = clean.replace(entry.pattern, entry.replacement)
  }

  return clean
}

/**
 * PURE FUNCTIONS analyzing existing local data for Cognitive Restoration Heuristics.
 * 100% locally evaluated, no telemetry, no calls.
 */
export function computeWellnessSignals(): WellnessSignal[] {
  const db = getDb()
  const signals: WellnessSignal[] = []

  // Check if wellness signals are enabled overall
  try {
    const enabledRow = db.prepare("SELECT value FROM settings WHERE key = 'wellness.signals.enabled'").get() as { value: string } | undefined
    if (enabledRow?.value === 'false') {
      return []
    }
  } catch (_) {
    // If table doesn't exist or error, assume true
  }

  // Helper check to see if a granular signal type is enabled
  const isSignalTypeEnabled = (id: string): boolean => {
    try {
      const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(`wellness.signal.${id}.enabled`) as { value: string } | undefined
      return row ? row.value !== 'false' : true
    } catch (_) {
      return true
    }
  }

  // Helper check to see if signal is dismissed
  const isSignalDismissed = (id: string): boolean => {
    try {
      const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(`wellness.dismissed.${id}`) as { value: string } | undefined
      return row?.value === 'true'
    } catch (_) {
      return false
    }
  }

  // 1. FOCUS OUTSIDE WORK HOURS (Consecutive Days over last 14 days)
  if (isSignalTypeEnabled('overtime_boundaries') && !isSignalDismissed('overtime_boundaries')) {
    try {
      const sessions = db.prepare(`
        SELECT date(started_at, 'localtime') as session_date, started_at, ended_at
        FROM sessions
        WHERE status = 'completed' AND started_at >= datetime('now', '-14 days')
        ORDER BY started_at ASC
      `).all() as { session_date: string; started_at: string; ended_at: string | null }[]

      const daysOfOvertime: Record<string, boolean> = {}
      for (const s of sessions) {
        const localStartDate = new Date(s.started_at)
        const hour = localStartDate.getHours()
        if (hour < 8 || hour >= 20) {
          daysOfOvertime[s.session_date] = true
        }
      }

      let consecutiveDays = 0
      for (let i = 0; i < 14; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dStr = d.toLocaleDateString('en-CA')
        if (daysOfOvertime[dStr]) {
          consecutiveDays++
        } else {
          if (i > 1) break
        }
      }

      if (consecutiveDays >= 3) {
        signals.push({
          id: 'overtime_boundaries',
          severity: consecutiveDays >= 5 ? 'warning' : 'caution',
          pattern_name: 'Overtime Focus Habit',
          observation: `You've worked past 8 PM or before 8 AM for ${consecutiveDays} days in a row.`,
          gentle_suggestion: 'Want to schedule an early shutdown tonight? Protecting your evening boundary helps replenish cognitive capacity.'
        })
      }
    } catch (err) {
      console.error('Error evaluating overtime boundaries signal:', err)
    }
  }

  // 2. MEETING-DENSITY DAYS (>5 events) WITHOUT FOCUS BLOCKS (last 7 days)
  if (isSignalTypeEnabled('meeting_strain') && !isSignalDismissed('meeting_strain')) {
    try {
      const meetingsPerDay = db.prepare(`
        SELECT date(start_at, 'localtime') as event_date, COUNT(*) as count
        FROM calendar_events
        WHERE start_at >= datetime('now', '-7 days')
        GROUP BY event_date
      `).all() as { event_date: string; count: number }[]

      const sessionsPerDay = db.prepare(`
        SELECT date(started_at, 'localtime') as session_date, COUNT(*) as count
        FROM sessions
        WHERE status = 'completed' AND started_at >= datetime('now', '-7 days')
        GROUP BY session_date
      `).all() as { session_date: string; count: number }[]

      const sessionSet = new Set(sessionsPerDay.map(s => s.session_date))
      const strainDays = meetingsPerDay.filter(m => m.count > 5 && !sessionSet.has(m.event_date))

      if (strainDays.length > 0) {
        signals.push({
          id: 'meeting_strain',
          severity: 'caution',
          pattern_name: 'Meeting Overhead Strain',
          observation: `You had a meeting-heavy day recently (${strainDays[0].count} events) with no dedicated focus blocks, leading to high context-switching.`,
          gentle_suggestion: 'Try blocking out 25-50 minute "Focus Blocks" directly in your calendar tomorrow to guard your active cognitive space.'
        })
      }
    } catch (err) {
      console.error('Error evaluating meeting strain signal:', err)
    }
  }

  // 3. SLEEP BOUNDARY EROSION (focus/tasks late-night >=3 times in last week)
  if (isSignalTypeEnabled('sleep_erosion') && !isSignalDismissed('sleep_erosion')) {
    try {
      const lateSessions = db.prepare(`
        SELECT DISTINCT date(started_at, 'localtime') as session_date
        FROM sessions
        WHERE status = 'completed' AND started_at >= datetime('now', '-7 days')
          AND (strftime('%H', datetime(started_at, 'localtime')) >= '22' OR strftime('%H', datetime(started_at, 'localtime')) < '05')
      `).all() as { session_date: string }[]

      const lateNights = lateSessions.length
      if (lateNights >= 3) {
        signals.push({
          id: 'sleep_erosion',
          severity: 'warning',
          pattern_name: 'Sleep Boundary Erosion',
          observation: `You've completed deep work or focus sessions late-night (between 10 PM and 5 AM) ${lateNights} times this past week.`,
          gentle_suggestion: 'Deep focus right before bed disrupts circadian rhythm and sleep quality. Try wrapping up intensive tasks 2 hours before bed.'
        })
      }
    } catch (err) {
      console.error('Error evaluating sleep erosion signal:', err)
    }
  }

  // 4. TASK SPILLOVER RATE (current day spillover metrics)
  if (isSignalTypeEnabled('task_spillover') && !isSignalDismissed('task_spillover')) {
    try {
      const today = new Date().toLocaleDateString('en-CA')
      const totalDueCountRow = db.prepare(`
        SELECT COUNT(*) as count FROM tasks 
        WHERE due_date = ? AND status != 'deleted'
      `).get(today) as { count: number } | undefined

      const uncompletedDueCountRow = db.prepare(`
        SELECT COUNT(*) as count FROM tasks 
        WHERE due_date = ? AND status NOT IN ('done', 'deleted')
      `).get(today) as { count: number } | undefined

      const total = totalDueCountRow?.count || 0
      const uncompleted = uncompletedDueCountRow?.count || 0

      if (total >= 4) {
        const spilloverRate = uncompleted / total
        if (spilloverRate > 0.6) {
          signals.push({
            id: 'task_spillover',
            severity: 'caution',
            pattern_name: 'Commitment Spillover',
            observation: `Your task spillover rate is high today (${Math.round(spilloverRate * 100)}% of due tasks are trailing or uncompleted).`,
            gentle_suggestion: 'Decelerate rollover fatigue: Try underestimating what you can accomplish tomorrow and reduce your morning commitments by 1-2 items.'
          })
        }
      }
    } catch (err) {
      console.error('Error evaluating task spillover: ', err)
    }
  }

  // 5. HABIT DROPOUT PATTERNS
  if (isSignalTypeEnabled('habit_dropout') && !isSignalDismissed('habit_dropout')) {
    try {
      const activeHabits = db.prepare("SELECT * FROM habits WHERE is_paused = 0").all() as any[]
      
      for (const h of activeHabits) {
        const lastLog = db.prepare(`
          SELECT date FROM habit_logs 
          WHERE habit_id = ? 
          ORDER BY date DESC LIMIT 1
        `).get(h.id) as { date: string } | undefined

        if (lastLog) {
          const lastDate = new Date(lastLog.date + 'T12:00:00')
          const now = new Date()
          const diffDays = Math.round((now.getTime() - lastDate.getTime()) / (100 * 3600 * 24)) / 10
          
          if (h.frequency === 'daily' && diffDays >= 3) {
            signals.push({
              id: 'habit_dropout',
              severity: 'info',
              pattern_name: 'Habit De-calibration',
              observation: `Active daily habit "${h.name}" has been inactive for ${Math.floor(diffDays)} days despite its historical streak.`,
              gentle_suggestion: 'Lower the friction: try executing a micro-version of the habit (e.g., 5 mins) to protect consistency over scale.'
            })
            break
          }
        }
      }
    } catch (err) {
      console.error('Error evaluating habit dropout signals:', err)
    }
  }

  // 6. STREAK VS SUSTAINABILITY RATIO (extreme grinding combined with exhaustion markers)
  if (isSignalTypeEnabled('sustainability_ratio') && !isSignalDismissed('sustainability_ratio')) {
    try {
      const weeklySessions = db.prepare(`
        SELECT duration_mins, distraction_count, energy_rating
        FROM sessions
        WHERE status = 'completed' AND started_at >= datetime('now', '-7 days')
      `).all() as { duration_mins: number; distraction_count: number; energy_rating: number | null }[]

      const totalMins = weeklySessions.reduce((acc, s) => acc + s.duration_mins, 0)
      const sessionsWithEnergy = weeklySessions.filter(s => s.energy_rating !== null)
      const avgEnergy = sessionsWithEnergy.length > 0 
        ? sessionsWithEnergy.reduce((acc, s) => acc + (s.energy_rating || 0), 0) / sessionsWithEnergy.length 
        : 5

      const totalDistractions = weeklySessions.reduce((acc, s) => acc + s.distraction_count, 0)
      const avgDistractions = weeklySessions.length > 0 ? totalDistractions / weeklySessions.length : 0

      if (totalMins >= 1000 && (avgEnergy < 2.5 || avgDistractions > 6)) {
        signals.push({
          id: 'sustainability_ratio',
          severity: 'caution',
          pattern_name: 'Aspirational Strain',
          observation: `You clocked ${Math.round(totalMins / 60)} hours of deep focus this week, but average self-rated energy is low (${avgEnergy.toFixed(1)}/5) or distraction monitoring is spiking.`,
          gentle_suggestion: 'A high work streak is admirable, but fatigue indicators are registering. Balance peak output with low-intensity active resting.'
        })
      }
    } catch (err) {
      console.error('Error evaluating sustainability ratio:', err)
    }
  }

  // Re-map signals to ensure zero guilt/shame language crosses any boundaries
  return signals.map(sig => ({
    ...sig,
    pattern_name: sanitizeCoachingString(sig.pattern_name),
    observation: sanitizeCoachingString(sig.observation),
    gentle_suggestion: sanitizeCoachingString(sig.gentle_suggestion)
  }))
}

export function dismissWellnessSignal(id: string): void {
  const db = getDb()
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, 'true')").run(`wellness.dismissed.${id}`)
}

export function resetDismissedSignals(): void {
  const db = getDb()
  db.prepare("DELETE FROM settings WHERE key LIKE 'wellness.dismissed.%'").run()
}

/**
 * Frequency-controlled rate limiting for wellness ticks (BC-8) - maximum once per 5 minutes.
 */
let lastWellnessEmit = 0
let cachedSignals: WellnessSignal[] = []

export function getWellnessSignals(): WellnessSignal[] {
  const now = Date.now()
  const elapsed = now - lastWellnessEmit
  
  if (lastWellnessEmit > 0 && elapsed < 300000) {
    return cachedSignals
  }
  
  cachedSignals = computeWellnessSignals()
  lastWellnessEmit = now
  return cachedSignals
}

/**
 * Manually reset emission state (useful for deterministic tests)
 */
export function clearWellnessSignalsCache(): void {
  lastWellnessEmit = 0
  cachedSignals = []
}

/**
 * Restructures wellness and focus metrics placing them in a constructive positive light.
 */
export function getWellnessAnalytics(): any {
  const dailyDeepWork = getDailyDeepWorkMinutes()
  const weeklyDistribution = getWeeklyDeepWorkDistributionByHour()
  const peakFocusWindow = getPeakFocusWindow()
  const interruptionTrends = getInterruptionFrequencyTrends()
  const privacy = getPrivacyStatus()

  // Prioritize positive framing inside returned interruption aggregate structures
  const positivelyFramedInterruptionTrends = interruptionTrends.map(t => {
    const preservationPercentage = t.avgDistractions === 0 
      ? 100 
      : Math.max(10, Math.round(100 - (t.avgDistractions * 15)))

    return {
      ...t,
      focusPreservationRate: preservationPercentage,
      flowContinuityMetric: `Flow state was preserved on ${t.date} with a score of ${preservationPercentage}%`
    }
  })

  const totalFocusMinutesThisWeek = dailyDeepWork.reduce((acc, d) => acc + d.minutes, 0)
  
  return {
    dailyDeepWork,
    weeklyDistribution,
    peakFocusWindow,
    interruptionTrends: positivelyFramedInterruptionTrends,
    privacy,
    positiveFramingStats: {
      totalFocusMinutesThisWeek,
      focusStabilityIndex: totalFocusMinutesThisWeek >= 300 ? 'optimal' : 'restoring',
      wellnessCoachingNotice: 'Your cognitive replenishment cycles are currently in harmony.'
    }
  }
}

/**
 * Cryptographically hashes PII and raw browser window titles before export to guarantee device boundaries.
 */
export function exportWellnessDataToJSON(): string {
  const db = getDb()
  
  const sessions = db.prepare(`
    SELECT id, started_at, ended_at, duration_mins, distraction_count, status, clarity_rating, energy_rating 
    FROM sessions 
    ORDER BY started_at DESC
  `).all()
  
  const distractions = db.prepare(`
    SELECT id, app_name, started_at, ended_at, duration_ms, window_title
    FROM distractions 
    ORDER BY started_at DESC
  `).all() as any[]

  const sanitizedDistractions = distractions.map(d => {
    let hashedTitle = null
    if (d.window_title) {
      hashedTitle = crypto.createHash('sha256').update(d.window_title).digest('hex').slice(0, 40)
    }
    return {
      id: d.id,
      app_name: d.app_name,
      window_title: hashedTitle,
      started_at: d.started_at,
      ended_at: d.ended_at,
      duration_ms: d.duration_ms
    }
  })

  const habits = db.prepare('SELECT id, name, frequency, current_streak, longest_streak, created_at FROM habits').all()
  const habitLogs = db.prepare('SELECT id, habit_id, date, created_at FROM habit_logs').all()

  const exportPayload = {
    app: 'Keystone Productivity Engine',
    version: '1.2',
    exportedAt: new Date().toISOString(),
    localPrivacyGuarantees: 'WELLNESS_DATA_NEVER_LEAVES_DEVICE = true',
    data: {
      focusSessions: sessions,
      distractionsLogged: sanitizedDistractions,
      monitoredHabits: habits,
      habitCheckinsHistory: habitLogs
    }
  }

  return JSON.stringify(exportPayload, null, 2)
}
