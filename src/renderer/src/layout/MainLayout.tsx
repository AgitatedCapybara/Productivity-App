import { Sidebar } from './Sidebar'
import { TodayView } from '../pages/TodayView'
import { UpcomingView } from '../pages/UpcomingView'
import { ProjectView } from '../pages/ProjectView'
import { useAppStore } from '../store/useAppStore'

export function MainLayout() {
  const activeView = useAppStore(state => state.activeView)

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Absolute top drag region for frameless window */}
      <div className="absolute top-0 left-0 w-full h-8 drag-region z-50 pointer-events-none" />
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        {activeView === 'today' && <TodayView />}
        {activeView === 'upcoming' && <UpcomingView />}
        {activeView === 'project' && <ProjectView />}
        {activeView === 'habits' && <div className="p-16 flex items-center justify-center text-[var(--text-muted)] italic">Habits view coming soon...</div>}
        {activeView === 'network' && <div className="p-16 flex items-center justify-center text-[var(--text-muted)] italic">Network view coming soon...</div>}
        {activeView === 'settings' && <div className="p-16 flex items-center justify-center text-[var(--text-muted)] italic">Settings view coming soon...</div>}
      </main>
    </div>
  )
}
