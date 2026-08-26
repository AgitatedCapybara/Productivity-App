import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { 
  X, 
  Clock, 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Play, 
  Pause, 
  Square,
  Sliders
} from 'lucide-react'
import { Logo } from '../src/components/Logo'

interface Task {
  id: string
  title: string
  priority: number
  status: 'todo' | 'in_progress' | 'done' | 'deleted'
  time_estimate_mins?: number
}

interface Session {
  id: string
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  targetDurationMins?: number
  target_duration_mins?: number
  distraction_count?: number
  distractionCount?: number
  custom_name?: string | null
  customName?: string | null
}

interface OverlayElectronAPI {
  getTasks: () => Promise<Task[]>
  getTasksForToday?: () => Promise<Task[]>
  getActiveSession: () => Promise<Session | null>
  completeTask: (id: string) => Promise<any>
  closeWindow: () => Promise<any>
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
  stopSession: () => Promise<any>
  onSessionTick: (callback: (elapsed: { seconds: number; distractionCount: number; targetDurationMins?: number }) => void) => () => void
  onSessionStateChanged: (callback: () => void) => () => void
  onTasksStateChanged: (callback: () => void) => () => void
}

export function OverlayPanel() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [sessionTick, setSessionTick] = useState<{ seconds: number; distractionCount: number; targetDurationMins?: number } | null>(null)
  const [currentTime, setCurrentTime] = useState<string>('')
  const [opacity, setOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('keystone_glance_opacity')
    return saved ? parseFloat(saved) : 0.85
  })

  const api = window.electronAPI as unknown as OverlayElectronAPI

  const handleOpacityChange = (val: number) => {
    setOpacity(val)
    localStorage.setItem('keystone_glance_opacity', String(val))
  }

  // Load initial data and bind listeners
  const loadData = async () => {
    try {
      // Use getTasksForToday to ensure Glance's "Today's Queue" matches the main Today view exactly.
      // This completely solves any "task hallucinations" or mismatch bugs.
      const todayTasks = api.getTasksForToday 
        ? await api.getTasksForToday() 
        : await api.getTasks()

      // Filter for active tasks (not done, not deleted)
      const activeTasks = todayTasks.filter(
        (t: any) => t.status === 'todo' || t.status === 'in_progress'
      )
      setTasks(activeTasks)

      const session = await api.getActiveSession()
      setActiveSession(session)
      if (!session) {
        setSessionTick(null)
      }
    } catch (err) {
      console.error('Failed to load overlay data:', err)
    }
  }

  useEffect(() => {
    loadData()

    // Subscribe to state change channels
    const unsubSessionState = api.onSessionStateChanged(() => {
      loadData()
    })

    const unsubTasksState = api.onTasksStateChanged(() => {
      loadData()
    })

    const unsubSessionTick = api.onSessionTick((tick: { seconds: number; distractionCount: number; targetDurationMins?: number }) => {
      setSessionTick(tick)
    })

    // Keyboard listener for Escape to dismiss/close the overlay window
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        api.closeWindow()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    // Current Time clock (1s resolution)
    const updateTime = () => {
      const date = new Date()
      setCurrentTime(
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      )
    }
    updateTime()
    const clockInterval = setInterval(updateTime, 1000)

    return () => {
      unsubSessionState()
      unsubTasksState()
      unsubSessionTick()
      window.removeEventListener('keydown', handleKeyDown)
      clearInterval(clockInterval)
    }
  }, [])

  const handleCompleteTask = async (id: string) => {
    try {
      await api.completeTask(id)
      loadData()
    } catch (err) {
      console.error('Failed to complete task:', err)
    }
  }

  const handleClose = () => {
    api.closeWindow()
  }

  // Session Control Actions
  const handlePause = async () => {
    try {
      await api.pauseSession()
      loadData()
    } catch (err) {
      console.error('Failed to pause session:', err)
    }
  }

  const handleResume = async () => {
    try {
      if (activeSession) {
        await api.resumeSession()
        loadData()
      }
    } catch (err) {
      console.error('Failed to resume session:', err)
    }
  }

  const handleStop = async () => {
    try {
      await api.stopSession()
      loadData()
    } catch (err) {
      console.error('Failed to stop session:', err)
    }
  }

  // Format tick seconds into MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate session remaining or elapsed percentage
  const totalTargetSecs = ((sessionTick?.targetDurationMins || activeSession?.targetDurationMins || activeSession?.target_duration_mins || 25) * 60)
  const elapsedSecs = sessionTick?.seconds || 0
  const progressPercent = Math.min(100, (elapsedSecs / (totalTargetSecs || 1)) * 100)

  // Sort tasks: high priority first
  const sortedTasks = [...tasks].sort((a, b) => b.priority - a.priority)

  return (
    <motion.div 
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="w-full h-full border-l border-y border-white/10 flex flex-col shadow-2xl rounded-l-2xl overflow-hidden select-none backdrop-blur-md"
      style={{ backgroundColor: `rgba(13, 13, 15, ${opacity})` }}
    >
      {/* HEADER PANEL */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/40">
        <div className="flex items-center gap-2">
          {/* MANUALLY ADJUST SIDE PANEL ICON SIZE: change size={24} to any pixel value you prefer (e.g. 16, 32, 48) */}
          <Logo size={24} showCircle={false} className="text-indigo-400 animate-pulse" />
          <span className="text-secondary font-medium tracking-wide uppercase text-[11px]">Keystone Glance</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-white/50">{currentTime}</span>
          <button 
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            title="Dismiss Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* SECTION 1: FOCUS STATUS */}
        <div className="space-y-3">
          <h3 className="text-secondary uppercase text-[10px] tracking-widest font-semibold text-white/40">
            Active Focus
          </h3>

          {activeSession ? (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/25 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-white text-[15px] truncate max-w-[200px]">
                    {activeSession.customName || activeSession.custom_name || 'Focus Session'}
                  </div>
                  <div className="text-xs text-white/60 mt-0.5 flex items-center gap-1">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${activeSession.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                    {activeSession.status === 'active' ? 'Deep Work Running' : 'Session Paused'}
                  </div>
                </div>
                
                {/* Micro Controls */}
                <div className="flex items-center gap-1.5">
                  {activeSession.status === 'active' ? (
                    <button 
                      onClick={handlePause}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                      title="Pause Focus Session"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button 
                      onClick={handleResume}
                      className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                      title="Resume Focus Session"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button 
                    onClick={handleStop}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                    title="Stop & Save Session"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Live Timer and Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-sm">
                  <span className="text-indigo-300 font-bold text-lg">
                    {formatTime(elapsedSecs)}
                  </span>
                  <span className="text-white/40">
                    / {activeSession.targetDurationMins || activeSession.target_duration_mins || 25}:00
                  </span>
                </div>
                
                {/* Progress bar container */}
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Distractions Summary */}
              <div className="flex items-center justify-between text-xs text-white/60 bg-white/5 p-2 rounded-lg">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-white/40" />
                  Elapsed: {Math.floor(elapsedSecs / 60)}m
                </span>
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className={`w-3.5 h-3.5 ${(sessionTick?.distractionCount ?? activeSession.distractionCount ?? activeSession.distraction_count ?? 0) > 0 ? 'text-amber-400 animate-bounce' : 'text-white/40'}`} />
                  Distractions: <span className="font-bold text-white font-mono">{sessionTick?.distractionCount ?? activeSession.distractionCount ?? activeSession.distraction_count ?? 0}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-white/5 bg-white/5 flex flex-col items-center justify-center text-center py-6 space-y-2">
              <Clock className="w-8 h-8 text-white/20" />
              <div className="text-secondary text-xs text-white/75 font-medium">No Active Session</div>
              <p className="text-caption text-[11px] max-w-[200px] text-white/50">
                Start a session in the main app to activate deep work tracking.
              </p>
            </div>
          )}
        </div>

        {/* SECTION 2: TODAY'S TASKS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-secondary uppercase text-[10px] tracking-widest font-semibold text-white/40">
              Today's Queue
            </h3>
            <span className="font-mono text-[10px] bg-white/5 px-1.5 py-0.5 rounded-full text-white/60">
              {sortedTasks.length} pending
            </span>
          </div>

          {sortedTasks.length > 0 ? (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {sortedTasks.map((task) => (
                <div 
                  key={task.id}
                  className="group flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/30 border border-white/5 hover:border-white/10 transition-all hover:bg-zinc-900/50"
                >
                  <button 
                    onClick={() => handleCompleteTask(task.id)}
                    className="mt-0.5 text-white/30 hover:text-indigo-400 transition-colors shrink-0"
                    title="Complete Task"
                  >
                    <Circle className="w-4 h-4 group-hover:hidden" />
                    <CheckCircle2 className="w-4 h-4 hidden group-hover:block text-indigo-500" />
                  </button>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="text-secondary text-xs font-medium text-white/90 break-words line-clamp-2 leading-relaxed">
                      {task.title}
                    </div>
                    
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Priority Tag */}
                      {task.priority === 3 && (
                        <span className="text-[9px] bg-rose-500/15 border border-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded-md font-semibold uppercase tracking-wider">
                          Critical
                        </span>
                      )}
                      {task.priority === 2 && (
                        <span className="text-[9px] bg-amber-500/15 border border-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded-md font-medium uppercase tracking-wider">
                          High
                        </span>
                      )}
                      {task.priority === 1 && (
                        <span className="text-[9px] bg-blue-500/15 border border-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded-md font-medium uppercase tracking-wider">
                          Medium
                        </span>
                      )}
                      
                      {(task.time_estimate_mins ?? 0) > 0 && (
                        <span className="text-[9px] text-white/40 bg-white/5 px-1 rounded font-mono">
                          {task.time_estimate_mins}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-white/5 bg-white/5 flex flex-col items-center justify-center text-center py-8 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/20" />
              <div className="text-secondary text-xs text-white/75 font-medium">Clear Queue</div>
              <p className="text-caption text-[11px] max-w-[200px] text-white/50">
                You have no pending tasks scheduled for today. Great work!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER SHORTCUT HINT WITH ADJUSTABLE DIAL */}
      <div className="p-3 bg-[#09090b]/90 border-t border-white/5 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[10px] text-white/50 font-medium">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Glance Opacity</span>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-[120px]">
            <input 
              type="range" 
              min="0.3" 
              max="1.0" 
              step="0.05" 
              value={opacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: '#818cf8' }}
              title="Adjust Transparency"
            />
            <span className="font-mono text-[9px] text-white/40 shrink-0 w-8 text-right">
              {Math.round(opacity * 100)}%
            </span>
          </div>
        </div>
        <p className="text-[10px] text-white/40 font-medium text-center">
          Press <span className="font-mono bg-white/5 px-1 py-0.5 rounded text-white/60">Esc</span> or Click <span className="font-mono bg-white/5 px-1 py-0.5 rounded text-white/60">X</span> to Dismiss
        </p>
      </div>
    </motion.div>
  )
}
