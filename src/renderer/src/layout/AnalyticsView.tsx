// src/renderer/src/pages/AnalyticsView.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { 
  BarChart3, 
  Clock, 
  AlertTriangle, 
  RotateCcw,
  FolderDot,
  Trash2,
  Pencil,
  Check,
  X
} from 'lucide-react'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid
} from 'recharts'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../lib/utils'
import { PostSessionOverview } from '../components/tasks/PostSessionOverview'

export function AnalyticsView() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingSessionName, setEditingSessionName] = useState<string>('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [timeScaleDays, setTimeScaleDays] = useState<number>(7)
  const [customInputVal, setCustomInputVal] = useState<string>('7')
  const [scaleError, setScaleError] = useState<string | null>(null)
  const projects = useAppStore(state => state.projects)
  const tasks = useAppStore(state => state.tasks)
  const completedTasks = useAppStore(state => state.completedTasks)
  const preselectedSessionId = useAppStore(state => state.preselectedSessionId)
  const setPreselectedSessionId = useAppStore(state => state.setPreselectedSessionId)

  const observerRef = useRef<ResizeObserver | null>(null)
  const [dimensions, setDimensions] = useState({ width: 500, height: 224 })

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    if (node) {
      const observer = new ResizeObserver((entries) => {
        if (!entries || entries.length === 0) return
        const { width, height } = entries[0].contentRect
        setDimensions({ 
          width: Math.max(100, width), 
          height: height > 0 ? height : 224 
        })
      })
      observer.observe(node)
      observerRef.current = observer
    }
  }, [])

  // Automatically calculate recommended scale based on history calendar days span
  const getRecommendedScale = (sessions: any[]) => {
    const dates = sessions
      .map(s => s.startedAt ? new Date(s.startedAt).getTime() : 0)
      .filter(t => t > 0)
    if (dates.length === 0) return 7 // Default to 7 if no data
    
    const minTime = Math.min(...dates)
    const minDate = new Date(minTime)
    const minMidnight = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime()
    
    const now = new Date()
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    
    const diffMs = todayMidnight - minMidnight
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1 // Add 1 to include today
    
    const calculatedDays = Math.max(1, diffDays)
    return calculatedDays > 7 ? 7 : calculatedDays
  }



  const loadHistory = async () => {
    if (!window.electronAPI || !window.electronAPI.getSessionHistory) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      const list = await window.electronAPI.getSessionHistory()
      const fetchedHistory = list || []
      setHistory(fetchedHistory)
      
      // Calculate and apply recommended scale on initial data load
      const activeHist = fetchedHistory.filter((s: any) => s.status === 'completed' || s.durationSeconds > 10)
      const recommended = getRecommendedScale(activeHist)
      setTimeScaleDays(recommended)
      setCustomInputVal(String(recommended))
      setScaleError(null)
    } catch (err) {
      console.error('Failed to load session history:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomScaleChange = (val: string) => {
    setCustomInputVal(val)
    if (val.trim() === '') {
      setScaleError('Please enter a number')
      return
    }
    
    const num = Number(val)
    if (isNaN(num)) {
      setScaleError('Error: Invalid input. Scaling factor must be a numeric value.')
      return
    }
    
    if (!Number.isInteger(num)) {
      setScaleError('Error: Non-integer value. Chart scaling must be a whole number.')
      return
    }
    
    if (num < 1) {
      setScaleError('Error: Scaling too small. Minimum value is 1 day.')
      return
    }

    if (num > 1000) {
      setScaleError('Error: Scaling too large. Maximum value is 1000 days.')
      return
    }
    
    setScaleError(null)
  }

  const handleApplyScale = () => {
    const val = customInputVal.trim()
    if (val === '') {
      setScaleError('Please enter a number')
      return
    }
    
    const num = Number(val)
    if (isNaN(num)) {
      setScaleError('Error: Invalid input. Scaling factor must be a numeric value.')
      return
    }
    
    if (!Number.isInteger(num)) {
      setScaleError('Error: Non-integer value. Chart scaling must be a whole number.')
      return
    }
    
    if (num < 1) {
      setScaleError('Error: Scaling too small. Minimum value is 1 day.')
      return
    }

    if (num > 1000) {
      setScaleError('Error: Scaling too large. Maximum value is 1000 days.')
      return
    }
    
    setScaleError(null)
    setTimeScaleDays(num)
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.electronAPI || !window.electronAPI.deleteSession) return
    try {
      await window.electronAPI.deleteSession(sessionId)
      if (selectedSession && (selectedSession.id === sessionId || selectedSession.sessionId === sessionId)) {
        setSelectedSession(null)
      }
      loadHistory()
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  useEffect(() => {
    loadHistory()

    if (window.electronAPI && window.electronAPI.onSessionStateChanged) {
      const removeStateListener = window.electronAPI.onSessionStateChanged(() => {
        loadHistory()
      })
      return () => {
        if (typeof removeStateListener === 'function') removeStateListener()
      }
    }
    return undefined
  }, [])

  useEffect(() => {
    if (preselectedSessionId && history.length > 0) {
      const item = history.find((s: any) => s.sessionId === preselectedSessionId || s.id === preselectedSessionId)
      if (item) {
        console.log('Auto-selecting preselected session:', item)
        setSelectedSession(item)
      }
      setPreselectedSessionId(null)
    }
  }, [preselectedSessionId, history])

  // Keeps the active selectedSession details drawer in complete sync with reloaded or renamed history items
  useEffect(() => {
    if (selectedSession) {
      const match = history.find((s: any) => (s.sessionId || s.id) === (selectedSession.sessionId || selectedSession.id))
      if (match) {
        setSelectedSession(match)
      }
    }
  }, [history])

  const handleClearHistory = async () => {
    if (!window.electronAPI || !window.electronAPI.clearSessionHistory) return
    try {
      await window.electronAPI.clearSessionHistory()
      setHistory([])
      setConfirmClear(false)
      setSelectedSession(null)
    } catch (err) {
      console.error('Failed to clear session history:', err)
    }
  }

  // Format helper
  const formatSecs = (totalSecs: number) => {
    if (totalSecs < 60) return `${totalSecs}s`
    const m = Math.floor(totalSecs / 60)
    const s = totalSecs % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }

  const formatSecsToShort = (totalSecs: number) => {
    const mins = Math.round(totalSecs / 60)
    return `${mins}m`
  }

  const formatOnlyDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr)
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch (e) {
      return isoStr
    }
  }

  // Stats Calculations
  const completedSessions = history.filter(s => s.status === 'completed' || s.durationSeconds > 10)
  const totalSessionsCount = completedSessions.length

  const totalDurationSeconds = completedSessions.reduce((acc, s) => acc + (s.durationSeconds ?? 0), 0)
  const totalProductiveSeconds = completedSessions.reduce((acc, s) => acc + (s.productiveSeconds ?? 0), 0)
  const totalDistractionCount = completedSessions.reduce((acc, s) => acc + (s.distractionCount ?? 0), 0)

  // Overall productive percentage
  const globalProductivePercent = totalDurationSeconds > 0 
    ? Math.round((totalProductiveSeconds / totalDurationSeconds) * 100) 
    : 100

  // Average focus streak before distraction
  const globalAverageFocusStreak = totalSessionsCount > 0
    ? Math.round(totalProductiveSeconds / (totalDistractionCount + totalSessionsCount))
    : 0

  // Group distractions across ALL sessions
  const appDistractionsMap: Record<string, { appName: string; durationMs: number; count: number }> = {}
  completedSessions.forEach(s => {
    if (s.distractions && Array.isArray(s.distractions)) {
      s.distractions.forEach((d: any) => {
        const app = d.appName || d.app_name || 'Unknown app'
        if (!appDistractionsMap[app]) {
          appDistractionsMap[app] = { appName: app, durationMs: 0, count: 0 }
        }
        appDistractionsMap[app].durationMs += (d.durationMs || d.duration_ms || 0)
        appDistractionsMap[app].count += 1
      })
    }
  })

  const globalTopDistractions = Object.values(appDistractionsMap)
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 5)

  const isDirty = customInputVal.trim() !== '' && customInputVal.trim() !== String(timeScaleDays)
  const parsedCustom = Number(customInputVal.trim())
  const showChart = customInputVal.trim() !== '' && !isNaN(parsedCustom) && Number.isInteger(parsedCustom) && parsedCustom >= 1 && parsedCustom <= 1000

  // Exact current time bounds for continuous-time XAxis
  const nowTime = Date.now()
  const startTime = nowTime - (timeScaleDays * 24 * 60 * 60 * 1000)
  const endTime = nowTime

  // Prepare chart data (chronological sessions filtered by scale)
  const reversedHistory = [...completedSessions].reverse()
  const filteredHistoryByScale = reversedHistory.filter(s => {
    if (!s.startedAt) return false
    try {
      const time = new Date(s.startedAt).getTime()
      return time >= startTime && time <= endTime
    } catch (e) {
      return false
    }
  })

  const chartData = filteredHistoryByScale.map(s => {
    let name = formatOnlyDate(s.startedAt)
    try {
      const d = new Date(s.startedAt)
      const datePart = d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      const timePart = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      name = `${datePart} · ${timePart}`
    } catch (e) {}

    return {
      name,
      timestamp: new Date(s.startedAt).getTime(),
      RawDate: s.startedAt,
      ProductivePct: s.productivePercent ?? 100,
      ProductiveMins: Math.round((s.productiveSeconds ?? 0) / 60),
      TotalMins: Math.round((s.durationSeconds ?? 0) / 60),
      distractions: s.distractionCount ?? 0
    }
  })

  // Generate ticks based on the continuous duration
  const getXAxisTicks = (start: number, end: number, days: number): number[] => {
    const ticks: number[] = []
    const d = new Date(start)
    
    if (days === 1) {
      // 24 hours: generate 4-hour ticks
      d.setMinutes(0, 0, 0)
      const startHour = Math.floor(d.getHours() / 4) * 4
      d.setHours(startHour)
      
      let t = d.getTime()
      while (t <= end) {
        if (t >= start) {
          ticks.push(t)
        }
        t += 4 * 60 * 60 * 1000 // 4 hours
      }
    } else if (days <= 7) {
      // Midnight of each day in range
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() + 1)
      
      let t = d.getTime()
      while (t <= end) {
        if (t >= start) {
          ticks.push(t)
        }
        t += 24 * 60 * 60 * 1000 // 1 day
      }
    } else {
      // Midnight of every N days
      const intervalDays = days <= 14 ? 2 : days <= 30 ? 5 : 10
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() + 1)
      
      let t = d.getTime()
      let count = 0
      while (t <= end) {
        if (count % intervalDays === 0 && t >= start) {
          ticks.push(t)
        }
        t += 24 * 60 * 60 * 1000
        count++
      }
    }
    
    if (ticks.length === 0) {
      ticks.push(start, (start + end) / 2, end)
    }
    return ticks
  }

  const xAxisTicks = getXAxisTicks(startTime, endTime, timeScaleDays)

  const formatXAxisTick = (tickVal: number) => {
    const d = new Date(tickVal)
    if (timeScaleDays === 1) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } else {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const formatTooltipLabel = (labelValue: any) => {
    try {
      const d = new Date(Number(labelValue))
      const datePart = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      const timePart = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      return `${datePart} · ${timePart}`
    } catch (e) {
      return String(labelValue)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] text-white overflow-hidden p-6 relative no-drag">
      {/* Soft background glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/[0.02] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-500/[0.02] blur-[120px] rounded-full pointer-events-none" />

      {/* Header section with Reset */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/40 no-drag">
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
            <BarChart3 className="text-indigo-400 shrink-0" size={20} />
            Focus Intelligence
          </h1>
          <p className="text-zinc-500 text-xs">
            Review your productivity and growth.
          </p>
        </div>

        {history.length > 0 && (
          <div className="relative">
            {!confirmClear ? (
              <button 
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800/60 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-medium cursor-pointer transition-colors"
              >
                <RotateCcw size={13} />
                Reset Data
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-zinc-900 border border-red-500/30 p-1 rounded-xl shadow-xl">
                <span className="text-[10px] text-zinc-400 px-1 font-semibold">Clear permanently?</span>
                <button 
                  onClick={handleClearHistory}
                  className="px-2 py-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                >
                  Yes
                </button>
                <button 
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                >
                  No
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-400">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Analyzing workspace database...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-center text-indigo-400 mb-4 shadow-xl">
            <Clock size={24} className="stroke-indigo-400/80" />
          </div>
          <h3 className="text-sm font-bold text-zinc-200">No Focus Session Records</h3>
          <p className="text-zinc-500 text-xs mt-2 leading-relaxed">
            Start a focus session from a task to monitor active windows, track streaks, and analyze your development deep-work analytics.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
          {/* LEFT COLUMN: Main Stats and Charts */}
          <div className="lg:col-span-8 flex flex-col gap-5 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            
            {/* KPI Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-zinc-900/30 border border-zinc-800/40 p-3.5 rounded-2xl relative overflow-hidden">
                <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase block mb-1">TOTAL SESSIONS</span>
                <span className="text-xl font-bold font-mono text-zinc-100">{totalSessionsCount}</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Completed blocks</span>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800/40 p-3.5 rounded-2xl relative overflow-hidden">
                <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase block mb-1">PRODUCTIVE TIME</span>
                <span className="text-xl font-bold font-mono text-emerald-400">{formatSecsToShort(totalProductiveSeconds)}</span>
                <span className="text-[10px] text-emerald-500/70 block mt-0.5">{globalProductivePercent}% of total</span>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800/40 p-3.5 rounded-2xl relative overflow-hidden">
                <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase block mb-1">AVG FOCUS STREAK</span>
                <span className="text-xl font-bold font-mono text-indigo-400">{formatSecs(globalAverageFocusStreak)}</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Before interruption</span>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800/40 p-3.5 rounded-2xl relative overflow-hidden">
                <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase block mb-1">SWAP OVERHEAD</span>
                <span className={cn(
                  "text-xl font-bold font-mono",
                  totalDistractionCount > 0 ? "text-rose-400" : "text-emerald-400"
                )}>
                  {totalDistractionCount}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Focus switch logs</span>
              </div>
            </div>

            {/* Interactive Area Chart */}
            <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">Productive Depth Timeline</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Chronological focus minutes & productive trends spanning {timeScaleDays} {timeScaleDays === 1 ? 'day' : 'days'}</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                    <span>Productive Mins</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-zinc-800" />
                    <span>Total Mins</span>
                  </div>
                </div>
              </div>

              {/* Chart Scale Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-zinc-800/20">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mr-1">Pre-Sets:</span>
                  <button
                    onClick={() => {
                      const recommended = getRecommendedScale(completedSessions)
                      setTimeScaleDays(recommended)
                      setCustomInputVal(String(recommended))
                      setScaleError(null)
                    }}
                    className={cn(
                      "px-2 py-1 text-[10px] font-mono rounded-lg border transition-all cursor-pointer flex items-center gap-1",
                      timeScaleDays === getRecommendedScale(completedSessions) && !scaleError ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-bold" : "bg-zinc-950/40 text-zinc-400 border-zinc-800/80 hover:text-zinc-200"
                    )}
                  >
                    Auto ({getRecommendedScale(completedSessions)}d)
                  </button>
                  <button
                    onClick={() => {
                      setTimeScaleDays(1)
                      setCustomInputVal('1')
                      setScaleError(null)
                    }}
                    className={cn(
                      "px-2 py-1 text-[10px] font-mono rounded-lg border transition-all cursor-pointer",
                      timeScaleDays === 1 && !scaleError ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-bold" : "bg-zinc-950/40 text-zinc-400 border-zinc-800/80 hover:text-zinc-200"
                    )}
                  >
                    1 Day
                  </button>
                  <button
                    onClick={() => {
                      setTimeScaleDays(7)
                      setCustomInputVal('7')
                      setScaleError(null)
                    }}
                    className={cn(
                      "px-2 py-1 text-[10px] font-mono rounded-lg border transition-all cursor-pointer",
                      timeScaleDays === 7 && !scaleError ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-bold" : "bg-zinc-950/40 text-zinc-400 border-zinc-800/80 hover:text-zinc-200"
                    )}
                  >
                    1 Week
                  </button>
                  <button
                    onClick={() => {
                      setTimeScaleDays(30)
                      setCustomInputVal('30')
                      setScaleError(null)
                    }}
                    className={cn(
                      "px-2 py-1 text-[10px] font-mono rounded-lg border transition-all cursor-pointer",
                      timeScaleDays === 30 && !scaleError ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-bold" : "bg-zinc-950/40 text-zinc-400 border-zinc-800/80 hover:text-zinc-200"
                    )}
                  >
                    1 Month
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Custom Days:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customInputVal}
                      onChange={(e) => handleCustomScaleChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleApplyScale()
                        }
                      }}
                      placeholder="e.g. 14"
                      className="w-16 bg-zinc-950/60 border border-zinc-800 px-2 py-1 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-center"
                    />
                    <AnimatePresence>
                      {isDirty && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8, x: -5 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.8, x: -5 }}
                          onClick={handleApplyScale}
                          disabled={!!scaleError || customInputVal.trim() === ''}
                          className={cn(
                            "p-1 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-center h-7 w-7 shrink-0",
                            (scaleError || customInputVal.trim() === '')
                              ? "bg-red-500/10 border-red-500/20 text-red-400 cursor-not-allowed opacity-50"
                              : "bg-emerald-500/15 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 active:scale-95"
                          )}
                          title="Apply custom scale (Enter)"
                        >
                          ✓
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {scaleError && (
                <div className="text-red-400 text-[10.5px] font-mono mb-3 bg-red-500/10 border border-red-500/25 p-2.5 rounded-xl flex items-center gap-2 animate-pulse">
                  <AlertTriangle size={12} className="shrink-0 text-red-400" />
                  <span>{scaleError}</span>
                </div>
              )}

              {showChart ? (
                <div ref={containerRef} className="h-56 w-full text-xs">
                  <AreaChart width={dimensions.width} height={dimensions.height} data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#27272a" strokeOpacity={0.4} strokeDasharray="3 3" vertical={true} horizontal={true} />
                    <XAxis 
                      type="number"
                      dataKey="timestamp" 
                      domain={[startTime, endTime]}
                      ticks={xAxisTicks}
                      tickFormatter={formatXAxisTick}
                      stroke="#4b5563" 
                      fontSize={9} 
                      tickLine={true} 
                      axisLine={true} 
                      dy={8}
                    />
                    <YAxis 
                      stroke="#4b5563" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      labelFormatter={formatTooltipLabel}
                      contentStyle={{ 
                        backgroundColor: '#18181b', 
                        borderColor: '#27272a',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '11px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                      }}
                      labelStyle={{ fontWeight: 'bold', color: '#a1a1aa', marginBottom: '4px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="TotalMins" 
                      stroke="#27272a" 
                      strokeWidth={1.5}
                      fill="transparent" 
                      strokeDasharray="4 4"
                      dot={{ r: 2, fill: '#3f3f46', strokeWidth: 0 }}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="ProductiveMins" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorProd)" 
                      dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </div>
              ) : (
                <div className="h-56 w-full flex flex-col items-center justify-center p-4 border border-dashed border-zinc-800/80 rounded-xl text-center bg-zinc-950/10">
                  <AlertTriangle size={20} className="text-zinc-500 mb-2 shrink-0 animate-pulse" />
                  <span className="text-[11px] font-bold text-zinc-400">Please show a valid number</span>
                  <p className="text-[10px] text-zinc-500 max-w-[280px] mt-1">
                    {scaleError || "Enter a valid whole number of days between 1 and 1000 in the Custom Days box to project your focus trends."}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Row / Global Distractions Visualizer */}
            <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-2xl p-4 flex-1 min-h-[220px] flex flex-col justify-start">
              <div className="mb-4">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">Global Wasted Streams</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Wasted time across all active sessions, grouped by detected foreground window apps.</p>
              </div>

              {globalTopDistractions.length > 0 ? (
                <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar max-h-56 pr-1">
                  {globalTopDistractions.map((ta: any, idx: number) => {
                    const distractSecs = Math.floor(ta.durationMs / 1000)
                    const totalWastedMs = globalTopDistractions.reduce((acc: number, app: any) => acc + (app.durationMs || 0), 0)
                    const weightPct = totalWastedMs > 0 ? Math.round((ta.durationMs / totalWastedMs) * 100) : 100

                    return (
                      <div key={idx} className="bg-zinc-950/20 border border-zinc-850 p-2.5 rounded-xl">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            <span className="font-bold text-zinc-200">{ta.appName}</span>
                            <span className="text-[10px] text-zinc-500">
                              ({ta.count} focus {ta.count === 1 ? 'incident' : 'incidents'})
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-zinc-400">
                            {formatSecs(distractSecs)}
                          </span>
                        </div>
                        
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${weightPct}%` }}
                            transition={{ duration: 0.8, delay: 0.1 * idx }}
                            className="h-full bg-rose-500/80 rounded-full"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-zinc-800 rounded-xl text-center bg-zinc-950/10">
                  <span className="text-xl mb-1">🛡️</span>
                  <span className="text-[11px] font-bold text-emerald-400">Pristine Safety Record</span>
                  <p className="text-[10px] text-zinc-500 max-w-[240px] mt-1">No off-task switches logged yet. Blacklisted windows have not disrupted focus.</p>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Chronological Session Log */}
          <div className="lg:col-span-4 flex flex-col bg-zinc-900/20 border border-zinc-800/40 rounded-2.5xl p-4 min-h-0 overflow-hidden">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono mb-1">Focus Log History</h3>
            <p className="text-[10px] text-zinc-500 mb-4">Click a session block to evaluate its timeline details.</p>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
              {completedSessions.map((s, idx) => {
                const sessionProject = projects.find(p => p.id === s.projectId || p.id === s.project_id)
                const matchedTask = [...tasks, ...completedTasks].find(t => t.id === s.taskId || t.id === s.task_id)
                const taskTitle = s.customName || s.custom_name || s.task_title || s.taskTitle || matchedTask?.title || 'Independent Focus Block'
                const sessId = s.sessionId || s.id
                const isEditing = editingSessionId === sessId

                return (
                  <div
                    key={sessId || idx}
                    onClick={() => {
                      if (!isEditing) {
                        console.log('Selected focus session item:', s)
                        setSelectedSession(s)
                      }
                    }}
                    className={cn(
                      "w-full text-left bg-zinc-900/40 border p-4.5 rounded-xl hover:bg-zinc-800/80 hover:border-zinc-700 active:scale-[0.99] hover:shadow-lg transition-all duration-150 flex flex-col gap-3 relative group cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500/50",
                      selectedSession?.sessionId === sessId ? "border-indigo-500 bg-indigo-500/[0.04]" : "border-zinc-800/60"
                    )}
                  >
                    {/* First line: Task Title (Prominent) and Duration */}
                    <div className="flex items-start justify-between gap-3 w-full pr-10">
                      {isEditing ? (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (editingSessionName.trim() && window.electronAPI && window.electronAPI.renameSession) {
                              await window.electronAPI.renameSession(sessId, editingSessionName.trim())
                              setEditingSessionId(null)
                              loadHistory()
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 flex-1 max-w-[85%]"
                        >
                          <input
                            type="text"
                            value={editingSessionName}
                            onChange={(e) => setEditingSessionName(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                e.preventDefault()
                                setEditingSessionId(null)
                              }
                            }}
                            className="bg-zinc-850 text-white border border-indigo-500/50 rounded-md px-2 py-0.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="submit"
                            className="p-1 hover:bg-zinc-800 rounded text-emerald-400 transition"
                          >
                            <Check className="w-3.5 h-3.5 animate-pulse" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingSessionId(null)
                            }}
                            className="p-1 hover:bg-zinc-800 rounded text-rose-400 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      ) : (
                        <span 
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            setEditingSessionId(sessId)
                            setEditingSessionName(taskTitle)
                          }}
                          className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors truncate block flex-1"
                          title="Double-click to rename"
                        >
                          {taskTitle}
                        </span>
                      )}
                      <span className="text-xs font-bold text-zinc-300 group-hover:text-white font-mono shrink-0 whitespace-nowrap mt-0.5">
                        {s.durationMins || Math.round(s.durationSeconds / 60)}m
                      </span>
                    </div>

                    {/* Second line: Project Indicator, Date, and productive percent */}
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 truncate max-w-[75%]">
                        {sessionProject ? (
                          <div className="flex items-center gap-1.5 truncate shrink-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sessionProject.color }} />
                            <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 truncate font-sans font-medium">
                              {sessionProject.name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 truncate shrink-0">
                            <FolderDot size={11} className="text-zinc-600 shrink-0" />
                            <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400 truncate font-sans font-medium">
                              No Project
                            </span>
                          </div>
                        )}
                        <span className="text-[10px] text-zinc-650 font-mono shrink-0">
                          ·
                        </span>
                        <span className="text-[10px] text-zinc-450 font-mono whitespace-nowrap truncate shrink-0">
                          {formatOnlyDate(s.startedAt)} · {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 whitespace-nowrap border",
                        s.productivePercent >= 90 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" :
                        s.productivePercent >= 70 ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/15" :
                        s.productivePercent >= 50 ? "bg-amber-500/10 text-amber-400 border-amber-500/10" : 
                        "bg-rose-500/10 text-rose-400 border-rose-500/15"
                      )}>
                        {s.productivePercent}% FOCUS
                      </span>
                    </div>

                    {/* Third line: Distractions count */}
                    {s.distractionCount > 0 && (
                      <div className="text-[10px] text-rose-400/85 font-mono flex items-center gap-1.5 mt-0.5 pt-2.5 border-t border-zinc-800/30 w-full">
                        <AlertTriangle size={11} className="shrink-0" />
                        <span className="truncate">
                          {s.distractionCount} {s.distractionCount === 1 ? 'distraction' : 'distractions'} ({formatSecs(Math.floor(s.totalDistractedSeconds))})
                        </span>
                      </div>
                    )}

                    {/* Quick action buttons for custom rename and deletion of individual focus sessions */}
                    {!isEditing && (
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                        <button
                          title="Rename focus session"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingSessionId(sessId)
                            setEditingSessionName(taskTitle)
                          }}
                          className="p-1.5 bg-zinc-950/80 border border-zinc-800 hover:border-indigo-500/30 text-zinc-400 hover:text-indigo-400 rounded-lg transition-all cursor-pointer"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          title="Delete focus session"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSession(sessId)
                          }}
                          className="p-1.5 bg-zinc-950/80 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Session Timeline Details */}
      <AnimatePresence>
        {selectedSession && (
          <PostSessionOverview 
            key={selectedSession.sessionId || selectedSession.id}
            summary={selectedSession}
            targetMinutes={selectedSession.targetDurationMins || selectedSession.target_duration_mins || 25}
            onClose={() => {
              setSelectedSession(null)
              loadHistory() // Refresh historical logs and self-analysis data in lists/charts instantly
            }}
            isHistorical={true}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
