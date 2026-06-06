import { Sidebar } from './Sidebar'
import { TodayView } from '../pages/TodayView'
import { UpcomingView } from '../pages/UpcomingView'
import { ProjectView } from '../pages/ProjectView'
import { useAppStore } from '../store/useAppStore'

export function MainLayout() {
  const activeView = useAppStore(state => state.activeView)

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
      </main>
    </div>
  )
}
