// src/renderer/src/components/tasks/TaskEditContextBox.tsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { 
  X, Calendar, RotateCw, Flag, 
  Sparkles, MapPin, Brain, AlignLeft, Folder, Clipboard
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useTasks } from '../../hooks/useTasks'
import { useSafeClickOutside } from '../../hooks/useSafeClickOutside'
import { cn } from '../../lib/utils'

export function TaskEditContextBox() {
  const editingTaskDetailsId = useAppStore(state => state.editingTaskDetailsId)
  const setEditingTaskDetailsId = useAppStore(state => state.setEditingTaskDetailsId)
  const tasks = useAppStore(state => state.tasks)
  const completedTasks = useAppStore(state => state.completedTasks)
  const projects = useAppStore(state => state.projects)
  const { updateTask } = useTasks()

  // Find the task being edited
  const task = tasks.find(t => t.id === editingTaskDetailsId) || completedTasks.find(t => t.id === editingTaskDetailsId)

  // Safe click outside handler
  const { containerRef: modalRef } = useSafeClickOutside<HTMLDivElement>({
    isOpen: !!editingTaskDetailsId,
    onClose: () => setEditingTaskDetailsId(null)
  })

  // Custom states for helper widgets
  const [customWeeklyDays, setCustomWeeklyDays] = useState<number[]>([])
  const [customMonthlyDays, setCustomMonthlyDays] = useState<number[]>([])
  const [showRecurrenceType, setShowRecurrenceType] = useState<string>('none')

  // Parse recurrence rule on load
  useEffect(() => {
    if (task && task.recurrence) {
      if (task.recurrence.startsWith('custom_weekly:')) {
        setShowRecurrenceType('custom_weekly')
        const days = task.recurrence.substring('custom_weekly:'.length).split(',').map(Number)
        setCustomWeeklyDays(days.filter(d => !isNaN(d)))
      } else if (task.recurrence.startsWith('custom_monthly:')) {
        setShowRecurrenceType('custom_monthly')
        const days = task.recurrence.substring('custom_monthly:'.length).split(',').map(Number)
        setCustomMonthlyDays(days.filter(d => !isNaN(d)))
      } else {
        setShowRecurrenceType(task.recurrence)
      }
    } else {
      setShowRecurrenceType('none')
    }
  }, [task?.id, task?.recurrence])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingTaskDetailsId) {
        setEditingTaskDetailsId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingTaskDetailsId, setEditingTaskDetailsId])

  if (!task) return null

  // Handle instant field updates
  const handleFieldChange = (field: string, value: any) => {
    if (!editingTaskDetailsId) return
    updateTask({
      id: editingTaskDetailsId,
      [field]: value
    }).catch(console.error)
  }

  // Handle custom recurrence type changes
  const handleRecurrenceTypeChange = (type: string) => {
    setShowRecurrenceType(type)
    if (type === 'none') {
      handleFieldChange('recurrence', null)
    } else if (type === 'custom_weekly') {
      const initialDays = customWeeklyDays.length > 0 ? customWeeklyDays : [1] // default Monday
      setCustomWeeklyDays(initialDays)
      handleFieldChange('recurrence', `custom_weekly:${initialDays.join(',')}`)
    } else if (type === 'custom_monthly') {
      const initialDays = customMonthlyDays.length > 0 ? customMonthlyDays : [1] // default 1st
      setCustomMonthlyDays(initialDays)
      handleFieldChange('recurrence', `custom_monthly:${initialDays.join(',')}`)
    } else {
      handleFieldChange('recurrence', type)
    }
  }

  // Toggle days for custom weekly
  const toggleWeeklyDay = (day: number) => {
    let nextDays = [...customWeeklyDays]
    if (nextDays.includes(day)) {
      nextDays = nextDays.filter(d => d !== day)
    } else {
      nextDays.push(day)
    }
    // Keep sorted
    nextDays.sort((a, b) => a - b)
    if (nextDays.length === 0) nextDays = [day] // enforce at least one
    setCustomWeeklyDays(nextDays)
    handleFieldChange('recurrence', `custom_weekly:${nextDays.join(',')}`)
  }

  // Add/Remove date for custom monthly
  const toggleMonthlyDay = (day: number) => {
    let nextDays = [...customMonthlyDays]
    if (nextDays.includes(day)) {
      nextDays = nextDays.filter(d => d !== day)
    } else {
      nextDays.push(day)
    }
    nextDays.sort((a, b) => a - b)
    if (nextDays.length === 0) nextDays = [1]
    setCustomMonthlyDays(nextDays)
    handleFieldChange('recurrence', `custom_monthly:${nextDays.join(',')}`)
  }

  // Priorities definitions
  const priorities = [
    { value: 0, label: 'None', color: 'text-zinc-400 bg-zinc-900 border-zinc-800' },
    { value: 1, label: 'Low', color: 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30' },
    { value: 2, label: 'Medium', color: 'text-amber-400 bg-amber-950/20 border-amber-900/30' },
    { value: 3, label: 'High', color: 'text-rose-400 bg-rose-950/20 border-rose-900/30' }
  ]

  const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans select-none"
        id="task-edit-modal-overlay"
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          id="task-edit-modal-box"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <Clipboard size={16} className="text-purple-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Edit Task Context</span>
            </div>
            <button
              onClick={() => setEditingTaskDetailsId(null)}
              className="p-1.5 hover:bg-zinc-800/80 rounded-md text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Close Panel (Esc)"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Title / Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Task Title</label>
              <input
                type="text"
                value={task.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="Enter task title..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-purple-500/80 transition-all font-medium"
              />
            </div>

            {/* Grid for Project, Priority & Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Project Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Folder size={11} className="text-zinc-500" />
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Project</label>
                  </div>
                  <select
                    value={task.project_id || 'inbox-default'}
                    onChange={(e) => {
                      const val = e.target.value === 'inbox-default' ? null : e.target.value
                      handleFieldChange('project_id', val)
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-hidden focus:border-purple-500/80 transition-all font-medium cursor-pointer"
                  >
                    <option value="inbox-default">📬 Inbox</option>
                    {projects.filter(p => p.id !== 'inbox-default').map((p) => (
                      <option key={p.id} value={p.id}>
                        🎨 {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Flag size={11} className="text-zinc-500" />
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Priority</label>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {priorities.map((p) => {
                      const isActive = task.priority === p.value
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => handleFieldChange('priority', p.value)}
                          className={cn(
                            "py-2 px-1 text-center rounded-xl border text-[11px] font-bold tracking-wide transition-all cursor-pointer",
                            isActive 
                              ? cn(p.color, "ring-1 ring-purple-500/20 scale-[1.02]") 
                              : "bg-transparent border-zinc-850 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800"
                          )}
                        >
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Schedule Details (Due Date & Time) */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} className="text-zinc-500" />
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Schedule Due</label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="date"
                        value={task.due_date || ''}
                        onChange={(e) => handleFieldChange('due_date', e.target.value || null)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-hidden focus:border-purple-500/80 transition-all font-medium cursor-pointer"
                      />
                    </div>
                    <div>
                      <input
                        type="time"
                        value={task.due_time || ''}
                        onChange={(e) => handleFieldChange('due_time', e.target.value || null)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-hidden focus:border-purple-500/80 transition-all font-medium cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Recurrence Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <RotateCw size={11} className="text-zinc-500" />
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recurrence</label>
                  </div>
                  <select
                    value={showRecurrenceType}
                    onChange={(e) => handleRecurrenceTypeChange(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-hidden focus:border-purple-500/80 transition-all font-medium cursor-pointer"
                  >
                    <option value="none">No Repeat</option>
                    <option value="daily">Daily</option>
                    <option value="every weekday">Every Weekday</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom_weekly">Custom Weekly...</option>
                    <option value="custom_monthly">Custom Monthly...</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Custom Recurrence Options */}
            {showRecurrenceType === 'custom_weekly' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-2"
              >
                <span className="text-[10px] font-semibold text-zinc-400">Repeat on Days:</span>
                <div className="flex justify-between gap-1.5">
                  {DAYS_SHORT.map((dayLabel, index) => {
                    const isSelected = customWeeklyDays.includes(index)
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => toggleWeeklyDay(index)}
                        className={cn(
                          "w-8 h-8 rounded-lg border text-xs font-bold flex items-center justify-center cursor-pointer transition-all",
                          isSelected 
                            ? "bg-purple-600 border-purple-500 text-white" 
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                        )}
                      >
                        {dayLabel}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {showRecurrenceType === 'custom_monthly' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-zinc-400">Repeat on Calendar Dates:</span>
                  <span className="text-[9px] text-zinc-500">Selected: {customMonthlyDays.join(', ')}</span>
                </div>
                {/* 31 days selector */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const isSelected = customMonthlyDays.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleMonthlyDay(day)}
                        className={cn(
                          "h-6.5 text-[10px] rounded-sm font-semibold flex items-center justify-center cursor-pointer transition-all",
                          isSelected 
                            ? "bg-purple-600 text-white font-bold" 
                            : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400"
                        )}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Notes Section */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <AlignLeft size={11} className="text-zinc-500" />
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Notes & Details</label>
              </div>
              <textarea
                value={task.notes || ''}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Write task description or add contextual details..."
                className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-purple-500/80 transition-all font-medium resize-none leading-relaxed"
              />
            </div>

            {/* Cognitive Planning Section */}
            <div className="border-t border-zinc-850 pt-5 space-y-4">
              <div className="flex items-center gap-2">
                <Brain size={14} className="text-purple-400 animate-pulse" />
                <span className="text-xs font-bold text-zinc-350 uppercase tracking-wide">
                  Intentional Cognitive Planning
                </span>
                <span className="text-[9px] text-zinc-500 px-1.5 py-0.5 rounded-full border border-zinc-800 font-mono ml-auto">
                  Implementation Intentions
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Plan When */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={11} className="text-zinc-500" />
                    <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider">Plan When</span>
                  </div>
                  <input
                    type="text"
                    value={task.plan_when || ''}
                    onChange={(e) => handleFieldChange('plan_when', e.target.value || null)}
                    placeholder="e.g. Tomorrow 9:00 AM"
                    className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-3 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-purple-500/80 transition-all font-medium"
                  />
                </div>

                {/* Plan Where */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={11} className="text-zinc-500" />
                    <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider">Plan Where</span>
                  </div>
                  <input
                    type="text"
                    value={task.plan_where || ''}
                    onChange={(e) => handleFieldChange('plan_where', e.target.value || null)}
                    placeholder="e.g. Quiet corner desk"
                    className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-3 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-purple-500/80 transition-all font-medium"
                  />
                </div>

                {/* Plan How */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Brain size={11} className="text-zinc-500" />
                    <span className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider">Plan How</span>
                  </div>
                  <input
                    type="text"
                    value={task.plan_how || ''}
                    onChange={(e) => handleFieldChange('plan_how', e.target.value || null)}
                    placeholder="e.g. Focus block 30m"
                    className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-3 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-purple-500/80 transition-all font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-zinc-900/40 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 font-mono">
              Auto-saved instantly to local workspace.
            </span>
            <button
              onClick={() => setEditingTaskDetailsId(null)}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-98 text-xs font-semibold text-white transition-all shadow-md shadow-purple-950/20 cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
