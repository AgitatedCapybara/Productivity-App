// src/renderer/src/pages/PlanView.tsx
import { useState, useEffect, useMemo } from 'react'
import { 
  Sparkles, X, AlertTriangle, 
  ChevronLeft, ChevronRight, Info, RefreshCw, CheckSquare,
  Settings, ChevronDown, Trash2, Calendar, Check
} from 'lucide-react'
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns'
import type { Task, CalendarEvent, SuggestedBlock } from '../types'
import { motion, AnimatePresence } from 'motion/react'
import { AISuggestionPanel } from '../components/tasks/AISuggestionPanel'
import { cn } from '../lib/utils'
import { overlaySlide } from '../lib/motion-tokens'
import { useAppStore } from '../store/useAppStore'
import { useSafeClickOutside } from '../hooks/useSafeClickOutside'

export function PlanView() {
  const projects = useAppStore(state => state.projects)
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [suggestions, setSuggestions] = useState<SuggestedBlock[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [suggestionRefreshKey, setSuggestionRefreshKey] = useState(0)
  const [hoveredSuggestionId, setHoveredSuggestionId] = useState<string | null>(null)

  // Progressive disclosure planning options
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)

  // Confirmation modal
  const [showAcceptAllConfirm, setShowAcceptAllConfirm] = useState(false)

  // Current calendar week anchor
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }))

  // Event edit modal state
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const isEventDirty = useMemo(() => {
    if (!editingEvent) return false
    const originalStart = (() => {
      try {
        return format(parseISO(editingEvent.start_at), "yyyy-MM-dd'T'HH:mm")
      } catch {
        return editingEvent.start_at.substring(0, 16)
      }
    })()
    const originalEnd = (() => {
      try {
        return format(parseISO(editingEvent.end_at), "yyyy-MM-dd'T'HH:mm")
      } catch {
        return editingEvent.end_at.substring(0, 16)
      }
    })()

    return (
      editTitle !== editingEvent.title ||
      editStart !== originalStart ||
      editEnd !== originalEnd ||
      editDescription !== (editingEvent.description || '')
    )
  }, [editingEvent, editTitle, editStart, editEnd, editDescription])

  const {
    containerRef: editEventRef,
    shakeKey: editEventShakeKey,
    isFlashing: editEventIsFlashing
  } = useSafeClickOutside({
    isOpen: !!editingEvent,
    isDirty: isEventDirty,
    onClose: () => setEditingEvent(null)
  })

  const {
    containerRef: acceptAllConfirmRef,
    shakeKey: acceptAllShakeKey,
    isFlashing: acceptAllIsFlashing
  } = useSafeClickOutside({
    isOpen: showAcceptAllConfirm,
    isDirty: false,
    onClose: () => setShowAcceptAllConfirm(false)
  })

  const handleEditCalendarEvent = (e: CalendarEvent) => {
    setEditingEvent(e)
    setEditTitle(e.title)
    try {
      setEditStart(format(parseISO(e.start_at), "yyyy-MM-dd'T'HH:mm"))
      setEditEnd(format(parseISO(e.end_at), "yyyy-MM-dd'T'HH:mm"))
    } catch (err) {
      setEditStart(e.start_at.substring(0, 16))
      setEditEnd(e.end_at.substring(0, 16))
    }
    setEditDescription(e.description || '')
  }

  const handleSaveEventChanges = async () => {
    if (!editingEvent) return
    setIsLoading(true)
    try {
      if (window.electronAPI) {
        const startISO = new Date(editStart).toISOString()
        const endISO = new Date(editEnd).toISOString()

        await window.electronAPI.updateEvent({
          id: editingEvent.id,
          title: editTitle,
          start_at: startISO,
          end_at: endISO,
          description: editDescription
        })
        
        setStatusMessage('Calendar event successfully updated!')
        setEditingEvent(null)
        await loadData() // Refresh calendar
      }
    } catch (err: any) {
      setStatusMessage(`Failed to update calendar event: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!editingEvent) return
    setIsLoading(true)
    try {
      if (window.electronAPI) {
        await window.electronAPI.deleteEvent(editingEvent.id)
        setStatusMessage('Event removed. Previous calendar state reverted!')
        setEditingEvent(null)
        
        // Refresh suggestions and calendar data so reverted suggestion shows up
        await loadData()
        setSuggestionRefreshKey(prev => prev + 1) // Recalculate or reload panel suggestions
      }
    } catch (err: any) {
      setStatusMessage(`Failed to remove event: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeclineAll = async () => {
    setIsLoading(true)
    try {
      if (window.electronAPI && window.electronAPI.declineAllSuggestions) {
        await window.electronAPI.declineAllSuggestions()
        setSuggestions([])
        setStatusMessage('All current suggestions have been declined.')
        setSuggestionRefreshKey(prev => prev + 1) // Refresh suggestion panel too!
      }
    } catch (err: any) {
      setStatusMessage(`Failed to decline suggestions: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Load all foundational data
  const loadData = async () => {
    setIsLoading(true)
    setStatusMessage(null)
    try {
      if (window.electronAPI) {
        const [loadedTasks, loadedEvents] = await Promise.all([
          window.electronAPI.getTasks(),
          window.electronAPI.getEvents()
        ])

        setTasks(loadedTasks.filter(t => t.status !== 'done' && t.status !== 'deleted'))
        setEvents(loadedEvents)
      } else {
        // Fallback for visual review
        setTasks([
          { id: '1', title: 'Compile Q3 Financial Statement Report', notes: '#finance high focus', project_id: 'default-work', priority: 3, status: 'todo', due_date: '2026-06-19', due_time: null, recurrence: null, sort_order: 1, time_estimate_mins: 90, time_logged_mins: 0, completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: '2', title: 'Submit personal tax claims', notes: 'low energy', project_id: 'default-personal', priority: 1, status: 'todo', due_date: '2026-06-20', due_time: null, recurrence: null, sort_order: 2, time_estimate_mins: 45, time_logged_mins: 0, completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ])
      }
    } catch (err: any) {
      console.error(err)
      setStatusMessage(`Error loading planning data: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Regenerate recommendations by forcing component refresh
  const handleRegenerate = () => {
    setSuggestionRefreshKey(prev => prev + 1)
    setStatusMessage('AI recommendations successfully updated based on latest variables!')
  }

  // Handle reload callback when a suggestion is modified
  const handleSuggestionProcessed = async () => {
    if (window.electronAPI) {
      const loadedEvents = await window.electronAPI.getEvents()
      setEvents(loadedEvents)
    }
  }

  // Accept a suggestion from calendar grid click
  const handleAcceptSuggestionInCalendar = async (id: string) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.acceptSuggestion(id)
        setSuggestions(prev => prev.filter(s => s.id !== id))
        setStatusMessage('Suggestion approved and converted into a calendar event!')
        await handleSuggestionProcessed()
      }
    } catch (err: any) {
      console.error(err)
      setStatusMessage(`Unable to accept: ${err.message}`)
    }
  }

  // Accept All best suggestions
  const handleAcceptAll = async () => {
    setIsLoading(true)
    let acceptedCount = 0
    let errCount = 0

    // For Accept All, we take the highest confidence pending suggestion for each distinct task
    const bestSuggestionsByTask: Record<string, SuggestedBlock> = {}
    for (const sug of suggestions) {
      if (sug.status === 'pending') {
        const existing = bestSuggestionsByTask[sug.task_id]
        if (!existing || sug.confidence > existing.confidence) {
          bestSuggestionsByTask[sug.task_id] = sug
        }
      }
    }

    const targets = Object.values(bestSuggestionsByTask)

    try {
      for (const target of targets) {
        try {
          if (window.electronAPI) {
            await window.electronAPI.acceptSuggestion(target.id)
            acceptedCount++
          } else {
            acceptedCount++
          }
        } catch (e) {
          errCount++
        }
      }

      if (window.electronAPI) {
        const generated = await window.electronAPI.generateSuggestions()
        setSuggestions(generated as any[])
        const loadedEvents = await window.electronAPI.getEvents()
        setEvents(loadedEvents)
      } else {
        setSuggestions([])
      }

      setStatusMessage(`Accept All completed: ${acceptedCount} task events scheduled successfully.${errCount > 0 ? ` ${errCount} conflicts skipped.` : ''}`)
    } catch (err: any) {
      setStatusMessage(`Accept all failed: ${err.message}`)
    } finally {
      setIsLoading(false)
      setShowAcceptAllConfirm(false)
    }
  }

  // Calendar Day Columns logic
  const calendarDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  // Map calendar events to day buckets
  const eventsByDay = useMemo(() => {
    const buckets: Record<string, CalendarEvent[]> = {}
    calendarDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd')
      buckets[dayKey] = events.filter(e => {
        const eStart = parseISO(e.start_at)
        return isSameDay(eStart, day)
      })
    })
    return buckets
  }, [events, calendarDays])

  // Map pending ghost blocks to day buckets
  const ghostBlocksByDay = useMemo(() => {
    const buckets: Record<string, SuggestedBlock[]> = {}
    calendarDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd')
      buckets[dayKey] = suggestions.filter(s => {
        const sStart = parseISO(s.suggested_start)
        return isSameDay(sStart, day) && s.status === 'pending'
      })
    })
    return buckets
  }, [suggestions, calendarDays])

  // Pre-calculate horizontal collision layout columns/offsets for each day
  const collisionLayoutsByDay = useMemo(() => {
    const layouts: Record<string, Record<string, { colIndex: number; totalCols: number }>> = {}

    calendarDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd')
      const dayEvents = eventsByDay[dayKey] || []
      const dayGhosts = ghostBlocksByDay[dayKey] || []

      // 1. Create a unified list of interval blocks for collision detection
      const items: Array<{
        id: string
        start: Date
        end: Date
      }> = []

      dayEvents.forEach(e => {
        items.push({
          id: `event-${e.id}`,
          start: parseISO(e.start_at),
          end: parseISO(e.end_at)
        })
      })

      dayGhosts.forEach(g => {
        items.push({
          id: `ghost-${g.id}`,
          start: parseISO(g.suggested_start),
          end: parseISO(g.suggested_end)
        })
      })

      // 2. Sort by start time, and by duration descending for ties
      const sorted = [...items].sort((a, b) => {
        const diff = a.start.getTime() - b.start.getTime()
        if (diff !== 0) return diff
        const durA = a.end.getTime() - a.start.getTime()
        const durB = b.end.getTime() - b.start.getTime()
        return durB - durA
      })

      // 3. Group into overlapping clusters (connected components of overlapping intervals)
      const clusters: typeof items[] = []
      let currentCluster: typeof items = []
      let currentClusterEnd = 0

      sorted.forEach(item => {
        if (currentCluster.length === 0) {
          currentCluster.push(item)
          currentClusterEnd = item.end.getTime()
        } else {
          // If this item starts before the current cluster's furthest end point, it overlaps
          if (item.start.getTime() < currentClusterEnd) {
            currentCluster.push(item)
            if (item.end.getTime() > currentClusterEnd) {
              currentClusterEnd = item.end.getTime()
            }
          } else {
            // No overlap, close this cluster and start a new one
            clusters.push(currentCluster)
            currentCluster = [item]
            currentClusterEnd = item.end.getTime()
          }
        }
      })
      if (currentCluster.length > 0) {
        clusters.push(currentCluster)
      }

      // 4. For each cluster, assign column slots
      const dayResults: Record<string, { colIndex: number; totalCols: number }> = {}

      clusters.forEach(cluster => {
        const columns: typeof items[] = []
        cluster.forEach(item => {
          let placed = false
          for (let c = 0; c < columns.length; c++) {
            const lastInCol = columns[c][columns[c].length - 1]
            // If the item starts exactly at or after the last item in this column ends, we can place it here
            if (item.start.getTime() >= lastInCol.end.getTime()) {
              columns[c].push(item)
              placed = true
              break
            }
          }
          if (!placed) {
            columns.push([item])
          }
        })

        // Assign position results based on columns array
        const totalCols = columns.length
        for (let c = 0; c < totalCols; c++) {
          columns[c].forEach(item => {
            dayResults[item.id] = {
              colIndex: c,
              totalCols
            }
          })
        }
      })

      layouts[dayKey] = dayResults
    })

    return layouts
  }, [calendarDays, eventsByDay, ghostBlocksByDay])

  const hours = Array.from({ length: 15 }, (_, i) => i + 8) // 8 AM to 10 PM

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden font-sans select-none relative view-container" id="plan-view-root">
      
      {/* Header Banner */}
      <header className="px-8 py-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-[34px] font-bold tracking-tight text-[var(--text-primary)] mb-1">AI Planning Assistant</h1>
            <p className="text-white/70 text-[15px] font-normal">Tactical automated recommendations for stress-free working hours</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPreferencesOpen(!isPreferencesOpen)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Planning Options</span>
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-150", isPreferencesOpen && "rotate-180")} />
          </button>

          <button
            onClick={handleRegenerate}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-hover)] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Recalculate AI Slots</span>
          </button>
          
          <button
            onClick={() => setShowAcceptAllConfirm(true)}
            disabled={suggestions.filter(s => s.status === 'pending').length === 0}
            className="flex items-center gap-2 px-4 py-2 text-xs bg-indigo-600 border border-indigo-500 text-white rounded-xl hover:bg-indigo-500 transition-all font-semibold shadow-lg shadow-indigo-900/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Accept All Best</span>
          </button>

          <button
            onClick={handleDeclineAll}
            disabled={suggestions.filter(s => s.status === 'pending').length === 0}
            className="flex items-center gap-2 px-4 py-2 text-xs bg-zinc-850 border border-zinc-750 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all font-semibold rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Decline all current pending suggestions"
          >
            <X className="w-3.5 h-3.5 text-red-400" />
            <span>Decline All</span>
          </button>
        </div>
      </header>

      {/* Progressive Disclosure Preferences Panel */}
      <AnimatePresence>
        {isPreferencesOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={overlaySlide}
            className="overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-8 py-4 shrink-0"
          >
            <div className="grid grid-cols-3 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-normal text-white/70">Focus Windows</label>
                <select className="bg-zinc-900 border border-zinc-805 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none cursor-pointer">
                  <option value="standard">Standard Business (8 AM - 6 PM)</option>
                  <option value="extended">Extended Day (8 AM - 10 PM)</option>
                  <option value="night">Night Owl (2 PM - midnight)</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-normal text-white/70">Confidence Threshold</label>
                <select className="bg-zinc-900 border border-zinc-805 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none cursor-pointer">
                  <option value="high">High Confidence (&gt; 80%)</option>
                  <option value="medium">Medium Confidence (&gt; 50%)</option>
                  <option value="all">Show All Recommendations</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-normal text-white/70">Conflict Management</label>
                <select className="bg-zinc-900 border border-zinc-805 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none cursor-pointer">
                  <option value="avoid">Avoid All Conflicts</option>
                  <option value="flexible">Flexible Slot Overlapping</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Notifications */}
      {statusMessage && (
        <div className="px-8 py-3 bg-indigo-550/10 border-b border-indigo-500/20 text-indigo-400 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {tasks.length === 0 && !isLoading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={overlaySlide}
            className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none"
          >
            <p className="text-[var(--text-secondary)] text-[17px] font-normal leading-relaxed mb-4">
              Plan your day. Let your mind breathe.
            </p>
            <button
              onClick={handleRegenerate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[15px] font-semibold rounded-xl cursor-pointer transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <Sparkles size={16} />
              <span>Recalculate AI Slots</span>
            </button>
          </motion.div>
        ) : (
          <>
            {/* Left Side: Sugesstions list grouping by task */}
            <section className="w-[380px] border-r border-[var(--border-subtle)] flex flex-col bg-[var(--bg-surface)] shrink-0 h-full overflow-hidden">
              <AISuggestionPanel 
                key={suggestionRefreshKey} 
                variant="full" 
                onSuggestionsFetched={(fetched) => setSuggestions(fetched)}
                onSuggestionProcessed={handleSuggestionProcessed} 
              />
            </section>

        {/* Right Side: Interactive Calendar view showing Ghost Boxes */}
        <section className="flex-1 flex flex-col bg-[var(--bg-primary)] overflow-hidden h-full">
          
          {/* Cal navigation bar */}
          <div className="px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex justify-between items-center shrink-0">
            <span className="text-xs font-semibold text-[var(--text-secondary)] font-mono">
              Timeline: {format(calendarDays[0], 'MMM dd')} - {format(calendarDays[6], 'MMM dd, yyyy')}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekStart(prev => addDays(prev, -7))}
                className="p-1 hover:bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)] text-zinc-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                className="px-2 py-1 text-[10px] hover:bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)] text-zinc-300"
              >
                Today
              </button>
              <button
                onClick={() => setWeekStart(prev => addDays(prev, 7))}
                className="p-1 hover:bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)] text-zinc-400 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid wrapper */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[700px] border border-zinc-805 rounded-xl overflow-hidden bg-zinc-950/40 relative">
              
              {/* Header block with days name */}
              <div className="bg-zinc-900 border-b border-zinc-805 h-12 flex items-center justify-center border-r border-zinc-805">
                <span className="text-[10px] text-zinc-500 font-mono">UTC</span>
              </div>
              
              {calendarDays.map(day => {
                const isToday = isSameDay(day, new Date())
                return (
                  <div
                    key={day.toISOString()}
                    className={`bg-zinc-900/60 border-b border-r border-zinc-805 h-12 flex flex-col items-center justify-center last:border-r-0 ${
                      isToday ? 'bg-indigo-950/20 border-b-2 border-b-indigo-505' : ''
                    }`}
                  >
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">
                      {format(day, 'EEE')}
                    </span>
                    <span className={`text-xs mt-0.5 font-mono ${isToday ? 'text-indigo-400 font-bold' : 'text-zinc-500'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                )
              })}

              {/* Grid content blocks */}
              {hours.map(hour => (
                <div key={hour} className="contents">
                  {/* Left hour tick label */}
                  <div className="border-r border-b border-zinc-805 h-16 flex items-start justify-end pr-2 pt-1">
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                    </span>
                  </div>

                  {/* Day column hour boxes */}
                  {calendarDays.map((day) => {
                    const dayKey = format(day, 'yyyy-MM-dd')
                    const dayEvents = eventsByDay[dayKey] || []
                    const dayGhosts = ghostBlocksByDay[dayKey] || []

                    // Calculate events starting in this hour
                    const hourEvents = dayEvents.filter(e => {
                      const eStart = parseISO(e.start_at)
                      return eStart.getHours() === hour
                    })

                    // Calculate suggestions starting in this hour
                    const hourGhosts = dayGhosts.filter(g => {
                      const gStart = parseISO(g.suggested_start)
                      return gStart.getHours() === hour
                    })

                    return (
                      <div
                        key={`${dayKey}-${hour}`}
                        className="border-r border-b border-zinc-805/45 h-16 relative bg-zinc-950/15 last:border-r-0 group/grid"
                      >
                        {/* Hour background guide */}
                        <div className="absolute inset-0 bg-transparent group-hover/grid:bg-zinc-800/10 pointer-events-none" />

                        {/* Rendering actual booked calendar events */}
                        {hourEvents.map(e => {
                          const eStart = parseISO(e.start_at)
                          const eEnd = parseISO(e.end_at)
                          const durationMins = (eEnd.getTime() - eStart.getTime()) / (60 * 1000)
                          const startMins = eStart.getMinutes()
                          const topPct = (startMins / 60) * 100
                          const heightPct = (durationMins / 60) * 100

                          const associatedProject = projects.find(p => p.id === e.project_id)
                          const projectColor = associatedProject?.color || '#6366f1'
                          const projectName = associatedProject?.name
                          const isExtraCompact = durationMins <= 30

                          // Determine collision layout
                          const eLayout = collisionLayoutsByDay[dayKey]?.[`event-${e.id}`]
                          const eTotalCols = eLayout?.totalCols || 1
                          const eColIndex = eLayout?.colIndex || 0
                          const eWidthPct = 100 / eTotalCols
                          const eLeftPct = (eColIndex / eTotalCols) * 100

                          return (
                            <div
                              key={e.id}
                              onClick={() => handleEditCalendarEvent(e)}
                              className={cn(
                                "absolute bg-zinc-850/90 hover:bg-zinc-800/95 rounded-xl z-10 select-none cursor-pointer active:scale-[0.98] transition-all duration-150 shadow-sm border border-zinc-800/40 group relative overflow-hidden min-w-0 text-left max-h-full box-border",
                                isExtraCompact 
                                  ? "flex flex-row items-center justify-between gap-1 px-1.5 py-0.5" 
                                  : "flex flex-col justify-between p-1.5"
                              )}
                              style={{
                                top: `${topPct}%`,
                                height: `calc(${heightPct}% - 2px)`,
                                left: `calc(${eLeftPct}% + 3px)`,
                                width: `calc(${eWidthPct}% - 6px)`,
                                borderLeft: `3.5px solid ${projectColor}`,
                                boxSizing: 'border-box'
                              }}
                              title="Click to Edit or Delete this block"
                            >
                              {isExtraCompact ? (
                                <>
                                  <p className="text-[10px] font-medium leading-tight tracking-tight truncate text-white flex-1 pr-1">
                                    {e.title}
                                  </p>
                                  <span className="text-[10px] font-mono opacity-80 shrink-0 leading-tight tracking-tight text-neutral-400 whitespace-nowrap">
                                    {format(eStart, 'h:mm')}-{format(eEnd, 'h:mm a')}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <div className="min-w-0 w-full">
                                    <p className="text-xs font-semibold tracking-wide text-white truncate leading-none">
                                      {e.title}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between gap-1.5 flex-wrap min-w-0 w-full mt-1.5">
                                    <span className="font-mono text-neutral-400 font-medium shrink-0 text-[10px] leading-none">
                                      {format(eStart, 'h:mm')} - {format(eEnd, 'h:mm a')}
                                    </span>

                                    {projectName && (
                                      <span 
                                        className="inline-flex items-center gap-1 font-bold rounded-md shrink-0 truncate max-w-[75px] my-0.5 text-[8.5px] px-1.5 py-0.5 leading-none"
                                        style={{
                                          backgroundColor: `${projectColor}15`,
                                          color: projectColor,
                                          border: `1px solid ${projectColor}25`
                                        }}
                                      >
                                        <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: projectColor }} />
                                        <span className="truncate">{projectName}</span>
                                      </span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          )
                        })}

                        {/* Rendering suggestion "GHOST BLOCKS" */}
                        {hourGhosts.map(g => {
                          const gStart = parseISO(g.suggested_start)
                          const gEnd = parseISO(g.suggested_end)
                          const durationMins = (gEnd.getTime() - gStart.getTime()) / (60 * 1000)
                          const startMins = gStart.getMinutes()
                          const topPct = (startMins / 60) * 100
                          const heightPct = (durationMins / 60) * 100
                          
                          const isHighlighted = hoveredSuggestionId === g.id
                          const riskWarning = g.conflict_risks && g.conflict_risks.length > 0
                          const associatedTask = tasks.find(t => t.id === g.task_id)
                          
                          const projColor = g.project_color || '#6366f1'
                          const taskTitle = g.task_title || associatedTask?.title || 'Planning Target'
                          const isExtraCompact = durationMins <= 30

                          // Determine collision layout
                          const gLayout = collisionLayoutsByDay[dayKey]?.[`ghost-${g.id}`]
                          const gTotalCols = gLayout?.totalCols || 1
                          const gColIndex = gLayout?.colIndex || 0
                          const gWidthPct = 100 / gTotalCols
                          const gLeftPct = (gColIndex / gTotalCols) * 100

                          return (
                            <motion.div
                              key={g.id}
                              onMouseEnter={() => setHoveredSuggestionId(g.id)}
                              onMouseLeave={() => setHoveredSuggestionId(null)}
                              whileHover={{ scale: 1.015, zIndex: 30 }}
                              className={cn(
                                "absolute rounded-xl border border-dashed flex text-left group relative overflow-hidden min-w-0 z-20 cursor-pointer transition-all duration-150 backdrop-blur-md max-h-full box-border",
                                isHighlighted
                                  ? 'bg-indigo-950/45 border-indigo-400 shadow-md ring-1 ring-indigo-500/30'
                                  : 'bg-zinc-900/70 border-zinc-700/60 hover:bg-zinc-850/60 hover:border-zinc-500',
                                isExtraCompact 
                                  ? "flex-row items-center justify-between gap-1 px-1.5 py-0.5" 
                                  : "flex-col justify-between p-1.5"
                              )}
                              style={{
                                top: `${topPct}%`,
                                height: `calc(${heightPct}% - 2px)`,
                                left: `calc(${gLeftPct}% + 3px)`,
                                width: `calc(${gWidthPct}% - 6px)`,
                                borderLeft: `3.5px solid ${projColor}`,
                                boxSizing: 'border-box'
                              }}
                              onClick={() => handleAcceptSuggestionInCalendar(g.id)}
                              title={`AI Recommended Block. Click to Accept.\nRationale: ${g.rationale}`}
                            >
                              {isExtraCompact ? (
                                <>
                                  <p className="text-[10px] font-medium leading-tight tracking-tight truncate text-white flex-1 pr-1">
                                    {taskTitle}
                                  </p>
                                  
                                  <div className="flex items-center gap-1 shrink-0 text-[10px] font-mono opacity-80 text-neutral-400 whitespace-nowrap leading-tight tracking-tight">
                                    <span className="text-indigo-300 font-bold leading-none">
                                      {Math.round(g.confidence * 100)}%
                                    </span>
                                    <span className="leading-none">•</span>
                                    <span className="leading-none">
                                      {format(gStart, 'h:mm')}-{format(gEnd, 'h:mm a')}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between gap-1 w-full min-w-0">
                                    <p className="font-medium text-xs text-white truncate flex-1 pr-1 tracking-tight leading-none">
                                      {taskTitle}
                                    </p>
                                    <span className="px-1 py-0.2 bg-indigo-500/15 text-indigo-300 font-bold font-mono rounded text-[9px] shrink-0 leading-none">
                                      {Math.round(g.confidence * 100)}%
                                    </span>
                                    {riskWarning && (
                                      <AlertTriangle className="w-2.5 h-2.5 text-amber-500 shrink-0 animate-pulse" />
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between gap-1.5 flex-wrap min-w-0 w-full mt-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: projColor }} />
                                      {g.project_name && (
                                        <span className="truncate max-w-[70px] text-[8.5px] font-medium text-zinc-350 leading-none">{g.project_name}</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 font-mono">
                                      <span title={g.rationale} className="inline-flex items-center cursor-help">
                                        <Info 
                                          size={9.5} 
                                          className="text-zinc-500 hover:text-indigo-400 transition" 
                                        />
                                      </span>
                                      <span className="text-[10px] font-mono text-neutral-400 whitespace-nowrap shrink-0 leading-none">
                                        {format(gStart, 'h:mm')} - {format(gEnd, 'h:mm a')}
                                      </span>
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Interactive Hover Confirmation Preview */}
                              <div className="absolute inset-0 bg-emerald-500/15 opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
                                <Check className="text-emerald-400 drop-shadow-sm w-5 h-5" />
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>
        </>
        )}
      </div>



      {/* Accept All Confirmation Modal */}
      <AnimatePresence>
        {showAcceptAllConfirm && (
          <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[9900] flex items-center justify-center p-4">
            <motion.div
              ref={acceptAllConfirmRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={acceptAllShakeKey > 0 ? {
                x: [0, -6, 6, -6, 6, -4, 4, 0],
                opacity: 1,
                scale: 1
              } : { opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-sm border rounded-2xl overflow-hidden shadow-2xl relative bg-zinc-900 transition-all duration-300",
                acceptAllIsFlashing
                  ? "border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-2 ring-amber-500/40"
                  : "border-zinc-805"
              )}
            >
              <div className="p-6 text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Sparkles size={22} className="text-indigo-400 animate-pulse" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100">
                    Auto-Schedule Pending Tasks?
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    This will automatically accept the highest trust matching recommendations for all of your {tasks.length} active tasks and write them as events in your local calendar database.
                  </p>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-zinc-950 border-t border-zinc-805 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowAcceptAllConfirm(false)}
                  className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg active:scale-[0.98] transition-all cursor-pointer"
                >
                  Confirm & Accept All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit/Revert Calendar Event Modal */}
      <AnimatePresence>
        {editingEvent && (
          <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[9900] flex items-center justify-center p-4">
            <motion.div
              ref={editEventRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={editEventShakeKey > 0 ? {
                x: [0, -6, 6, -6, 6, -4, 4, 0],
                opacity: 1,
                scale: 1
              } : { opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-md border rounded-2xl overflow-hidden shadow-2xl relative bg-zinc-900 transition-all duration-300",
                editEventIsFlashing
                  ? "border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-2 ring-amber-500/40"
                  : "border-zinc-805"
              )}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-805 pb-3">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Calendar size={18} />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-150">
                      Edit Calendar Block
                    </h3>
                  </div>
                  <button
                    onClick={() => setEditingEvent(null)}
                    className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Name/Title field */}
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block mb-1.5">
                      Event Name
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none text-zinc-200 text-xs rounded-xl p-2.5 transition"
                      placeholder="e.g. Focus on Q3 report"
                    />
                  </div>

                  {/* Date and Time Windows */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block mb-1.5">
                        Start Date/Time
                      </label>
                      <input
                        type="datetime-local"
                        value={editStart}
                        onChange={(e) => setEditStart(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none text-zinc-200 text-xs rounded-xl p-2.5 transition font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block mb-1.5">
                        End Date/Time
                      </label>
                      <input
                        type="datetime-local"
                        value={editEnd}
                        onChange={(e) => setEditEnd(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none text-zinc-200 text-xs rounded-xl p-2.5 transition font-mono text-center"
                      />
                    </div>
                  </div>

                  {/* Notes/Description */}
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block mb-1.5">
                      Description / Notes
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none text-zinc-200 text-xs rounded-xl p-2.5 resize-none transition"
                      placeholder="Add notes, links, or description..."
                    />
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="px-5 py-3.5 bg-zinc-950 border-t border-zinc-805 flex items-center justify-between gap-3">
                <button
                  onClick={handleDeleteEvent}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-900/30 rounded-lg flex items-center gap-1.5 transition-all"
                  title="Remove event and restore to recommended suggestions"
                >
                  <Trash2 size={13} />
                  <span>Delete & Revert</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingEvent(null)}
                    className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEventChanges}
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg active:scale-[0.98] transition-all flex items-center gap-1"
                  >
                    <Check size={13} />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
