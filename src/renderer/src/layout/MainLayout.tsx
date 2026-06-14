import { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TodayView } from '../pages/TodayView'
import { UpcomingView } from '../pages/UpcomingView'
import { ProjectView } from '../pages/ProjectView'
import { FocusWorkspaceView } from '../pages/FocusWorkspaceView'
import { SettingsView } from '../pages/SettingsView'
import { AnalyticsView } from './AnalyticsView'
import { PostSessionOverview } from '../components/tasks/PostSessionOverview'
import { useAppStore } from '../store/useAppStore'
import { useTasks } from '../hooks/useTasks'
import { Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

export function MainLayout() {
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

  useEffect(() => {
    if (!window.electronAPI) return

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

    return () => {
      if (typeof removeStateListener === 'function') removeStateListener()
      if (typeof removeTasksListener === 'function') removeTasksListener()
      if (typeof removeDistractionListener === 'function') removeDistractionListener()
      if (typeof removeSessionEndedListener === 'function') removeSessionEndedListener()
    }
  }, [])

  const handleBulkDelete = () => {
    selectedTaskIds.forEach(id => deleteTask(id))
    setSelectedTaskIds([])
  }

  const renderView = () => {
    switch (activeView) {
      case 'today':
        return <TodayView />
      case 'upcoming':
        return <UpcomingView />
      case 'project':
        return <ProjectView />
      case 'habits':
        return (
          <div className="flex-1 flex items-center justify-center p-8 text-[var(--text-muted)] italic select-none text-xs sm:text-sm h-full" id="habits-coming-soon">
            Habits · Coming in Phase 4
          </div>
        )
      case 'analytics':
        return <AnalyticsView />
      case 'circle':
        return (
          <div className="flex-1 flex items-center justify-center p-8 text-[var(--text-muted)] italic select-none text-xs sm:text-sm h-full" id="circle-coming-soon">
            Circle · Coming in Phase 6
          </div>
        )
      case 'settings':
        return <SettingsView />
      default:
        return <TodayView />
    }
  }

  if (recentFocusSummary) {
    const targetMins = recentFocusSummary.targetMinutes || recentFocusSummary.target_duration_mins || 25
    return (
      <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#09090b]" id="recent-focus-summary-wrapper">
        <PostSessionOverview 
          summary={recentFocusSummary}
          targetMinutes={targetMins}
          onClose={() => setRecentFocusSummary(null)}
        />
      </div>
    )
  }

  if (activeSessionId) {
    return (
      <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#09090b]" id="active-session-workspace-wrapper">
        <FocusWorkspaceView />
      </div>
    )
  }

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Absolute top drag region for frameless window */}
      <div className="absolute top-0 left-0 w-full h-8 drag-region z-50 pointer-events-none" />
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        {renderView()}

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
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
              <button 
                onClick={() => setSelectedTaskIds([])}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-md hover:bg-[var(--bg-hover)]"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
