import React, { useState } from 'react'
import { motion } from 'motion/react'
import { GripVertical, Check, MoreHorizontal, Play, Square, Trash2, X } from 'lucide-react'
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
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [isConfirmingStop, setIsConfirmingStop] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const projects = useAppStore(state => state.projects)
  const activeTaskId = useAppStore(state => state.activeTaskId)
  const { startSession, stopSession } = useTasks()
  const inputRef = React.useRef<HTMLInputElement | null>(null)

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
    zIndex: isDragging ? 0 : 1,
    opacity: isDragging ? 0.3 : 1
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
          className={cn(
            "w-4 h-4 rounded-full border flex flex-shrink-0 items-center justify-center ml-1 mr-3 transition-colors",
            task.status === 'done'
              ? "bg-[var(--color-success)] border-[var(--color-success)] text-white"
              : "border-[var(--border-default)] hover:border-[var(--accent-primary)] text-transparent"
          )}
        >
          <Check size={10} strokeWidth={3} className={task.status === 'done' ? "block" : "hidden"} />
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
            className="w-full bg-transparent outline-none text-[13px] text-[var(--text-primary)] font-normal border-0 p-0 focus:ring-0"
          />
        ) : (
          <div 
            className="flex items-center gap-2 overflow-hidden flex-1 cursor-text" 
            onClick={(e) => {
              if (e.shiftKey || e.metaKey || e.ctrlKey) return
              e.stopPropagation()
              startEditing()
            }}
          >
            <span 
              className={cn(
                "text-[13px] font-normal truncate",
                task.status === 'done' ? "line-through opacity-50 text-[var(--text-secondary)]" : 
                task.status === 'deleted' ? "line-through opacity-60 text-[var(--text-secondary)] italic font-light" : "text-[var(--text-primary)]"
              )}
            >
              {task.title}
            </span>
            {task.due_date && (
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
                 <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: projects.find(p => p.id === task.project_id)?.color || '#888' }} />
                 {projects.find(p => p.id === task.project_id)?.name || 'Project'}
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
            "relative w-6 h-6 mr-1 flex-shrink-0 flex items-center justify-center rounded-md hover:bg-[var(--bg-elevated)] transition-all group/stop",
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
          className="w-6 h-6 flex flex-shrink-0 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all mr-1"
        >
          <Play size={14} className="fill-current" />
        </button>
      )}

      <DropdownMenu onOpenChange={(open) => { if (!open) setIsConfirmingDelete(false) }}>
        <DropdownMenuTrigger asChild>
          <button className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all ml-auto">
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
                   startEditing()
                 }, 100)
              }}>Edit title</DropdownMenuItem>
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
              <DropdownMenuItem onClick={() => onDelete?.(task.id)} className="text-[var(--color-overdue)] focus:text-[var(--color-overdue)]">Delete</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )

  if (isOverlay) {
    return (
      <div 
        className="group relative flex items-center h-[40px] px-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-xl opacity-100 cursor-grabbing pointer-events-none"
      >
        {inner}
      </div>
    )
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      data-task-id={task.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDragging ? 0.3 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      className={cn(
        "group relative flex items-center h-[40px] px-2 rounded-lg transition-colors border",
        isSelected 
          ? "bg-[var(--bg-elevated)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]" 
          : "border-transparent hover:bg-[var(--bg-hover)]",
        "no-drag"
      )}
      onClick={(e) => {
        if (e.currentTarget.contains(e.target as Node)) {
          onSelect?.(e, task.id)
        }
      }}
    >
      {inner}
    </motion.div>
  )
})
