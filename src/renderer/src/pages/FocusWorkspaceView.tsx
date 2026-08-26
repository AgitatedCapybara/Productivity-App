// src/renderer/src/pages/FocusWorkspaceView.tsx
import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Play, 
  Pause, 
  Square, 
  AlertTriangle, 
  Compass,
  Check,
  ListTodo,
  Sparkles
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../lib/utils'
import { PostSessionOverview } from '../components/tasks/PostSessionOverview'
import { useTasks } from '../hooks/useTasks'

export function FocusWorkspaceView() {
  const activeSessionId = useAppStore(state => state.activeSessionId)
  const setActiveSession = useAppStore(state => state.setActiveSession)
  const setActiveTaskId = useAppStore(state => state.setActiveTaskId)
  const setActiveView = useAppStore(state => state.setActiveView)
  const projects = useAppStore(state => state.projects)

  const { tasks, completeTask } = useTasks(true, 'focus-workspace')
  const [activeTab, setActiveTab] = useState<string>('inbox-default')

  // Find all projects, ensuring we always have Inbox, Personal, Work
  const tabsList = useMemo(() => {
    const list = [...projects]
    if (!list.some(p => p.id === 'inbox-default')) {
      list.unshift({
        id: 'inbox-default',
        name: 'Inbox',
        color: '#6366f1',
        icon: 'inbox',
        sort_order: 0,
        created_at: new Date().toISOString()
      })
    }
    return list
  }, [projects])

  // Get active (incomplete) tasks for the selected project
  const filteredTasks = useMemo(() => {
    const todoTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'deleted')
    return todoTasks.filter(task => {
      if (activeTab === 'inbox-default') {
        return !task.project_id || task.project_id === 'inbox-default'
      }
      return task.project_id === activeTab
    })
  }, [tasks, activeTab])

  const handleShiftFocus = async (taskId: string) => {
    if (!session || !window.electronAPI.updateSessionTask) return
    try {
      await window.electronAPI.updateSessionTask(session.id, taskId)
      setSession((prev: any) => prev ? ({ ...prev, taskId, task_id: taskId }) : null)
    } catch (err) {
      console.error('Failed to update session focus task:', err)
    }
  }

  // Session state from backend
  const [session, setSession] = useState<any>(null)
  const elapsedSeconds = useAppStore(state => state.activeSessionElapsedSeconds)
  const currentPhase = useAppStore(state => state.currentPhase)
  const targetStudyDurationMins = useAppStore(state => state.targetStudyDurationMins)
  const targetBreakDurationMins = useAppStore(state => state.targetBreakDurationMins)
  const [rawDistractionCount, setRawDistractionCount] = useState(0)
  const [rawDistractions, setRawDistractions] = useState<any[]>([])
  const [distractionCount, setDistractionCount] = useState(0)
  const [distractions, setDistractions] = useState<any[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [targetMinutes, setTargetMinutes] = useState(25)

  const lastUpdateRef = useRef<number>(0)

  useEffect(() => {
    lastUpdateRef.current = 0
  }, [session?.id])

  useEffect(() => {
    const now = Date.now()
    const limit = 300000 // 5 minutes in ms
    if (rawDistractionCount === 0 || lastUpdateRef.current === 0 || now - lastUpdateRef.current >= limit) {
      setDistractionCount(rawDistractionCount)
      setDistractions(rawDistractions)
      lastUpdateRef.current = now
    } else {
      const delay = limit - (now - lastUpdateRef.current)
      const t = setTimeout(() => {
        setDistractionCount(rawDistractionCount)
        setDistractions(rawDistractions)
        lastUpdateRef.current = Date.now()
      }, delay)
      return () => clearTimeout(t)
    }
  }, [rawDistractionCount, rawDistractions])

  // Completion summary state
  const [summary, setSummary] = useState<any | null>(null)

  // Safety confirmation
  const [isConfirmingStop, setIsConfirmingStop] = useState(false)

  // Companion Widget diagnostics
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [showSystemResumePrompt, setShowSystemResumePrompt] = useState(false)

  // Poll diagnostics in real-time
  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.getOverlayDiagnostics) return

    const loadDiagnostics = async () => {
      try {
        const diag = await window.electronAPI.getOverlayDiagnostics()
        setDiagnostics(diag)
        setDiagnosticError(null)
      } catch (err: any) {
        setDiagnosticError(err.message || String(err))
      }
    }

    loadDiagnostics()
    const id = setInterval(loadDiagnostics, 2000)
    return () => clearInterval(id)
  }, [])

  const handleForceShow = async () => {
    if (window.electronAPI && window.electronAPI.forceShowWidget) {
      const res = await window.electronAPI.forceShowWidget()
      setDiagnosticError(`Status: ${res.success ? 'Success' : 'Failed'} - ${res.message}`)
    }
  }

  const handleForceHide = async () => {
    if (window.electronAPI && window.electronAPI.forceHideWidget) {
      const res = await window.electronAPI.forceHideWidget()
      setDiagnosticError(`Status: ${res.success ? 'Success' : 'Failed'} - ${res.message}`)
    }
  }

  const loadActiveSession = async (retryCount = 0) => {
    if (!window.electronAPI) return
    try {
      const active = await window.electronAPI.getActiveSession()
      console.log(`[WORKSPACE VIEW] loadActiveSession (attempt ${retryCount + 1}) fetched active:`, JSON.stringify(active), 'current summary is:', JSON.stringify(summary))
      if (active) {
        setSession(active)
        setRawDistractionCount(active.distractionCount ?? 0)
        setIsPaused(active.status === 'paused')
        const mins = active.targetDurationMins || (active as any).target_duration_mins || 25
        setTargetMinutes(mins)
        
        // Initial elapsed calculation
        const startIso = active.startedAt || (active as any).started_at
        if (startIso) {
          const startMs = new Date(startIso).getTime()
          const diffSecs = Math.floor((Date.now() - startMs) / 1000)
          useAppStore.getState().setSessionElapsedSeconds(Math.max(0, diffSecs))
        }

        // Fetch distractions list
        if (window.electronAPI.getSessionDistractions) {
          const dl = await window.electronAPI.getSessionDistractions(active.id)
          setRawDistractions(dl)
        }
      } else {
        // If active is null but activeSessionId is set in store, wait and try again
        if (retryCount < 3 && !summary && activeSessionId) {
          console.log(`[WORKSPACE VIEW] Active session is null but activeSessionId is set to "${activeSessionId}". Retrying in 250ms...`)
          setTimeout(() => {
            loadActiveSession(retryCount + 1)
          }, 250)
        } else if (!summary) {
          console.log('[WORKSPACE VIEW] No active session found after retries and not showing summary, calling setActiveSession(null) to close work block')
          // No active session and not in summary
          setActiveSession(null)
          setActiveTaskId(null)
        }
      }
    } catch (err) {
      console.error('Error loading active session in workspace:', err)
    }
  }

  useEffect(() => {
    loadActiveSession()

    if (!window.electronAPI) return

    // Listen to background syncs
    const removeStateListener = window.electronAPI.onSessionStateChanged(() => {
      loadActiveSession()
    })

    const removeDistractionListener = window.electronAPI.onSessionDistractionUpdate((count) => {
      setRawDistractionCount(count)
      if (activeSessionId && window.electronAPI.getSessionDistractions) {
        window.electronAPI.getSessionDistractions(activeSessionId).then(setRawDistractions)
      }
    })

    const removeResumeListener = window.electronAPI.onSessionSystemResumed?.((sessionId) => {
      console.log('[WORKSPACE VIEW] System resumed for session:', sessionId)
      setShowSystemResumePrompt(true)
      loadActiveSession()
    })

    return () => {
      if (typeof removeStateListener === 'function') removeStateListener()
      if (typeof removeDistractionListener === 'function') removeDistractionListener()
      if (typeof removeResumeListener === 'function') removeResumeListener()
    }
  }, [activeSessionId])

  // Local accurate timer to track elapsed seconds + periodically poll distractions
  useEffect(() => {
    if (!session || isPaused) return

    const calculateElapsed = () => {
      const startIso = session.startedAt || (session as any).started_at
      if (!startIso) return
      const startMs = new Date(startIso).getTime()
      const diffSecs = Math.floor((Date.now() - startMs) / 1000)
      useAppStore.getState().setSessionElapsedSeconds(Math.max(0, diffSecs))
    }

    calculateElapsed()

    const timerInterval = setInterval(() => {
      calculateElapsed()
    }, 1000)

    // Periodically refresh distraction list to catch window switches
    const distractInterval = setInterval(() => {
      if (activeSessionId && window.electronAPI && window.electronAPI.getSessionDistractions) {
        window.electronAPI.getSessionDistractions(activeSessionId)
          .then(setRawDistractions)
          .catch(console.error)
      }
    }, 5000)

    return () => {
      clearInterval(timerInterval)
      clearInterval(distractInterval)
    }
  }, [session, isPaused, activeSessionId])

  const handleTogglePause = async () => {
    if (!window.electronAPI || !session) return
    try {
      if (isPaused) {
        await window.electronAPI.resumeSession()
        setIsPaused(false)
      } else {
        await window.electronAPI.pauseSession()
        setIsPaused(true)
      }
    } catch (err) {
      console.error('Failed to toggle session state:', err)
    }
  }

  const handleStop = async () => {
    if (!window.electronAPI || !session) return
    if (!isConfirmingStop) {
      setIsConfirmingStop(true)
      return
    }
    try {
      const summaryResult = await window.electronAPI.stopSession()
      setSummary(summaryResult)
      setActiveSession(null)
      setActiveTaskId(null)
      setIsConfirmingStop(false)
    } catch (err) {
      console.error('Failed to stop session:', err)
    }
  }

  const handleWrapUp = () => {
    setSummary(null)
    setActiveSession(null)
    setActiveTaskId(null)
    setActiveView('analytics')
  }

  // Timer calculation
  const activeTargetMins = currentPhase === 'study' 
    ? (session?.targetDurationMins || targetStudyDurationMins || 25) 
    : (session?.targetBreakDurationMins || targetBreakDurationMins || 5)
  const targetSeconds = activeTargetMins * 60
  const isOvertime = elapsedSeconds > targetSeconds
  const displaySeconds = isOvertime ? (elapsedSeconds - targetSeconds) : (targetSeconds - elapsedSeconds)

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const progressRatio = Math.min(1, elapsedSeconds / targetSeconds)

  const formatMs = (ms: number | null) => {
    if (!ms) return 'Active'
    const seconds = Math.floor(ms / 1000)
    if (seconds < 1) return '1s'
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const remainingSecs = seconds % 60
    return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`
  }

  const formatFullDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch (e) {
      return ''
    }
  }

  // Display motivational quote/reminder
  const reminderMessages = [
    "Focus on one block at a time. The rest is just noise.",
    "Minimize distractions, maximize craftsmanship.",
    "Your current work is of true creation. Honor it.",
    "Breathe. Keep designing, keep coding.",
    "Flow state achieved when secondary streams are completely paused.",
    "This time is reserved for your creative agency."
  ]
  const [reminderIndex, setReminderIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setReminderIndex(prev => (prev + 1) % reminderMessages.length)
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  // Resolve project name details
  const sessionProject = projects.find(p => p.id === (session?.projectId || session?.project_id))

  // Render Session Summary State
  if (summary) {
    return (
      <PostSessionOverview 
        summary={summary}
        targetMinutes={targetMinutes}
        onClose={handleWrapUp}
      />
    )
  }

  // Render Active Immersive Focus View State
  return (
    <div className="flex-1 bg-[#09090b] flex flex-col text-white px-8 py-10 overflow-y-auto relative select-none view-container">
      {/* Background soft glowing blur */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/[0.02] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/[0.02] blur-[120px] rounded-full pointer-events-none" />

      {/* Gentle Non-Punitive System Resume Prompt */}
      <AnimatePresence>
        {showSystemResumePrompt && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-3rem)] bg-zinc-950/90 border border-indigo-500/20 rounded-2xl p-4 shadow-2xl backdrop-blur-xl"
            id="system-resume-prompt-banner"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mt-0.5 shrink-0">
                <Sparkles size={16} className="animate-pulse" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-bold text-xs text-zinc-100 uppercase tracking-widest">System Pause Recovered</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Welcome back! Your focus block has been securely held. Shall we resume your workspace flow?
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={async () => {
                      if (window.electronAPI && window.electronAPI.resumeSession) {
                        await window.electronAPI.resumeSession()
                        setIsPaused(false)
                        setShowSystemResumePrompt(false)
                        loadActiveSession()
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                  >
                    Resume Flow
                  </button>
                  <button
                    onClick={() => setShowSystemResumePrompt(false)}
                    className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-semibold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                  >
                    Keep Paused
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid Wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl w-full mx-auto flex-1 items-start mt-4 relative z-10">
        
        {/* Left Column: Clock and Diagnostics Panel */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-8 w-full">
        
        {/* Dynamic focus quotes */}
        <AnimatePresence mode="wait">
          <motion.div
            key={reminderIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <span className="text-indigo-400 text-[10px] tracking-[0.25em] font-semibold uppercase block mb-2 opacity-80">
              Focus Scope: {sessionProject ? `"${sessionProject.name}"` : 'General Workflow'}
            </span>
            <p className="text-zinc-200 text-lg md:text-xl font-light tracking-wide max-w-xl mx-auto italic">
              "{reminderMessages[reminderIndex]}"
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Ring Clock Graphic */}
        <div className="relative w-56 h-56 flex items-center justify-center">
          {/* Visual glow backdrop */}
          <div className={cn(
            "absolute w-48 h-48 filter blur-[32px] rounded-full transition-all duration-700",
            currentPhase === 'study' ? "bg-indigo-500/5" : "bg-emerald-500/5"
          )} />
          
          <svg className="w-full h-full transform -rotate-90">
            {/* Outer dark track */}
            <circle
              cx="112"
              cy="112"
              r="85"
              className="stroke-zinc-800/30 fill-none"
              strokeWidth="6"
            />
            {/* Radiant glowing progress track */}
            <motion.circle
              cx="112"
              cy="112"
              r="85"
              className={cn(
                "fill-none transition-colors duration-500",
                isPaused 
                  ? "stroke-zinc-650" 
                  : isOvertime 
                    ? "stroke-rose-500 shadow-lg" 
                    : currentPhase === 'study'
                      ? "stroke-indigo-400"
                      : "stroke-emerald-400"
              )}
              strokeWidth="6"
              strokeDasharray="534" // 2 * pi * 85
              strokeDashoffset={isOvertime ? 0 : 534 * progressRatio}
              strokeLinecap="round"
            />
          </svg>

          {/* Time digits inside the ring */}
          <div className="absolute flex flex-col items-center justify-center select-none">
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest mb-1.5 select-none flex items-center gap-1 px-2.5 py-0.5 rounded-full transition-all duration-500 border",
              currentPhase === 'study'
                ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
                : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            )}>
              {currentPhase === 'study' ? '✍️ Study Block' : '☕ Break Time'}
            </span>
            {isOvertime && (
              <span className="text-[10px] font-bold text-rose-450 uppercase tracking-widest mb-1 select-none flex items-center gap-1 animate-pulse">
                Overtime
              </span>
            )}
            <span className={cn(
              "text-4xl font-light font-mono tracking-tight",
              isPaused ? "text-zinc-400" : isOvertime ? "text-rose-400" : "text-white"
            )}>
              {formatTime(displaySeconds)}
            </span>
            <span className="text-xs text-zinc-550 block mt-1 font-mono">
              of {activeTargetMins}:00m
            </span>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center gap-4">
          {/* Pause/Resume Button */}
          <button
            onClick={handleTogglePause}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center border-0 transition-all shadow-md active:scale-95 cursor-pointer",
              isPaused 
                ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                : "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 hover:text-white"
            )}
          >
            {isPaused ? <Play size={18} strokeWidth={2.5} /> : <Pause size={18} strokeWidth={2.5} />}
          </button>

          {/* STOP Button (Terminates work block) */}
          <button
            onClick={handleStop}
            onMouseLeave={() => setIsConfirmingStop(false)}
            className={cn(
              "px-6 h-12 rounded-2xl flex items-center gap-2 text-xs font-semibold tracking-wide uppercase transition-all shadow-md active:scale-95 cursor-pointer border",
              isConfirmingStop
                ? "bg-rose-605 text-white border-transparent hover:bg-rose-700 animate-pulse font-bold"
                : "bg-rose-500/10 border-rose-500/20 hover:bg-rose-500 hover:text-white hover:border-transparent text-rose-400"
            )}
          >
            <Square size={13} fill="currentColor" />
            {isConfirmingStop ? 'Are you sure? Click again' : 'End Focus Session'}
          </button>
        </div>

        {/* Live Monitored Distractions & Active Window monitor logs list */}
        <div className="max-w-[560px] w-full bg-zinc-950/20 border border-zinc-860/20 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-2">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Compass size={14} className="text-indigo-400" />
              Active Window Monitor Logger
            </h4>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "inline-block w-2 h-2 rounded-full",
                isPaused ? "bg-amber-400 animate-pulse" : "bg-emerald-400 animate-pulse"
              )} />
              <span className="text-[10px] font-mono text-zinc-500">
                {isPaused ? "Monitoring Paused" : "Live distraction monitor logging"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3 bg-zinc-900/30 p-2.5 rounded-xl border border-zinc-900 text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
              <AlertTriangle size={13} className={cn(distractionCount > 0 ? "text-amber-400" : "text-zinc-500")} />
              Recorded Distraction Swaps:
            </span>
            <span className={cn(
              "font-mono font-bold text-sm px-2 py-0.5 rounded",
              distractionCount > 0 ? "text-amber-400 bg-amber-500/5" : "text-emerald-400 bg-emerald-500/5"
            )}>
              {distractionCount}
            </span>
          </div>



          {/* Live distractions monitored list */}
          {distractions.length > 0 ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
              {distractions.map((d, i) => (
                <div key={d.id || i} className="flex items-center justify-between text-[11px] p-2 bg-zinc-900/10 border border-zinc-900/40 rounded-lg hover:border-zinc-800/40 transition-colors">
                  <div className="flex items-center gap-2 max-w-[80%]">
                    <span className="font-mono text-[9px] font-semibold text-rose-450 shrink-0 uppercase bg-rose-500/5 border border-rose-500/10 py-[1px] px-1 rounded">
                      {d.appName}
                    </span>
                    <span className="text-zinc-300 font-sans truncate select-text">{d.windowTitle || "Distracted focus frame"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 font-mono text-[9px] shrink-0 text-right">
                    <span>{formatFullDate(d.startedAt)}</span>
                    <span className="text-zinc-400 bg-zinc-800/40 px-1 py-[1px] rounded">{formatMs(d.durationMs)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-550 text-xs italic">
              ✨ Window monitoring active. No distraction switches recorded yet.
            </div>
          )}
        </div>

        {/* Overlay OS Diagnostician & Debugging Console */}
        <div className="max-w-[560px] w-full bg-zinc-950/40 border border-zinc-800/40 rounded-2xl p-4 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Overlay OS Diagnostician
            </h4>
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
            >
              {showDiagnostics ? "Hide Details" : "Inspect System Details"}
            </button>
          </div>

          {showDiagnostics ? (
            <div className="space-y-3.5 text-left transition-all">
              {window.electronAPI ? (
                <div className="space-y-2 text-[10px] text-zinc-400 font-mono">
                  {diagnostics ? (
                    <>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-zinc-900/30 p-2.5 rounded-xl border border-zinc-900">
                        <div className="flex justify-between border-b border-zinc-900/40 pb-1">
                          <span className="text-zinc-500">Active Session SQlite:</span> 
                          <span className={diagnostics.sessionActive ? "text-emerald-400 font-bold" : "text-amber-500"}>
                            {diagnostics.sessionActive ? `YES (${diagnostics.sessionStatus})` : "NO"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900/40 pb-1">
                          <span className="text-zinc-500">Main Win Registered:</span> 
                          <span className={diagnostics.mainWindowFound ? "text-emerald-400" : "text-rose-500 font-bold"}>
                            {diagnostics.mainWindowFound ? "YES" : "NO"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900/40 pb-1">
                          <span className="text-zinc-500">Main Win Minimized:</span> 
                          <span className={diagnostics.mainWindowMinimized ? "text-amber-400 font-bold" : "text-zinc-500"}>
                            {diagnostics.mainWindowMinimized ? "TRUE (Minimized)" : "FALSE"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900/40 pb-1">
                          <span className="text-zinc-550">Main Win isVisible:</span> 
                          <span className={diagnostics.mainWindowVisible ? "text-emerald-400" : "text-amber-500 font-bold"}>
                            {diagnostics.mainWindowVisible ? "TRUE" : "FALSE"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900/40 pb-1">
                          <span className="text-zinc-550">Main Win isFocused:</span> 
                          <span className={diagnostics.mainWindowFocused ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                            {diagnostics.mainWindowFocused ? "TRUE" : "FALSE"}
                          </span>
                        </div>
                        <div className="flex justify-between pb-1">
                          <span className="text-zinc-550">Widget Instantiated:</span> 
                          <span className={diagnostics.widgetWindowCreated ? "text-emerald-400 font-bold" : "text-amber-500"}>
                            {diagnostics.widgetWindowCreated ? "YES" : "NO"}
                          </span>
                        </div>
                        <div className="flex justify-between pb-1">
                          <span className="text-zinc-550">Widget isVisible:</span> 
                          <span className={diagnostics.widgetWindowVisible ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                            {diagnostics.widgetWindowVisible ? "TRUE" : "FALSE"}
                          </span>
                        </div>
                      </div>

                      {/* Display Step-by-Step execution sync history */}
                      <div className="border border-zinc-950 bg-zinc-950/60 rounded-xl p-3 mt-1.5">
                        <div className="text-zinc-500 text-[9px] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Window Sync Evaluation History (Polled):
                        </div>
                        <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar select-text pr-1">
                          {diagnostics.syncLogs && diagnostics.syncLogs.length > 0 ? (
                            diagnostics.syncLogs.map((log: string, idx: number) => (
                              <div key={idx} className="text-[9px] text-zinc-400 font-mono break-all leading-tight border-b border-zinc-900/30 pb-1 last:border-b-0">
                                {log}
                              </div>
                            ))
                          ) : (
                            <div className="text-zinc-600 text-[9px] italic">No sync evaluations registered yet. Click "Evaluate State" below!</div>
                          )}
                        </div>
                      </div>

                      <div className="border border-zinc-950 bg-zinc-950/60 rounded-xl p-3 mt-1.5">
                        <div className="text-zinc-500 text-[9px] uppercase tracking-wider font-bold mb-1 font-sans">Active OS Windows List:</div>
                        <div className="space-y-1">
                          {diagnostics.windowsList && diagnostics.windowsList.length > 0 ? (
                            diagnostics.windowsList.map((w: any, idx: number) => (
                              <div key={idx} className="text-[9px] text-zinc-500 leading-normal border-b border-zinc-900/30 pb-0.5 last:border-b-0">
                                • "{w.title || 'Frameless Window'}" <span className="text-zinc-400">(isMin: {w.isMinimized ? 'yes' : 'no'}, isVis: {w.isVisible ? 'yes' : 'no'}, isFoc: {w.isFocused ? 'yes' : 'no'}, isMain: {w.isMainWindow ? 'yes' : 'no'}, isWidget: {w.isCompanionWidget ? 'yes' : 'no'})</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-[9px] text-zinc-600 italic">Zero windows returned by Electron</div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <span className="text-zinc-500 italic block">Evaluating active process threads...</span>
                  )}
                  
                  {diagnosticError && (
                    <div className="text-rose-400 text-[9.5px] bg-rose-500/5 p-1 rounded border border-rose-500/10 font-sans mt-2">
                      {diagnosticError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-amber-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 leading-relaxed font-sans">
                  ⚡ Native Electron API not found. Please compile/run the application locally on Windows/macOS.
                </div>
              )}

              {/* Action Controls for Debugging */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-900/50">
                {window.electronAPI && (
                  <>
                    <button
                      onClick={handleForceShow}
                      className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-[9.5px] font-semibold rounded-lg text-indigo-300 transition-all cursor-pointer"
                    >
                      Force Show Widget
                    </button>
                    <button
                      onClick={handleForceHide}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[9.5px] font-semibold rounded-lg text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                    >
                      Force Hide Widget
                    </button>
                    <button
                      onClick={async () => {
                        if (window.electronAPI && window.electronAPI.getOverlayDiagnostics) {
                          const diag = await window.electronAPI.getOverlayDiagnostics()
                          setDiagnostics(diag)
                        }
                      }}
                      className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-[9.5px] font-semibold rounded-lg text-emerald-300 transition-all cursor-pointer ml-auto"
                    >
                      Evaluate State
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[10.5px] text-zinc-500 text-left">
              If the minimized overlay doesn't appear automatically on your desktop, toggle this inspect panel to trace active threads, window names, SQLite sessions, and execute force-trigger controls.
            </p>
          )}
        </div>

      </div>

      {/* Right Column: Focus Workspace Tasks Center / Backlogger */}
      <div className="lg:col-span-5 w-full bg-zinc-950/40 border border-zinc-900 rounded-3xl p-5 flex flex-col space-y-4 backdrop-blur-md h-[580px]">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <ListTodo size={15} className="text-indigo-400" />
                Session Backlogger
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">Toggle projects & complete tasks inline</p>
            </div>
            <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full">
              {filteredTasks.length} pending
            </span>
          </div>

          {/* Project Navigation tab buttons */}
          <div className="flex gap-1 overflow-x-auto pb-1 shrink-0 scrollbar-none">
            {tabsList.map(tab => {
              const isSelected = activeTab === tab.id
              const count = tasks.filter(t => {
                const isTodo = t.status !== 'done' && t.status !== 'deleted'
                if (tab.id === 'inbox-default') return isTodo && (!t.project_id || t.project_id === 'inbox-default')
                return isTodo && t.project_id === tab.id
              }).length

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap border shrink-0",
                    isSelected
                      ? "bg-indigo-500/10 text-indigo-300 border-indigo-550/30"
                      : "bg-zinc-900/40 hover:bg-zinc-900 border-zinc-900/50 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {tab.icon && tab.icon.startsWith('data:image/') ? (
                    <img 
                      src={tab.icon} 
                      alt={tab.name}
                      className="w-3.5 h-3.5 rounded-full object-cover shrink-0 border border-zinc-800"
                    />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tab.color || '#fff' }} />
                  )}
                  <span>{tab.name}</span>
                  <span className={cn(
                    "text-[9px] font-mono px-1 rounded-full shrink-0",
                    isSelected ? "bg-indigo-500/20 text-indigo-100" : "bg-zinc-800 text-zinc-500"
                  )}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Scrollable backlog task rows */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => {
                const isSessionTask = session?.taskId === task.id || session?.task_id === task.id
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "group p-3 rounded-2xl border text-xs flex items-center justify-between transition-all hover:bg-zinc-900/30",
                      isSessionTask
                        ? "bg-indigo-500/5 border-indigo-500/20 shadow-md shadow-indigo-500/[0.02]"
                        : "bg-zinc-900/20 border-zinc-900/85 hover:border-zinc-800"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Checkbox trigger to complete inline */}
                      <button
                        onClick={async () => {
                          try {
                            await completeTask(task.id)
                          } catch (err) {
                            console.error(err)
                          }
                        }}
                        className={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                          task.priority === 3
                            ? "border-indigo-500/90 bg-indigo-500/10 hover:border-indigo-400 hover:bg-indigo-500/20"
                            : task.priority === 2
                              ? "border-amber-500/90 bg-amber-500/10 hover:border-amber-400 hover:bg-amber-500/20"
                              : task.priority === 1
                                ? "border-zinc-500 bg-zinc-500/10 hover:border-zinc-400 hover:bg-zinc-500/20"
                                : "border-zinc-800 hover:border-emerald-500 hover:bg-emerald-500/10"
                        )}
                        title="Complete task"
                      >
                        <Check className="w-2.5 h-2.5 text-transparent group-hover:text-emerald-450 transition-colors" />
                      </button>

                      {/* Info & Title */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          task.priority === 3 ? "bg-red-500 animate-pulse" : task.priority === 2 ? "bg-amber-500" : "bg-slate-400"
                        )} />
                        <span className="truncate text-zinc-200 group-hover:text-white font-medium text-[11.5px] break-all">
                          {task.title}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {isSessionTask ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          Focused
                        </span>
                      ) : (
                        <button
                          onClick={() => handleShiftFocus(task.id)}
                          className="text-[9px] font-semibold text-zinc-400 hover:text-indigo-400 bg-zinc-900 border border-zinc-850 px-2 py-1 rounded-lg opacity-0 lg:group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          Focus
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 text-zinc-600 space-y-2">
                <Sparkles className="w-8 h-8 text-zinc-750 animate-pulse" />
                <p className="text-xs italic">All clear! No pending tasks in this project category.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
