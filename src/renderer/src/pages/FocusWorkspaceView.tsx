// src/renderer/src/pages/FocusWorkspaceView.tsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Play, 
  Pause, 
  Square, 
  AlertTriangle, 
  Compass 
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../lib/utils'
import { PostSessionOverview } from '../components/tasks/PostSessionOverview'

export function FocusWorkspaceView() {
  const activeSessionId = useAppStore(state => state.activeSessionId)
  const setActiveSession = useAppStore(state => state.setActiveSession)
  const setActiveTaskId = useAppStore(state => state.setActiveTaskId)
  const projects = useAppStore(state => state.projects)

  // Session state from backend
  const [session, setSession] = useState<any>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [distractionCount, setDistractionCount] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [targetMinutes, setTargetMinutes] = useState(25)
  const [distractions, setDistractions] = useState<any[]>([])
  const [debugChecksCount, setDebugChecksCount] = useState(0)
  const [isSimulated, setIsSimulated] = useState(false)
  const [simulateActivity, setSimulateActivity] = useState(false)

  // Completion summary state
  const [summary, setSummary] = useState<any | null>(null)

  // Load simulate-activity preference
  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.getSetting) return
    window.electronAPI.getSetting('simulate-activity', 'false').then((val) => {
      setSimulateActivity(val === 'true')
    })
  }, [])

  const handleToggleSimulateActivity = async () => {
    if (!window.electronAPI || !window.electronAPI.setSetting) return
    const nextVal = !simulateActivity
    setSimulateActivity(nextVal)
    await window.electronAPI.setSetting('simulate-activity', nextVal ? 'true' : 'false')
  }

  const loadActiveSession = async (retryCount = 0) => {
    if (!window.electronAPI) return
    try {
      const active = await window.electronAPI.getActiveSession()
      console.log(`[WORKSPACE VIEW] loadActiveSession (attempt ${retryCount + 1}) fetched active:`, JSON.stringify(active), 'current summary is:', JSON.stringify(summary))
      if (active) {
        setSession(active)
        setDistractionCount(active.distractionCount ?? 0)
        setIsPaused(active.status === 'paused')
        const mins = active.targetDurationMins || (active as any).target_duration_mins || 25
        setTargetMinutes(mins)
        
        // Initial elapsed calculation
        const startIso = active.startedAt || (active as any).started_at
        if (startIso) {
          const startMs = new Date(startIso).getTime()
          const diffSecs = Math.floor((Date.now() - startMs) / 1000)
          setElapsedSeconds(Math.max(0, diffSecs))
        }

        // Fetch distractions list
        if (window.electronAPI.getSessionDistractions) {
          const dl = await window.electronAPI.getSessionDistractions(active.id)
          setDistractions(dl)
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
      setDistractionCount(count)
      if (activeSessionId && window.electronAPI.getSessionDistractions) {
        window.electronAPI.getSessionDistractions(activeSessionId).then(setDistractions)
      }
    })

    const removeDebugCheckListener = window.electronAPI.onSessionDebugCheckTick
      ? window.electronAPI.onSessionDebugCheckTick((count, sim) => {
          setDebugChecksCount(count)
          setIsSimulated(sim)
        })
      : null

    return () => {
      if (typeof removeStateListener === 'function') removeStateListener()
      if (typeof removeDistractionListener === 'function') removeDistractionListener()
      if (typeof removeDebugCheckListener === 'function') removeDebugCheckListener()
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
      setElapsedSeconds(Math.max(0, diffSecs))
    }

    calculateElapsed()

    const timerInterval = setInterval(() => {
      calculateElapsed()
    }, 1000)

    // Periodically refresh distraction list to catch window switches
    const distractInterval = setInterval(() => {
      if (activeSessionId && window.electronAPI && window.electronAPI.getSessionDistractions) {
        window.electronAPI.getSessionDistractions(activeSessionId)
          .then(setDistractions)
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
    try {
      const summaryResult = await window.electronAPI.stopSession()
      setSummary(summaryResult)
      setActiveSession(null)
      setActiveTaskId(null)
    } catch (err) {
      console.error('Failed to stop session:', err)
    }
  }

  const handleWrapUp = () => {
    setSummary(null)
    setActiveSession(null)
    setActiveTaskId(null)
  }

  // Timer calculation
  const targetSeconds = targetMinutes * 60
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
    <div className="flex-1 bg-[#09090b] flex flex-col text-white px-8 py-10 overflow-hidden relative select-none">
      {/* Background soft glowing blur */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/[0.02] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/[0.02] blur-[120px] rounded-full pointer-events-none" />

      {/* Header section (motivational message) */}
      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col items-center justify-center gap-10">
        
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
          <div className="absolute w-48 h-48 bg-indigo-500/5 filter blur-[32px] rounded-full" />
          
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
                    : "stroke-indigo-400"
              )}
              strokeWidth="6"
              strokeDasharray="534" // 2 * pi * 85
              strokeDashoffset={isOvertime ? 0 : 534 * (1 - progressRatio)}
              strokeLinecap="round"
            />
          </svg>

          {/* Time digits inside the ring */}
          <div className="absolute flex flex-col items-center justify-center select-none">
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
              of {targetMinutes}:00m
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
            className="px-6 h-12 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white hover:border-transparent text-rose-400 rounded-2xl flex items-center gap-2 text-xs font-semibold tracking-wide uppercase transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Square size={13} fill="currentColor" />
            End Focus Session
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

          {/* Debug window check counter */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between bg-zinc-950/40 p-2 text-[10.5px] rounded-lg border border-zinc-900/50">
              <span className="text-zinc-500 font-mono flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                [Debug] Window Polling Checks:
              </span>
              <span className="font-mono text-indigo-400 font-bold bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                {debugChecksCount} check{debugChecksCount === 1 ? '' : 's'} {isSimulated ? '(Simulated)' : '(Native)'}
              </span>
            </div>

            {isSimulated && (
              <div className="bg-amber-500/[0.02] border border-amber-550/15 rounded-xl p-3 space-y-2 text-left">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    Web Preview Sandbox Simulation
                  </div>
                  <button
                    onClick={handleToggleSimulateActivity}
                    className={cn(
                      "text-[9.5px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer",
                      simulateActivity
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850"
                    )}
                  >
                    {simulateActivity ? 'SIMULATOR ACTIVE' : 'SIMULATOR PAUSED'}
                  </button>
                </div>
                <p className="text-[10.5px] text-zinc-400 leading-normal font-sans">
                  {simulateActivity ? (
                    <span>
                      Because this app is running in a headless browser container inside the <strong>AI Studio Cloud Preview</strong>, OS APIs cannot capture your physical screen. Instead, we are simulates focus swaps (like VS Code, Brave, Slack, Spotify) to showcase distraction logs.
                    </span>
                  ) : (
                    <span>
                      Simulated focus shifts have been <strong>paused</strong>. Ticks will now remain 100% productive, logging 0 distraction switches. Feel free to use this to test and experience a focused workspace cycle!
                    </span>
                  )}
                </p>
                <div className="text-[9.5px] text-zinc-500 italic font-sans leading-relaxed pt-0.5 border-t border-zinc-900/50">
                  *When built and run locally in VS Code or compiled for your actual Windows/macOS desktop, this app will track your physical Brave, Slate, and terminal foreground frames natively!
                </div>
              </div>
            )}
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

      </div>
    </div>
  )
}
