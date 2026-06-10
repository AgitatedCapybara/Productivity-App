// src/renderer/src/pages/FocusWorkspaceView.tsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Play, 
  Pause, 
  Square, 
  AlertTriangle, 
  Sparkles, 
  Compass, 
  TrendingDown,
  ArrowRight
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../lib/utils'

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
    const durationSecs = summary.durationSeconds ?? ((summary.durationMins ?? 0) * 60)
    const distractionCountVal = summary.distractionCount ?? 0
    const productivePct = summary.productivePercent ?? (distractionCountVal > 0 ? 80 : 100)
    const productiveSecs = summary.productiveSeconds ?? Math.max(0, durationSecs - (distractionCountVal * 15))
    const averageStreakSecs = summary.averageFocusStreakSeconds ?? (distractionCountVal > 0 ? Math.round(productiveSecs / (distractionCountVal + 1)) : productiveSecs)
    const topApps = summary.topDistractions ?? []

    const formatSecs = (totalSecs: number) => {
      if (totalSecs < 60) return `${totalSecs}s`
      const m = Math.floor(totalSecs / 60)
      const s = totalSecs % 60
      return s > 0 ? `${m}m ${s}s` : `${m}m`
    }

    // Determine performance tier & title
    let performanceTier = {
      title: "Flow State Master",
      desc: "Outstanding cognitive control. Your attention streams were kept pristine.",
      color: "text-emerald-400",
      accent: "from-emerald-500/20 to-teal-500/10",
      border: "border-emerald-500/20",
      ringColor: "stroke-emerald-400",
      icon: "🏆"
    }

    if (productivePct < 50) {
      performanceTier = {
        title: "Testing & Iterating",
        desc: "Frequent interruptions detected. Refine your workspace blacklist.",
        color: "text-rose-400",
        accent: "from-rose-500/20 to-orange-500/10",
        border: "border-rose-500/20",
        ringColor: "stroke-rose-400",
        icon: "⚠️"
      }
    } else if (productivePct < 75) {
      performanceTier = {
        title: "Focused Apprentice",
        desc: "A solid effort. Keep training your focus muscles to dodge swift stream shifts.",
        color: "text-amber-400",
        accent: "from-amber-500/20 to-orange-500/10",
        border: "border-amber-500/20",
        ringColor: "stroke-amber-400",
        icon: "⚡"
      }
    } else if (productivePct < 90) {
      performanceTier = {
        title: "Cognitive Architect",
        desc: "High productive depth. You minimized distractions masterfully.",
        color: "text-indigo-400",
        accent: "from-indigo-500/20 to-blue-500/10",
        border: "border-indigo-500/20",
        ringColor: "stroke-indigo-400",
        icon: "🧩"
      }
    }

    const strokeDashoffset = 251.2 - (251.2 * productivePct) / 100

    return (
      <div className="flex-1 bg-[#09090b] flex items-center justify-center p-6 md:p-8 text-white relative select-none overflow-y-auto custom-scrollbar h-full">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-500/5 blur-[120px] rounded-full pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-2xl w-full bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800/40 p-6 md:p-8 rounded-3xl shadow-2xl relative my-auto"
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  Focus Block Evaluated
                </h2>
                <p className="text-zinc-500 text-xs font-mono">
                  SESSION ID: {summary.sessionId || 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-xs text-zinc-400 block font-mono">TARGET DURATION</span>
              <span className="text-sm font-semibold text-indigo-400 font-mono">{targetMinutes}m</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
            {/* Left: Score ring */}
            <div className="md:col-span-5 flex flex-col items-center justify-center bg-zinc-900/30 border border-zinc-800/30 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-12 h-12 bg-white/2 rounded-full blur-xl pointer-events-none" />
              
              {/* Radial circle */}
              <div className="relative w-28 h-28 flex items-center justify-center mb-3">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle 
                    className="text-zinc-800 stroke-current" 
                    strokeWidth="8" 
                    fill="transparent" 
                    r="40" 
                    cx="50" 
                    cy="50" 
                  />
                  <motion.circle 
                    className={cn(performanceTier.ringColor, "stroke-current transition-all duration-1000 ease-out")}
                    strokeWidth="8" 
                    strokeLinecap="round"
                    fill="transparent" 
                    r="40" 
                    cx="50" 
                    cy="50" 
                    strokeDasharray="251.2"
                    initial={{ strokeDashoffset: 251.2 }}
                    animate={{ strokeDashoffset }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-extrabold font-mono tracking-tighter text-white">
                    {productivePct}%
                  </span>
                  <span className="text-[9px] font-semibold text-zinc-500 tracking-wider uppercase">Focus Score</span>
                </div>
              </div>

              {/* Title & Tier Badge */}
              <div className="text-center">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-sans inline-flex items-center gap-1">
                  <span>{performanceTier.icon}</span>
                  <span>{performanceTier.title}</span>
                </span>
              </div>
            </div>

            {/* Right: Primary statistical KPIs */}
            <div className="md:col-span-7 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/30 border border-zinc-800/30 p-3.5 rounded-xl">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">TOTAL DURATION</span>
                  <span className="text-lg font-bold font-mono text-zinc-100">{formatSecs(durationSecs)}</span>
                  <span className="text-[10px] text-zinc-500 block mt-1">Elapsed focus time</span>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800/30 p-3.5 rounded-xl">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1 font-sans">ON-TASK TIME</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">{formatSecs(productiveSecs)}</span>
                  <span className="text-[10px] text-zinc-500 block mt-1">Direct development time</span>
                </div>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800/30 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-0.5">AVERAGE FOCUS STREAK</span>
                  <span className="text-base font-bold font-mono text-indigo-400">{formatSecs(averageStreakSecs)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-0.5">DISTRACTION EVENTS</span>
                  <span className={cn(
                    "text-base font-bold font-mono",
                    distractionCountVal > 0 ? "text-rose-400" : "text-emerald-400"
                  )}>
                    {distractionCountVal}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback description row */}
          <div className={cn(
            "p-3.5 rounded-2xl bg-gradient-to-r border text-xs leading-relaxed mb-6",
            performanceTier.accent,
            performanceTier.border,
            performanceTier.color
          )}>
            <strong>Feedback: </strong> {performanceTier.desc}
          </div>

          {/* Top Distractions visualizer / progress bars */}
          {distractionCountVal > 0 ? (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <TrendingDown size={14} className="text-rose-400" />
                Primary Distractors
              </h3>
              
              <div className="space-y-2.5">
                {topApps.map((ta: any, idx: number) => {
                  const distractSecs = Math.floor(ta.durationMs / 1000)
                  const totalWastedMs = topApps.reduce((acc: number, app: any) => acc + (app.durationMs || 0), 0)
                  const weightPct = totalWastedMs > 0 ? Math.round((ta.durationMs / totalWastedMs) * 100) : 100

                  return (
                    <div key={idx} className="bg-zinc-950/40 border border-zinc-800/30 p-2.5 rounded-xl">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span className="font-bold text-zinc-200">{ta.appName}</span>
                          <span className="text-[10px] text-zinc-500">({ta.count} {ta.count === 1 ? 'switch' : 'switches'})</span>
                        </div>
                        <span className="font-mono text-[11px] text-zinc-400">
                          {formatSecs(distractSecs)}
                        </span>
                      </div>
                      
                      {/* Visual progress bar bar */}
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${weightPct}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className="h-full bg-rose-500/80 rounded-full"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="p-5 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl flex items-center gap-3.5 mb-6">
              <span className="text-2xl">🏆</span>
              <div>
                <h4 className="text-sm font-bold text-emerald-400">Absolute Perfection Achieved</h4>
                <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
                  You did not switch to any blocked distraction apps or unproductive browser windows. Outstanding commitment to your focal workspace.
                </p>
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            onClick={handleWrapUp}
            className="w-full py-3 bg-zinc-100 hover:bg-white text-[#09090b] text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-white/5 cursor-pointer"
          >
            Return to Space
            <ArrowRight size={13} />
          </button>
        </motion.div>
      </div>
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
