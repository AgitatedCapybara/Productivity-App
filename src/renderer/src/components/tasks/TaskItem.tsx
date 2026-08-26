// src/renderer/src/components/tasks/TaskItem.tsx
import React, { useState } from 'react'
import { motion } from 'motion/react'
import { GripVertical, Check, MoreHorizontal, Play, Square, Trash2, X, FileText, Sparkles } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from '../../types'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/useAppStore'
import { useTasks } from '../../hooks/useTasks'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

interface TaskItemProps {
  task: Task
  onComplete?: (id: string) => void
  onUpdate?: (task: Partial<Task> & { id: string }) => void
  onDelete?: (id: string) => void
  isOverlay?: boolean
  isSelected?: boolean
  onSelect?: (e: React.MouseEvent, taskId: string) => void
}

export const TaskItem = React.memo(function TaskItem({ 
  task, 
  onComplete, 
  onUpdate, 
  onDelete, 
  isOverlay,
  isSelected,
  onSelect
}: TaskItemProps) {
  const editingTaskId = useAppStore(state => state.editingTaskId)
  const setEditingTaskId = useAppStore(state => state.setEditingTaskId)
  const setEditingTaskDetailsId = useAppStore(state => state.setEditingTaskDetailsId)
  const isEditing = editingTaskId === task.id
  const setIsEditing = (val: boolean) => setEditingTaskId(val ? task.id : null)

  const [editTitle, setEditTitle] = useState(task.title)
  const [isConfirmingStop, setIsConfirmingStop] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const projects = useAppStore(state => state.projects)
  const activeTaskId = useAppStore(state => state.activeTaskId)
  const highlightedTaskId = useAppStore(state => state.highlightedTaskId)
  const setHighlightedTaskId = useAppStore(state => state.setHighlightedTaskId)
  const setActiveView = useAppStore(state => state.setActiveView)
  const densitySetting = useAppStore(state => state.densitySetting)
  const keyboardSelectedTaskId = useAppStore(state => state.keyboardSelectedTaskId)
  const featureVisibility = useAppStore(state => state.featureVisibility)
  const { startSession, stopSession } = useTasks()
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  const [hasNote, setHasNote] = useState(false)

  React.useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getNotesByParent('task', task.id).then(list => {
        setHasNote(list && list.length > 0)
      }).catch(console.error)
    }
  }, [task.id, useAppStore(state => state.tasksRevision)])

  const handleOpenNotes = async () => {
    if (!window.electronAPI) return
    try {
      const existing = await window.electronAPI.getNotesByParent('task', task.id)
      if (existing && existing.length > 0) {
        localStorage.setItem('selected_notes_view_id', existing[0].id)
        setActiveView('notes')
      } else {
        const newNote = await window.electronAPI.createNote({
          title: `Note: ${task.title}`,
          body_md: `# Note: ${task.title}\n\nTask Description: ${task.notes || 'No description'}\n\n`,
          parent_type: 'task',
          parent_id: task.id
        })
        localStorage.setItem('selected_notes_view_id', newNote.id)
        setActiveView('notes')
      }
    } catch (e) {
      console.error('Failed notes navigation/creation:', e)
    }
  }

  const startEditing = () => {
    setEditTitle(task.title)
    setIsEditing(true)
  }

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  React.useEffect(() => {
    if (highlightedTaskId === task.id) {
       const el = document.querySelector(`[data-task-id="${task.id}"]`)
       if (el) {
         setTimeout(() => {
           el.scrollIntoView({ behavior: 'smooth', block: 'center' })
         }, 80)
       }
       const timer = setTimeout(() => {
         setHighlightedTaskId(null)
       }, 3000)
       return () => clearTimeout(timer)
    }
    return undefined
  }, [highlightedTaskId, task.id, setHighlightedTaskId])

  React.useEffect(() => {
    if (keyboardSelectedTaskId === task.id) {
       const el = document.querySelector(`[data-task-id="${task.id}"]`)
       if (el) {
         el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
       }
    }
  }, [keyboardSelectedTaskId, task.id])

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    disabled: isOverlay
  })

  const style = isOverlay ? undefined : {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  }

  const handleEditSubmit = () => {
    if (editTitle.trim() && editTitle !== task.title && onUpdate) {
      onUpdate({ id: task.id, title: editTitle.trim() })
    } else {
      setEditTitle(task.title)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditSubmit()
    if (e.key === 'Escape') {
      setEditTitle(task.title)
      setIsEditing(false)
    }
  }

  const handlePlayClick = (e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey || task.status === 'deleted') return
    e.stopPropagation()
    startSession(task.id)
  }

  const handleStopClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isConfirmingStop) {
      setIsConfirmingStop(true)
      return
    }
    stopSession()
    setIsConfirmingStop(false)
  }

  const inner = (
    <>
      <div 
        className={cn(
          "flex-shrink-0 w-[2.5px] h-5 rounded-full mr-1 transition-opacity",
          task.priority === 1 ? "bg-slate-400" :
          task.priority === 2 ? "bg-[var(--color-warning)]" :
          task.priority === 3 ? "bg-[var(--accent-primary)]" : "opacity-0"
        )}
      />

      <div
        {...attributes}
        {...listeners}
        className="w-6 h-full flex items-center justify-center opacity-0 group-hover:opacity-30 cursor-grab active:cursor-grabbing hover:!opacity-100 transition-opacity"
      >
        <GripVertical size={14} className="text-[var(--text-secondary)]" />
      </div>

      {task.status === 'deleted' ? (
        <div className="w-4 h-4 flex flex-shrink-0 items-center justify-center ml-1 mr-3 text-[var(--text-muted)] opacity-80" title="This task is in the recycle bin">
          <Trash2 size={12} />
        </div>
      ) : (
        <button
          onClick={() => onComplete?.(task.id)}
          className="w-10 h-10 flex flex-shrink-0 items-center justify-center ml-1 mr-1 hover:bg-[var(--bg-elevated)] rounded-full transition-colors cursor-pointer"
        >
          <div className={cn(
            "w-4 h-4 rounded-full border flex flex-shrink-0 items-center justify-center transition-colors",
            task.status === 'done'
              ? "bg-[var(--color-success)] border-[var(--color-success)] text-white"
              : task.priority === 3
                ? "border-indigo-500/90 bg-indigo-500/10 hover:border-indigo-400 hover:bg-indigo-500/20 text-transparent"
                : task.priority === 2
                  ? "border-amber-500/90 bg-amber-500/10 hover:border-amber-400 hover:bg-amber-500/20 text-transparent"
                  : task.priority === 1
                    ? "border-zinc-500 bg-zinc-500/10 hover:border-zinc-400 hover:bg-zinc-500/20 text-transparent"
                    : "border-zinc-700 hover:border-zinc-400 bg-transparent text-transparent"
          )}>
            <Check size={10} strokeWidth={3} className={task.status === 'done' ? "block" : "hidden"} />
          </div>
        </button>
      )}

      <div className="flex-1 flex items-center h-full min-w-0 pr-2 gap-2">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent outline-none text-[17px] text-[var(--text-primary)] font-normal border-0 p-0 focus:ring-0"
          />
        ) : (
          <div 
            className="flex items-center gap-2 overflow-hidden flex-1 cursor-text" 
            onDoubleClick={(e) => {
              if (e.shiftKey || e.metaKey || e.ctrlKey) return
              e.stopPropagation()
              startEditing()
            }}
          >
            <span 
              className={cn(
                "text-[17px] font-normal truncate",
                task.status === 'done' ? "line-through opacity-50 text-[var(--text-secondary)]" : 
                task.status === 'deleted' ? "line-through opacity-60 text-[var(--text-secondary)] italic font-light" : "text-[var(--text-primary)]"
              )}
            >
              {task.title}
            </span>
            {featureVisibility.planningFields && task.due_date && (
               <span 
                 className="flex-shrink-0 text-[10px] text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--border-default)] cursor-default"
                 title={(() => {
                   const [year, month, day] = task.due_date.split('-').map(Number)
                   const d = new Date(year, month - 1, day)
                   
                   const today = new Date()
                   const localTodayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
                   
                   const tomorrow = new Date(today)
                   tomorrow.setDate(today.getDate() + 1)
                   const localTomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
                   
                   let datePart = ''
                   if (task.due_date === localTodayStr) {
                     datePart = 'Today'
                   } else if (task.due_date === localTomorrowStr) {
                     datePart = 'Tomorrow'
                   } else {
                     datePart = d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
                   }
                   
                   if (task.due_time) {
                     const [h, m] = task.due_time.split(':').map(Number)
                     const dateObj = new Date(year, month - 1, day, h, m)
                     const timeFormatted = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                     return `${datePart} at ${timeFormatted}`
                   }
                   return datePart
                 })()}
               >
                 {(() => {
                   const d = new Date()
                   const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                   const isToday = task.due_date === localToday
                   
                   const tomorrow = new Date(d)
                   tomorrow.setDate(d.getDate() + 1)
                   const localTomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
                   
                   if (isToday && task.due_time) {
                     const [h, m] = task.due_time.split(':').map(Number)
                     const dateObj = new Date()
                     dateObj.setHours(h, m)
                     return dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                   }
                   
                   if (task.due_date === localTomorrowStr) {
                     return 'Tomorrow'
                   }
                   
                   const [year, month, day] = task.due_date.split('-').map(Number)
                   const dateObj = new Date(year, month - 1, day)
                   return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })
                 })()}
               </span>
            )}
            {task.project_id && task.project_id !== 'inbox-default' && (
               <span className="flex-shrink-0 flex items-center gap-1 text-[10px] text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--border-default)]">
                 {(() => { const proj = projects.find(p => p.id === task.project_id); return proj?.icon && proj.icon.startsWith('data:image/') ? <img src={proj.icon} alt={proj.name} className="w-3.5 h-3.5 rounded-full object-cover shrink-0 border border-zinc-800" /> : <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: proj?.color || '#888' }} /> })()}
                 {projects.find(p => p.id === task.project_id)?.name || 'Project'}
               </span>
            )}
            {hasNote && (
               <span 
                 onClick={(e) => { e.stopPropagation(); handleOpenNotes(); }}
                 className="flex-shrink-0 flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 hover:bg-indigo-500/20 hover:text-indigo-300 transition cursor-pointer select-none"
                 title="Open attached note"
               >
                 <FileText className="w-3 h-3 text-indigo-400" />
                 Note
               </span>
            )}
          </div>
        )}
      </div>

      {activeTaskId === task.id ? (
        <button 
          onClick={handleStopClick}
          onMouseLeave={() => setIsConfirmingStop(false)}
          className={cn(
            "relative w-10 h-10 mr-1 flex-shrink-0 flex items-center justify-center rounded-md hover:bg-[var(--bg-elevated)] transition-all group/stop",
            isConfirmingStop ? "text-[var(--color-overdue)]" : "text-[var(--color-success)]"
          )}
          title={isConfirmingStop ? "Click again to confirm stop" : "Stop active session"}
        >
          {isConfirmingStop ? (
            <X size={12} className="stroke-[3]" />
          ) : (
            <>
              {/* Pulsing green dot by default */}
              <span className="absolute flex h-2 w-2 group-hover:hidden group-hover/stop:hidden transition-all duration-150">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success)]"></span>
              </span>
              {/* Stop Square icon shown on hover */}
              <Square size={10} className="hidden group-hover:block group-hover/stop:block fill-current" />
            </>
          )}
        </button>
      ) : task.status !== 'deleted' && (
        <button 
          onClick={handlePlayClick}
          className="w-10 h-10 flex flex-shrink-0 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all mr-1"
        >
          <Play size={14} className="fill-current" />
        </button>
      )}

      {task.status !== 'deleted' && (
        <button 
          onClick={(e) => {
            e.stopPropagation()
            if (!isConfirmingDelete) {
              setIsConfirmingDelete(true)
            } else {
              onDelete?.(task.id)
              setIsConfirmingDelete(false)
            }
          }}
          onMouseLeave={() => setIsConfirmingDelete(false)}
          className={cn(
            "w-10 h-10 flex flex-shrink-0 items-center justify-center rounded-md mr-1 transition-all ml-4",
            isConfirmingDelete 
              ? "opacity-100 text-[var(--color-overdue)] bg-[var(--color-overdue)]/15 border border-[var(--color-overdue)]/30 scale-105 animate-pulse" 
              : "opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--color-overdue)]"
          )}
          title={isConfirmingDelete ? "Click again to confirm delete" : "Delete task"}
        >
          <Trash2 size={13} className={cn("transition-all", isConfirmingDelete && "scale-105")} />
        </button>
      )}

      <DropdownMenu onOpenChange={(open) => { if (!open) setIsConfirmingDelete(false) }}>
        <DropdownMenuTrigger asChild>
          <button className="w-10 h-10 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all ml-auto">
            <MoreHorizontal size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[170px] z-50">
          {task.status === 'deleted' ? (
            <>
              <DropdownMenuItem onClick={() => onUpdate?.({ id: task.id, status: 'todo' })} className="text-[var(--color-success)] focus:text-[var(--color-success)]">
                Restore Task
              </DropdownMenuItem>
              <DropdownMenuItem 
                onSelect={(e) => {
                  e.preventDefault()
                  if (!isConfirmingDelete) {
                    setIsConfirmingDelete(true)
                  } else {
                    onDelete?.(task.id)
                    setIsConfirmingDelete(false)
                  }
                }} 
                className="text-[var(--color-overdue)] focus:text-[var(--color-overdue)] font-semibold"
              >
                {isConfirmingDelete ? 'Confirm Permanent Delete?' : 'Delete Permanently'}
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => {
                 setTimeout(() => {
                   setEditingTaskDetailsId(task.id)
                 }, 100)
              }}>
                <Sparkles size={13} className="mr-2 text-indigo-400 animate-pulse" />
                <span>Edit details...</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => {
                 setTimeout(() => {
                   startEditing()
                 }, 100)
              }}>Rename title</DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Set priority</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => onUpdate?.({ id: task.id, priority: 0 })}>None</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdate?.({ id: task.id, priority: 1 })}>Low</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdate?.({ id: task.id, priority: 2 })}>Medium</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdate?.({ id: task.id, priority: 3 })}>High</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuItem onSelect={handleOpenNotes}>
                <FileText className="w-3.5 h-3.5 mr-2 text-indigo-400" strokeWidth={2} />
                <span>Open/Create Notes</span>
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Move to project</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => onUpdate?.({ id: task.id, project_id: 'inbox-default' })}>
                      Inbox
                    </DropdownMenuItem>
                    {projects.filter(p => p.id !== 'inbox-default').map(p => (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => onUpdate?.({ id: task.id, project_id: p.id })}
                      >
                        <span style={{ color: p.color }} className="mr-2">●</span>
                        {p.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuItem 
                onSelect={(e) => {
                  e.preventDefault()
                  if (!isConfirmingDelete) {
                    setIsConfirmingDelete(true)
                  } else {
                    onDelete?.(task.id)
                    setIsConfirmingDelete(false)
                  }
                }}
                className="text-[var(--color-overdue)] focus:text-[var(--color-overdue)] font-semibold"
              >
                {isConfirmingDelete ? 'Confirm Delete?' : 'Delete'}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  const isCompact = densitySetting === 'compact'
  const itemHeight = isCompact ? 40 : 52

  if (isOverlay) {
    return (
      <div 
        className={cn(
          "group relative flex items-center px-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-xl opacity-100 cursor-grabbing pointer-events-none",
          isCompact ? "h-[40px]" : "h-[52px]"
        )}
      >
        {inner}
      </div>
    )
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout={!isDragging && !isOverlay ? "position" : false}
      data-task-id={task.id}
      initial={{ opacity: 0, height: 0, y: -4, overflow: 'hidden' }}
      animate={{ 
        opacity: isDragging ? 0.3 : 1, 
        height: itemHeight,
        y: 0,
        transitionEnd: { overflow: 'visible' }
      }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.21, ease: 'easeOut' } }}
      transition={{
        height: { type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.28 },
        opacity: { type: 'tween', ease: 'linear', duration: 0.18 },
        y: { type: 'spring', stiffness: 420, damping: 32 },
        layout: { type: 'spring', stiffness: 380, damping: 34 }
      }}
      className={cn(
        "group relative flex items-center px-2 rounded-lg border transition-all duration-155",
        isCompact ? "h-[40px]" : "h-[52px]",
        keyboardSelectedTaskId === task.id
          ? "bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/45 shadow-[0_0_15px_rgba(168,85,247,0.5)] z-20"
          : isSelected 
            ? "bg-[var(--bg-elevated)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]" 
            : highlightedTaskId === task.id
              ? "bg-purple-950/20 border-purple-500 animate-[pulse_1.5s_infinite] shadow-[0_0_12px_rgba(168,85,247,0.3)]"
              : "border-transparent hover:bg-[var(--bg-hover)]",
        "no-drag"
      )}
      onClick={(e) => {
        // Set keyboard highlighted task on click so users can highlight tasks
        useAppStore.getState().setKeyboardSelectedTaskId(task.id)
        if (e.currentTarget.contains(e.target as Node)) {
          onSelect?.(e, task.id)
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        setEditingTaskDetailsId(task.id)
      }}
    >
      {inner}
    </motion.div>
  )
})
