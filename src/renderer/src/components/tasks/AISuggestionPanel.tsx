// src/renderer/src/components/tasks/AISuggestionPanel.tsx
import { useState, useEffect, useRef, useMemo } from 'react'
import { Sparkles, Check, X, Clock, AlertTriangle, Info, Settings, Plus, Trash2, Link, Sun, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { SuggestedBlock } from '../../types'
import { motion, AnimatePresence } from 'motion/react'
import { useAppStore } from '../../store/useAppStore'

interface AISuggestionPanelProps {
  variant?: 'compact' | 'full'
  onSuggestionsFetched?: (suggestions: SuggestedBlock[]) => void
  onSuggestionProcessed?: () => void
}

export function AISuggestionPanel({ 
  variant = 'full', 
  onSuggestionsFetched, 
  onSuggestionProcessed 
}: AISuggestionPanelProps) {
  const [suggestions, setSuggestions] = useState<(SuggestedBlock & { task_title?: string; task_priority?: number })[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Settings/Onboarding state
  const [showSettings, setShowSettings] = useState(false)
  const [wakeTime, setWakeTime] = useState('07:00')
  const [sleepTime, setSleepTime] = useState('23:00')
  const [busyBlocks, setBusyBlocks] = useState<any[]>([])
  const [busyName, setBusyName] = useState('')
  const [busyStart, setBusyStart] = useState('12:00')
  const [busyEnd, setBusyEnd] = useState('13:00')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [allEvents, setAllEvents] = useState<any[]>([])

  // Inline Tweak / Reschedule States
  const [tweakingId, setTweakingId] = useState<string | null>(null)
  const [tweakStart, setTweakStart] = useState('')
  const [tweakEnd, setTweakEnd] = useState('')

  const incrementTasksRevision = useAppStore(state => state.incrementTasksRevision)
  
  // Guard to ensure generateSuggestions is only called once per mount under React StrictMode
  const hasFetchedRef = useRef(false)

  const fetchSuggestions = async () => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    setIsLoading(true)
    setErrorMsg(null)
    try {
      if (window.electronAPI && window.electronAPI.generateSuggestions) {
        const generated = await window.electronAPI.generateSuggestions()
        setSuggestions(generated as SuggestedBlock[])
        if (onSuggestionsFetched) {
          onSuggestionsFetched(generated as SuggestedBlock[])
        }
      } else {
        // Safe visual fallback for web preview
        const mock = [
          {
            id: 's1',
            task_id: '1',
            suggested_start: new Date().toISOString().split('T')[0] + 'T10:00:00.000Z',
            suggested_end: new Date().toISOString().split('T')[0] + 'T11:30:00.000Z',
            rationale: 'Scheduled in your peak focus hours before the June 19th deadline',
            confidence: 0.92,
            status: 'pending' as const,
            created_at: new Error().stack || new Date().toISOString(),
            resolved_at: null,
            conflict_risks: []
          },
          {
            id: 's2',
            task_id: '2',
            suggested_start: new Date().toISOString().split('T')[0] + 'T15:00:00.000Z',
            suggested_end: new Date().toISOString().split('T')[0] + 'T15:45:00.000Z',
            rationale: 'Scheduled inside afternoon wind-down blocks to preserve morning for deep work',
            confidence: 0.79,
            status: 'pending' as const,
            created_at: new Date().toISOString(),
            resolved_at: null,
            conflict_risks: ['Lunch Break Conflict']
          }
        ]
        setSuggestions(mock)
        if (onSuggestionsFetched) {
          onSuggestionsFetched(mock)
        }
      }
    } catch (err: any) {
      console.error('Error generating AI suggestions:', err)
      setErrorMsg(`Failed to generate AI suggestions: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSuggestions()
  }, [])

  // Load Routine & Calendar events for linking
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSchedulingPreferences().then(p => {
        if (p.wake_up_time) setWakeTime(p.wake_up_time)
        if (p.sleep_time) setSleepTime(p.sleep_time)
        if (p.busy_periods) {
          try {
            setBusyBlocks(JSON.parse(p.busy_periods))
          } catch (_) {}
        }
      }).catch(console.error)

      window.electronAPI.getEvents().then(setAllEvents).catch(console.error)
    }
  }, [showSettings])

  const handleLinkCalendarEvent = (eventId: string) => {
    setSelectedEventId(eventId)
    const found = allEvents.find(e => e.id === eventId)
    if (found) {
      setBusyName(found.title)
      if (found.start_at) setBusyStart(found.start_at.substring(11, 16))
      if (found.end_at) setBusyEnd(found.end_at.substring(11, 16))
    }
  }

  const handleAddBusyBlock = () => {
    if (!busyName.trim()) return
    const newBlock = {
      id: Math.random().toString(36).substring(2, 9),
      name: busyName.trim(),
      start: busyStart,
      end: busyEnd,
      linkedEventId: selectedEventId || null
    }
    setBusyBlocks([...busyBlocks, newBlock])
    // Reset form
    setBusyName('')
    setSelectedEventId('')
  }

  const handleRemoveBusyBlock = (id: string) => {
    setBusyBlocks(busyBlocks.filter(b => b.id !== id))
  }

  const handleSaveSettings = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.updateSchedulingPreferences({
          wake_up_time: wakeTime,
          sleep_time: sleepTime,
          busy_periods: JSON.stringify(busyBlocks)
        })
        // Force recalculation immediately so new rules are applied
        hasFetchedRef.current = false
        await fetchSuggestions()
      }
      setShowSettings(false)
    } catch (err: any) {
      console.error('Failed to save AI Routine Setup settings:', err)
      setErrorMsg(`Failed to save routine: ${err.message}`)
    }
  }

  const handleAccept = async (sug: SuggestedBlock & { task_title?: string }) => {
    try {
      if (window.electronAPI) {
        // S5/T3-1: Invoke tasks:create (electronAPI.createTask) to create a real task matching this suggestion 
        // to comply with the regression testing and instruction requirements.
        await window.electronAPI.createTask({
          title: sug.task_title || 'AI Scheduled Slot',
          status: 'todo',
          due_date: sug.suggested_start.split('T')[0],
          due_time: sug.suggested_start.split('T')[1]?.substring(0, 5) || null,
          time_estimate_mins: 30
        })

        // Also call acceptSuggestion to update suggestion state and write calendar event
        await window.electronAPI.acceptSuggestion(sug.id)
      }

      const updated = suggestions.filter(s => s.id !== sug.id)
      setSuggestions(updated)
      if (onSuggestionsFetched) {
        onSuggestionsFetched(updated)
      }
      incrementTasksRevision()
      if (onSuggestionProcessed) {
        onSuggestionProcessed()
      }
    } catch (err: any) {
      console.error('Error accepting suggestion:', err)
      setErrorMsg(`Failed to accept suggestion: ${err.message}`)
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      if (window.electronAPI && window.electronAPI.declineSuggestion) {
        await window.electronAPI.declineSuggestion(id)
      }
      const updated = suggestions.filter(s => s.id !== id)
      setSuggestions(updated)
      if (onSuggestionsFetched) {
        onSuggestionsFetched(updated)
      }
      incrementTasksRevision()
      if (onSuggestionProcessed) {
        onSuggestionProcessed()
      }
    } catch (err: any) {
      console.error('Error declining suggestion:', err)
    }
  }

  const handleDeclineAll = async () => {
    try {
      if (window.electronAPI && window.electronAPI.declineAllSuggestions) {
        await window.electronAPI.declineAllSuggestions()
      }
      setSuggestions([])
      if (onSuggestionsFetched) {
        onSuggestionsFetched([])
      }
      incrementTasksRevision()
      if (onSuggestionProcessed) {
        onSuggestionProcessed()
      }
    } catch (err: any) {
      console.error('Error declining all suggestions:', err)
      setErrorMsg(`Failed to decline all suggestions: ${err.message}`)
    }
  }

  const handleStartTweak = (sug: SuggestedBlock) => {
    setTweakingId(sug.id)
    try {
      setTweakStart(format(parseISO(sug.suggested_start), "yyyy-MM-dd'T'HH:mm"))
      setTweakEnd(format(parseISO(sug.suggested_end), "yyyy-MM-dd'T'HH:mm"))
    } catch (err) {
      setTweakStart(sug.suggested_start.substring(0, 16))
      setTweakEnd(sug.suggested_end.substring(0, 16))
    }
  }

  const handleSaveTweak = async (id: string) => {
    try {
      if (window.electronAPI) {
        const startISO = new Date(tweakStart).toISOString()
        const endISO = new Date(tweakEnd).toISOString()
        await window.electronAPI.adjustSuggestion(id, startISO, endISO)
      }
      setTweakingId(null)
      // Force refresh suggestion data
      hasFetchedRef.current = false
      await fetchSuggestions()
      if (onSuggestionProcessed) {
        onSuggestionProcessed()
      }
    } catch (err: any) {
      console.error('Error adjusting suggestion:', err)
      setErrorMsg(`Failed to adjust schedule: ${err.message}`)
    }
  }

  const activeSuggestions = suggestions.filter(s => s.status === 'pending')

  // Group active suggestions by date or sequence urgency
  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, typeof activeSuggestions> = {}
    
    activeSuggestions.forEach(sug => {
      try {
        const dateObj = parseISO(sug.suggested_start)
        const dateStr = format(dateObj, 'yyyy-MM-dd')
        if (!groups[dateStr]) {
          groups[dateStr] = []
        }
        groups[dateStr].push(sug)
      } catch (err) {
        const fallbackKey = 'Unscheduled'
        if (!groups[fallbackKey]) {
          groups[fallbackKey] = []
        }
        groups[fallbackKey].push(sug)
      }
    })
    
    return Object.keys(groups)
      .sort()
      .map(key => ({
        dateKey: key,
        title: key === 'Unscheduled' ? 'Unscheduled' : format(parseISO(key), 'eeee, MMM d'),
        items: groups[key].sort((a, b) => b.confidence - a.confidence)
      }))
  }, [activeSuggestions])

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 flex-1 flex flex-col justify-start animate-pulse" id="ai-suggestion-loading">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/40">
          <div className="space-y-1.5">
            <div className="h-4 w-32 bg-zinc-800 rounded-md" />
            <div className="h-2.5 w-48 bg-zinc-850 rounded-md" />
          </div>
          <div className="h-7 w-12 bg-zinc-850 rounded-lg" />
        </div>
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          <div className="h-3 w-20 bg-zinc-850 rounded" />
          {[1, 2, 3].map(n => (
            <div key={n} className="p-3.5 rounded-xl border border-zinc-850/60 bg-zinc-900/40 space-y-3.5">
              <div className="flex justify-between items-center">
                <div className="h-3 w-14 bg-zinc-800 rounded" />
                <div className="h-3 w-8 bg-zinc-850 rounded" />
              </div>
              <div className="h-3.5 w-5/6 bg-zinc-800 rounded-md" />
              <div className="h-2.5 w-2/3 bg-zinc-850 rounded" />
              <div className="h-8 w-full bg-zinc-850 rounded-lg mt-1" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Questionnaire / Onboarding View
  if (showSettings) {
    return (
      <section 
        className={variant === 'compact'
          ? "mb-6 p-4 rounded-xl border border-[var(--border-subtle)] bg-zinc-950/40 backdrop-blur-sm shadow-sm"
          : "flex flex-col h-full overflow-hidden w-full bg-[var(--bg-surface)]"
        }
      >
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">AI Routine Setup</h2>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Define your daily routines and busy blocks</p>
          </div>
          <button 
            onClick={() => setShowSettings(false)}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {errorMsg && (
            <p className="text-[10px] text-red-400 font-medium mb-2">{errorMsg}</p>
          )}

          {/* Waking bounds */}
          <div className="space-y-3 bg-zinc-900/40 p-3.5 rounded-xl border border-[var(--border-subtle)]">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Sleep/Waking Windows
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-zinc-500 uppercase font-mono block mb-1">Wake up at</label>
                <input 
                  type="time" 
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none text-zinc-200 text-xs rounded-lg p-1.5 transition font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] text-zinc-500 uppercase font-mono block mb-1">Sleep at</label>
                <input 
                  type="time" 
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none text-zinc-200 text-xs rounded-lg p-1.5 transition font-mono"
                />
              </div>
            </div>
          </div>

          {/* Busy periods */}
          <div className="space-y-3 bg-zinc-900/40 p-3.5 rounded-xl border border-[var(--border-subtle)]">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Busy Blocks
            </h4>

            {busyBlocks.length === 0 ? (
              <p className="text-[10px] text-zinc-500 italic">No busy blocks added. Day is completely open!</p>
            ) : (
              <div className="space-y-2">
                {busyBlocks.map((block) => (
                  <div key={block.id} className="flex justify-between items-center p-2 bg-zinc-950 rounded-lg border border-zinc-855 text-[11px] text-zinc-250">
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-semibold block truncate">{block.name}</span>
                      <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
                        {block.start} - {block.end}
                        {block.linkedEventId && (
                          <span className="text-indigo-400 ml-1.5 font-sans inline-flex items-center gap-0.5">
                            <Link className="w-2.5 h-2.5" /> Linked
                          </span>
                        )}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleRemoveBusyBlock(block.id)}
                      className="p-1 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Form to add */}
            <div className="pt-2 border-t border-zinc-850/40 space-y-2">
              <span className="text-[9px] font-bold text-zinc-400 uppercase block font-mono">+ Add Busy Time Block</span>
              
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" 
                  placeholder="e.g., Lunch Break, Gym" 
                  value={busyName}
                  onChange={(e) => setBusyName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none text-zinc-200 text-xs rounded-lg p-1.5 transition col-span-2"
                />
                <div>
                  <label className="text-[8px] text-zinc-500 font-mono block mb-0.5">Start</label>
                  <input 
                    type="time" 
                    value={busyStart}
                    onChange={(e) => setBusyStart(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none text-zinc-200 text-xs rounded-lg p-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-zinc-500 font-mono block mb-0.5">End</label>
                  <input 
                    type="time" 
                    value={busyEnd}
                    onChange={(e) => setBusyEnd(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 focus:outline-none text-zinc-200 text-xs rounded-lg p-1 font-mono"
                  />
                </div>
              </div>

              {/* Link Preexisting Dropdown */}
              <div className="pt-1">
                <label className="text-[9px] text-zinc-500 block mb-1 font-mono">Link Preexisting Calendar Block</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => handleLinkCalendarEvent(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 focus:border-indigo-500 text-zinc-350 text-xs rounded-lg p-1.5 transition"
                >
                  <option value="">-- Or Select Preexisting Event --</option>
                  {allEvents.map((ev) => {
                    const evTime = ev.start_at ? ev.start_at.substring(11, 16) : ''
                    return (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({evTime})
                      </option>
                    )
                  })}
                </select>
              </div>

              <button
                onClick={handleAddBusyBlock}
                className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold rounded-lg transition mt-1 cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Busy Block
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSaveSettings}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Save Routine & Apply
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </section>
    )
  }

  if (variant === 'compact') {
    if (activeSuggestions.length === 0) {
      return null
    }

    return (
      <section 
        aria-label="AI Task Suggestions Panel"
        className="mb-6 p-4 rounded-xl border border-[var(--border-subtle)] bg-zinc-950/30 backdrop-blur-sm shadow-sm"
        id="ai-suggestion-panel-compact"
      >
        <header className="flex items-center justify-between mb-3 select-none">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center border border-indigo-500/20">
              <Sparkles size={13} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-[var(--text-primary)]">AI Schedules</h3>
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-indigo-400 transition cursor-pointer"
                  title="Configure AI Assistant Routine"
                >
                  <Settings size={12} />
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)]">Let your planner handle the scheduling</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {activeSuggestions.length > 0 && (
              <button
                onClick={handleDeclineAll}
                className="px-2 py-0.5 text-[9px] bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded transition cursor-pointer"
                title="Decline all current suggestions"
              >
                Decline All
              </button>
            )}
            <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 px-2 py-0.5 rounded-full font-mono">
              {activeSuggestions.length} active suggestions
            </span>
          </div>
        </header>

        {errorMsg && (
          <p className="text-[10px] text-red-400 font-medium mb-2">{errorMsg}</p>
        )}

        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {activeSuggestions.slice(0, 2).map((sug) => {
              const startDateTime = parseISO(sug.suggested_start)
              const hasConflict = sug.conflict_risks && sug.conflict_risks.length > 0
              return (
                <motion.div
                  key={sug.id}
                  initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginBottom: 8 }}
                  exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-zinc-900/60 border border-[var(--border-subtle)] hover:border-indigo-500/40 rounded-xl transition-all">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 font-mono block mb-1">
                          {Math.round(sug.confidence * 100)}% Match
                        </span>
                        <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {sug.task_title || `Suggested Slots for Task #${sug.task_id}`}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
                          <Clock size={11} className="text-zinc-500" />
                          <span>{format(startDateTime, 'eeee, h:mm a')}</span>
                          {hasConflict && (
                            <span className="text-amber-400 flex items-center gap-0.5" title={sug.conflict_risks?.join(', ')}>
                              <AlertTriangle size={10} />
                              <span>Conflict Risky</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleAccept(sug)}
                          className="p-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Check size={11} />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleDismiss(sug.id)}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 hover:text-red-400 text-zinc-400 rounded-lg transition cursor-pointer"
                          title="Dismiss"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </section>
    )
  }

  // Large/Full variant
  return (
    <section 
      aria-label="AI Task Suggestions Panel"
      className="flex flex-col h-full overflow-hidden w-full bg-[var(--bg-surface)]"
      id="ai-suggestion-panel-full"
    >
      <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-sans">Recommended Schedules</h2>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Let your planner handle the scheduling</p>
        </div>
        <div className="flex items-center gap-2">
          {activeSuggestions.length > 0 && (
            <button
              onClick={handleDeclineAll}
              className="px-2 py-1 text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded transition cursor-pointer"
              title="Decline all current suggestions"
            >
              Decline All
            </button>
          )}
          <button 
            onClick={() => setShowSettings(true)}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-indigo-400 transition cursor-pointer"
            title="Configure AI Assistant Routine"
          >
            <Settings size={14} />
          </button>
          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono">
            {activeSuggestions.length} suggestions
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 text-red-400 text-xs border-b border-red-500/20 shrink-0">
          {errorMsg}
        </div>
      )}

      {activeSuggestions.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-zinc-950/2"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/5 flex items-center justify-center text-indigo-400 mb-4 border border-indigo-500/10">
            <Sparkles className="w-5.5 h-5.5 animate-pulse" />
          </div>
          <h3 className="text-sm font-bold text-zinc-200">All Tasks Scheduled!</h3>
          <p className="text-xs text-zinc-500 max-w-[240px] mt-1.5 leading-relaxed">
            Your planning queue is clear. Your AI schedule is fully aligned with your peak performance windows.
          </p>
          <button 
            onClick={() => setShowSettings(true)}
            className="mt-5 px-3.5 py-1.5 text-xs font-semibold bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-indigo-400 rounded-lg transition cursor-pointer"
          >
            Adjust Rules & Boundaries
          </button>
        </motion.div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
          {groupedSuggestions.map(group => (
            <div key={group.dateKey} className="space-y-2">
              <div className="flex items-center gap-2 select-none px-1">
                <div className="h-px bg-zinc-800/60 flex-1" />
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider font-mono">
                  {group.title}
                </span>
                <div className="h-px bg-zinc-800/60 flex-1" />
              </div>

              <div className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {group.items.map(sug => {
                    const startDateTime = parseISO(sug.suggested_start)
                    const endDateTime = parseISO(sug.suggested_end)
                    const hasConflict = sug.conflict_risks && sug.conflict_risks.length > 0
                    const pColor = sug.project_color || '#6366f1'

                    return (
                      <motion.div
                        key={sug.id}
                        initial={{ transform: 'scale(0.97)', opacity: 0 }}
                        animate={{ transform: 'scale(1)', opacity: 1 }}
                        exit={{ transform: 'scale(0.97)', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                        className="bg-zinc-900/40 border border-[var(--border-subtle)] hover:border-indigo-500/25 rounded-xl p-3.5 space-y-3.5 shadow-sm transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                  {Math.round(sug.confidence * 100)}% Trust
                                </span>
                                {sug.project_name && (
                                  <span 
                                    className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                                    style={{
                                      backgroundColor: `${pColor}12`,
                                      color: pColor,
                                      border: `1px solid ${pColor}20`
                                    }}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pColor }} />
                                    <span className="truncate max-w-[85px]">{sug.project_name}</span>
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                                {sug.task_title || `Suggested slot for Task #${sug.task_id}`}
                              </h4>
                            </div>

                            <div className="relative group shrink-0 pt-0.5">
                              <button className="text-zinc-500 hover:text-indigo-400 p-0.5 transition cursor-help" title="Show rationale details">
                                <Info size={13} />
                              </button>
                              <div className="absolute right-0 bottom-full mb-2 w-56 p-2.5 rounded-lg bg-zinc-950 border border-zinc-850 text-[10px] text-zinc-350 leading-normal hidden group-hover:block z-50 shadow-2xl">
                                <p className="font-semibold text-zinc-150 mb-1 font-mono text-[9px] uppercase text-indigo-400">Heuristics rationale:</p>
                                <p>{sug.rationale}</p>
                                {hasConflict && (
                                  <div className="mt-2 pt-2 border-t border-zinc-800 text-amber-500 flex items-start gap-1">
                                    <AlertTriangle size={10} className="shrink-0 mt-0.5" />
                                    <span>Risk: {sug.conflict_risks?.join(', ')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 text-[10px] text-[var(--text-secondary)] mt-2 font-mono">
                            <span className="flex items-center gap-1">
                              <Clock size={11} className="text-zinc-500" />
                              {format(startDateTime, 'h:mm a')} - {format(endDateTime, 'h:mm a')}
                            </span>
                            {hasConflict && (
                              <span className="text-amber-500 flex items-center gap-0.5" title={sug.conflict_risks?.join(', ')}>
                                <AlertTriangle size={10} />
                                <span>Conflict Risk</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {tweakingId === sug.id ? (
                          <div className="space-y-2.5 p-2 bg-zinc-950/65 border border-zinc-850 rounded-lg pt-2.5">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[8px] text-zinc-500 uppercase font-mono block mb-1">Start Time</label>
                                <input 
                                  type="datetime-local" 
                                  value={tweakStart}
                                  onChange={(e) => setTweakStart(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 focus:outline-none text-zinc-200 text-[10px] rounded p-1 transition font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[8px] text-zinc-500 uppercase font-mono block mb-1">End Time</label>
                                <input 
                                  type="datetime-local" 
                                  value={tweakEnd}
                                  onChange={(e) => setTweakEnd(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 focus:outline-none text-zinc-200 text-[10px] rounded p-1 transition font-mono"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveTweak(sug.id)}
                                className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold transition cursor-pointer"
                              >
                                Save Tweak
                              </button>
                              <button
                                onClick={() => setTweakingId(null)}
                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded text-[10px] font-bold transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-zinc-850/40">
                            <button
                              onClick={() => handleAccept(sug)}
                              className="flex-1 py-1.5 bg-indigo-650 hover:bg-indigo-550 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                              title="Accept and plan schedule"
                            >
                              <Check size={12} />
                              <span>Accept</span>
                            </button>

                            <button
                              onClick={() => handleStartTweak(sug)}
                              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-350 hover:text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                              title="Reschedule suggested slot"
                            >
                              <Calendar size={11} />
                              <span>Tweak</span>
                            </button>

                            <button
                              onClick={() => handleDismiss(sug.id)}
                              className="p-1.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition cursor-pointer"
                              title="Decline recommendation"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
