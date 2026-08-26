import { useEffect, useState, memo, ComponentType } from 'react'
import { Sidebar } from './Sidebar'
import { TodayView } from '../pages/TodayView'
import { UpcomingView } from '../pages/UpcomingView'
import { ProjectView } from '../pages/ProjectView'
import { FocusWorkspaceView } from '../pages/FocusWorkspaceView'
import { SettingsView } from '../pages/SettingsView'
import { AnalyticsView } from './AnalyticsView'
import { HabitsView } from '../pages/HabitsView'
import { DeepWorkView } from '../pages/DeepWorkView'
import { CalendarView } from '../pages/CalendarView'
import { PlanView } from '../pages/PlanView'
import { CirclePage } from '../pages/Circle/CirclePage'
import { NotesView } from '../pages/NotesView'
import { ViewsView } from '../pages/ViewsView'
import { InboxView } from '../pages/InboxView'
import { Shortcuts } from '../components/help/Shortcuts'
import { KeyboardShortcutsOverlay } from '../components/KeyboardShortcutsOverlay'
import { PostSessionOverview } from '../components/tasks/PostSessionOverview'
import { SearchPalette } from '../components/search/SearchPalette'
import { CommandBar } from '../components/command/CommandBar'
import { MorningPlan } from '../components/rituals/MorningPlan'
import { EveningShutdown } from '../components/rituals/EveningShutdown'
import { TaskEditContextBox } from '../components/tasks/TaskEditContextBox'
import { CelebrationOverlay } from '../components/CelebrationOverlay'
import { useCelebrationStore } from '../store/useCelebrationStore'
import { useAppStore } from '../store/useAppStore'
import { overlaySlide } from '../lib/motion-tokens'
import { useTasks } from '../hooks/useTasks'
import { useHabits } from '../hooks/useHabits'
import { useProjects } from '../hooks/useProjects'
import { Trash2, X, Sparkles, Flame, Check } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '../lib/utils'

const MemoizedView = memo(({ Component }: { Component: ComponentType<any> }) => {
  return <Component />
})

