import { useState } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useAppStore } from '../store/useAppStore'
import { QuickAdd } from '../components/tasks/QuickAdd'
import { TaskSection } from '../components/tasks/TaskSection'
import { Settings2 } from 'lucide-react'
import { ProjectEditModal } from '../components/projects/ProjectEditModal'

export function ProjectView() {
  const { tasks, isLoading, error } = useTasks(true)
  const selectedProjectId = useAppStore(state => state.selectedProjectId)
  const projects = useAppStore(state => state.projects)
  const project = projects.find(p => p.id === selectedProjectId)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

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
        <header className="mb-8 select-none flex items-center justify-between" id="project-view-header">
          <div className="flex items-center gap-3">
            {project.icon && project.icon.startsWith('data:image/') ? (
              <img 
                src={project.icon} 
                alt={project.name}
                className="w-7 h-7 rounded-full object-cover border border-[var(--border-subtle)]"
                id="project-view-color-img"
              />
            ) : (
              <div 
                className="w-3.5 h-3.5 rounded-full flex-shrink-0" 
                style={{ backgroundColor: project.color }} 
                id="project-view-color"
              />
            )}
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]" id="project-view-title">{project.name}</h1>
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="w-8 h-8 rounded-lg hover:bg-[var(--bg-hover)] border border-transparent hover:border-zinc-805 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center cursor-pointer"
            title="Edit project details"
          >
            <Settings2 size={16} />
          </button>
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

      <ProjectEditModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        initialEditProjectId={project.id} 
      />
    </div>
  )
}
