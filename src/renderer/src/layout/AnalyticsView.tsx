// src/renderer/src/layout/AnalyticsView.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  X,
  CheckCircle2,
  Award,
  SlidersHorizontal,
  Calendar,
  Compass
} from 'lucide-react'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../lib/utils'
import { PostSessionOverview } from '../components/tasks/PostSessionOverview'
import type { Task } from '../types'

export function AnalyticsView() {
  const [history, setHistory] = useState<any[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingSessionName, setEditingSessionName] = useState<string>('')
  const [confirmClear, setConfirmClear] = useState<boolean>(false)
  const [timeScaleDays, setTimeScaleDays] = useState<number>(7)
  const [customInputVal, setCustomInputVal] = useState<string>('7')
  const [scaleError, setScaleError] = useState<string | null>(null)
  
  // Interactive Project Filter State
  const [filterProjectId, setFilterProjectId] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'focus' | 'tasks' | 'rituals'>('focus')

  const projects = useAppStore(state => state.projects)
  const preselectedSessionId = useAppStore(state => state.preselectedSessionId)
  const setPreselectedSessionId = useAppStore(state => state.setPreselectedSessionId)

  const observerRef = useRef<ResizeObserver | null>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 224 })

  const containerRef = useCallback((node: HTMLDivElement | null): void => {
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
  const getRecommendedScale = (sessions: any[]): number => {
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

  const loadHistory = async (): Promise<void> => {
    if (!window.electronAPI || !window.electronAPI.getSessionHistory) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      const listPromise = window.electronAPI.getSessionHistory()
      const tasksPromise = window.electronAPI.getTasks ? window.electronAPI.getTasks() : Promise.resolve([])
      
      const [list, fetchedTasks] = await Promise.all([listPromise, tasksPromise])
      const fetchedHistory = list || []
      
      setHistory(fetchedHistory)
      setAllTasks(fetchedTasks || [])
      
      // Calculate and apply recommended scale on initial data load
      const activeHist = fetchedHistory.filter((s: any) => s.status === 'completed' || s.durationSeconds > 10)
      const recommended = getRecommendedScale(activeHist)
      setTimeScaleDays(recommended)
      setCustomInputVal(String(recommended))
      setScaleError(null)
    } catch (err) {
      console.error('Failed to load productivity data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomScaleChange = (val: string): void => {
    setCustomInputVal(val)
  }

  const handleApplyScale = (): void => {
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

  const handleDeleteSession = async (sessionId: string): Promise<void> => {
    if (!window.electronAPI || !window.electronAPI.deleteSession) return
    const prevHistory = [...history]
    
    // Optimistic update
    setHistory(prev => prev.filter(s => (s.sessionId || s.id) !== sessionId))
    if (selectedSession && (selectedSession.id === sessionId || selectedSession.sessionId === sessionId)) {
      setSelectedSession(null)
    }

    try {
      await window.electronAPI.deleteSession(sessionId)
      loadHistory()
    } catch (err) {
      console.error('Failed to delete session:', err)
      // Rollback on error
      setHistory(prevHistory)
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

  const handleClearHistory = async (): Promise<void> => {
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
  const formatSecs = (totalSecs: number): string => {
    if (totalSecs < 60) return `${totalSecs}s`
    const m = Math.floor(totalSecs / 60)
    const s = totalSecs % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }

  const formatSecsToShort = (totalSecs: number): string => {
    const mins = Math.round(totalSecs / 60)
    return `${mins}m`
  }

  const formatOnlyDate = (isoStr: string): string => {
    try {
      const d = new Date(isoStr)
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch (e) {
      return isoStr
    }
  }

  // Helper matching rule for project filtering
  const matchesProject = (testProjId: string | null): boolean => {
    if (filterProjectId === 'all') return true
    if (filterProjectId === 'inbox-default') {
      return !testProjId || testProjId === 'inbox-default'
    }
    return testProjId === filterProjectId
  }

  // Raw Sessions & Tasks filtering based on project selection
  const rawSessions = history.filter(s => s.status === 'completed' || s.durationSeconds > 10)
  const filteredSessions = rawSessions.filter(s => matchesProject(s.projectId || s.project_id))

  const activeTasks = allTasks.filter(t => t.status !== 'done' && t.status !== 'deleted')
  const doneTasks = allTasks.filter(t => t.status === 'done')
  
  const filteredDoneTasks = doneTasks.filter(t => matchesProject(t.project_id))
  const filteredActiveTasks = activeTasks.filter(t => matchesProject(t.project_id))

  // KPI calculations based on filtered results
  const totalSessionsCount = filteredSessions.length
  const totalDurationSeconds = filteredSessions.reduce((acc, s) => acc + (s.durationSeconds ?? 0), 0)
  const totalProductiveSeconds = filteredSessions.reduce((acc, s) => acc + (s.productiveSeconds ?? 0), 0)
  const totalDistractionCount = filteredSessions.reduce((acc, s) => acc + (s.distractionCount ?? 0), 0)

  const globalProductivePercent = totalDurationSeconds > 0 
    ? Math.round((totalProductiveSeconds / totalDurationSeconds) * 100) 
    : 100

  const globalAverageFocusStreak = totalSessionsCount > 0
    ? Math.round(totalProductiveSeconds / (totalDistractionCount + totalSessionsCount))
    : 0

  // Group distractions across filtered sessions
  const appDistractionsMap: Record<string, { appName: string; durationMs: number; count: number }> = {}
  filteredSessions.forEach(s => {
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
  const showChart = typeof timeScaleDays === 'number' && !isNaN(timeScaleDays) && timeScaleDays >= 1 && timeScaleDays <= 1000

  // Time Bound limits for charts
  const nowTime = Date.now()
  const startTime = nowTime - (timeScaleDays * 24 * 60 * 60 * 1000)
  const endTime = nowTime

  // Prepare chart data (chronological filtered sessions)
  const reversedHistory = [...filteredSessions].reverse()
  const filteredHistoryByScale = reversedHistory.filter(s => {
    if (!s.startedAt) return false
    try {
      const time = new Date(s.startedAt).getTime()
      return time >= startTime && time <= endTime
    } catch (e) {
      return false
    }
  })

  const focusChartData = filteredHistoryByScale.map(s => {
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

  // Dynamic custom dots
  const renderCustomDot = (r: number, fill: string) => (props: any): React.ReactNode => {
    const { cx, cy, index } = props
    if (cx === undefined || cy === undefined || index === undefined) return null
    return (
      <circle
        key={`dot-${index}`}
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke="none"
      />
    )
  }

  // Generate XAxis Ticks
  const getXAxisTicks = (start: number, end: number, days: number): number[] => {
    const ticks: number[] = []
    const d = new Date(start)
    
    if (days === 1) {
      d.setMinutes(0, 0, 0)
      const startHour = Math.floor(d.getHours() / 4) * 4
      d.setHours(startHour)
      
      let t = d.getTime()
      while (t <= end) {
        if (t >= start) {
          ticks.push(t)
        }
        t += 4 * 60 * 60 * 1000
      }
    } else if (days <= 7) {
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() + 1)
      
      let t = d.getTime()
      while (t <= end) {
        if (t >= start) {
          ticks.push(t)
        }
        t += 24 * 60 * 60 * 1000
      }
    } else {
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

  const formatXAxisTick = (tickVal: number): string => {
    const d = new Date(tickVal)
    if (timeScaleDays === 1) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } else {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const formatTooltipLabel = (labelValue: any): string => {
    try {
      const d = new Date(Number(labelValue))
      const datePart = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      const timePart = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      return `${datePart} · ${timePart}`
    } catch (e) {
      return String(labelValue)
    }
  }

  // --- COMPLETED TASKS DATA GROUPING ---
  // Filter done tasks that were completed within this timeframe
  const completedTasksInTimeframe = filteredDoneTasks.filter(t => {
    if (!t.completed_at) return false
    const time = new Date(t.completed_at).getTime()
    return time >= startTime && time <= endTime
  })

  // Filter all tasks that were created within this timeframe and match project
  const filteredAllTasks = useMemo(() => {
    return allTasks.filter(t => matchesProject(t.project_id))
  }, [allTasks, filterProjectId])

  const createdTasksInTimeframe = useMemo(() => {
    return filteredAllTasks.filter(t => {
      if (!t.created_at) return false
      const time = new Date(t.created_at).getTime()
      return time >= startTime && time <= endTime
    })
  }, [filteredAllTasks, startTime, endTime])

  // Map tasks to daily buckets for both completed and created
  const dailyCompletionData = useMemo((): { dateStr: string; count: number; createdCount: number; timestamp: number }[] => {
    const dailyMap: Record<string, { dateStr: string; count: number; createdCount: number; timestamp: number }> = {}
    
    // Initialize empty day grids
    for (let i = timeScaleDays - 1; i >= 0; i--) {
      const d = new Date(nowTime - (i * 24 * 60 * 60 * 1000))
      const key = d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      const zeroed = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      dailyMap[key] = {
        dateStr: key,
        count: 0,
        createdCount: 0,
        timestamp: zeroed.getTime()
      }
    }
    
    // Populate completed values
    completedTasksInTimeframe.forEach(t => {
      if (!t.completed_at) return
      const d = new Date(t.completed_at)
      const key = d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      if (dailyMap[key]) {
        dailyMap[key].count += 1
      } else {
        const zeroed = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        dailyMap[key] = { dateStr: key, count: 1, createdCount: 0, timestamp: zeroed.getTime() }
      }
    })

    // Populate created values
    createdTasksInTimeframe.forEach(t => {
      if (!t.created_at) return
      const d = new Date(t.created_at)
      const key = d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      if (dailyMap[key]) {
        dailyMap[key].createdCount += 1
      } else {
        const zeroed = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        dailyMap[key] = { dateStr: key, count: 0, createdCount: 1, timestamp: zeroed.getTime() }
      }
    })
    
    return Object.values(dailyMap).sort((a, b) => a.timestamp - b.timestamp)
  }, [completedTasksInTimeframe, createdTasksInTimeframe, timeScaleDays, nowTime])

  // Sort completed tasks for detailed recap list (newest first)
  const sortedCompletedTasks = useMemo((): Task[] => {
    return [...filteredDoneTasks].sort((a, b) => {
      const timeA = a.completed_at ? new Date(a.completed_at).getTime() : 0
      const timeB = b.completed_at ? new Date(b.completed_at).getTime() : 0
      return timeB - timeA
    })
  }, [filteredDoneTasks])

  // Completed Tasks Priority distribution
  const p3Count = filteredDoneTasks.filter(t => t.priority === 3).length
  const p2Count = filteredDoneTasks.filter(t => t.priority === 2).length
  const p1Count = filteredDoneTasks.filter(t => t.priority === 1).length
  const p0Count = filteredDoneTasks.filter(t => t.priority === 0).length
  const totalPriCount = filteredDoneTasks.length

  const getPriorityPct = (cnt: number): number => {
    return totalPriCount > 0 ? Math.round((cnt / totalPriCount) * 100) : 0
  }

  // Active vs Complete totals/velocity
  const totalActiveAndDone = filteredDoneTasks.length + filteredActiveTasks.length
  const taskCompletionRate = totalActiveAndDone > 0 
    ? Math.round((filteredDoneTasks.length / totalActiveAndDone) * 100) 
    : 0

  // Estimate accuracies
  const tasksWithEstimates = filteredDoneTasks.filter(t => t.time_estimate_mins > 0)
  const totalEstimatedMins = tasksWithEstimates.reduce((acc, t) => acc + t.time_estimate_mins, 0)
  const totalLoggedMinsForEstimates = tasksWithEstimates.reduce((acc, t) => acc + t.time_logged_mins, 0)
  const estimationDeviationPct = totalEstimatedMins > 0 
    ? Math.round(((totalLoggedMinsForEstimates - totalEstimatedMins) / totalEstimatedMins) * 100)
    : 0

  // True capacity variance percentage
  const capacityVarianceData = useMemo(() => {
    const tasksWithEstimatesInTimeframe = completedTasksInTimeframe.filter(t => t.time_estimate_mins > 0)
    if (tasksWithEstimatesInTimeframe.length === 0) {
      return { percentage: 0, hasData: false, label: "No estimates" }
    }

    let totalEstimated = 0
    let totalActual = 0

    tasksWithEstimatesInTimeframe.forEach(t => {
      totalEstimated += t.time_estimate_mins
      // Find linked sessions
      const linkedSessions = history.filter(s => s.taskId === t.id || s.task_id === t.id)
      const actualMins = linkedSessions.reduce((sum, s) => {
        const mins = s.durationMins || s.duration_mins || Math.round((s.durationSeconds ?? 0) / 60)
        return sum + mins
      }, 0)
      totalActual += actualMins
    })

    if (totalEstimated === 0) {
      return { percentage: 0, hasData: false, label: "No estimates" }
    }

    const variancePct = Math.round(((totalActual - totalEstimated) / totalEstimated) * 100)

    let label = ""
    if (variancePct === 0) {
      label = "100% Match"
    } else if (variancePct < 0) {
      label = `-${Math.abs(variancePct)}% Under-estimated`
    } else {
      label = `+${variancePct}% Over-committed`
    }

    return {
      percentage: variancePct,
      hasData: true,
      label,
      totalEstimated,
      totalActual
    }
  }, [completedTasksInTimeframe, history])

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] text-white overflow-hidden p-6 relative no-drag animate-fade-in">
      {/* Dynamic backdrop neon glows */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-indigo-500/[0.02] blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-emerald-500/[0.015] blur-[150px] rounded-full pointer-events-none" />

      {/* HEADER BLOCK */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 pb-4 border-b border-zinc-800/40 no-drag">
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
            <BarChart3 className="text-indigo-400 shrink-0 animate-pulse" size={20} />
            Productivity Statistics
          </h1>
          <p className="text-zinc-500 text-xs">
            Review your stats, task completion velocity, and growth!
          </p>
        </div>

        {/* Dynamic Filters panel */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Project Filtering Dropdown */}
          <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/80 px-2.5 py-1 rounded-xl">
            <SlidersHorizontal size={12} className="text-zinc-400 shrink-0" />
            <select
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-200 outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-zinc-950 text-zinc-300">All Projects</option>
              <option value="inbox-default" className="bg-zinc-950 text-zinc-300">Inbox (Default)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-zinc-950 text-white">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset functionality */}
          {history.length > 0 && (
            <div className="relative">
              {!confirmClear ? (
                <button 
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800/60 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-medium cursor-pointer transition-colors h-8"
                >
                  <RotateCcw size={12} />
                  Reset Database
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-zinc-950 border border-red-500/30 p-1 rounded-xl shadow-xl h-8">
                  <span className="text-[10px] text-zinc-400 px-1 font-semibold">Delete?</span>
                  <button 
                    onClick={handleClearHistory}
                    className="px-2 py-0.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[9px] font-bold rounded-lg transition-all cursor-pointer"
                  >
                    Yes
                  </button>
                  <button 
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-[9px] font-bold rounded-lg transition-all cursor-pointer"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-400">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-zinc-500">Compiling productivity telemetry...</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* TAB SWITCHER */}
          <div className="flex items-center justify-start mb-4 no-drag">
            <div className="flex bg-[#121214] p-1 rounded-xl border border-zinc-800/80 relative">
              <button
                onClick={() => setActiveTab('focus')}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold relative transition-all focus:outline-none cursor-pointer",
                  activeTab === 'focus' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {activeTab === 'focus' && (
                  <motion.div
                    layoutId="active-stats-tab"
                    className="absolute inset-0 bg-zinc-900 border border-zinc-805 rounded-lg -z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Clock size={13} className={cn(activeTab === 'focus' ? "text-indigo-400" : "text-zinc-500")} />
                  Focus Session Stats
                </span>
              </button>
                           <button
                onClick={() => setActiveTab('tasks')}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold relative transition-all focus:outline-none cursor-pointer",
                  activeTab === 'tasks' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {activeTab === 'tasks' && (
                  <motion.div
                    layoutId="active-stats-tab"
                    className="absolute inset-0 bg-zinc-900 border border-zinc-805 rounded-lg -z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className={cn(activeTab === 'tasks' ? "text-emerald-400" : "text-zinc-500")} />
                  Tasks & Achievements
                </span>
              </button>

              <button
                onClick={() => setActiveTab('rituals')}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold relative transition-all focus:outline-none cursor-pointer",
                  activeTab === 'rituals' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {activeTab === 'rituals' && (
                  <motion.div
                    layoutId="active-stats-tab"
                    className="absolute inset-0 bg-zinc-900 border border-zinc-805 rounded-lg -z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Compass size={13} className={cn(activeTab === 'rituals' ? "text-purple-400" : "text-zinc-500")} />
                  Rituals Consistency
                </span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-1 min-h-0">
            {activeTab === 'focus' ? (
              history.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto my-12">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-center text-indigo-400 mb-4 shadow-xl">
                    <Clock size={24} className="stroke-indigo-400/80 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-200">No Focus Session Records</h3>
                  <p className="text-zinc-500 text-xs mt-2 leading-relaxed font-sans">
                    Start a focus session from a task to monitor active windows, track streaks, and analyze your development deep-work analytics.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* PRODUCTIVITY BENTO KPI ROW */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div className="bg-zinc-900/35 border border-zinc-800/40 p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase block mb-1">FOCUSED SPRINT BLOCKS</span>
                        <span className="text-2xl font-black font-mono text-zinc-100">{totalSessionsCount}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block mt-2">Active intervals completed</span>
                    </div>

                    <div className="bg-zinc-900/35 border border-zinc-800/40 p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase block mb-1">TOTAL FOCUS TIME</span>
                        <span className="text-2xl font-black font-mono text-emerald-400">{formatSecsToShort(totalProductiveSeconds)}</span>
                      </div>
                      <span className="text-[10px] text-emerald-500/70 block mt-2">{globalProductivePercent}% pure cognitive flow</span>
                    </div>

                    <div className="bg-zinc-900/35 border border-zinc-800/40 p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase block mb-1">DISTRACTIONS HALTED</span>
                        <span className={cn(
                          "text-2xl font-black font-mono block",
                          totalDistractionCount > 0 ? "text-rose-400" : "text-emerald-400"
                        )}>
                          {totalDistractionCount}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block mt-2">Avg {formatSecs(globalAverageFocusStreak)} sprints</span>
                    </div>
                  </div>

                  {/* DOUBLE CHARTS GRID */}
                  <div className="bg-zinc-900/20 border border-zinc-800/40 rounded-2.5xl p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">Productive Depth Timeline</h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-sans">Focus minutes & trends spanning {timeScaleDays} {timeScaleDays === 1 ? 'day' : 'days'}</p>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-zinc-400 font-mono">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span>Focus Mins</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-zinc-700" />
                          <span>Total Mins</span>
                        </div>
                      </div>
                    </div>

                    {/* Chart Scale Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-zinc-800/20">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mr-1 font-mono">Scale:</span>
                        <button
                          onClick={() => {
                            const recommended = getRecommendedScale(rawSessions)
                            setTimeScaleDays(recommended)
                            setCustomInputVal(String(recommended))
                            setScaleError(null)
                          }}
                          className={cn(
                            "px-2 py-0.5 text-[9px] font-mono rounded-lg border transition-all cursor-pointer flex items-center gap-1",
                            timeScaleDays === getRecommendedScale(rawSessions) && !scaleError ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-bold" : "bg-zinc-950/40 text-zinc-400 border-zinc-800/80 hover:text-zinc-200"
                          )}
                        >
                          Auto ({getRecommendedScale(rawSessions)}d)
                        </button>
                        <button
                          onClick={() => {
                            setTimeScaleDays(1)
                            setCustomInputVal('1')
                            setScaleError(null)
                          }}
                          className={cn(
                            "px-2 py-0.5 text-[9px] font-mono rounded-lg border transition-all cursor-pointer",
                            timeScaleDays === 1 && !scaleError ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-bold" : "bg-zinc-950/40 text-zinc-400 border-zinc-800/80 hover:text-zinc-200"
                          )}
                        >
                          24h
                        </button>
                        <button
                          onClick={() => {
                            setTimeScaleDays(7)
                            setCustomInputVal('7')
                            setScaleError(null)
                          }}
                          className={cn(
                            "px-2 py-0.5 text-[9px] font-mono rounded-lg border transition-all cursor-pointer",
                            timeScaleDays === 7 && !scaleError ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-bold" : "bg-zinc-950/40 text-zinc-400 border-zinc-800/80 hover:text-zinc-200"
                          )}
                        >
                          7d
                        </button>
                        <button
                          onClick={() => {
                            setTimeScaleDays(30)
                            setCustomInputVal('30')
                            setScaleError(null)
                          }}
                          className={cn(
                            "px-2 py-0.5 text-[9px] font-mono rounded-lg border transition-all cursor-pointer",
                            timeScaleDays === 30 && !scaleError ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-bold" : "bg-zinc-950/40 text-zinc-400 border-zinc-800/80 hover:text-zinc-200"
                          )}
                        >
                          30d
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Custom Days:</span>
                        <input
                          type="text"
                          value={customInputVal}
                          onChange={(e) => handleCustomScaleChange(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleApplyScale() }}
                          className="w-12 bg-zinc-950/60 border border-zinc-850 px-1 py-0.5 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-center text-[10px]"
                        />
                        <AnimatePresence>
                          {isDirty && (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              onClick={handleApplyScale}
                              className="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold cursor-pointer transition-all"
                            >
                              Set
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {scaleError && (
                      <div className="text-red-400 text-[10px] font-mono mb-3 bg-red-500/10 border border-red-500/20 p-2 rounded-xl flex items-center gap-1.5">
                        <AlertTriangle size={11} className="shrink-0 text-red-400" />
                        <span>{scaleError}</span>
                      </div>
                    )}

                    {showChart ? (
                      <div ref={containerRef} className="h-56 w-full text-xs overflow-hidden pt-2">
                        {dimensions.width > 0 && (
                          <motion.div
                            key={`${timeScaleDays}-${focusChartData.length}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4 }}
                            className="h-full w-full"
                          >
                            <ResponsiveContainer width="100%" height={210}>
                              <AreaChart data={focusChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid stroke="#27272a" strokeOpacity={0.3} strokeDasharray="3 3" />
                                <XAxis 
                                  type="number"
                                  dataKey="timestamp" 
                                  domain={[startTime, endTime]}
                                  ticks={xAxisTicks}
                                  tickFormatter={formatXAxisTick}
                                  stroke="#71717a" 
                                  fontSize={9} 
                                  tickLine={true} 
                                  axisLine={true} 
                                  dy={6}
                                />
                                <YAxis 
                                  stroke="#71717a" 
                                  fontSize={9} 
                                  tickLine={false} 
                                  axisLine={false}
                                  allowDecimals={false}
                                />
                                <Tooltip 
                                  labelFormatter={formatTooltipLabel}
                                  contentStyle={{ 
                                    backgroundColor: '#09090b', 
                                    borderColor: '#27272a',
                                    borderRadius: '12px',
                                    color: '#f4f4f5',
                                    fontSize: '10px'
                                  }}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="TotalMins" 
                                  stroke="#3f3f46" 
                                  strokeWidth={1}
                                  fill="transparent" 
                                  strokeDasharray="4 4"
                                  isAnimationActive={false}
                                  dot={renderCustomDot(2, '#27272a')}
                                  activeDot={{ r: 4 }}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="ProductiveMins" 
                                  stroke="#6366f1" 
                                  strokeWidth={1.5}
                                  fill="url(#colorProd)" 
                                  isAnimationActive={false}
                                  dot={renderCustomDot(3, '#6366f1')}
                                  activeDot={{ r: 5 }}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </motion.div>
                        )}
                      </div>
                    ) : (
                      <div className="h-56 w-full flex flex-col items-center justify-center p-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/5 text-center">
                        <AlertTriangle size={16} className="text-zinc-650 mb-1" />
                        <span className="text-[10px] text-zinc-500">Scale disabled</span>
                      </div>
                    )}
                  </div>

                  {/* LOWER ANALYSIS DETAIL GRID: Focus Log & Distractions */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
                    {/* LHS app distractions (4 cols) */}
                    <div className="lg:col-span-4 bg-zinc-900/10 border border-zinc-800/40 rounded-2.5xl p-4.5 flex flex-col min-h-0 h-[380px]">
                      <div className="mb-4">
                        <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono mb-0.5">Local Blocked Incidents</h4>
                        <p className="text-[10px] text-zinc-500 font-sans">Breakdown of off-task distractions in current project</p>
                      </div>

                      {globalTopDistractions.length > 0 ? (
                        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
                          {globalTopDistractions.map((ta: any, idx: number) => {
                            const distractSecs = Math.floor(ta.durationMs / 1000)
                            const totalWastedMs = globalTopDistractions.reduce((acc: number, app: any) => acc + (app.durationMs || 0), 0)
                            const weightPct = totalWastedMs > 0 ? Math.round((ta.durationMs / totalWastedMs) * 100) : 100

                            return (
                              <div key={idx} className="bg-zinc-950/20 border border-zinc-850 p-2 rounded-xl">
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                    <span className="font-bold text-zinc-200 truncate pr-1">{ta.appName}</span>
                                  </div>
                                  <span className="font-mono text-[10px] text-zinc-500 whitespace-nowrap">
                                    {formatSecs(distractSecs)}
                                  </span>
                                </div>
                                <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                                  <div className="h-full bg-rose-500/80 rounded-full" style={{ width: `${weightPct}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-3 border border-dashed border-zinc-800/80 rounded-xl bg-zinc-950/40 text-center">
                          <span className="text-lg mb-1">🛡️</span>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">Shield Pristine</span>
                          <p className="text-[9px] text-zinc-500 max-w-[200px] mt-0.5 font-sans">Blacklisted window triggers remained entirely at bay.</p>
                        </div>
                      )}
                    </div>

                    {/* RHS Sprints log (8 cols) */}
                    <div className="lg:col-span-8 bg-zinc-900/10 border border-zinc-800/40 rounded-2.5xl p-4.5 flex flex-col min-h-0 h-[380px]">
                      <div className="mb-4">
                        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono mb-0.5">Focus Sprints History</h3>
                        <p className="text-[10px] text-zinc-500 font-sans">Click a session timeline box to evaluate detail metrics, energy logs & reflections</p>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3.5 pr-1.5">
                        {filteredSessions.length > 0 ? (
                          filteredSessions.map((s, idx) => {
                            const sessionProject = projects.find(p => p.id === s.projectId || p.id === s.project_id)
                            const matchedTask = allTasks.find(t => t.id === s.taskId || t.id === s.task_id)
                            const taskTitle = s.customName || s.custom_name || s.task_title || s.taskTitle || matchedTask?.title || 'Independent Focus Block'
                            const sessId = s.sessionId || s.id
                            const isEditing = editingSessionId === sessId

                            return (
                              <div
                                key={sessId || idx}
                                onClick={() => {
                                  if (!isEditing) {
                                    setSelectedSession(s)
                                  }
                                }}
                                className={cn(
                                  "w-full text-left bg-zinc-900/45 border p-4 rounded-xl hover:bg-zinc-800/80 hover:border-zinc-700 active:scale-[0.99] hover:shadow-lg transition-all duration-150 flex flex-col gap-3 relative group cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500/50",
                                  selectedSession?.sessionId === sessId ? "border-indigo-500 bg-indigo-500/[0.04]" : "border-zinc-800/60"
                                )}
                              >
                                {/* Title line */}
                                <div className="flex items-start justify-between gap-3 w-full pr-12">
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
                                        className="bg-zinc-850 text-white border border-indigo-500/50 rounded-md px-2 py-0.5 text-xs w-full focus:outline-none"
                                      />
                                      <button
                                        type="submit"
                                        className="p-1 hover:bg-zinc-800 rounded text-emerald-400 transition"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditingSessionId(null)
                                        }}
                                        className="p-1 hover:bg-zinc-800 rounded text-rose-455 transition"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </form>
                                  ) : (
                                    <span 
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
                                  <span className="text-xs font-bold text-zinc-350 group-hover:text-white font-mono shrink-0 pt-0.5">
                                    {s.durationMins || Math.round(s.durationSeconds / 60)}m
                                  </span>
                                </div>

                                {/* Project / Date metadata */}
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2 truncate max-w-[75%]">
                                    {sessionProject ? (
                                      <div className="flex items-center gap-1.5 truncate shrink-0">
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sessionProject.color }} />
                                        <span className="text-[10.5px] text-zinc-400 group-hover:text-zinc-300 truncate font-semibold font-sans">
                                          {sessionProject.name}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 truncate shrink-0">
                                        <FolderDot size={11} className="text-zinc-650 shrink-0" />
                                        <span className="text-[10.5px] text-zinc-500 group-hover:text-zinc-400 truncate font-medium font-sans">
                                          No Project
                                        </span>
                                      </div>
                                    )}
                                    <span className="text-[10px] text-zinc-700 font-mono shrink-0">·</span>
                                    <span className="text-[10px] text-zinc-500 font-mono truncate shrink-0">
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

                                {/* Distractions detail banner */}
                                {s.distractionCount > 0 && (
                                  <div className="text-[10px] text-rose-450 font-mono flex items-center gap-1.5 mt-0.5 pt-2 border-t border-zinc-800/30 w-full">
                                    <AlertTriangle size={11} className="shrink-0" />
                                    <span className="truncate">
                                      {s.distractionCount} {s.distractionCount === 1 ? 'distraction' : 'distractions'} ({formatSecs(Math.floor(s.totalDistractedSeconds))})
                                    </span>
                                  </div>
                                )}

                                {/* Actions buttons */}
                                {!isEditing && (
                                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center no-drag select-none text-zinc-400">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingSessionId(sessId)
                                        setEditingSessionName(taskTitle)
                                      }}
                                      className="w-10 h-10 flex items-center justify-center bg-zinc-950/85 border border-zinc-800 hover:border-indigo-500/35 text-zinc-400 hover:text-indigo-400 rounded-lg cursor-pointer transition-all"
                                      title="Rename"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteSession(sessId)
                                      }}
                                      className="w-10 h-10 flex items-center justify-center bg-zinc-950/85 border border-zinc-800 hover:border-red-500/35 text-zinc-400 hover:text-red-400 rounded-lg cursor-pointer transition-all ml-4"
                                      title="Delete"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })
                        ) : (
                          <div className="flex flex-col items-center justify-center p-6 border border-dashed border-zinc-850 rounded-2xl h-full text-center text-zinc-500 bg-zinc-950/10">
                            <Clock size={16} className="text-zinc-650 mb-2" />
                            <span className="text-[10px] font-bold text-zinc-400 font-mono uppercase tracking-widest">No matching focus sprints</span>
                            <p className="text-[9.5px] text-zinc-650 mt-1 max-w-[210px] font-sans">Work blocks for your currently filtered project have not been created yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : activeTab === 'tasks' ? (
               /* TASK VIEW TAB */
               allTasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto my-12">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-center text-emerald-400 mb-4 shadow-xl">
                    <CheckCircle2 size={24} className="stroke-emerald-450/80 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-200">No Task History Available</h3>
                  <p className="text-zinc-500 text-xs mt-2 leading-relaxed font-sans">
                    Create and complete tasks in your core daily checklists to populate performance statistics, priority layouts, and predictions.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* TASKS BENTO KPI ROW */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="bg-zinc-900/35 border border-zinc-800/40 p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase block mb-1">TASKS COMPLETED</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black font-mono text-indigo-400">{filteredDoneTasks.length}</span>
                          <span className="text-xs text-zinc-500 font-mono">/ {totalActiveAndDone}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-indigo-400/80 block mt-2">{taskCompletionRate}% finished velocity</span>
                    </div>

                    <div className="bg-zinc-900/35 border border-zinc-800/40 p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase block mb-1">ESTIMATION PREDICTABILITY</span>
                        <span className={cn(
                          "text-2xl font-black font-mono block",
                          !capacityVarianceData.hasData ? "text-zinc-400" : capacityVarianceData.percentage <= 0 ? "text-emerald-400" : "text-amber-550"
                        )}>
                          {capacityVarianceData.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block mt-2">Capacity variance vs targets</span>
                    </div>
                  </div>

                  {/* DOUBLE CHARTS GRID */}
                  <div className="bg-zinc-900/20 border border-zinc-800/40 rounded-2.5xl p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">Tasks Completed Daily</h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-sans">Quantity of tasks accomplished per day</p>
                      </div>
                      <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg text-emerald-400 text-[10px] font-mono font-bold">
                        <CheckCircle2 size={11} />
                        <span>{completedTasksInTimeframe.length} Total</span>
                      </div>
                    </div>

                    <div className="h-56 w-full pt-4">
                      <ResponsiveContainer width="100%" height={210}>
                        <AreaChart data={dailyCompletionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#27272a" strokeOpacity={0.3} strokeDasharray="3 3" vertical={false} />
                          <XAxis 
                            dataKey="dateStr" 
                            stroke="#71717a" 
                            fontSize={9} 
                            tickLine={false} 
                            axisLine={false}
                            dy={6}
                          />
                          <YAxis 
                            stroke="#71717a" 
                            fontSize={9} 
                            tickLine={false} 
                            axisLine={false}
                            allowDecimals={false}
                            width={25}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#09090b', 
                              borderColor: '#27272a',
                              borderRadius: '12px',
                              color: 'white',
                              fontSize: '10px'
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="createdCount" 
                            stroke="#6366f1" 
                            strokeWidth={1.5}
                            fill="transparent" 
                            strokeDasharray="4 4"
                            isAnimationActive={false}
                            name="Created"
                            dot={renderCustomDot(2, '#4f46e5')}
                            activeDot={{ r: 4 }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#10b981" 
                            strokeWidth={1.5}
                            fill="url(#colorCompleted)" 
                            isAnimationActive={false}
                            name="Completed"
                            dot={renderCustomDot(3, '#10b981')}
                            activeDot={{ r: 5 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* LOWER DETAIL GRID FOR TASK METRICS */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
                    {/* Left: split stats (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col gap-4.5 h-[380px]">
                      {/* Priorities card */}
                      <div className="bg-zinc-900/15 border border-zinc-800/40 rounded-2xl p-4.5 flex-1 flex flex-col justify-between overflow-hidden">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono mb-0.5">Task Priorities</h4>
                          <p className="text-[10px] text-zinc-500 mb-3 font-sans">Velocity ratio grouped by Priority levels</p>
                        </div>

                        <div className="space-y-2.5 flex-1 overflow-y-auto custom-scrollbar pr-1 pt-1">
                          {/* Priority High */}
                          <div>
                            <div className="flex items-center justify-between text-[11px] mb-0.5">
                              <span className="font-semibold text-rose-450 font-sans">P1 (High)</span>
                              <span className="font-mono text-zinc-400 text-[9px]">{p3Count} done · {getPriorityPct(p3Count)}%</span>
                            </div>
                            <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-500/80 rounded-full" style={{ width: `${getPriorityPct(p3Count)}%` }} />
                            </div>
                          </div>

                          {/* Priority Med */}
                          <div>
                            <div className="flex items-center justify-between text-[11px] mb-0.5">
                              <span className="font-semibold text-amber-500/90 font-sans">P2 (Medium)</span>
                              <span className="font-mono text-zinc-400 text-[9px]">{p2Count} done · {getPriorityPct(p2Count)}%</span>
                            </div>
                            <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500/80 rounded-full" style={{ width: `${getPriorityPct(p2Count)}%` }} />
                            </div>
                          </div>

                          {/* Priority Low */}
                          <div>
                            <div className="flex items-center justify-between text-[11px] mb-0.5">
                              <span className="font-semibold text-indigo-455 font-sans">P3 (Low)</span>
                              <span className="font-mono text-zinc-400 text-[9px]">{p1Count} done · {getPriorityPct(p1Count)}%</span>
                            </div>
                            <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500/80 rounded-full" style={{ width: `${getPriorityPct(p1Count)}%` }} />
                            </div>
                          </div>

                          {/* Priority None */}
                          <div>
                            <div className="flex items-center justify-between text-[11px] mb-0.5">
                              <span className="font-semibold text-zinc-400 font-sans">P4 (None)</span>
                              <span className="font-mono text-zinc-400 text-[9px]">{p0Count} done · {getPriorityPct(p0Count)}%</span>
                            </div>
                            <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                              <div className="h-full bg-zinc-750 rounded-full" style={{ width: `${getPriorityPct(p0Count)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Predictability card */}
                      <div className="bg-zinc-900/15 border border-zinc-800/40 rounded-2xl p-4.5 flex-1 flex flex-col justify-between overflow-hidden">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono mb-0.5">Time Predictability</h4>
                          <p className="text-[10px] text-zinc-500 mb-2 font-sans">Estimates vs Actual Focus Logged</p>
                        </div>

                        {tasksWithEstimates.length > 0 ? (
                          <div className="space-y-2 flex-1 flex flex-col justify-center">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-zinc-950/20 border border-zinc-850 p-2 rounded-xl text-center">
                                <span className="text-[8px] font-bold font-mono text-zinc-500 uppercase block mb-0.5">ESTIMATED</span>
                                <span className="text-sm font-black font-mono text-indigo-400">{totalEstimatedMins}m</span>
                              </div>
                              <div className="bg-zinc-950/20 border border-zinc-850 p-2 rounded-xl text-center">
                                <span className="text-[8px] font-bold font-mono text-zinc-500 uppercase block mb-0.5">LOGGED</span>
                                <span className="text-sm font-black font-mono text-amber-500">{totalLoggedMinsForEstimates}m</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 text-[9.5px] leading-relaxed bg-zinc-950/30 border border-zinc-850 p-2 rounded-xl text-zinc-400">
                              <Award size={12} className="text-amber-400 shrink-0" />
                              <div className="truncate">
                                {estimationDeviationPct === 0 ? (
                                  <span>Forecasts aligned completely with focus logs!</span>
                                ) : estimationDeviationPct < 0 ? (
                                  <span>You completed items **{Math.abs(estimationDeviationPct)}% faster** than targeted!</span>
                                ) : (
                                  <span>Tasks took **{estimationDeviationPct}% longer** than targeted.</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col justify-center items-center p-2 border border-dashed border-zinc-800/80 rounded-xl bg-zinc-950/45 text-center text-zinc-500">
                            <AlertTriangle size={13} className="text-zinc-650 mb-1" />
                            <span className="text-[9px] font-semibold">No Estimated Tasks Done</span>
                            <p className="text-[8px] text-zinc-600 max-w-[190px] mt-0.5 font-sans">Set time limits to check prediction accuracy.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: checklist history (8 cols) */}
                    <div className="lg:col-span-8 bg-zinc-900/10 border border-zinc-800/40 rounded-2.5xl p-4.5 flex flex-col min-h-0 h-[380px]">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest font-mono mb-0.5">Tasks Completed History</h3>
                          <p className="text-[10px] text-zinc-500 font-sans">Chronological log of solved & closed checklist tickets</p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-950/30 border border-zinc-850 rounded-xl px-2.5 py-1">
                          <span className="font-bold underline text-emerald-400 font-mono">{filteredDoneTasks.length}</span>
                          <span>Tasks Completed</span>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1.5 animate-fade-in">
                        {sortedCompletedTasks.length > 0 ? (
                          sortedCompletedTasks.map((t) => {
                            const taskProject = projects.find(p => p.id === t.project_id)
                            const priorityColor = t.priority === 3 ? "text-rose-455 bg-rose-500/10 border-rose-500/15" :
                                                  t.priority === 2 ? "text-amber-400 bg-amber-500/10 border-amber-500/15" :
                                                  t.priority === 1 ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/15" :
                                                  "text-zinc-400 bg-zinc-800/20 border-zinc-800/10"
                            
                            const priorityLabel = t.priority === 3 ? "P1" :
                                                  t.priority === 2 ? "P2" :
                                                  t.priority === 1 ? "P3" : "P4"

                            return (
                              <div 
                                key={t.id} 
                                className="bg-zinc-900/30 border border-zinc-850 hover:bg-zinc-800/40 p-3.5 rounded-xl transition duration-150 flex items-start gap-3 relative overflow-hidden"
                              >
                                <div className="text-emerald-505 pt-0.5 shrink-0">
                                  <CheckCircle2 size={16} className="fill-emerald-550/10" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-semibold text-zinc-250 block truncate leading-tight mb-1.5 pr-6 line-through decoration-zinc-650 decoration-1">
                                    {t.title}
                                  </span>
                                  
                                  <div className="flex items-center gap-2.5 flex-wrap truncate text-[9.5px]">
                                    {taskProject ? (
                                      <div className="flex items-center gap-1 truncate shrink-0">
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: taskProject.color }} />
                                        <span className="text-zinc-400 font-bold truncate">
                                          {taskProject.name}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-zinc-500 shrink-0 font-medium">
                                        <FolderDot size={10} className="shrink-0" />
                                        <span>Inbox</span>
                                      </div>
                                    )}

                                    <span className="text-zinc-700 font-mono">·</span>

                                    {t.completed_at && (
                                      <div className="flex items-center gap-1 text-zinc-500 font-mono whitespace-nowrap">
                                        <Calendar size={10} className="shrink-0" />
                                        <span>{new Date(t.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                      </div>
                                    )}

                                    {t.time_logged_mins > 0 && (
                                      <>
                                        <span className="text-zinc-700 font-mono">·</span>
                                        <span className="text-amber-500 font-bold font-mono">
                                          {t.time_logged_mins}m logged
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className={cn(
                                  "px-1.5 py-0.5 rounded text-[9px] font-black font-mono border self-start shrink-0",
                                  priorityColor
                                )}>
                                  {priorityLabel}
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="flex flex-col items-center justify-center p-6 border border-dashed border-zinc-855 rounded-2xl h-full text-center text-zinc-500 bg-zinc-950/10">
                            <CheckCircle2 size={16} className="text-zinc-650 mb-2" />
                            <span className="text-[10px] font-bold text-zinc-450 font-mono uppercase tracking-widest">No tasks completed yet</span>
                            <p className="text-[9.5px] text-zinc-650 mt-1 max-w-[210px] font-sans">Complete active tasks on the board to log achievements for the current project filter.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <RitualsSummaryView />
            )}
          </div>
        </div>
      )}

      {/* TIMELINE DETAIL EVALUATION MODAL */}
      <AnimatePresence>
        {selectedSession && (
          <PostSessionOverview 
            key={selectedSession.sessionId || selectedSession.id}
            summary={selectedSession}
            targetMinutes={selectedSession.targetDurationMins || selectedSession.target_duration_mins || 25}
            onClose={() => {
              setSelectedSession(null)
              loadHistory() // instantly refresh logs
            }}
            isHistorical={true}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function RitualsSummaryView() {
  const [summary, setSummary] = useState<any>(null)
  const [streak, setStreak] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isWhyMatterCollapsed, setIsWhyMatterCollapsed] = useState(false)
  const [isWhyMatterDismissed, setIsWhyMatterDismissed] = useState(false)

  const loadRitualStats = async () => {
    if (window.electronAPI) {
      try {
        setLoading(true)
        const [sum, strk] = await Promise.all([
          window.electronAPI.getWeeklyRitualSummary(),
          window.electronAPI.getRitualStreak()
        ])
        setSummary(sum)
        setStreak(strk)
      } catch (err) {
        console.error('Failed to load ritual summary:', err)
      } finally {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadRitualStats()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-14 gap-2 text-zinc-500">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-zinc-500">Gathering ritual compliance & consistency logs...</span>
      </div>
    )
  }

  const completionRate = summary?.completionRate ?? 0
  const avgCommitted = summary?.avgTasksCommitted ?? 0
  const avgCompleted = summary?.avgTasksCompleted ?? 0
  const capacityAccuracy = summary?.capacityAccuracy ?? 100

  const currentStreak = streak?.currentStreak ?? 0
  const longestStreak = streak?.longestStreak ?? 0

  return (
    <div className="space-y-6 animate-fade-in" id="rituals-analytics-section">
      {/* KPI block cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cardinal completion bar */}
        <div className="bg-zinc-900/35 border border-zinc-800/40 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between" id="metric-completion-rate">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase block">7-DAY COMPLETION RATE</span>
            <span className="text-3xl font-black font-sans text-purple-400">{completionRate}%</span>
          </div>
          <div className="mt-3">
            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/65">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300" 
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500 block mt-1.5 font-sans">Completing both morning & evening ritual sessions</span>
          </div>
        </div>

        {/* Streaks */}
        <div className="bg-zinc-900/35 border border-zinc-800/40 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between" id="metric-ritual-streaks">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase block">RITUAL STREAK</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-sans text-orange-400">{currentStreak}</span>
              <span className="text-xs text-zinc-500">days active</span>
            </div>
          </div>
          <span className="text-[10px] text-zinc-500 block mt-3 font-sans">
            Longest streak: <strong className="text-orange-400/90 font-semibold">{longestStreak} days</strong>
          </span>
        </div>

        {/* Capacity Accuracy Heuristic */}
        <div className="bg-zinc-900/35 border border-zinc-800/40 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between" id="metric-capacity-accuracy">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase block">CAPACITY ALIGNMENT ACCURACY</span>
            <span className="text-3xl font-black font-sans text-emerald-400">{capacityAccuracy}%</span>
          </div>
          <span className="text-[10px] text-zinc-500 block mt-3 font-sans">
            Accuracy of committed task estimates vs. actual core focus logs
          </span>
        </div>
      </div>

      {/* Comparisons card section */}
      <div className={cn(
        "grid gap-5",
        isWhyMatterDismissed ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
      )}>
        <div className="bg-zinc-900/10 border border-zinc-800/30 p-5 rounded-2xl flex flex-col gap-4" id="metric-daily-balance">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">Daily Task Delivery Balance</h3>
            <p className="text-xs text-zinc-500">Sunsama balance comparison of morning commitments versus evening completed items.</p>
          </div>

          <div className="flex items-center justify-around py-4">
            <div className="text-center">
              <span className="text-xs text-zinc-500 uppercase font-semibold block">Morning committed</span>
              <p className="text-3xl font-black text-amber-400 font-mono mt-1">{avgCommitted}</p>
              <span className="text-[10px] text-zinc-650 block">Tasks / day</span>
            </div>

            <div className="h-10 border-l border-zinc-850" />

            <div className="text-center">
              <span className="text-xs text-zinc-500 uppercase font-semibold block">Evening finished</span>
              <p className="text-3xl font-black text-purple-400 font-mono mt-1">{avgCompleted}</p>
              <span className="text-[10px] text-zinc-650 block">Tasks / day</span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed italic bg-zinc-950/40 border border-zinc-800/40 p-3.5 rounded-xl">
            {avgCommitted > avgCompleted + 1.5 
              ? "💡 Advice: You are committing to more work in the morning than you can wrap up in the evening. Keep yesterday's lessons in mind and decrease your morning committed tasks threshold by 1-2 items."
              : avgCommitted === 0 
                ? "💡 Advice: Start morning planning to calibrate your workday and find your ideal commit sweet spot!"
                : "💡 Advice: Beautiful calibration! You are scheduling and completing an extremely balanced workload with high precision."
            }
          </p>
        </div>

        {/* Benefits panel card - collapsible and dismissible */}
        {!isWhyMatterDismissed && (
          <div className="bg-gradient-to-tr from-purple-500/5 to-zinc-900/20 border border-purple-500/10 p-5 rounded-2xl flex flex-col justify-between transition-all duration-300" id="metric-benefits-panel">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setIsWhyMatterCollapsed(!isWhyMatterCollapsed)}
                  className="text-sm font-semibold text-purple-300 flex items-center gap-1.5 hover:text-purple-200 transition cursor-pointer"
                >
                  <Compass size={14} className={isWhyMatterCollapsed ? "" : "animate-spin-slow"} />
                  <span>Why Daily Rituals Matter</span>
                  <span className="text-[9px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded ml-1 font-mono">
                    {isWhyMatterCollapsed ? "Show Details" : "Collapse"}
                  </span>
                </button>
                <button
                  onClick={() => setIsWhyMatterDismissed(true)}
                  className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-zinc-800/40 rounded transition cursor-pointer"
                  title="Dismiss view"
                >
                  <X size={14} />
                </button>
              </div>

              {!isWhyMatterCollapsed && (
                <div className="space-y-2 mt-2">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Keystone's Morning Plan and Evening Shutdown rituals aim to recreate Sunsama's highly effective intentionality blocks:
                  </p>
                  <ul className="text-[11px] text-zinc-400 space-y-1.5 list-disc pl-4 mt-2">
                    <li><strong>Zero Rollover Debt</strong>: Overdue items are processed intentionally on step 1 rather than cluttering future columns automatically.</li>
                    <li><strong>Physical Capacity Heuristic</strong>: Grounding your day on realistic available hours rather than infinite aspirational lists.</li>
                    <li><strong>Complete Disconnection</strong>: Reclaiming evenings by silencing work flows, reflection logging, and creating mental boundaries.</li>
                  </ul>
                </div>
              )}
            </div>

            {!isWhyMatterCollapsed && (
              <div className="pt-4 mt-4 border-t border-zinc-805/40 flex items-center justify-between text-[11px] text-purple-400 font-semibold uppercase tracking-wider">
                <span>Mindfulness productivity engine</span>
                <span>Keystone v1.2</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
