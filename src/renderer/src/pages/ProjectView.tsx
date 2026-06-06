import { useTasks } from '../hooks/useTasks'
import { useAppStore } from '../store/useAppStore'
import { QuickAdd } from '../components/tasks/QuickAdd'
import { TaskSection } from '../components/tasks/TaskSection'

export function ProjectView() {
  const { tasks, completedTasks, isLoading, error } = useTasks()
  const selectedProjectId = useAppStore(state => state.selectedProjectId)
  const projects = useAppStore(state => state.projects)
  const project = projects.find(p => p.id === selectedProjectId)

  if (!project) return null

  // Filter tasks by project ID to ensure absolute separation (e.g. Work vs. Personal vs. Inbox)
  const incomplete = tasks.filter(t => {
    if (t.status !== 'todo') return false
    if (selectedProjectId === 'inbox-default') {
      return t.project_id === 'inbox-default' || t.project_id === null
    }
    return t.project_id === selectedProjectId
  })

  const completed = completedTasks.filter(t => {
    if (selectedProjectId === 'inbox-default') {
      return t.project_id === 'inbox-default' || t.project_id === null
    }
    return t.project_id === selectedProjectId
  })

  return (
    <div className="flex-1 overflow-y-auto px-8 relative outline-none custom-scrollbar">
      <div className="max-w-2xl w-full mx-auto h-full pt-16 pb-20">
        
        {/* Header */}
        <header className="mb-8 select-none flex items-center gap-3">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }} />
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{project.name}</h1>
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
            <TaskSection 
              title="Tasks" 
              tasks={incomplete} 
              accentColor="var(--text-secondary)" 
              defaultOpen 
            />
            
            <TaskSection 
              title="Completed" 
              tasks={completed} 
              accentColor="var(--text-muted)" 
              defaultOpen={false} 
            />

            {tasks.length === 0 && (
              <div className="text-center mt-12 text-[var(--text-muted)] text-sm italic select-none">
                No tasks found in {project.name}.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
