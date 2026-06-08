import { Sidebar } from './Sidebar'
import { TodayView } from '../pages/TodayView'
import { UpcomingView } from '../pages/UpcomingView'
import { ProjectView } from '../pages/ProjectView'
import { useAppStore } from '../store/useAppStore'
import { useTasks } from '../hooks/useTasks'
import { Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

export function MainLayout() {
  const activeView = useAppStore(state => state.activeView)
  const selectedTaskIds = useAppStore(state => state.selectedTaskIds)
  const setSelectedTaskIds = useAppStore(state => state.setSelectedTaskIds)
  const { deleteTask } = useTasks()

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
        return (
          <div className="flex-1 flex items-center justify-center p-8 text-[var(--text-muted)] italic select-none text-xs sm:text-sm h-full" id="analytics-coming-soon">
            Analytics · Coming in Phase 5
          </div>
        )
      case 'circle':
        return (
          <div className="flex-1 flex items-center justify-center p-8 text-[var(--text-muted)] italic select-none text-xs sm:text-sm h-full" id="circle-coming-soon">
            Circle · Coming in Phase 6
          </div>
        )
      case 'settings':
        return (
          <div className="flex-1 flex items-center justify-center p-8 text-[var(--text-muted)] italic select-none text-xs sm:text-sm h-full" id="settings-coming-soon">
            Settings · Coming soon
          </div>
        )
      default:
        return <TodayView />
    }
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
