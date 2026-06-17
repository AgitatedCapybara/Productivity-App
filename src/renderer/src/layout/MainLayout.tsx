import { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { TodayView } from '../pages/TodayView'
import { UpcomingView } from '../pages/UpcomingView'
import { ProjectView } from '../pages/ProjectView'
import { FocusWorkspaceView } from '../pages/FocusWorkspaceView'
import { SettingsView } from '../pages/SettingsView'
import { AnalyticsView } from './AnalyticsView'
import { HabitsView } from '../pages/HabitsView'
import { CalendarView } from '../pages/CalendarView'
import { CirclePage } from '../pages/Circle/CirclePage'
import { PostSessionOverview } from '../components/tasks/PostSessionOverview'
import { useAppStore } from '../store/useAppStore'
import { useTasks } from '../hooks/useTasks'
import { useHabits } from '../hooks/useHabits'
import { useProjects } from '../hooks/useProjects'
import { Trash2, X, Sparkles, Flame, Check } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '../lib/utils'

export function MainLayout() {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [isConfirmingBulk, setIsConfirmingBulk] = useState(false)
  const activeView = useAppStore(state => state.activeView)
  const selectedTaskIds = useAppStore(state => state.selectedTaskIds)
  const setSelectedTaskIds = useAppStore(state => state.setSelectedTaskIds)
  const { deleteTask } = useTasks()

  const activeSessionId = useAppStore(state => state.activeSessionId)
  const setActiveSession = useAppStore(state => state.setActiveSession)
  const setActiveTaskId = useAppStore(state => state.setActiveTaskId)
  const setSessionDistractionCount = useAppStore(state => state.setSessionDistractionCount)
  const recentFocusSummary = useAppStore(state => state.recentFocusSummary)
  const setRecentFocusSummary = useAppStore(state => state.setRecentFocusSummary)
  const pageScales = useAppStore(state => state.pageScales)
  const setPageScales = useAppStore(state => state.setPageScales)

  useEffect(() => {
    setIsConfirmingBulk(false)
  }, [selectedTaskIds])

  useEffect(() => {
    if (!window.electronAPI) return

    // Load persisted page scales from SQLite settings database
    if (window.electronAPI.getSetting) {
      window.electronAPI.getSetting('page-scales', '').then(val => {
        if (val) {
          try {
            const parsed = JSON.parse(val)
            setPageScales(parsed)
          } catch (e) {
            console.error('Failed to parse persisted page-scales config:', e)
          }
        }
      }).catch(console.error)
    }

    // 1. Initial State Load
    window.electronAPI.getActiveSession().then(session => {
      if (session) {
        setActiveSession(session.id)
        setActiveTaskId(session.taskId || (session as any).task_id || null)
        setSessionDistractionCount(session.distractionCount ?? 0)
      } else {
        setActiveSession(null)
        setActiveTaskId(null)
      }
    }).catch(console.error)

    // 2. State Switch Sync (triggered by play, pause, stops in widget or main app)
    const removeStateListener = window.electronAPI.onSessionStateChanged(() => {
      window.electronAPI.getActiveSession().then(session => {
        if (session) {
          setActiveSession(session.id)
          setActiveTaskId(session.taskId || (session as any).task_id || null)
          setSessionDistractionCount(session.distractionCount ?? 0)
        } else {
          setActiveSession(null)
          setActiveTaskId(null)
        }
      }).catch(console.error)
    })

    // 2.5 Dynamic Background Tasks Sync (any database modifications)
    let removeTasksListener: (() => void) | undefined
    if (window.electronAPI.onTasksStateChanged) {
      removeTasksListener = window.electronAPI.onTasksStateChanged(() => {
        useAppStore.getState().incrementTasksRevision()
      })
    }

    // 3. Actively Monitored Distractions Listener
    const removeDistractionListener = window.electronAPI.onSessionDistractionUpdate((count) => {
      setSessionDistractionCount(count)
    })

    // 4. Session Ended Listener
    const removeSessionEndedListener = window.electronAPI.onSessionEnded
      ? window.electronAPI.onSessionEnded((summary) => {
          console.log('[MAIN LAYOUT] Session ended with summary:', JSON.stringify(summary))
          useAppStore.getState().setRecentFocusSummary(summary)
          useAppStore.getState().incrementTasksRevision()
        })
      : null

    // 5. Native Close requested from titlebar X button
    let removeCloseListener: (() => void) | undefined
    if (window.electronAPI.onCloseRequested) {
      removeCloseListener = window.electronAPI.onCloseRequested(() => {
        setShowCloseConfirm(true)
      })
    }

    return () => {
      if (typeof removeStateListener === 'function') removeStateListener()
      if (typeof removeTasksListener === 'function') removeTasksListener()
      if (typeof removeDistractionListener === 'function') removeDistractionListener()
      if (typeof removeSessionEndedListener === 'function') removeSessionEndedListener()
      if (typeof removeCloseListener === 'function') removeCloseListener()
    }
  }, [])

  const handleBulkDelete = () => {
    if (!isConfirmingBulk) {
      setIsConfirmingBulk(true)
      return
    }
    selectedTaskIds.forEach(id => deleteTask(id))
    setSelectedTaskIds([])
    setIsConfirmingBulk(false)
  }

  const renderView = () => {
    switch (activeView) {
      case 'today':
        return <TodayView />
      case 'upcoming':
        return <UpcomingView />
      case 'calendar':
        return <CalendarView />
      case 'project':
        return <ProjectView />
      case 'habits':
        return <HabitsView />
      case 'analytics':
        return <AnalyticsView />
      case 'circle':
        return <CirclePage />
      case 'settings':
        return <SettingsView />
      default:
        return <TodayView />
    }
  }

  const closeConfirmationDialog = (
    <AnimatePresence>
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4" id="close-confirm-overlay">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-sm bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden"
            id="close-confirm-dialog"
          >
            {/* Top ambient glow accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 opacity-80" />

            <div className="flex flex-col gap-4 text-center mt-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <X size={20} />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">
                  Confirm Exit
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {activeSessionId 
                    ? "You have an active focus session running. Quitting now will automatically complete and save your focus progress. Are you sure you want to exit completely?"
                    : "Are you sure you want to exit? Any unsaved edits will be lost and the background productivity monitor will close."}
                </p>
              </div>

              <div className="flex items-center gap-3.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseConfirm(false)}
                  className="flex-1 px-4 py-2 text-xs font-medium cursor-pointer bg-zinc-805 text-zinc-350 hover:bg-zinc-800 hover:text-white rounded-xl transition-all border border-zinc-800/30 active:scale-[0.98]"
                  id="close-confirm-cancel-btn"
                >
                  No, Stay
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.electronAPI.confirmExit) {
                      await window.electronAPI.confirmExit()
                    }
                  }}
                  className="flex-1 px-4 py-2 text-xs font-medium cursor-pointer bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all border border-purple-500/10 shadow-lg shadow-purple-900/10 active:scale-[0.98]"
                  id="close-confirm-yes-btn"
                >
                  Yes, Exit
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  if (recentFocusSummary) {
    const targetMins = recentFocusSummary.targetMinutes || recentFocusSummary.target_duration_mins || 25
    return (
      <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#09090b]" id="recent-focus-summary-wrapper">
        <PostSessionOverview 
          summary={recentFocusSummary}
          targetMinutes={targetMins}
          onClose={() => setRecentFocusSummary(null)}
        />
        {closeConfirmationDialog}
      </div>
    )
  }

  if (activeSessionId) {
    return (
      <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#09090b]" id="active-session-workspace-wrapper">
        <FocusWorkspaceView />
        {closeConfirmationDialog}
      </div>
    )
  }

  const currentScale = pageScales?.adjustAll
    ? pageScales.globalScale
    : (pageScales?.scales?.[activeView] ?? 1.0)

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Absolute top drag region for frameless window */}
      <div className="absolute top-0 left-0 w-full h-8 drag-region z-50 pointer-events-none" />
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        <div 
          className="flex-1 flex flex-col min-h-0 w-full overflow-hidden" 
          style={currentScale !== 1.0 ? { zoom: currentScale } : undefined}
          id="scaled-page-wrapper"
        >
          {renderView()}
        </div>

        {/* Compact Habit Bar */}
        {activeView !== 'habits' && (
          <CompactHabitBar />
        )}

        <AnimatePresence>
          {selectedTaskIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl shadow-2xl z-50"
            >
              <span className="text-sm font-medium pr-2 border-r border-[var(--border-default)]">
                {selectedTaskIds.length} selected
              </span>
              <button 
                onClick={handleBulkDelete}
                onMouseLeave={() => setIsConfirmingBulk(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs text-white rounded-lg transition-all border shrink-0",
                  isConfirmingBulk 
                    ? "bg-red-600 hover:bg-red-700 border-red-500 scale-102 font-semibold shadow-md" 
                    : "bg-red-500 hover:bg-red-600 border-transparent"
                )}
                id="bulk-delete-btn"
              >
                <Trash2 size={14} />
                <span>{isConfirmingBulk ? 'Confirm Bulk Delete?' : 'Delete'}</span>
              </button>
              <button 
                onClick={() => setSelectedTaskIds([])}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-md hover:bg-[var(--bg-hover)]"
                id="clear-selected-btn"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      {closeConfirmationDialog}
    </div>
  )
}

function CompactHabitBar() {
  const { habits, logs, checkIn, uncheckIn } = useHabits()
  const { projects } = useProjects()
  const todayStr = new Date().toLocaleDateString('en-CA')

  // Only show active habits in the compact bar (not paused)
  const activeHabits = habits.filter(h => h.is_paused === 0)

  if (activeHabits.length === 0) return null

  return (
    <div className="border-t border-[var(--border-default)] bg-zinc-950/80 backdrop-blur-md px-6 py-2.5 flex items-center justify-between gap-4 shrink-0 transition-all select-none" id="compact-habit-bar">
      <div className="flex items-center gap-1.5 shrink-0 text-zinc-405">
        <Sparkles size={13} className="text-purple-400 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Today's Habits:</span>
      </div>

      <div className="flex-1 flex items-center gap-4 overflow-x-auto scrollbar-none py-1">
        {activeHabits.map((habit) => {
          const isDone = logs.some(l => l.habit_id === habit.id && l.date === todayStr)
          const mappedProject = projects.find(p => p.id === habit.project_id)

          return (
            <div 
              key={habit.id} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs shrink-0 ${
                isDone 
                  ? 'bg-purple-950/20 border-purple-500/20 text-zinc-300'
                  : 'bg-zinc-900/30 border-zinc-850 text-zinc-400 hover:border-zinc-800'
              }`}
              id={`compact-habit-item-${habit.id}`}
            >
              {/* Tap toggle trigger */}
              <button
                onClick={() => {
                  if (isDone) {
                    uncheckIn(habit.id, todayStr)
                  } else {
                    checkIn(habit.id, todayStr)
                  }
                }}
                className={`w-4 h-4 rounded-md cursor-pointer transition-all flex items-center justify-center border ${
                  isDone 
                    ? 'bg-purple-600 border-purple-500 text-white shadow-sm' 
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
                title={isDone ? 'Checked! Click to undo' : 'Click to check in'}
                id={`compact-check-${habit.id}`}
              >
                {isDone && <Check size={10} className="stroke-[3px]" />}
              </button>

              <span className={`font-semibold text-[11px] leading-none ${isDone ? 'line-through opacity-50' : ''}`}>
                {habit.name}
              </span>

              {/* Project tiny dot indicator */}
              {mappedProject && (
                <span 
                  className="w-1.5 h-1.5 rounded-full shrink-0" 
                  style={{ backgroundColor: mappedProject.color }} 
                  title={`Project: ${mappedProject.name}`}
                />
              )}

              {/* Flame active streak */}
              {habit.current_streak > 0 && (
                <span className="flex items-center text-[10px] text-orange-400 font-bold ml-0.5" title={`${habit.current_streak} days streak!`}>
                  <Flame size={11} className="fill-orange-400/10 shrink-0" />
                  <span>{habit.current_streak}</span>
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
