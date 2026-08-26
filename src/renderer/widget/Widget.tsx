// src/renderer/widget/Widget.tsx
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Play, Pause, Square, Check, ExternalLink, Sparkles, X } from 'lucide-react'
import type { Session } from '../../preload/index.d'

type SessionSummary = { durationMins: number; durationSeconds?: number; distractionCount: number }

export function Widget() {
  const [session, setSession] = useState<Session | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [projectsList, setProjectsList] = useState<any[]>([])
  const [isConfirmingStop, setIsConfirmingStop] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedProjectIdForMenu, setSelectedProjectIdForMenu] = useState<string>('inbox-default')

  const fetchTasks = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getTasks) {
        const rawTasks = await window.electronAPI.getTasks()
        setTasks(rawTasks || [])
      } else if (window.widgetAPI && window.widgetAPI.getTasksForToday) {
        const rawTasks = await window.widgetAPI.getTasksForToday()
        setTasks(rawTasks || [])
      }
    } catch (err) {
      console.error('Failed to fetch tasks in widget:', err)
    }
  }

  const fetchProjects = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getProjects) {
        const list = await window.electronAPI.getProjects()
        setProjectsList(list || [])
      }
    } catch (err) {
      console.error('Failed to fetch projects in widget:', err)
    }
  }

  useEffect(() => {
    // 1. Check initial state
    window.widgetAPI.getActiveSession().then(s => {
      setSession(s)
      if (s) {
        setSummary(null)
      }
    })

    // Fetch initial tasks & projects
    fetchTasks()
    fetchProjects()

    // 2. Listen to ticks
    const cleanupTick = window.widgetAPI.onSessionTick((data) => {
      setElapsedSeconds(data.seconds)
      setSummary(null)
    })

    // 3. Listen to summary
    const cleanupSummary = window.widgetAPI.onSessionStopped((data) => {
      setSummary(data)
      setSession(null)
      setIsExpanded(false)
      if (window.widgetAPI.setWidgetHeight) {
        window.widgetAPI.setWidgetHeight(52)
      }
    })

    // 4. Listen on state change notifications
    let cleanupState: (() => void) | undefined
    if (window.widgetAPI.onSessionStateChanged) {
      cleanupState = window.widgetAPI.onSessionStateChanged(() => {
        fetchTasks()
        fetchProjects()
        window.widgetAPI.getActiveSession().then(s => {
          setSession(s)
          if (s) {
            setSummary(null)
          }
        })
      })
    }

    return () => {
      cleanupTick()
      cleanupSummary()
      if (cleanupState) cleanupState()
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
    if (!isConfirmingStop) {
      setIsConfirmingStop(true)
      return
    }
    const data = await window.widgetAPI.stopSession()
    setIsConfirmingStop(false)
    setIsExpanded(false)
    if (window.widgetAPI.setWidgetHeight) {
      await window.widgetAPI.setWidgetHeight(52)
    }
    if (data) {
      setSummary({ 
        durationMins: data.durationMins, 
        durationSeconds: (data as any).durationSeconds, 
        distractionCount: data.distractionCount 
      })
      setSession(null)
    }
  }

  const handleRestoreMainWindow = async () => {
    try {
      if (window.electronAPI.restoreMainWindow) {
        await window.electronAPI.restoreMainWindow()
      }
    } catch (err) {
      console.error('Failed to restore main window:', err)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      await window.widgetAPI.completeTask(taskId)
      await fetchTasks()
    } catch (err) {
      console.error('Failed to complete task in widget:', err)
    }
  }

  const handleDone = async () => {
    try {
      if (window.electronAPI.restoreMainWindow) {
        await window.electronAPI.restoreMainWindow()
      }
      window.electronAPI.closeWindow()
    } catch (err) {
      console.error('Failed to finish widget completed state:', err)
    }
  }

  const handleOpenExpanded = async () => {
    setIsExpanded(true)
    if (window.widgetAPI.setWidgetHeight) {
      await window.widgetAPI.setWidgetHeight(320)
    }
  }

  const handleCloseExpanded = async () => {
    setIsExpanded(false)
    if (window.widgetAPI.setWidgetHeight) {
      await window.widgetAPI.setWidgetHeight(52)
    }
  }

  const handleUpdateFocusTask = async (taskId: string) => {
    if (!session?.id) return
    try {
      await window.widgetAPI.updateSessionTask(session.id, taskId)
      setSession(prev => prev ? ({ ...prev, taskId, task_id: taskId }) : null)
      await fetchTasks()
    } catch (err) {
      console.error('Failed to update session focus task:', err)
    }
  }

  // Derived tasks logic (filtered out completed/deleted, sorted by priority + sort_order)
  const todoTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'deleted')
  const sortedTasks = [...todoTasks].sort((a, b) => {
    const pA = a.priority ?? 0
    const pB = b.priority ?? 0
    if (pB !== pA) {
      return pB - pA // High priority first
    }
    return (a.sort_order ?? 0) - (b.sort_order ?? 0) // Lowest sort_order first
  })

  // Currently focused task
  const sessionTaskId = session?.taskId || (session as any)?.task_id
  const activeTask = sessionTaskId ? sortedTasks.find(t => t.id === sessionTaskId) : null
  
  // Decide which task to render as the main goal. If none attached, pick the top queue item
  const displayTask = activeTask || sortedTasks[0] || null

  // Rest of the queue
  const nextTasks = displayTask 
    ? sortedTasks.filter(t => t.id !== displayTask.id) 
    : sortedTasks

  const upcomingTask = nextTasks[0] || null

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const targetSeconds = (session?.targetDurationMins || (session as any)?.target_duration_mins || 25) * 60
  const isOvertime = elapsedSeconds > targetSeconds
  const displaySeconds = isOvertime ? (elapsedSeconds - targetSeconds) : (targetSeconds - elapsedSeconds)

  // Priority indicator helper
  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'bg-slate-400'
    if (priority === 2) return 'bg-amber-500' // warning color
    if (priority === 3) return 'bg-red-500' // accent primary
    return 'bg-zinc-650'
  }

  // Full focus completed screen formatted as a compact horizontal pill
  if (summary) {
    const mins = summary.durationSeconds !== undefined 
      ? Math.max(0, Math.floor(summary.durationSeconds / 60)) 
      : summary.durationMins

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-[440px] h-[52px] rounded-full bg-zinc-950 border border-emerald-500/30 flex items-center justify-between px-4 text-white select-none shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
        style={{ WebkitAppRegion: 'drag' } as any}
        onDoubleClick={handleRestoreMainWindow}
      >
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="text-emerald-400 w-3 h-3" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-emerald-400 leading-none">Session Complete</span>
            <span className="text-[10px] text-zinc-400">
              {mins}m logged · {summary.distractionCount} distraction{summary.distractionCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <button
          onClick={handleDone}
          className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 hover:border-emerald-500/60 rounded-full text-[10px] font-semibold text-emerald-300 transition-all shadow-md cursor-pointer"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          Review Summary
        </button>
      </motion.div>
    )
  }

  // Expanded View Option
  if (isExpanded) {
    const activeProjectTasks = sortedTasks.filter(t => {
      if (selectedProjectIdForMenu === 'inbox-default') {
        return !t.project_id || t.project_id === 'inbox-default'
      }
      return t.project_id === selectedProjectIdForMenu
    })

    return (
      <div 
        className="w-[440px] h-[320px] rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col p-4 text-white select-none shadow-[0_12px_48px_rgba(0,0,0,0.8)] overflow-hidden"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Top Header Row of Expanded View */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className={`text-xs font-bold font-mono tracking-tight ${isOvertime ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
              {isOvertime ? '+' : ''}{formatTime(displaySeconds)}
            </span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold font-sans">
              · SELECT RE-FOCUS TARGET
            </span>
          </div>

          {/* Close expanded navigation panel */}
          <button
            onClick={handleCloseExpanded}
            className="w-5 h-5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 flex items-center justify-center text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
            style={{ WebkitAppRegion: 'no-drag' } as any}
            title="Close companion menu"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        </div>

        {/* Project Selector Rows / Pills */}
        <div className="flex gap-1 py-2 overflow-x-auto shrink-0 scrollbar-none" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {[
            { id: 'inbox-default', name: 'Inbox', color: '#6366f1' },
            ...projectsList.filter(p => p.id !== 'inbox-default')
          ].map(p => {
            const isSelected = selectedProjectIdForMenu === p.id
            const taskCount = sortedTasks.filter(t => {
              if (p.id === 'inbox-default') return !t.project_id || t.project_id === 'inbox-default'
              return t.project_id === p.id
            }).length

            return (
              <button
                key={p.id}
                onClick={() => setSelectedProjectIdForMenu(p.id)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                  isSelected 
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/40' 
                    : 'bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-900/50 hover:border-zinc-800 text-zinc-400'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color || '#888' }} />
                <span>{p.name}</span>
                <span className={`text-[9.5px] font-mono rounded-full px-1 ${
                  isSelected ? 'bg-indigo-500/30 text-indigo-200' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {taskCount}
                </span>
              </button>
            )
          })}
        </div>

        {/* Tasks List inside the navigation panel */}
        <div 
          className="flex-1 overflow-y-auto space-y-1 pr-1 mt-1 custom-scrollbar shrink-0 h-44" 
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          {activeProjectTasks.length > 0 ? (
            activeProjectTasks.map(task => {
              const isActive = sessionTaskId === task.id
              return (
                <div 
                  key={task.id} 
                  onClick={() => handleUpdateFocusTask(task.id)}
                  className={`group flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-indigo-500/10 border-indigo-500/30 shadow-inner'
                      : 'bg-zinc-900/40 border-zinc-900/50 hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Tick box to complete task within widget context menu */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCompleteTask(task.id)
                      }}
                      className="w-4 h-4 rounded-full bg-zinc-950 border border-zinc-850 hover:border-emerald-500 hover:bg-emerald-500/10 flex items-center justify-center shrink-0 transition-all"
                    >
                      <Check className="w-2.5 h-2.5 text-transparent group-hover:text-emerald-400 transition-colors" />
                    </button>

                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getPriorityColor(task.priority)}`} />
                      <span className={`truncate text-zinc-200 group-hover:text-white font-medium`}>
                        {task.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isActive ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 shadow-sm">
                        Focused
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold text-zinc-550 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Focus Target
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="py-12 text-center text-zinc-600 text-xs italic flex flex-col items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-zinc-700 animate-pulse" />
              <span>Zero pending tasks in this project segment.</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="w-[440px] h-[52px] rounded-full bg-zinc-950 border border-zinc-800/80 flex items-center justify-between px-3 text-white select-none shadow-[0_12px_24px_rgba(0,0,0,0.7)] overflow-hidden"
      style={{ WebkitAppRegion: 'drag' } as any}
      onDoubleClick={handleRestoreMainWindow}
    >
      {/* 1. Timer Panel & Controls */}
      <div className="flex items-center gap-1.5 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={handleTogglePause}
          className="w-6 h-6 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
          title={session?.status === 'paused' ? 'Resume focus' : 'Pause focus'}
        >
          {session?.status === 'paused' ? (
            <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
          ) : (
            <Pause className="w-2.5 h-2.5 fill-current" />
          )}
        </button>

        <button
          onClick={handleStop}
          onMouseLeave={() => setIsConfirmingStop(false)}
          className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
            isConfirmingStop
              ? "bg-rose-600 border-rose-500 text-white hover:bg-rose-700 font-bold scale-105"
              : "bg-zinc-900 hover:bg-red-950/30 border-zinc-800 hover:border-red-900/30 text-zinc-400 hover:text-red-400"
          }`}
          title={isConfirmingStop ? "Click again to confirm stop" : "Stop focus session"}
        >
          {isConfirmingStop ? (
            <X className="w-2.5 h-2.5 text-white stroke-[3.5]" />
          ) : (
            <Square className="w-2 h-2 fill-current" />
          )}
        </button>

        <div className="h-4 w-[1px] bg-zinc-800/80 mx-0.5" />

        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all ${
          session?.status === 'paused' 
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.05)]' 
            : isOvertime
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.05)] animate-pulse'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.05)]'
        }`}>
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            {session?.status !== 'paused' && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isOvertime ? 'bg-rose-400' : 'bg-emerald-400'
              }`}></span>
            )}
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
              session?.status === 'paused' 
                ? 'bg-amber-500' 
                : isOvertime 
                  ? 'bg-rose-500' 
                  : 'bg-emerald-500'
            }`}></span>
          </span>
          <span className="font-mono text-[12px] font-bold tracking-tight tabular-nums">
            {isOvertime ? '+' : ''}{formatTime(displaySeconds)}
          </span>
        </div>
      </div>

      {/* 2. Interactive Active Focus Task Target area */}
      <div 
        onClick={handleOpenExpanded}
        className="flex-1 flex items-center px-1.5 py-0.5 bg-zinc-905 border border-zinc-800/50 hover:bg-zinc-900 hover:border-indigo-500/30 rounded-lg min-w-0 max-w-[150px] mx-1 transition-all cursor-pointer"
        style={{ WebkitAppRegion: 'no-drag' } as any}
        title="Press to change task context"
      >
        {displayTask ? (
          <div className="flex items-center gap-1.5 w-full min-w-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCompleteTask(displayTask.id)
              }}
              className="w-3.5 h-3.5 rounded-full bg-zinc-900 border border-zinc-700 hover:border-emerald-500/80 hover:bg-emerald-500/10 flex items-center justify-center group shrink-0 transition-all cursor-pointer"
              title="Complete current task"
            >
              <Check className="w-2 h-2 text-transparent group-hover:text-emerald-400 transition-colors" />
            </button>
            
            <div className="flex flex-col min-w-0 leading-none">
              <span className="text-[7.5px] text-zinc-500 font-bold tracking-wider uppercase mb-0.5">Focus Scope</span>
              <div className="flex items-center gap-1 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getPriorityColor(displayTask.priority)}`} />
                <span className="text-[10.5px] font-semibold text-zinc-200 truncate w-full" title={displayTask.title}>
                  {displayTask.title}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <div className="flex flex-col leading-none">
              <span className="text-[7.5px] text-zinc-500 font-bold tracking-wider uppercase mb-0.5">Focus Scope</span>
              <span className="text-[10.5px] font-bold text-emerald-400 leading-none">Deep Focus</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Up Next Backlog Queue */}
      <div className="flex items-center px-2 max-w-[110px] min-w-[70px] shrink-0 border-l border-zinc-800/80">
        {upcomingTask ? (
          <div className="flex flex-col min-w-0 leading-none">
            <span className="text-[8px] text-zinc-500 font-semibold tracking-wider uppercase mb-0.5">Up Next</span>
            <span className="text-[10px] font-medium text-zinc-400 truncate w-full" title={upcomingTask.title}>
              {upcomingTask.title}
            </span>
          </div>
        ) : (
          <div className="flex flex-col justify-center leading-none">
            <span className="text-[8px] text-zinc-500 font-semibold tracking-wider uppercase mb-0.5">Up Next</span>
            <span className="text-[10px] font-medium text-emerald-500/80 italic leading-none font-sans">Queue clear</span>
          </div>
        )}
      </div>

      {/* 4. Restore Companion Overlay Action */}
      <div className="flex items-center pl-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={handleRestoreMainWindow}
          className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          title="Restore main application"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}
