import { useTasks } from '../hooks/useTasks'
import { useAppStore } from '../store/useAppStore'
import { QuickAdd } from '../components/tasks/QuickAdd'
import { TaskSection } from '../components/tasks/TaskSection'

export function ProjectView() {
  const { tasks, isLoading, error } = useTasks()
  const selectedProjectId = useAppStore(state => state.selectedProjectId)
  const projects = useAppStore(state => state.projects)
  const project = projects.find(p => p.id === selectedProjectId)

  if (!selectedProjectId || !project) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-[var(--text-muted)] select-none text-sm h-full" id="project-view-unselected">
        Select a project from the sidebar
      </div>
    )
  }

  let projectTasks = tasks
  if (!window.electronAPI) {
    projectTasks = tasks.filter(t => {
      if (selectedProjectId === 'inbox-default') {
        return !t.project_id || t.project_id === 'inbox-default'
      }
      return t.project_id === selectedProjectId
    })
  }

  const active = projectTasks.filter(t => t.status !== 'done')
  const completed = projectTasks.filter(t => t.status === 'done')

  return (
    <div className="flex-1 overflow-y-auto px-8 relative outline-none custom-scrollbar" id="project-view-container">
      <div className="max-w-2xl w-full mx-auto h-full pt-16 pb-20" id="project-view-content">
        
        {/* Header */}
        <header className="mb-8 select-none flex items-center gap-3" id="project-view-header">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: project.color }} 
            id="project-view-color"
          />
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]" id="project-view-title">{project.name}</h1>
        </header>

        {error && (
          <div className="p-4 bg-[var(--color-overdue)]/10 border border-[var(--color-overdue)]/20 text-[var(--color-overdue)] rounded-xl text-sm mb-6" id="project-view-error">
            <strong>Backend Error:</strong> {error}
          </div>
        )}

        {/* Input */}
        <QuickAdd projectId={selectedProjectId} />

        {/* Sections */}
        {isLoading ? (
          <div className="space-y-4 mt-8" id="project-view-loading">
            <div className="h-12 w-full rounded-xl bg-[var(--bg-elevated)] opacity-50 animate-pulse"></div>
            <div className="h-12 w-full rounded-xl bg-[var(--bg-elevated)] opacity-40 animate-pulse"></div>
          </div>
        ) : (
          <div className="space-y-6 mt-6" id="project-view-sections">
            <TaskSection 
              title="Tasks" 
              tasks={active} 
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
              <div className="text-center mt-12 text-[var(--text-muted)] text-sm italic select-none" id="project-view-empty">
                No tasks found in {project.name}.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