export function MainLayout() {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [isConfirmingBulk, setIsConfirmingBulk] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showCommandBar, setShowCommandBar] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const activeView = useAppStore(state => state.activeView)
  const setActiveView = useAppStore(state => state.setActiveView)
  const selectedTaskIds = useAppStore(state => state.selectedTaskIds)
  const setSelectedTaskIds = useAppStore(state => state.setSelectedTaskIds)
  const { deleteTask } = useTasks()

  const activeSessionId = useAppStore(state => state.activeSessionId)
  const setActiveSession = useAppStore(state => state.setActiveSession)
  const setActiveTaskId = useAppStore(state => state.setActiveTaskId)
  const setSessionDistractionCount = useAppStore(state => state.setSessionDistractionCount)
  const setSessionElapsedSeconds = useAppStore(state => state.setSessionElapsedSeconds)
  const setSessionTargetDurationMins = useAppStore(state => state.setSessionTargetDurationMins)
  const recentFocusSummary = useAppStore(state => state.recentFocusSummary)
  const setRecentFocusSummary = useAppStore(state => state.setRecentFocusSummary)
  const pageScales = useAppStore(state => state.pageScales)
  const setPageScales = useAppStore(state => state.setPageScales)
  const showMorningPlan = useAppStore(state => state.showMorningPlan)
  const showEveningShutdown = useAppStore(state => state.showEveningShutdown)
  const setShortcutsOpen = useAppStore(state => state.setShortcutsOpen)
  const toggleSidebar = useAppStore(state => state.toggleSidebar)
  const sidebarCollapsed = useAppStore(state => state.sidebarCollapsed)
  const sidebarExpanded = useAppStore(state => state.sidebarExpanded)
  const inspectorVisible = useAppStore(state => state.inspectorVisible)
  const toggleInspector = useAppStore(state => state.toggleInspector)

  const featureVisibility = useAppStore(state => state.featureVisibility)
  const selectedProjectId = useAppStore(state => state.selectedProjectId)
  const [visibleViews, setVisibleViews] = useState<Record<string, boolean>>({
    today: true,
    upcoming: true,
    calendar: true,
    plan: true,
    habits: true,
    notes: true,
    views: true,
    analytics: true,
    deepwork: true,
    circle: true,
    inbox: true
  })

  useEffect(() => {
    const loadPreferences = async () => {
      const keys = ['today', 'upcoming', 'calendar', 'plan', 'habits', 'notes', 'views', 'analytics', 'deepwork', 'circle', 'inbox']
      const updated: Record<string, boolean> = {}

      for (const key of keys) {
        if (window.electronAPI && window.electronAPI.getSetting) {
          try {
            const val = await window.electronAPI.getSetting(`sidebar.view.${key}`, 'true')
            updated[key] = val !== 'false'
          } catch (e) {
            updated[key] = localStorage.getItem(`sidebar.view.${key}`) !== 'false'
          }
        } else {
          updated[key] = localStorage.getItem(`sidebar.view.${key}`) !== 'false'
        }
      }
      setVisibleViews(updated)
    }

    loadPreferences()
    const pollInterval = setInterval(loadPreferences, 1500)
    return () => clearInterval(pollInterval)
  }, [])

  useEffect(() => {
    let lastKey = ''
    let lastKeyTime = 0

    const handleShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isEditable = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable || 
        target.closest('.no-keyboard-nav') !== null
      )

      if (isEditable) return

      if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === 'k') {
        e.preventDefault()
        setShowCommandBar(prev => !prev)
        return
      } else if (e.key === '?' && !isEditable) {
        e.preventDefault()
        setShortcutsOpen(!useAppStore.getState().isShortcutsOpen)
        return
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.key === '?')) {
        e.preventDefault()
        setShortcutsOpen(!useAppStore.getState().isShortcutsOpen)
        return
      } else if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault()
        toggleSidebar()
        return
      } else if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === 'i') {
        e.preventDefault()
        toggleInspector()
        return
      }

      // Mnemonic navigation routes: G -> T, G -> D, G -> V
      const now = Date.now()
      const key = e.key.toLowerCase()

      if (lastKey === 'g' && now - lastKeyTime < 1000) {
        if (key === 't') {
          e.preventDefault()
          e.stopPropagation()
          useAppStore.getState().setActiveView('today')
          lastKey = ''
          return
        } else if (key === 'd') {
          e.preventDefault()
          e.stopPropagation()
          useAppStore.getState().setActiveView('deepwork')
          lastKey = ''
          return
        } else if (key === 'v') {
          e.preventDefault()
          e.stopPropagation()
          useAppStore.getState().setActiveView('views')
          lastKey = ''
          return
        }
      }

      if (key === 'g') {
        lastKey = 'g'
        lastKeyTime = now
      } else {
        lastKey = ''
      }
    }
    window.addEventListener('keydown', handleShortcut, true)
    return () => window.removeEventListener('keydown', handleShortcut, true)
  }, [toggleSidebar, toggleInspector])

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
        setSessionElapsedSeconds(0)
        setSessionDistractionCount(0)
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
          setSessionElapsedSeconds(0)
          setSessionDistractionCount(0)
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
          setSessionElapsedSeconds(0)

          // Trigger visual celebration side-effect
          const celebType = Math.random() < 0.5 ? 'confetti' : 'balloons'
          useCelebrationStore.getState().triggerCelebration(celebType)
        })
      : null

    // 4.1 Session Tick & Stopped Listeners
    const removeTickListener = window.electronAPI.onSessionTick
      ? window.electronAPI.onSessionTick((data) => {
          setSessionElapsedSeconds(data.seconds)
          setSessionDistractionCount(data.distractionCount)
          if (data.targetDurationMins) {
            setSessionTargetDurationMins(data.targetDurationMins)
          }
        })
      : null

    const removeSessionStoppedListener = window.electronAPI.onSessionStopped
      ? window.electronAPI.onSessionStopped(() => {
          setSessionElapsedSeconds(0)
        })
      : null

    // 5. Native Close requested from titlebar X button
    let removeCloseListener: (() => void) | undefined
    if (window.electronAPI.onCloseRequested) {
      removeCloseListener = window.electronAPI.onCloseRequested(() => {
        setShowCloseConfirm(true)
      })
    }

    // 6. Automatic Ritual Triggers Check
    let eveningIntervalId: any = null
    const checkAutomaticRituals = async () => {
      if (!window.electronAPI) return

      const todayStr = new Date().toLocaleDateString('en-CA')

      try {
        // Load preferences
        const prefs = await window.electronAPI.getSchedulingPreferences()
        const quietModeUntil = prefs['rituals.quiet_mode_until'] || ''

        // Check quiet mode boundary
        if (quietModeUntil && new Date() < new Date(quietModeUntil)) {
          console.log('[Rituals] Quiet mode active, skipping automated triggers.')
          return
        }

        // Check logs for today
        const logs = await window.electronAPI.getRitualEntriesByDate(todayStr)
        const hasMorningLog = logs.some((l: any) => l.type === 'morning')
        const hasEveningLog = logs.some((l: any) => l.type === 'evening')

        // Auto-trigger Morning Plan
        const morningEnabled = prefs['rituals.morning.enabled'] !== 'false'
        const morningAuto = prefs['rituals.morning.autotrigger'] !== 'false'
        if (morningEnabled && morningAuto && !hasMorningLog) {
          console.log('[Rituals] Auto-triggering Morning Plan...')
          useAppStore.getState().setShowMorningPlan(true)
        }

        // Set up timer check for Evening Shutdown
        const eveningEnabled = prefs['rituals.evening.enabled'] !== 'false'
        const eveningAuto = prefs['rituals.evening.autotrigger'] !== 'false'
        const eveningTime = prefs['rituals.evening.time'] || '18:00'

        if (eveningEnabled && eveningAuto && !hasEveningLog) {
          eveningIntervalId = setInterval(() => {
            const now = new Date()
            const currentHourMins = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
            if (currentHourMins >= eveningTime) {
              console.log('[Rituals] Auto-triggering Evening Shutdown at', currentHourMins)
              useAppStore.getState().setShowEveningShutdown(true)
              if (eveningIntervalId) clearInterval(eveningIntervalId)
            }
          }, 30000) // check every 30 seconds
        }
      } catch (err) {
        console.error('[Rituals] Automated check failed:', err)
      }
    }

    checkAutomaticRituals()

    return () => {
      if (typeof removeStateListener === 'function') removeStateListener()
      if (typeof removeTasksListener === 'function') removeTasksListener()
      if (typeof removeDistractionListener === 'function') removeDistractionListener()
      if (typeof removeSessionEndedListener === 'function') removeSessionEndedListener()
      if (typeof removeTickListener === 'function') removeTickListener()
      if (typeof removeSessionStoppedListener === 'function') removeSessionStoppedListener()
      if (typeof removeCloseListener === 'function') removeCloseListener()
      if (eveningIntervalId) clearInterval(eveningIntervalId)
    }
  }, [])

  // Robust local web-fallback ticker for testing/preview environments (when onSessionTick is not available)
  useEffect(() => {
    if (!activeSessionId) {
      setSessionElapsedSeconds(0)
      return
    }

    if (!window.electronAPI || !window.electronAPI.onSessionTick) {
      setSessionElapsedSeconds(0) // Reset elapsed on start
      
      const interval = setInterval(() => {
        const currentElapsed = useAppStore.getState().activeSessionElapsedSeconds
        setSessionElapsedSeconds(currentElapsed + 1)
      }, 1000)

      return () => {
        clearInterval(interval)
      }
    }
    return undefined
  }, [activeSessionId, setSessionElapsedSeconds])

  const handleBulkDelete = () => {
    if (!isConfirmingBulk) {
      setIsConfirmingBulk(true)
      return
    }
    selectedTaskIds.forEach(id => deleteTask(id))
    setSelectedTaskIds([])
    setIsConfirmingBulk(false)
  }

  const isSessionActive = !!activeSessionId

  const isViewVisible = (viewId: string) => {
    if (featureVisibility) {
      if (viewId === 'today' && !featureVisibility.todayView) return false
      if (viewId === 'deepwork' && !featureVisibility.focusTimer) return false
      if (viewId === 'views' && !featureVisibility.notesBoard) return false
      if (viewId === 'notes' && !featureVisibility.notesBoard) return false
      if (viewId === 'analytics' && !featureVisibility.wellnessAnalytics) return false
      if (viewId === 'habits' && !featureVisibility.habitTracking) return false
      if (viewId === 'plan' && !featureVisibility.aiSuggestions) return false
    }
    if (visibleViews[viewId] === false) return false
    return true
  }

  const sectionsToRender = ([
    { id: 'today', Component: TodayView },
    { id: 'calendar', Component: CalendarView },
    { id: 'upcoming', Component: UpcomingView },
    { id: 'plan', Component: PlanView },
    { id: 'deepwork', Component: isSessionActive ? FocusWorkspaceView : DeepWorkView },
    { id: 'habits', Component: HabitsView },
    { id: 'analytics', Component: AnalyticsView },
    { id: 'inbox', Component: InboxView },
    { id: 'notes', Component: NotesView },
    { id: 'views', Component: ViewsView },
    { id: 'circle', Component: CirclePage },
    { id: 'settings', Component: SettingsView },
    selectedProjectId ? { id: 'project', Component: ProjectView } : null
  ].filter(Boolean) as { id: string; Component: ComponentType<any> }[]).filter(item => isViewVisible(item.id))

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
                    // Close all active local dialogs/overlays
                    setShowCloseConfirm(false)
                    setShowSearch(false)
                    setShowCommandBar(false)
                    setShowShortcuts(false)
                    
                    // Reset global state dialogs in the store
                    const store = useAppStore.getState()
                    store.setQuickAddOpen(false)
                    store.setShortcutsOpen(false)
                    store.setShowMorningPlan(false)
                    store.setShowEveningShutdown(false)
                    store.setKeyboardDetailsPeekOpen(false)
                    store.setEditingTaskId(null)

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
          onClose={() => {
            setRecentFocusSummary(null)
            setActiveView('analytics')
          }}
        />
        {closeConfirmationDialog}
      </div>
    )
  }

  const currentScale = pageScales?.adjustAll
    ? pageScales.globalScale
    : (pageScales?.scales?.[activeView] ?? 1.0)

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] min-w-[1280px] min-h-[800px]">
      {/* Absolute top drag region for frameless window */}
      <div className="absolute top-0 left-0 w-full h-8 drag-region z-50 pointer-events-none" />
      
      {/* Sidebar zone - dynamic width depending on expanded or collapsed state */}
      <motion.div
        animate={{ 
          width: sidebarCollapsed ? 0 : (sidebarExpanded ? 208 : 60),
          opacity: sidebarCollapsed ? 0 : 1 
        }}
        transition={overlaySlide}
        style={{ pointerEvents: 'auto' }}
        className="h-full flex-shrink-0 overflow-hidden border-r border-[var(--color-border-default)] bg-[var(--bg-surface)] flex flex-col"
        id="sidebar-zone-wrapper"
      >
        <Sidebar />
      </motion.div>
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        <div 
          className="flex-1 w-full h-full relative overflow-hidden" 
          style={currentScale !== 1.0 ? { 
            transform: `scale(${currentScale})`, 
            transformOrigin: 'top left', 
            width: `${100 / currentScale}%`, 
            height: `${100 / currentScale}%` 
          } : undefined}
          id="dashboard-viewport"
        >
          {sectionsToRender.map((sec) => {
            const isVisible = activeView === sec.id
            const Component = sec.Component
            return (
              <div
                key={sec.id}
                id={`section-${sec.id}`}
                className={cn(
                  "w-full h-full absolute inset-0 flex flex-col overflow-hidden transform-gpu transition-all duration-200 ease-in-out",
                  isVisible ? "opacity-100 scale-100 pointer-events-auto z-10 visible" : "opacity-0 scale-[0.99] pointer-events-none z-0 invisible"
                )}
              >
                <MemoizedView Component={Component} />
              </div>
            )
          })}
        </div>

        {/* Compact Habit Bar - fades out during active focus session */}
        <AnimatePresence>
          {activeView !== 'habits' && !isSessionActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
              id="compact-habit-bar-anim-wrapper"
            >
              <CompactHabitBar />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedTaskIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl shadow-2xl z-50"
            >
              <span className="text-sm font-medium pr-2 border-r border-[var(--border-default)]">
                {selectedTaskIds.length} selected
              </span>
              <button 
                onClick={handleBulkDelete}
                onMouseLeave={() => setIsConfirmingBulk(false)}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 rounded-lg transition-all border shrink-0 text-xs min-h-10 min-w-10",
                  isConfirmingBulk 
                    ? "bg-red-650 hover:bg-red-700 border-red-500 scale-102 font-semibold shadow-md text-white" 
                    : "bg-red-950/20 hover:bg-red-900/40 text-red-400 border-red-900/60"
                )}
                id="bulk-delete-btn"
              >
                <Trash2 size={14} />
                <span>{isConfirmingBulk ? 'Confirm Bulk Delete?' : 'Delete'}</span>
              </button>
              <button 
                onClick={() => setSelectedTaskIds([])}
                className="w-10 h-10 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-md hover:bg-[var(--bg-hover)] ml-4 shrink-0"
                id="clear-selected-btn"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Optional Inspector zone */}
      <AnimatePresence>
        {inspectorVisible && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={overlaySlide}
            className="h-full flex-shrink-0 overflow-hidden border-l border-[var(--color-border-default)] bg-[var(--color-surface-primary)] flex flex-col"
            id="inspector-zone-wrapper"
          >
            <div className="w-[240px] h-full flex flex-col p-4 relative text-[var(--color-text-primary)]">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--color-border-default)]">
                <span className="text-[12px] uppercase font-bold tracking-widest text-zinc-400 font-sans">Inspector</span>
                <button
                  onClick={toggleInspector}
                  className="p-1.5 hover:bg-zinc-850/60 rounded-md text-[var(--color-text-secondary)] hover:text-white transition-colors cursor-pointer"
                  id="close-inspector-btn"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                <div className="p-3 bg-zinc-900/50 rounded-xl border border-[var(--color-border-default)]">
                  <h4 className="font-semibold text-[13px] text-zinc-100 mb-1.5 font-sans">Context & Focus</h4>
                  <p>Enforce active blocking over passive reminders to secure long-term focus protection.</p>
                </div>
                <div className="p-3 bg-zinc-900/50 rounded-xl border border-[var(--color-border-default)]">
                  <h4 className="font-semibold text-[13px] text-zinc-100 mb-1.5 font-sans">Behavioral Science</h4>
                  <p>Spatial consistency preserves muscle memory. Avoid reflowing layouts.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {closeConfirmationDialog}
      <AnimatePresence>
        {showSearch && (
          <SearchPalette isOpen={showSearch} onClose={() => setShowSearch(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCommandBar && (
          <CommandBar isOpen={showCommandBar} onClose={() => setShowCommandBar(false)} />
        )}
      </AnimatePresence>
      <Shortcuts isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <KeyboardShortcutsOverlay />

      {/* Ritual Overlays */}
      {showMorningPlan && <MorningPlan />}
      {showEveningShutdown && <EveningShutdown />}

      {/* Task Overhaul Edit Context Overlay */}
      <TaskEditContextBox />

      {/* Global Celebration Engine Overlay */}
      <CelebrationOverlay />
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
    <div className="border-t border-[var(--border-default)] bg-zinc-950/90 backdrop-blur-md px-6 py-3.5 md:py-4 flex items-center justify-between gap-6 shrink-0 transition-all select-none" id="compact-habit-bar">
      <div className="flex items-center gap-2 shrink-0 text-zinc-300">
        <Sparkles size={15} className="text-indigo-400 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-250">Today's Habits:</span>
      </div>

      <div className="flex-1 flex items-center gap-3.5 overflow-x-auto scrollbar-none py-1.5">
        {activeHabits.map((habit) => {
          const isDone = logs.some(l => l.habit_id === habit.id && l.date === todayStr)
          const mappedProject = projects.find(p => p.id === habit.project_id)

          return (
            <div 
              key={habit.id} 
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all text-sm shrink-0 shadow-sm ${
                isDone 
                  ? 'bg-purple-950/25 border-purple-500/30 text-zinc-200'
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
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
                className={`w-5.5 h-5.5 rounded-lg cursor-pointer transition-all flex items-center justify-center border ${
                  isDone 
                    ? 'bg-purple-600 border-purple-500 text-white shadow-md scale-105' 
                    : 'bg-zinc-950 border-zinc-750 hover:border-zinc-650'
                }`}
                title={isDone ? 'Checked! Click to undo' : 'Click to check in'}
                id={`compact-check-${habit.id}`}
              >
                {isDone && <Check size={11} className="stroke-[3.5px]" />}
              </button>

              <span className={`font-semibold text-xs leading-none tracking-wide ${isDone ? 'line-through opacity-50' : ''}`}>
                {habit.name}
              </span>

              {/* Project tiny dot indicator */}
              {mappedProject && (
                <span 
                  className="w-2 h-2 rounded-full shrink-0 shadow-sm" 
                  style={{ backgroundColor: mappedProject.color }} 
                  title={`Project: ${mappedProject.name}`}
                />
              )}

              {/* Flame active streak */}
              {habit.current_streak > 0 && (
                <span className="flex items-center text-xs text-orange-400 font-bold ml-0.5 gap-0.5" title={`${habit.current_streak} days streak!`}>
                  <Flame size={13} className="fill-orange-400/15 shrink-0" />
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
