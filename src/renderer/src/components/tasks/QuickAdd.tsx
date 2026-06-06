import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, CheckCircle2, SlidersHorizontal, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { useTasks, parseTaskInput } from '../../hooks/useTasks'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'

const formatDatePreview = (dateStr: string, timeStr: string | null) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-').map(Number)
  if (parts.length < 3 || parts.some(isNaN)) return dateStr
  const [year, month, day] = parts
  try {
    if (timeStr) {
      const timeParts = timeStr.split(':').map(Number)
      if (timeParts.length >= 2 && !timeParts.some(isNaN)) {
        const [h, m] = timeParts
        const d = new Date(year, month - 1, day, h, m)
        return format(d, "EEEE, MMMM d 'at' h:mm a")
      }
    }
    const d = new Date(year, month - 1, day)
    return format(d, "EEEE, MMMM d")
  } catch (e) {
    return dateStr
  }
}

function ProjectChip({ tag }: { tag: string }) {
  const projects = useAppStore(state => state.projects)
  const project = projects.find(p => p.name.toLowerCase() === tag.toLowerCase())

  if (project) {
    return (
      <div className="flex items-center gap-1.5 px-1.5 py-[2px] rounded border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-sm text-[11px] font-medium text-[var(--text-primary)]">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
        <span>{project.name}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center px-1.5 py-[2px] rounded border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-sm text-[11px] font-medium text-[var(--text-muted)]">
      @{tag}
    </div>
  )
}

function PriorityChip({ priority }: { priority: number }) {
  let label = ''
  let colorClass = ''
  if (priority === 1) {
    label = 'Low'
    colorClass = 'text-[var(--text-secondary)]'
  } else if (priority === 2) {
    label = 'Medium'
    colorClass = 'text-[var(--color-warning)]'
  } else if (priority === 3) {
    label = 'High'
    colorClass = 'text-[var(--accent-primary)]'
  }

  return (
    <div className={cn("text-[11px] font-medium flex items-center px-1.5 py-[2px] rounded border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-sm", colorClass)}>
      {label}
    </div>
  )
}

export function QuickAdd() {
  const { quickAddOpen, setQuickAddOpen } = useAppStore()
  const { createTask } = useTasks()
  const [inputValue, setInputValue] = useState('')
  const [parsedInfo, setParsedInfo] = useState<ReturnType<typeof parseTaskInput> | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  // Manual scheduling overrides states
  const [isManualEditing, setIsManualEditing] = useState(false)
  const [customDueDate, setCustomDueDate] = useState('')
  const [customDueTime, setCustomDueTime] = useState('')
  const [customPriority, setCustomPriority] = useState<0 | 1 | 2 | 3>(0)
  const [customProjectId, setCustomProjectId] = useState('inbox-default')

  const projects = useAppStore(state => state.projects)
  const activeView = useAppStore(state => state.activeView)
  const selectedProjectId = useAppStore(state => state.selectedProjectId)

  useEffect(() => {
    if (!inputValue.trim()) {
      setParsedInfo(null)
      return
    }

    const timer = setTimeout(() => {
      const parsed = parseTaskInput(inputValue)
      if (parsed.due_date || parsed.priority > 0 || parsed.projectTag) {
        setParsedInfo(parsed)
      } else {
        setParsedInfo(null)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [inputValue])

  // Sync state values to inferred ones as long as manual editing hasn't taken active control
  useEffect(() => {
    if (!isManualEditing) {
      if (parsedInfo) {
        setCustomDueDate(parsedInfo.due_date || '')
        setCustomDueTime(parsedInfo.due_time || '')
        setCustomPriority((parsedInfo.priority as 0 | 1 | 2 | 3) || 0)
        
        if (parsedInfo.projectTag) {
          const project = projects.find(p => p.name.toLowerCase() === parsedInfo.projectTag!.toLowerCase())
          setCustomProjectId(project ? project.id : 'inbox-default')
        } else if (activeView === 'project' && selectedProjectId) {
          setCustomProjectId(selectedProjectId)
        } else {
          setCustomProjectId('inbox-default')
        }
      } else {
        setCustomDueDate('')
        setCustomDueTime('')
        setCustomPriority(0)
        setCustomProjectId(activeView === 'project' && selectedProjectId ? selectedProjectId : 'inbox-default')
      }
    }
  }, [parsedInfo, isManualEditing, activeView, selectedProjectId, projects])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    // Explicit manual-override arguments
    const overrides = {
      due_date: customDueDate || null,
      due_time: customDueTime || null,
      priority: customPriority,
      project_id: customProjectId === 'inbox-default' ? null : customProjectId
    }

    createTask(inputValue, overrides)
    setInputValue('')
    setParsedInfo(null)
    setIsManualEditing(false)
    
    // Show success checkmark briefly without closing the bar
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
    }, 1000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuickAddOpen(false)
      setInputValue('')
      setIsManualEditing(false)
    }
  }

  if (!quickAddOpen) {
    return (
      <button
        onClick={() => setQuickAddOpen(true)}
        className="w-full flex items-center justify-start text-left gap-3 px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl transition-all text-sm mb-6 no-drag text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] opacity-80 hover:opacity-100 shadow-sm"
      >
        <Plus size={16} className="text-[var(--text-secondary)]" />
        <span>Add task...</span>
      </button>
    )
  }

  return (
    <div className="mb-6 relative no-drag">
      <div className={cn(
        "bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl overflow-hidden shadow-sm transition-all duration-200",
        "focus-within:border-[var(--accent-primary)] focus-within:shadow-md"
      )}>
        <form onSubmit={handleSubmit} className="relative flex flex-col p-1">
          <div className="relative flex items-center">
            <input
              autoFocus
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                setShowSuccess(false)
              }}
              onKeyDown={handleKeyDown}
              placeholder='Add task... try "call dentist next Tuesday 2pm"'
              className="w-full bg-transparent border-0 px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:ring-0 focus:outline-none"
            />
            
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-success)] bg-transparent"
                >
                  <CheckCircle2 size={18} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Expanded or collapsed NLP preview / Manual controls */}
          {(parsedInfo || isManualEditing) && !showSuccess && (
            <div className="border-t border-[var(--border-subtle)] px-3 py-2.5 bg-[var(--bg-surface)]/30 flex flex-col gap-2.5">
              {/* Preview Line */}
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Interpreted:</span>
                  
                  {customProjectId && customProjectId !== 'inbox-default' && (
                    <ProjectChip tag={projects.find(p => p.id === customProjectId)?.name || 'Project'} />
                  )}
                  {customProjectId === 'inbox-default' && parsedInfo?.projectTag && (
                    <ProjectChip tag={parsedInfo.projectTag} />
                  )}

                  {customDueDate && (
                    <div className="flex items-center gap-1 px-1.5 py-[2px] rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[11px] font-medium text-[var(--text-primary)]">
                      <span>📅</span>
                      <span>{formatDatePreview(customDueDate, customDueTime)}</span>
                    </div>
                  )}

                  {customPriority > 0 && (
                    <PriorityChip priority={customPriority} />
                  )}

                  {!customDueDate && customPriority === 0 && (!customProjectId || customProjectId === 'inbox-default') && (
                    <span className="text-[11px] text-[var(--text-muted)] italic">Simple task in Inbox</span>
                  )}
                </div>

                {/* Toggle Manual Adjustments */}
                <button
                  type="button"
                  onClick={() => setIsManualEditing(!isManualEditing)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all hover:bg-[var(--bg-hover)] cursor-pointer select-none",
                    isManualEditing ? "text-[var(--accent-primary)] font-semibold" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <SlidersHorizontal size={12} />
                  {isManualEditing ? "Lock Adjustments" : "Manual Edit"}
                </button>
              </div>

              {/* Collapsible Manual Edit Form */}
              <AnimatePresence>
                {isManualEditing && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden flex flex-col gap-3 pt-1"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      {/* Date */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Due Date</label>
                        <input
                          type="date"
                          value={customDueDate}
                          onChange={(e) => setCustomDueDate(e.target.value)}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] color-scheme-dark"
                        />
                      </div>

                      {/* Time */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Due Time</label>
                        <input
                          type="time"
                          value={customDueTime}
                          onChange={(e) => setCustomDueTime(e.target.value)}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] color-scheme-dark"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Priority selector */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Priority</label>
                        <div className="flex gap-1">
                          {([0, 1, 2, 3] as const).map((p) => {
                            let label = 'None'
                            let activeClass = 'bg-transparent text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--text-muted)]'
                            if (p === 0) {
                              label = 'None'
                              if (customPriority === 0) activeClass = 'bg-[var(--bg-hover)] text-[var(--text-primary)] border-[var(--border-default)] font-semibold'
                            } else if (p === 1) {
                              label = 'Low'
                              if (customPriority === 1) activeClass = 'bg-slate-400/20 text-slate-300 border-slate-500/30 font-semibold'
                            } else if (p === 2) {
                              label = 'Med'
                              if (customPriority === 2) activeClass = 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/30 font-semibold'
                            } else if (p === 3) {
                              label = 'High'
                              if (customPriority === 3) activeClass = 'bg-[var(--accent-primary)]/20 text-[var(--text-primary)] border-[var(--accent-primary)]/30 font-semibold'
                            }

                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setCustomPriority(p)}
                                className={cn(
                                  "flex-1 text-[11px] py-1 px-1.5 rounded-lg border text-center transition-all cursor-pointer",
                                  activeClass
                                )}
                              >
                                {label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Project selector */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Project</label>
                        <select
                          value={customProjectId}
                          onChange={(e) => setCustomProjectId(e.target.value)}
                          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] hover:border-[var(--text-muted)] cursor-pointer"
                        >
                          <option value="inbox-default">Inbox</option>
                          {projects.filter(p => p.id !== 'inbox-default').map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Reset Controls footer */}
                    <div className="flex justify-between items-center mt-1 border-t border-[var(--border-subtle)] pt-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualEditing(false)
                        }}
                        className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      >
                        <RotateCcw size={11} />
                        Reset to Auto-Schedule
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsManualEditing(false)}
                        className="bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-[11px] font-medium px-2.5 py-1 rounded-lg border border-[var(--border-default)] cursor-pointer"
                      >
                        Confirm Controls
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
