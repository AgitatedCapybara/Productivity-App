import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Play, Pause, Square } from 'lucide-react'
import type { Session } from '../../preload/index.d'

type SessionSummary = { durationMins: number; durationSeconds?: number; distractionCount: number }

export function Widget() {
  const [session, setSession] = useState<Session | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [distractionCount, setDistractionCount] = useState(0)
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [targetMinutes, setTargetMinutes] = useState(25)

  useEffect(() => {
    // 1. Check initial state
    window.widgetAPI.getActiveSession().then(s => {
      setSession(s)
      if (s) {
        setDistractionCount(s.distractionCount)
        const mins = (s as any).targetDurationMins || (s as any).target_duration_mins || 25
        setTargetMinutes(mins)
      }
    })

    // 2. Listen to ticks
    const cleanupTick = window.widgetAPI.onSessionTick((data) => {
      setElapsedSeconds(data.seconds)
      setDistractionCount(data.distractionCount)
      if (data.targetDurationMins) {
        setTargetMinutes(data.targetDurationMins)
      }
    })

    // 3. Listen to summary
    const cleanupSummary = window.widgetAPI.onSessionStopped((data) => {
      setSummary(data)
      setSession(null)
    })

    return () => {
      cleanupTick()
      cleanupSummary()
    }
  }, [])

  const handleTogglePause = async () => {
    if (!session) return
    if (session.status === 'active') {
      await window.widgetAPI.pauseSession()
      setSession({ ...session, status: 'paused' })
    } else {
      await window.widgetAPI.resumeSession()
      setSession({ ...session, status: 'active' })
    }
  }

  const handleStop = async () => {
    const data = await window.widgetAPI.stopSession()
    if (data) {
      setSummary({ 
        durationMins: data.durationMins, 
        durationSeconds: (data as any).durationSeconds, 
        distractionCount: data.distractionCount 
      })
      setSession(null)
    }
  }

  const handleDone = () => {
    // @ts-ignore
    window.electronAPI.closeWindow()
  }

  // Derived state
  const targetSeconds = targetMinutes * 60
  const progressRatio = Math.min(1, elapsedSeconds / targetSeconds)
  const strokeDashoffset = 339 * (1 - progressRatio) // derived from radius 54 => 2*pi*r

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (summary) {
    return (
      <div className="w-[380px] h-[320px] rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-white relative overflow-hidden select-none">
        <div className="absolute top-0 w-full h-8 flex items-center justify-center p-2" style={{ WebkitAppRegion: 'drag' } as any}>
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <Square className="text-emerald-400 w-8 h-8 fill-current" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Session Complete</h2>
          <div className="flex gap-4 text-sm text-white/50 mb-8">
            <span>
              {summary.durationSeconds !== undefined ? (
                summary.durationSeconds >= 60 ? (
                  `${Math.floor(summary.durationSeconds / 60)}m ${summary.durationSeconds % 60}s logged`
                ) : (
                  `${summary.durationSeconds}s logged`
                )
              ) : (
                `${summary.durationMins} min logged`
              )}
            </span>
            <span>·</span>
            <span>{summary.distractionCount} distractions</span>
          </div>
          
          <button 
            onClick={handleDone}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium transition-colors"
          >
            Done
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="w-[380px] h-[320px] rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 flex flex-col text-white relative overflow-hidden select-none">
      {/* Drag Handle */}
      <div className="w-full h-6 flex items-center justify-center" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="w-24 h-1.5 bg-white/20 rounded-full mt-2" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* Title */}
        <h3 className="text-sm font-medium text-white/80 w-full text-center truncate mb-4">
          {session?.taskId || (session as any)?.task_id ? 'Task in progress' : (session as any)?.projectId || (session as any)?.project_id ? 'Project focus session' : 'Focus Session'}
        </h3>

        {/* Ring */}
        <div className="relative flex items-center justify-center w-32 h-32 mb-4">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="64" cy="64" r="54" stroke="currentColor" strokeWidth="4" fill="none" className="text-white/10" />
            <motion.circle 
              cx="64" cy="64" r="54" 
              stroke="currentColor" 
              strokeWidth="4" 
              fill="none" 
              strokeLinecap="round"
              className="text-emerald-400"
              style={{ strokeDasharray: 339 }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-3xl font-light tracking-tight">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
          Focusing · {distractionCount} distractions
        </div>

        {/* Up Next */}
        <div className="text-[10px] text-white/30 truncate w-full text-center mb-4">
          Keep it up!
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button 
            onClick={handleTogglePause}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shadow-lg"
          >
            {session?.status === 'paused' ? <Play className="w-4 h-4 fill-current ml-0.5" /> : <Pause className="w-4 h-4 fill-current" />}
          </button>
          
          <button 
            onClick={handleStop}
            className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors shadow-lg"
          >
             <Square className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>
    </div>
  )
}
