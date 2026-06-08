import { useMemo, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useTasks } from '../hooks/useTasks'
import { QuickAdd } from '../components/tasks/QuickAdd'
import { TaskSection } from '../components/tasks/TaskSection'

export function TodayView() {
  const { tasks, completedTasks, isLoading, error } = useTasks()
  const [todaySessions, setTodaySessions] = useState<any[]>([])

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.getTodaySessions) {
      window.electronAPI.getTodaySessions().then(setTodaySessions).catch(console.error)
    }
  }, [])

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

  return (
    <div className="flex-1 overflow-y-auto px-8 relative outline-none custom-scrollbar">
      <div className="max-w-2xl w-full mx-auto h-full pt-16 pb-20">
        
        {/* Header */}
        <header className="mb-8 select-none">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">Today</h1>
          <p className="text-[var(--text-secondary)] text-sm">{format(new Date(), "EEEE, MMMM d")}</p>
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
        <QuickAdd />

        {/* Sections */}
        {isLoading ? (
          <div className="space-y-4 mt-8">
            <div className="h-12 w-full rounded-xl bg-[var(--bg-elevated)] opacity-50 animate-pulse"></div>
            <div className="h-12 w-full rounded-xl bg-[var(--bg-elevated)] opacity-40 animate-pulse"></div>
            <div className="h-12 w-full rounded-xl bg-[var(--bg-elevated)] opacity-30 animate-pulse"></div>
            <div className="h-12 w-full rounded-xl bg-[var(--bg-elevated)] opacity-20 animate-pulse"></div>
          </div>
        ) : (
          <>
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

            {todaySessions.length > 0 && (
              <div className="mt-8 mb-4">
                <h3 className="text-sm font-semibold tracking-tight text-[var(--text-secondary)] mb-3 select-none flex items-center gap-2">
                  Today's Sessions
                </h3>
                <div className="space-y-2">
                  {todaySessions.map((session, i) => (
                    <div key={session.id || i} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                      <span className="text-[var(--text-primary)] font-medium truncate max-w-[50%]">
                        {session.task_title || (tasks.find(t => t.id === session.task_id)?.title) || 'Focus Session'}
                      </span>
                      <span className="text-[var(--text-secondary)] text-xs">
                        {session.duration_mins || 0}m · {session.distraction_count || 0} distractions
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tasks.length === 0 && window.electronAPI && (
              <div className="text-center mt-12 text-[var(--text-muted)] text-sm italic select-none">
                No tasks found. Begin your focus session by adding one above.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
