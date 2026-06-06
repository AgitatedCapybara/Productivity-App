import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { useTasks } from '../hooks/useTasks'
import { QuickAdd } from '../components/tasks/QuickAdd'
import { TaskSection } from '../components/tasks/TaskSection'
import { Task } from '../types'

export function UpcomingView() {
  const { tasks, isLoading, error } = useTasks()
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const futureTasks = useMemo(() => {
    return tasks.filter(t => t.due_date && t.due_date > todayStr)
  }, [tasks, todayStr])

  // Group by date
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {}
    futureTasks.forEach(t => {
      if (!t.due_date) return
      if (!groups[t.due_date]) groups[t.due_date] = []
      groups[t.due_date].push(t)
    })
    
    // Sort keys alphabetically
    return Object.keys(groups).sort().map(date => ({
      date,
      tasks: groups[date]
    }))
  }, [futureTasks])

  return (
    <div className="flex-1 overflow-y-auto px-8 relative outline-none custom-scrollbar">
      <div className="max-w-2xl w-full mx-auto h-full pt-16 pb-20">
        
        {/* Header */}
        <header className="mb-8 select-none">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">Upcoming</h1>
          <p className="text-[var(--text-secondary)] text-sm">Future scheduled tasks</p>
        </header>

        {error && (
          <div className="p-4 bg-[var(--color-overdue)]/10 border border-[var(--color-overdue)]/20 text-[var(--color-overdue)] rounded-xl text-sm mb-6">
            <strong>Backend Error:</strong> {error}
          </div>
        )}

        {/* Input */}
        <QuickAdd />

        {/* Sections */}
        {isLoading ? (
          <div className="space-y-4 mt-8">
            <div className="h-12 w-full rounded-xl bg-[var(--bg-elevated)] opacity-50 animate-pulse"></div>
            <div className="h-12 w-full rounded-xl bg-[var(--bg-elevated)] opacity-40 animate-pulse"></div>
          </div>
        ) : (
          <>
            {groupedTasks.length === 0 ? (
               <div className="text-center mt-12 text-[var(--text-muted)] text-sm italic select-none">
                 No upcoming tasks found.
               </div>
            ) : (
               groupedTasks.map(group => (
                 <TaskSection 
                   key={group.date}
                   title={format(parseISO(group.date), "EEEE, MMMM d")} 
                   tasks={group.tasks} 
                   accentColor="var(--text-secondary)" 
                   defaultOpen 
                 />
               ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
