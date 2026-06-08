import { useMemo } from 'react'
import { format, addDays } from 'date-fns'
import { useTasks } from '../hooks/useTasks'
import { TaskSection } from '../components/tasks/TaskSection'
import { Task } from '../types'

export function UpcomingView() {
  const { tasks, isLoading, error } = useTasks()

  const tomorrowStr = useMemo(() => {
    return format(addDays(new Date(), 1), 'yyyy-MM-dd')
  }, [])

  // Group by date
  const groupedTasks = useMemo(() => {
    let sourceTasks = tasks
    if (!window.electronAPI) {
      const d = new Date()
      const formatLocalStr = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      const todayStr = formatLocalStr(d)
      d.setDate(d.getDate() + 7)
      const endStr = formatLocalStr(d)
      sourceTasks = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date > todayStr && t.due_date <= endStr)
    }

    const groups: Record<string, Task[]> = {}
    sourceTasks.forEach(t => {
      if (!t.due_date) return
      if (!groups[t.due_date]) groups[t.due_date] = []
      groups[t.due_date].push(t)
    })
    
    // Sort keys alphabetically
    return Object.keys(groups).sort().map(date => ({
      date,
      tasks: groups[date]
    }))
  }, [tasks])

  return (
    <div className="flex-1 overflow-y-auto px-8 relative outline-none custom-scrollbar" id="upcoming-view-container">
      <div className="max-w-2xl w-full mx-auto h-full pt-16 pb-20" id="upcoming-view-content">
        
        {/* Header */}
        <header className="mb-8 select-none" id="upcoming-view-header">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1" id="upcoming-view-title">Upcoming</h1>
          <p className="text-[var(--text-secondary)] text-sm" id="upcoming-view-subtitle">Next 7 days</p>
        </header>

        {error && (
          <div className="p-4 bg-[var(--color-overdue)]/10 border border-[var(--color-overdue)]/20 text-[var(--color-overdue)] rounded-xl text-sm mb-6" id="upcoming-view-error">
            <strong>Backend Error:</strong> {error}
          </div>
        )}

        {/* Sections */}
        {isLoading ? (
          <div className="space-y-4 mt-8" id="upcoming-view-loading">
            <div className="h-12 w-full rounded-xl bg-[var(--bg-elevated)] opacity-50 animate-pulse"></div>
            <div className="h-12 w-full rounded-xl bg-[var(--bg-elevated)] opacity-40 animate-pulse"></div>
          </div>
        ) : (
          <div id="upcoming-view-list">
            {tasks.length === 0 ? (
               <div className="text-center mt-12 text-[var(--text-muted)] text-sm italic select-none" id="upcoming-view-empty">
                 No upcoming tasks for the next 7 days.
               </div>
            ) : (
               groupedTasks.map(group => {
                 let formattedTitle = "Tomorrow"
                 if (group.date !== tomorrowStr) {
                   const [year, month, day] = group.date.split('-').map(Number)
                   const d = new Date(year, month - 1, day)
                   formattedTitle = format(d, "EEEE, MMMM d")
                 }
                 return (
                   <TaskSection 
                     key={group.date}
                     title={formattedTitle} 
                     tasks={group.tasks} 
                     accentColor="var(--text-secondary)" 
                     defaultOpen 
                   />
                 )
               })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
