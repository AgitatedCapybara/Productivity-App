// src/renderer/src/pages/ProjectView.tsx
import { useState, useEffect } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useAppStore } from '../store/useAppStore'
import { QuickAdd } from '../components/tasks/QuickAdd'
import { TaskSection } from '../components/tasks/TaskSection'
import { Settings2, FileText, Plus } from 'lucide-react'
import { ProjectEditModal } from '../components/projects/ProjectEditModal'

export function ProjectView() {
  const { tasks, isLoading, error } = useTasks(true, 'project')
  const selectedProjectId = useAppStore(state => state.selectedProjectId)
  const projects = useAppStore(state => state.projects)
  const project = projects.find(p => p.id === selectedProjectId)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [projectNotes, setProjectNotes] = useState<any[]>([])
  const [isNotesEnabled, setIsNotesEnabled] = useState(true)

  useEffect(() => {
    if (window.electronAPI && selectedProjectId) {
      window.electronAPI.getSetting('notes.enabled', 'true').then((val) => {
        setIsNotesEnabled(val === 'true')
      }).catch(console.error)

      window.electronAPI.getNotesByParent('project', selectedProjectId).then(list => {
        setProjectNotes(list || [])
      }).catch(console.error)
    }
  }, [selectedProjectId])

  if (!selectedProjectId || !project) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-[var(--text-muted)] select-none text-sm h-full" id="project-view-unselected">
        Select a project from the sidebar
      </div>
    )
  }

  const createProjectNote = async () => {
    if (!window.electronAPI) return
    try {
      const newNote = await window.electronAPI.createNote({
        title: `Note: ${project.name}`,
        body_md: `# Project Note: ${project.name}\n\nProject details and notes.\n\n`,
        parent_type: 'project',
        parent_id: project.id
      })
      localStorage.setItem('selected_notes_view_id', newNote.id)
      useAppStore.getState().setActiveView('notes')
    } catch (err) {
      console.error(err)
    }
  }

  const openProjectNote = (noteId: string) => {
    localStorage.setItem('selected_notes_view_id', noteId)
    useAppStore.getState().setActiveView('notes')
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
    <div className="flex-1 overflow-y-auto px-8 relative outline-none custom-scrollbar view-container" id="project-view-container">
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

        {/* Project Knowledge Vault section */}
        {isNotesEnabled && (
          <div className="mt-12 border-t border-zinc-900 pt-8 space-y-4" id="project-view-notes-section">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-sans">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Project Notes ({projectNotes.length})
              </h3>
              <button
                onClick={createProjectNote}
                className="text-[11px] font-mono font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded border border-indigo-500/25 active:scale-95 transition cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Project Note
              </button>
            </div>

            {projectNotes.length === 0 ? (
              <p className="text-[11px] text-zinc-500 italic font-sans font-medium">No notes linked to this project yet. Capture blueprints, design docs, or notes in 1-click.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projectNotes.map(no => (
                  <div
                    key={no.id}
                    onClick={() => openProjectNote(no.id)}
                    className="p-3 bg-zinc-950/25 border border-zinc-900 hover:border-indigo-500/20 rounded-xl cursor-pointer transition flex flex-col justify-between h-24 hover:bg-indigo-500/[0.02]"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center justify-between gap-1 overflow-hidden">
                        <span className="font-sans font-bold text-[11.5px] text-zinc-200 truncate flex items-center gap-1.5">
                          {no.pinned && <span className="text-indigo-400 text-[10px]">📌</span>}
                          {no.title}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-zinc-500 line-clamp-2 leading-relaxed">
                        {no.body_md ? no.body_md.replace(/[#*`_[\]]/g, '').slice(0, 80) : 'No content'}
                      </p>
                    </div>
                    <div className="text-[9px] font-mono text-zinc-650 block mt-1">
                      Modified {new Date(no.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
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
