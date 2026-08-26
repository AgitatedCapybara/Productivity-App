import { useMemo, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useTasks } from '../hooks/useTasks'
import { QuickAdd } from '../components/tasks/QuickAdd'
import { SessionQuickStart } from '../components/tasks/SessionQuickStart'
import { AISuggestionPanel } from '../components/tasks/AISuggestionPanel'
import { TaskSection } from '../components/tasks/TaskSection'
import { Trash2, Pencil, Check, X, AlertTriangle, Plus } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { motion, AnimatePresence } from 'motion/react'
import type { CalendarEvent } from '../types'
import { cn } from '../lib/utils'
import { LayoutList, StretchHorizontal } from 'lucide-react'
import { Skeleton } from '../components/ui/Skeleton'
import { overlaySlide } from '../lib/motion-tokens'

export function TodayView() {
  const { tasks, completedTasks, deletedTasks, isLoading, error, purgeDeletedTasks, startSession, updateTask, completeTask, deleteTask } = useTasks(true, 'today')
  const [todaySessions, setTodaySessions] = useState<any[]>([])
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingSessionName, setEditingSessionName] = useState<string>('')
  
  const [isSchedulingExpanded, setIsSchedulingExpanded] = useState(false)
  const [isPlanningExpanded, setIsPlanningExpanded] = useState(false)
  
  // Nudge states
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isNudgesEnabled, setIsNudgesEnabled] = useState(true)
  const [dismissedTaskIds, setDismissedTaskIds] = useState<string[]>([])

  const projects = useAppStore(state => state.projects)
  const setActiveView = useAppStore(state => state.setActiveView)
  const setPreselectedSessionId = useAppStore(state => state.setPreselectedSessionId)
  const densitySetting = useAppStore(state => state.densitySetting)
  const setDensitySetting = useAppStore(state => state.setDensitySetting)
  const setQuickAddOpen = useAppStore(state => state.setQuickAddOpen)
  const featureVisibility = useAppStore(state => state.featureVisibility)
  const usageMilestones = useAppStore(state => state.usageMilestones)
  const dismissedTips = useAppStore(state => state.dismissedTips)
  const dismissTip = useAppStore(state => state.dismissTip)
  const activeSessionId = useAppStore(state => state.activeSessionId)

  const keyboardSelectedTaskId = useAppStore(state => state.keyboardSelectedTaskId)
  const setKeyboardSelectedTaskId = useAppStore(state => state.setKeyboardSelectedTaskId)
  const isKeyboardDetailsPeekOpen = useAppStore(state => state.isKeyboardDetailsPeekOpen)
  const setKeyboardDetailsPeekOpen = useAppStore(state => state.setKeyboardDetailsPeekOpen)
  const editingTaskId = useAppStore(state => state.editingTaskId)
  const setEditingTaskId = useAppStore(state => state.setEditingTaskId)

  // Safe confirmation states (instead of blocking window.confirm)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [isConfirmingClear, setIsConfirmingClear] = useState(false)
  const [isConfirmingPurge, setIsConfirmingPurge] = useState(false)

  const handlePurgeDeleted = async () => {
    if (!isConfirmingPurge) {
      setIsConfirmingPurge(true)
      return
    }
    await purgeDeletedTasks()
    setIsConfirmingPurge(false)
  }

  const handleSessionClick = (sessionId: string) => {
    setPreselectedSessionId(sessionId)
    setActiveView('analytics')
  }

  const fetchTodaySessions = () => {
    if (window.electronAPI && window.electronAPI.getTodaySessions) {
      window.electronAPI.getTodaySessions().then(setTodaySessions).catch(console.error)
    }
  }

  const handleDeleteSession = async (id: string) => {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id)
      return
    }
    // Optimistic update
    setTodaySessions(prev => prev.filter(s => s.id !== id))
    setConfirmingDeleteId(null)
    
    if (window.electronAPI && window.electronAPI.deleteSession) {
      try {
        await window.electronAPI.deleteSession(id)
      } catch (err) {
        console.error(err)
        fetchTodaySessions()
      }
    }
  }

  const handleClearHistory = async () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true)
      return
    }
    // Optimistic update
    setTodaySessions([])
    setIsConfirmingClear(false)
    
    if (window.electronAPI && window.electronAPI.clearSessionHistory) {
      try {
        await window.electronAPI.clearSessionHistory()
      } catch (err) {
        console.error(err)
        fetchTodaySessions()
      }
    }
  }

  useEffect(() => {
    fetchTodaySessions()

    if (window.electronAPI && window.electronAPI.onSessionStateChanged) {
      const removeStateListener = window.electronAPI.onSessionStateChanged(() => {
        fetchTodaySessions()
      })
      return () => {
        if (typeof removeStateListener === 'function') removeStateListener()
      }
    }
    return undefined
  }, [])

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getEvents().then(setEvents).catch(console.error)
      window.electronAPI.getSetting('scheduler.nudges.enabled', 'true')
        .then(val => setIsNudgesEnabled(val === 'true'))
        .catch(console.error)
    }
  }, [tasks])

  const getSessionDurationString = (session: any) => {
    if (session.started_at && session.ended_at) {
      const start = new Date(session.started_at).getTime()
      const end = new Date(session.ended_at).getTime()
      const diffSeconds = Math.floor((end - start) / 1000)
      
      if (diffSeconds < 0) return '0s'
      
      const mins = Math.floor(diffSeconds / 60)
      const secs = diffSeconds % 60
      
      if (mins === 0) {
        return `${secs}s`
      }
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
    }
    return `${session.duration_mins || 0}m`
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const overdue = useMemo(() => {
    return tasks.filter(t => t.status !== 'done' && t.due_date !== null && t.due_date < todayStr)
  }, [tasks, todayStr])

  const todayTasks = useMemo(() => {
    return tasks.filter(t => t.status !== 'done' && t.due_date === todayStr)
  }, [tasks, todayStr])

  const inbox = useMemo(() => {
    return tasks.filter(t => t.status !== 'done' && t.due_date === null && (!window.electronAPI ? (!t.project_id || t.project_id === 'inbox-default') : true))
  }, [tasks])

  const nudgedTasks = useMemo(() => {
    if (!isNudgesEnabled) return []
    const nowMs = new Date().getTime()
    return tasks.filter(t => {
      if (t.status === 'done' || t.status === 'deleted') return false
      if (!t.due_date) return false
      if (dismissedTaskIds.includes(t.id)) return false

      // Check if scheduled
      const isScheduled = events.some(e => e.description?.includes(t.id) || e.title === t.title)
      if (isScheduled) return false

      // Check if deadline < 2 days (48 hours)
      const dueTime = t.due_time || '23:59:00'
      const dueDateTime = new Date(`${t.due_date}T${dueTime}`)
      const diffMs = dueDateTime.getTime() - nowMs

      return diffMs > 0 && diffMs < 48 * 60 * 60 * 1000
    })
  }, [tasks, events, isNudgesEnabled, dismissedTaskIds])

  const orderedTasks = useMemo(() => {
    return [
      ...overdue,
      ...todayTasks,
      ...inbox,
      ...completedTasks,
      ...(deletedTasks || [])
    ]
  }, [overdue, todayTasks, inbox, completedTasks, deletedTasks])

  // Reset keyboardSelectedTaskId if it is no longer valid
  useEffect(() => {
    if (keyboardSelectedTaskId && !orderedTasks.some(t => t.id === keyboardSelectedTaskId)) {
      setKeyboardSelectedTaskId(null)
    }
  }, [orderedTasks, keyboardSelectedTaskId, setKeyboardSelectedTaskId])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Filter out when typing in input, textarea, contenteditable, or select
      const target = e.target as HTMLElement
      if (!target) return
      const tagName = target.tagName.toLowerCase()
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        target.isContentEditable ||
        target.closest('.no-keyboard-nav') !== null
      ) {
        return
      }

      const key = e.key.toLowerCase()

      // J and K to traverse tasks sequentially
      if (key === 'j' || key === 'k') {
        if (orderedTasks.length === 0) return
        e.preventDefault()
        e.stopPropagation()

        const currentIndex = keyboardSelectedTaskId
          ? orderedTasks.findIndex(t => t.id === keyboardSelectedTaskId)
          : -1

        let nextIndex = 0
        if (currentIndex === -1) {
          nextIndex = key === 'j' ? 0 : orderedTasks.length - 1
        } else {
          if (key === 'j') {
            nextIndex = (currentIndex + 1) % orderedTasks.length
          } else {
            nextIndex = (currentIndex - 1 + orderedTasks.length) % orderedTasks.length
          }
        }
        const nextTask = orderedTasks[nextIndex]
        if (nextTask) {
          setKeyboardSelectedTaskId(nextTask.id)
        }
        return
      }

      // Space to toggle details peek
      if (e.key === ' ') {
        if (!keyboardSelectedTaskId) return
        e.preventDefault()
        e.stopPropagation()
        setKeyboardDetailsPeekOpen(!isKeyboardDetailsPeekOpen)
        return
      }

      // C to toggle completion of highlighted task
      if (key === 'c') {
        if (!keyboardSelectedTaskId) return
        e.preventDefault()
        e.stopPropagation()
        completeTask(keyboardSelectedTaskId)
        return
      }

      // Delete or Backspace to delete highlighted task
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!keyboardSelectedTaskId) return
        e.preventDefault()
        e.stopPropagation()
        const idToDelete = keyboardSelectedTaskId
        setKeyboardSelectedTaskId(null)
        deleteTask(idToDelete).catch(console.error)
        return
      }

      // Enter to activate (Shift + Enter starts focus session) or inline rename (Enter)
      if (e.key === 'Enter') {
        if (!keyboardSelectedTaskId) return
        e.preventDefault()
        e.stopPropagation()
        if (e.shiftKey) {
          // Play focus session
          startSession(keyboardSelectedTaskId).catch(console.error)
        } else {
          // Toggle rename
          if (editingTaskId === keyboardSelectedTaskId) {
            setEditingTaskId(null)
          } else {
            setEditingTaskId(keyboardSelectedTaskId)
          }
        }
        return
      }

      // Escape to close everything
      if (e.key === 'Escape') {
        if (isKeyboardDetailsPeekOpen) {
          setKeyboardDetailsPeekOpen(false)
          e.preventDefault()
          e.stopPropagation()
        }
        if (editingTaskId) {
          setEditingTaskId(null)
          e.preventDefault()
          e.stopPropagation()
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true)
    }
  }, [
    orderedTasks,
    keyboardSelectedTaskId,
    isKeyboardDetailsPeekOpen,
    editingTaskId,
    setKeyboardSelectedTaskId,
    setKeyboardDetailsPeekOpen,
    setEditingTaskId,
    startSession,
    completeTask,
    deleteTask
  ])

  const activeNavTask = useMemo(() => {
    return orderedTasks.find(t => t.id === keyboardSelectedTaskId)
  }, [orderedTasks, keyboardSelectedTaskId])

  // Deselect task when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target) return

      // If the click is inside a task item, don't clear anything
      if (target.closest('[data-task-id]')) {
        return
      }

      // Check if click is on any Radix / headless UI portal/dropdown elements, interactive elements, or sidebars
      let isPortalOrInteractive = false
      let curr: HTMLElement | null = target
      while (curr) {
        if (
          curr.getAttribute?.('data-radix-portal') !== null ||
          curr.getAttribute?.('data-radix-popper-content-wrapper') !== null ||
          curr.className?.includes?.('radix') ||
          curr.className?.includes?.('select-content') ||
          curr.className?.includes?.('dropdown-menu') ||
          curr.className?.includes?.('fixed') || // This covers floating details peek, modals, dropdowns
          curr.tagName?.toLowerCase() === 'input' ||
          curr.tagName?.toLowerCase() === 'textarea' ||
          curr.tagName?.toLowerCase() === 'button' ||
          curr.tagName?.toLowerCase() === 'select' ||
          curr.closest?.('.no-keyboard-nav') !== null ||
          curr.closest?.('[role="dialog"]') !== null ||
          curr.closest?.('[role="menu"]') !== null
        ) {
          isPortalOrInteractive = true
          break
        }
        curr = curr.parentElement
      }

      if (isPortalOrInteractive) {
        return
      }

      // If we clicked outside, let's clear the selected/highlighted tasks!
      const currentSelectedTaskIds = useAppStore.getState().selectedTaskIds
      const currentKeyboardSelectedTaskId = useAppStore.getState().keyboardSelectedTaskId

      if (currentKeyboardSelectedTaskId) {
        useAppStore.getState().setKeyboardSelectedTaskId(null)
      }

      // For cases where users are selecting multiple tasks at the same time, they should have to press the 'x' as we currently have.
      // So if currentSelectedTaskIds.length === 1, we clear it!
      if (currentSelectedTaskIds.length === 1) {
        useAppStore.getState().setSelectedTaskIds([])
        useAppStore.getState().setLastSelectedTaskId(null)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick, true)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true)
    }
  }, [])

  if (!featureVisibility.todayView) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 p-8 font-sans h-full">
        <div className="text-center max-w-md space-y-3 p-8 border border-zinc-900 rounded-2xl bg-zinc-950/40">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Today Workspace is Hidden</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            You have toggled off the Today View for extreme focus. You can re-enable it any time in the Workspace Preferences under Settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <section 
      aria-label="Today Workspace Dashboard"
      className={cn(
        "flex-1 overflow-y-auto relative outline-none custom-scrollbar transition-all view-container",
        densitySetting === 'compact' ? "px-6" : "px-8"
      )}
    >
      <div className={cn(
        "max-w-2xl w-full mx-auto transition-all",
        densitySetting === 'compact' ? "pt-8 pb-8" : "pt-12 pb-12"
      )}>
        
        {/* Header */}
        <header className={cn(
          "select-none flex items-center justify-between transition-all",
          densitySetting === 'compact' ? "mb-6" : "mb-8"
        )}>
          <div>
            <h1 className="text-[34px] font-bold tracking-tight text-[var(--text-primary)] mb-1">Today</h1>
            <p className="text-white/70 text-[15px] font-normal">{format(new Date(), "EEEE, MMMM d")}</p>
          </div>
          
          <div className="flex items-center gap-1 bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border-default)] shadow-sm">
            <button
              onClick={() => setDensitySetting('comfortable')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-all flex items-center gap-1",
                densitySetting === 'comfortable'
                  ? "bg-purple-600/15 text-purple-400 border border-purple-500/20"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent"
              )}
              title="Comfortable layout view"
            >
              <LayoutList size={11} />
              <span>Comfortable</span>
            </button>
            <button
              onClick={() => setDensitySetting('compact')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-all flex items-center gap-1",
                densitySetting === 'compact'
                  ? "bg-purple-600/15 text-purple-400 border border-purple-500/20"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent"
              )}
              title="Compact layout view"
            >
              <StretchHorizontal size={11} />
              <span>Compact</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-[var(--color-overdue)]/10 border border-[var(--color-overdue)]/20 text-[var(--color-overdue)] rounded-xl text-sm mb-6">
            <strong>Backend Error:</strong> {error}
          </div>
        )}
        {!window.electronAPI && (
          <div className="p-4 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 text-[var(--color-warning)] rounded-xl text-sm mb-6">
            <strong>Preview Warning:</strong> Electron IPC is not available in the web browser. Export and run via desktop environment to test SQLite and native OS integrations.
          </div>
        )}

        {/* Input */}
        {featureVisibility.quickAdd && <QuickAdd />}
        
        {/* Custom Focus Session Quick Start Picker */}
        {featureVisibility.focusTimer && <SessionQuickStart />}

        {/* AI Suggestions Compact Panel */}
        {featureVisibility.aiSuggestions && <AISuggestionPanel variant="compact" />}

        {/* Progressive AI Suggestions Tip */}
        <AnimatePresence>
          {!activeSessionId && !featureVisibility.aiSuggestions && usageMilestones.tasksCreated >= 5 && !dismissedTips.includes('tip-ai-suggestions') && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="mb-8 p-4 bg-zinc-800/60 border border-zinc-700/35 rounded-xl relative flex items-center justify-between gap-3 shadow-sm text-[13px] text-zinc-100/60"
              id="tip-ai-suggestions-banner"
            >
              <span className="font-sans font-medium">
                Tip: AI scheduling can help organize these. Enable it in Settings.
              </span>
              <button
                type="button"
                onClick={() => dismissTip('tip-ai-suggestions')}
                className="p-1 text-zinc-400 hover:text-zinc-250 hover:bg-zinc-700/40 rounded-lg transition-all cursor-pointer shrink-0"
                aria-label="Dismiss tip"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deadline-Aware Nudge Banner */}
        {nudgedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl relative flex items-start gap-3.5 shadow-sm"
          >
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Needs Scheduling</h4>
              <p className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
                You have {nudgedTasks.length} task{nudgedTasks.length > 1 ? 's' : ''} with deadlines in less than 48 hours that {nudgedTasks.length > 1 ? 'are' : 'is'} not scheduled on your calendar.
              </p>
              <div className="mt-2.5 flex items-center gap-3">
                <button
                  onClick={() => setActiveView('plan')}
                  className="px-3 py-1 bg-amber-500/25 border border-amber-500/35 hover:bg-amber-500/35 text-amber-300 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                >
                  Let AI Find Optimal Slots
                </button>
                <button
                  onClick={() => setDismissedTaskIds(prev => [...prev, ...nudgedTasks.map(t => t.id)])}
                  className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold"
                >
                  Dismiss Nudge
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Sections */}
        {isLoading ? (
          <div className="space-y-4 mt-8">
            <Skeleton variant="list-item" className="opacity-60" />
            <Skeleton variant="list-item" className="opacity-50" />
            <Skeleton variant="list-item" className="opacity-40" />
            <Skeleton variant="list-item" className="opacity-30" />
          </div>
        ) : (
          <>
            {!featureVisibility.taskList ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-zinc-900 rounded-2xl bg-zinc-950/25 mt-8 px-6">
                <p className="text-xs text-zinc-400 font-sans max-w-sm leading-relaxed">
                  Your task list is hidden to preserve extreme calm. You can re-enable it any time in Settings.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 mt-8">
                <TaskSection 
                  title="Overdue" 
                  tasks={overdue} 
                  accentColor="var(--color-overdue)" 
                  defaultOpen 
                />
                
                <TaskSection 
                  title="Today" 
                  tasks={todayTasks} 
                  accentColor="var(--text-secondary)" 
                  defaultOpen 
                />
                
                <TaskSection 
                  title="Inbox" 
                  tasks={inbox} 
                  accentColor="var(--text-muted)" 
                  defaultOpen 
                />
                
                <TaskSection 
                  title="Completed" 
                  tasks={completedTasks} 
                  accentColor="var(--text-muted)" 
                  defaultOpen={false} 
                />
                
                <TaskSection 
                  title="Deleted" 
                  tasks={deletedTasks || []} 
                  accentColor="var(--text-muted)" 
                  defaultOpen={false} 
                  headerAction={
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePurgeDeleted()
                      }}
                      onMouseLeave={() => setIsConfirmingPurge(false)}
                      className={`text-[10px] flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all duration-150 select-none font-semibold ${
                        isConfirmingPurge 
                          ? 'bg-[var(--color-overdue)]/10 text-[var(--color-overdue)] border-[var(--color-overdue)]/30 scale-105' 
                          : 'text-[var(--text-secondary)] hover:text-[var(--color-overdue)] border-transparent hover:bg-[var(--bg-elevated)]'
                      }`}
                      title={isConfirmingPurge ? 'Permanently empty trash?' : 'Empty trash'}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{isConfirmingPurge ? 'Confirm Empty?' : 'Delete All'}</span>
                    </button>
                  }
                />
              </div>
            )}

            {todaySessions.length > 0 && (
              <div className="mt-8 mb-4">
                <div className="flex items-center justify-between mb-3 select-none">
                  <h3 className="text-[17px] font-semibold tracking-tight text-[var(--text-secondary)] flex items-center gap-2">
                    Today's Sessions
                  </h3>
                  <button 
                    onClick={handleClearHistory}
                    onMouseLeave={() => setIsConfirmingClear(false)}
                    className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all duration-150 ${
                      isConfirmingClear 
                        ? 'bg-[var(--color-overdue)]/10 text-[var(--color-overdue)] border-[var(--color-overdue)]/30 font-medium' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border-transparent hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isConfirmingClear ? 'Confirm Clear?' : 'Clear History'}
                  </button>
                </div>
                <div className="space-y-2">
                  {todaySessions.map((session, i) => {
                    const sessionName = session.customName || session.custom_name || session.task_title || (tasks.find(t => t.id === session.task_id)?.title) || 'Focus Session';
                    const isEditing = editingSessionId === session.id;

                    return (
                      <div 
                        key={session.id || i} 
                        onClick={() => !isEditing && handleSessionClick(session.id)}
                        className="group flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-indigo-500/45 hover:bg-zinc-800/40 active:scale-[0.99] cursor-pointer transition-all duration-150"
                      >
                        {isEditing ? (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (editingSessionName.trim() && window.electronAPI && window.electronAPI.renameSession) {
                                await window.electronAPI.renameSession(session.id, editingSessionName.trim())
                                setEditingSessionId(null)
                                fetchTodaySessions()
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 flex-1 max-w-[65%]"
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
                              className="bg-zinc-800 text-white border border-indigo-500/50 rounded-md px-2 py-0.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="submit"
                              className="p-1 hover:bg-zinc-700/80 rounded text-emerald-400 transition"
                            >
                              <Check className="w-3.5 h-3.5 animate-pulse" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingSessionId(null)
                              }}
                              className="p-1 hover:bg-zinc-700/80 rounded text-rose-400 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        ) : (
                          <span 
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => {
                              e.stopPropagation()
                              setEditingSessionId(session.id)
                              setEditingSessionName(sessionName)
                            }}
                            className="text-[var(--text-primary)] font-medium truncate max-w-[55%] group-hover:text-white transition-colors"
                            title="Double-click to rename"
                          >
                            {sessionName}
                          </span>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="text-[var(--text-secondary)] text-xs select-none">
                            {getSessionDurationString(session)} · {session.distraction_count || 0} distraction{session.distraction_count === 1 ? '' : 's'}
                          </span>
                          
                          {!isEditing && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingSessionId(session.id)
                                setEditingSessionName(sessionName)
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-indigo-400 hover:bg-[var(--bg-elevated)] rounded transition-all duration-150"
                              title="Rename focus session"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteSession(session.id)
                            }}
                            onMouseLeave={() => {
                              if (confirmingDeleteId === session.id) setConfirmingDeleteId(null)
                            }}
                            className={`flex items-center rounded transition-all duration-150 ${
                              confirmingDeleteId === session.id
                                ? 'opacity-100 bg-[var(--color-overdue)]/15 text-[var(--color-overdue)] px-1.5 py-0.5 border border-[var(--color-overdue)]/30'
                                : 'opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-[var(--color-overdue)] hover:bg-[var(--bg-elevated)]'
                            }`}
                            title={confirmingDeleteId === session.id ? "Click again to delete" : "Delete session"}
                          >
                            <span className="flex items-center gap-1 text-[11px] font-semibold leading-none">
                              {confirmingDeleteId === session.id && <span>Confirm?</span>}
                              <Trash2 className="w-3.5 h-3.5" />
                            </span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {tasks.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={overlaySlide}
                className="mt-6 text-center select-none flex flex-col items-center gap-3"
              >
                <p className="text-[var(--text-secondary)] text-[17px] font-normal leading-relaxed">
                  Your mind is clear. Ready to offload a task?
                </p>
                <button
                  onClick={() => setQuickAddOpen(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[15px] font-semibold rounded-xl cursor-pointer transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  <Plus size={16} />
                  <span>Offload a Task</span>
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* FLOATING DETAILS PEEK PANEL */}
      <AnimatePresence>
        {isKeyboardDetailsPeekOpen && activeNavTask && (
          <motion.div
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-[420px] bg-zinc-950/95 border-l border-zinc-900 shadow-2xl z-50 backdrop-blur-md p-6 flex flex-col justify-between"
          >
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-900 mb-6">
                <span className="text-[13px] font-bold uppercase tracking-widest text-purple-400">
                  Task Details
                </span>
                <button
                  onClick={() => setKeyboardDetailsPeekOpen(false)}
                  className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-zinc-100 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Progressive Planning Fields Tip */}
              <AnimatePresence>
                {!activeSessionId && !featureVisibility.planningFields && usageMilestones.tasksCreated >= 10 && !dismissedTips.includes('tip-planning-fields') && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="mb-4 p-3 bg-zinc-800/60 border border-zinc-700/20 rounded-xl relative flex items-center justify-between gap-2.5 shadow-sm text-[12px] text-zinc-100/60"
                    id="tip-planning-fields-banner"
                  >
                    <span className="font-sans font-medium">
                      Planning when and where helps you follow through. Enable intention planning in Settings.
                    </span>
                    <button
                      type="button"
                      onClick={() => dismissTip('tip-planning-fields')}
                      className="p-1 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 rounded-lg transition-all cursor-pointer shrink-0"
                      aria-label="Dismiss tip"
                    >
                      <X size={12} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Primary Controls (Title, Status, Priority) */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateTask({ id: activeNavTask.id, status: activeNavTask.status === 'done' ? 'todo' : 'done' })}
                    className="w-8 h-8 flex flex-shrink-0 items-center justify-center hover:bg-zinc-900 rounded-full transition-colors cursor-pointer"
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex flex-shrink-0 items-center justify-center transition-colors",
                      activeNavTask.status === 'done' ? "bg-emerald-500 border-emerald-500 text-white" : "border-zinc-700 hover:border-zinc-400"
                    )}>
                      <Check size={10} strokeWidth={3} className={activeNavTask.status === 'done' ? "block" : "hidden"} />
                    </div>
                  </button>
                  <input
                    type="text"
                    value={activeNavTask.title}
                    onChange={(e) => updateTask({ id: activeNavTask.id, title: e.target.value })}
                    className="flex-1 bg-transparent border-0 p-0 text-[17px] font-medium text-zinc-100 focus:ring-0 outline-none"
                    placeholder="Task title"
                  />
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <span className="text-[13px] font-normal text-zinc-400">Priority:</span>
                  <div className="flex gap-1.5">
                    {([0, 1, 2, 3] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => updateTask({ id: activeNavTask.id, priority: p })}
                        className={cn(
                          "px-2 py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer",
                          activeNavTask.priority === p
                            ? p === 3 ? "bg-rose-500/20 text-rose-450 border-rose-500/45" :
                              p === 2 ? "bg-amber-500/20 text-amber-400 border-amber-500/45" :
                              p === 1 ? "bg-slate-500/20 text-slate-350 border-slate-500/45" :
                              "bg-zinc-800 text-zinc-300 border-zinc-700"
                            : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700"
                        )}
                      >
                        {p === 3 ? 'High' : p === 2 ? 'Medium' : p === 1 ? 'Low' : 'None'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[13px] font-normal text-zinc-400">Status:</span>
                  <select
                    value={activeNavTask.status}
                    onChange={(e) => updateTask({ id: activeNavTask.id, status: e.target.value as any })}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 outline-none focus:border-purple-500/50 cursor-pointer"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              {/* Secondary Controls - Group 1: Scheduling & Project */}
              <div className="border-t border-zinc-900 pt-4">
                <button
                  onClick={() => setIsSchedulingExpanded(!isSchedulingExpanded)}
                  className="w-full flex items-center justify-between py-2 text-[15px] font-semibold text-zinc-350 hover:text-white border-b border-zinc-900 select-none cursor-pointer"
                >
                  <span>Scheduling & Project</span>
                  <span className="text-zinc-500 text-xs">{isSchedulingExpanded ? 'Collapse' : 'Expand'}</span>
                </button>
                {isSchedulingExpanded && (
                  <div className="space-y-4 pt-3 pb-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[13px] text-white/60">Project Assignment</label>
                      <select
                        value={activeNavTask.project_id || 'inbox-default'}
                        onChange={(e) => updateTask({ id: activeNavTask.id, project_id: e.target.value === 'inbox-default' ? undefined : e.target.value })}
                        className="text-[17px] p-2 min-h-10 bg-zinc-800 rounded-lg border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-purple-400 placeholder:text-white/30 text-zinc-100 outline-none w-full transition-all cursor-pointer"
                      >
                        <option value="inbox-default">Inbox</option>
                        {projects.filter(p => p.id !== 'inbox-default').map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[13px] text-white/60">Due Date</label>
                        <input
                          type="date"
                          value={activeNavTask.due_date || ''}
                          onChange={(e) => updateTask({ id: activeNavTask.id, due_date: e.target.value || undefined })}
                          className="text-[17px] p-2 min-h-10 bg-zinc-800 rounded-lg border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-purple-400 placeholder:text-white/30 text-zinc-100 outline-none w-full transition-all color-scheme-dark"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[13px] text-white/60">Due Time</label>
                        <input
                          type="time"
                          value={activeNavTask.due_time || ''}
                          onChange={(e) => updateTask({ id: activeNavTask.id, due_time: e.target.value || undefined })}
                          className="text-[17px] p-2 min-h-10 bg-zinc-800 rounded-lg border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-purple-400 placeholder:text-white/30 text-zinc-100 outline-none w-full transition-all color-scheme-dark"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[13px] text-white/60">Duration Est (mins)</label>
                      <input
                        type="number"
                        placeholder="Duration in minutes"
                        value={activeNavTask.time_estimate_mins || ''}
                        onChange={(e) => updateTask({ id: activeNavTask.id, time_estimate_mins: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="text-[17px] p-2 min-h-10 bg-zinc-800 rounded-lg border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-purple-400 placeholder:text-white/30 text-zinc-100 outline-none w-full transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Secondary Controls - Group 2: Focus Planning */}
              <div className="border-t border-zinc-900 pt-4">
                <button
                  onClick={() => setIsPlanningExpanded(!isPlanningExpanded)}
                  className="w-full flex items-center justify-between py-2 text-[15px] font-semibold text-zinc-350 hover:text-white border-b border-zinc-900 select-none cursor-pointer"
                >
                  <span>Focus Planning & Intentions</span>
                  <span className="text-zinc-500 text-xs">{isPlanningExpanded ? 'Collapse' : 'Expand'}</span>
                </button>
                {isPlanningExpanded && (
                  <div className="space-y-4 pt-3 pb-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[13px] text-white/60">When will you do this?</label>
                      <input
                        type="text"
                        placeholder="e.g., Tomorrow at 10:00 AM after morning standup"
                        value={activeNavTask.plan_when || ''}
                        onChange={(e) => updateTask({ id: activeNavTask.id, plan_when: e.target.value || undefined })}
                        className="text-[17px] p-2 min-h-10 bg-zinc-800 rounded-lg border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-purple-400 placeholder:text-white/30 text-zinc-100 outline-none w-full transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[13px] text-white/60">Where will you do this?</label>
                      <input
                        type="text"
                        placeholder="e.g., At my desk with headphones on"
                        value={activeNavTask.plan_where || ''}
                        onChange={(e) => updateTask({ id: activeNavTask.id, plan_where: e.target.value || undefined })}
                        className="text-[17px] p-2 min-h-10 bg-zinc-800 rounded-lg border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-purple-400 placeholder:text-white/30 text-zinc-100 outline-none w-full transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[13px] text-white/60">How (immediate micro-action to start)?</label>
                      <input
                        type="text"
                        placeholder="e.g., Open the index.html file and write one paragraph"
                        value={activeNavTask.plan_how || ''}
                        onChange={(e) => updateTask({ id: activeNavTask.id, plan_how: e.target.value || undefined })}
                        className="text-[17px] p-2 min-h-10 bg-zinc-800 rounded-lg border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-purple-400 placeholder:text-white/30 text-zinc-100 outline-none w-full transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Description Notes */}
              <div className="border-t border-zinc-900 pt-4 mt-4">
                <span className="text-[13px] font-semibold text-zinc-350 block mb-2">Description Notes</span>
                <textarea
                  placeholder="No description notes written. Add details here..."
                  value={activeNavTask.notes || ''}
                  onChange={(e) => updateTask({ id: activeNavTask.id, notes: e.target.value || undefined })}
                  className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl min-h-[120px] text-xs text-zinc-350 leading-relaxed font-normal outline-none focus:border-purple-500/50 resize-y"
                />
              </div>
            </div>

            {/* Shortcut Guidelines */}
            <div className="border-t border-zinc-905 pt-4 mt-6">
              <div className="space-y-3 select-none">
                <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Keyboard Guide</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold bg-zinc-900 border border-zinc-800 text-purple-400 px-1.5 py-0.5 rounded text-[9px] font-mono">J</span>
                    <span className="text-zinc-500">Next Task</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold bg-zinc-900 border border-zinc-800 text-purple-400 px-1.5 py-0.5 rounded text-[9px] font-mono">K</span>
                    <span className="text-zinc-500">Prev Task</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold bg-zinc-900 border border-zinc-800 text-purple-400 px-1.5 py-0.5 rounded text-[9px] font-mono">Space</span>
                    <span className="text-zinc-500">Toggle Peek</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold bg-zinc-900 border border-zinc-800 text-purple-400 px-1.5 py-0.5 rounded text-[9px] font-mono">Enter</span>
                    <span className="text-zinc-500">Rename Title</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold bg-zinc-900 border border-zinc-800 text-purple-400 px-1.5 py-0.5 rounded text-[9px] font-mono">C</span>
                    <span className="text-zinc-500">Toggle Done</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold bg-zinc-900 border border-zinc-800 text-purple-400 px-1.5 py-0.5 rounded text-[9px] font-mono">Del</span>
                    <span className="text-zinc-500">Purge Task</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-between border-t border-zinc-900/50 pt-2 mt-1">
                    <span className="font-semibold bg-zinc-900 border border-zinc-800 text-purple-400 px-2 py-0.5 rounded text-[9px] font-mono">Shift + Enter</span>
                    <span className="text-zinc-500 font-semibold">Start Focus Session</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Add Task FAB */}
      <button
        onClick={() => setQuickAddOpen(true)}
        className="fixed bottom-8 right-8 w-10 h-10 bg-purple-600 hover:bg-purple-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
        title="Add a task"
        id="today-add-task-fab"
      >
        <Plus size={20} />
      </button>
    </section>
  )
}
