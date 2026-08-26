// src/renderer/src/pages/CalendarView.tsx
import { useState, useEffect, useMemo, Fragment } from 'react'
import { cn } from '../lib/utils'
import { useEvents } from '../hooks/useEvents'
import { useTasks } from '../hooks/useTasks'
import { useHabits } from '../hooks/useHabits'
import { useProjects } from '../hooks/useProjects'
import type { CalendarEvent, Task, Habit, HabitLog } from '../types'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles,
  X,
  PlusCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useSafeClickOutside } from '../hooks/useSafeClickOutside'

type CalendarViewMode = 'day' | 'workweek' | 'week' | 'month' | 'agenda'

function formatRecurrenceLabel(recurrence: string): string {
  if (recurrence === 'none') return ''
  if (recurrence === 'daily') return 'Daily'
  if (recurrence === 'weekly') return 'Weekly'
  if (recurrence === 'monthly') return 'Monthly'
  
  if (recurrence.startsWith('custom_weekly:')) {
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const days = recurrence.substring('custom_weekly:'.length).split(',').map(Number)
    const labels = days.map(d => DAYS[d] || '')
    return `Weekly: ${labels.join(', ')}`
  }
  
  if (recurrence.startsWith('custom_monthly:')) {
    const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    const days = recurrence.substring('custom_monthly:'.length).split(',').map(Number)
    const ordinals = days.map(getOrdinal)
    return `Monthly: ${ordinals.join(', ')}`
  }
  
  return recurrence
}

export function CalendarView() {
  const { events, loading: eventsLoading, createEvent, updateEvent, deleteEvent } = useEvents()
  const { tasks, completeTask } = useTasks()
  const { habits, logs } = useHabits()
  const { projects } = useProjects()

  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [isConfirmingModalDelete, setIsConfirmingModalDelete] = useState(false)

  // Add Event Form State
  const [evtTitle, setEvtTitle] = useState('')
  const [evtDesc, setEvtDesc] = useState('')
  const [evtDate, setEvtDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [evtStartTime, setEvtStartTime] = useState('09:00')
  const [evtEndTime, setEvtEndTime] = useState('10:00')
  const [evtProject, setEvtProject] = useState('')
  const [evtRecurrence, setEvtRecurrence] = useState<string>('none')
  const [customWeeklyDays, setCustomWeeklyDays] = useState<number[]>([1])
  const [customMonthlyDays, setCustomMonthlyDays] = useState<number[]>([1])

  const [initialFormState, setInitialFormState] = useState<{
    title: string
    desc: string
    date: string
    startTime: string
    endTime: string
    project: string
    recurrence: string
    weeklyDays: number[]
    monthlyDays: number[]
  } | null>(null)

  useEffect(() => {
    if (showAddModal) {
      setInitialFormState({
        title: evtTitle,
        desc: evtDesc,
        date: evtDate,
        startTime: evtStartTime,
        endTime: evtEndTime,
        project: evtProject,
        recurrence: evtRecurrence,
        weeklyDays: [...customWeeklyDays],
        monthlyDays: [...customMonthlyDays]
      })
    } else {
      setInitialFormState(null)
    }
  }, [showAddModal])

  const isCalendarFormDirty = useMemo(() => {
    if (!initialFormState) return false
    return (
      evtTitle !== initialFormState.title ||
      evtDesc !== initialFormState.desc ||
      evtDate !== initialFormState.date ||
      evtStartTime !== initialFormState.startTime ||
      evtEndTime !== initialFormState.endTime ||
      evtProject !== initialFormState.project ||
      evtRecurrence !== initialFormState.recurrence ||
      JSON.stringify(customWeeklyDays) !== JSON.stringify(initialFormState.weeklyDays) ||
      JSON.stringify(customMonthlyDays) !== JSON.stringify(initialFormState.monthlyDays)
    )
  }, [
    initialFormState,
    evtTitle,
    evtDesc,
    evtDate,
    evtStartTime,
    evtEndTime,
    evtProject,
    evtRecurrence,
    customWeeklyDays,
    customMonthlyDays
  ])

  const {
    containerRef: addEventRef,
    shakeKey: addEventShakeKey,
    isFlashing: addEventIsFlashing
  } = useSafeClickOutside({
    isOpen: showAddModal,
    isDirty: isCalendarFormDirty,
    onClose: () => handleCloseAddModal()
  })

  const handleCloseAddModal = () => {
    setShowAddModal(false)
    setEditingEventId(null)
    setEvtTitle('')
    setEvtDesc('')
    setEvtDate(new Date().toLocaleDateString('en-CA'))
    setEvtStartTime('09:00')
    setEvtEndTime('10:00')
    setEvtProject('')
    setEvtRecurrence('none')
    setCustomWeeklyDays([1])
    setCustomMonthlyDays([1])
    setIsConfirmingModalDelete(false)
  }

  const handleStartEditEvent = (evt: CalendarEvent) => {
    // Reset confirming state when opening for edit
    setIsConfirmingModalDelete(false)
    const originalId = evt.id.split('-repeat-')[0]
    const originalEvent = events.find(e => e.id === originalId) || evt

    setEditingEventId(originalId)
    setEvtTitle(originalEvent.title)
    setEvtDesc(originalEvent.description || '')

    const startDateObj = new Date(originalEvent.start_at)
    const endDateObj = new Date(originalEvent.end_at)

    const yyyy = startDateObj.getFullYear()
    const mm = String(startDateObj.getMonth() + 1).padStart(2, '0')
    const dd = String(startDateObj.getDate()).padStart(2, '0')
    setEvtDate(`${yyyy}-${mm}-${dd}`)

    const startHH = String(startDateObj.getHours()).padStart(2, '0')
    const startMM = String(startDateObj.getMinutes()).padStart(2, '0')
    setEvtStartTime(`${startHH}:${startMM}`)

    const endHH = String(endDateObj.getHours()).padStart(2, '0')
    const endMM = String(endDateObj.getMinutes()).padStart(2, '0')
    setEvtEndTime(`${endHH}:${endMM}`)

    setEvtProject(originalEvent.project_id || '')
    
    if (originalEvent.recurrence.startsWith('custom_weekly:')) {
      setEvtRecurrence('custom_weekly')
      const days = originalEvent.recurrence.substring('custom_weekly:'.length).split(',').map(Number)
      setCustomWeeklyDays(days)
    } else if (originalEvent.recurrence.startsWith('custom_monthly:')) {
      setEvtRecurrence('custom_monthly')
      const days = originalEvent.recurrence.substring('custom_monthly:'.length).split(',').map(Number)
      setCustomMonthlyDays(days)
    } else {
      setEvtRecurrence(originalEvent.recurrence)
    }

    setShowAddModal(true)
  }

  const handleStartAddEvent = () => {
    setEditingEventId(null)
    setEvtTitle('')
    setEvtDesc('')
    setEvtDate(new Date().toLocaleDateString('en-CA'))
    setEvtStartTime('09:00')
    setEvtEndTime('10:00')
    setEvtProject('')
    setEvtRecurrence('none')
    setCustomWeeklyDays([1])
    setCustomMonthlyDays([1])
    setIsConfirmingModalDelete(false)
    setShowAddModal(true)
  }

  // Real-time now-line position state
  const [now, setNow] = useState<Date>(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Calculate local date range bounds depending on `viewMode`
  const dateRange = useMemo(() => {
    const base = new Date(currentDate)
    if (viewMode === 'day') {
      const start = new Date(base)
      start.setHours(0, 0, 0, 0)
      const end = new Date(base)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    } else if (viewMode === 'workweek') {
      // Find Monday
      const day = base.getDay()
      const diff = base.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
      const start = new Date(base)
      start.setDate(diff)
      start.setHours(0, 0, 0, 0)

      const end = new Date(start)
      end.setDate(start.getDate() + 4) // Friday
      end.setHours(23, 59, 59, 999)
      return { start, end }
    } else if (viewMode === 'week') {
      // Find Sunday
      const day = base.getDay()
      const diff = base.getDate() - day
      const start = new Date(base)
      start.setDate(diff)
      start.setHours(0, 0, 0, 0)

      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    } else if (viewMode === 'month') {
      const start = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0)
      const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999)
      return { start, end }
    } else {
      // Agenda mode: show 14 days from active base date
      const start = new Date(base)
      start.setHours(0, 0, 0, 0)
      const end = new Date(base)
      end.setDate(base.getDate() + 14)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
  }, [currentDate, viewMode])

  // Repetitive series resolution logic
  const resolvedEvents = useMemo(() => {
    const instances: CalendarEvent[] = []
    events.forEach((e: CalendarEvent) => {
      // Resolve recurrence
      if (e.recurrence === 'none') {
        const start = new Date(e.start_at)
        if (start >= dateRange.start && start <= dateRange.end) {
          instances.push(e)
        }
      } else if (e.recurrence.startsWith('custom_weekly:')) {
        const initialStart = new Date(e.start_at)
        const initialEnd = new Date(e.end_at)
        const durationMs = initialEnd.getTime() - initialStart.getTime()

        const daysStr = e.recurrence.substring('custom_weekly:'.length)
        if (daysStr) {
          const selectedDays = Array.from(new Set(daysStr.split(',').map(Number)))
          let startOfWeek = new Date(initialStart)
          startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
          
          let currentWeek = new Date(startOfWeek)
          let iterations = 0
          while (currentWeek <= dateRange.end && iterations < 50) {
            iterations++
            for (const dayIndex of selectedDays) {
              const targetDate = new Date(currentWeek)
              targetDate.setDate(currentWeek.getDate() + dayIndex)
              targetDate.setHours(initialStart.getHours(), initialStart.getMinutes(), initialStart.getSeconds(), initialStart.getMilliseconds())
              
              if (targetDate >= initialStart && targetDate <= dateRange.end) {
                const walkEnd = new Date(targetDate.getTime() + durationMs)
                instances.push({
                  ...e,
                  // Keep id unique for repeats so React rendering is perfectly happy
                  id: `${e.id}-repeat-${targetDate.getTime()}`,
                  start_at: targetDate.toISOString(),
                  end_at: walkEnd.toISOString()
                })
              }
            }
            currentWeek.setDate(currentWeek.getDate() + 7)
          }
        }
      } else if (e.recurrence.startsWith('custom_monthly:')) {
        const initialStart = new Date(e.start_at)
        const initialEnd = new Date(e.end_at)
        const durationMs = initialEnd.getTime() - initialStart.getTime()

        const daysStr = e.recurrence.substring('custom_monthly:'.length)
        if (daysStr) {
          const selectedDays = Array.from(new Set(daysStr.split(',').map(Number)))
          let currentMonth = new Date(initialStart.getFullYear(), initialStart.getMonth(), 1)
          let iterations = 0
          while (currentMonth <= dateRange.end && iterations < 50) {
            iterations++
            const year = currentMonth.getFullYear()
            const month = currentMonth.getMonth()
            const lastDayInMonth = new Date(year, month + 1, 0).getDate()
            
            const uniqueDays = Array.from(new Set(selectedDays.map(dayNum => Math.min(dayNum, lastDayInMonth))))
            for (const actualDay of uniqueDays) {
              const targetDate = new Date(year, month, actualDay, initialStart.getHours(), initialStart.getMinutes(), initialStart.getSeconds(), initialStart.getMilliseconds())
              
              if (targetDate >= initialStart && targetDate <= dateRange.end) {
                const walkEnd = new Date(targetDate.getTime() + durationMs)
                instances.push({
                  ...e,
                  // Keep id unique for repeats so React rendering is perfectly happy
                  id: `${e.id}-repeat-${targetDate.getTime()}`,
                  start_at: targetDate.toISOString(),
                  end_at: walkEnd.toISOString()
                })
              }
            }
            currentMonth.setMonth(currentMonth.getMonth() + 1)
          }
        }
      } else {
        const initialStart = new Date(e.start_at)
        const initialEnd = new Date(e.end_at)
        const durationMs = initialEnd.getTime() - initialStart.getTime()

        let currentWalk = new Date(initialStart)
        
        // Safety lock, don't run more than 180 loops
        let iterations = 0
        while (currentWalk <= dateRange.end && iterations < 180) {
          iterations++
          const walkEnd = new Date(currentWalk.getTime() + durationMs)
          
          if (walkEnd >= dateRange.start && currentWalk <= dateRange.end) {
            instances.push({
              ...e,
              // Keep id unique for repeats so React rendering is perfectly happy
              id: `${e.id}-repeat-${currentWalk.getTime()}`,
              start_at: currentWalk.toISOString(),
              end_at: walkEnd.toISOString()
            })
          }

          if (e.recurrence === 'daily') {
            currentWalk.setDate(currentWalk.getDate() + 1)
          } else if (e.recurrence === 'weekly') {
            currentWalk.setDate(currentWalk.getDate() + 7)
          } else if (e.recurrence === 'monthly') {
            currentWalk.setMonth(currentWalk.getMonth() + 1)
          } else {
            break
          }
        }
      }
    })
    return instances.sort((a,b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }, [events, dateRange])

  // Get active columns days array
  const columns = useMemo(() => {
    const days: Date[] = []
    const base = new Date(dateRange.start)
    const diffDays = Math.floor((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
    
    // For months, we map grid elements. But for week/day views, we map columns.
    if (viewMode === 'month') {
      // Month view is rendered as a 35 or 42 grid cell framework (starting from Sunday back of the month first day)
      const firstDayIndex = dateRange.start.getDay() // 0 is sunday
      const startCell = new Date(dateRange.start)
      startCell.setDate(startCell.getDate() - firstDayIndex)

      for (let i = 0; i < 42; i++) {
        const d = new Date(startCell)
        d.setDate(startCell.getDate() + i)
        days.push(d)
      }
      return days
    }

    // Day/Week/WorkWeek columns
    for (let i = 0; i <= diffDays; i++) {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      days.push(d)
    }
    return days
  }, [dateRange, viewMode])

  // Navigate dates
  const handlePrev = () => {
    const base = new Date(currentDate)
    if (viewMode === 'day') {
      base.setDate(base.getDate() - 1)
    } else if (viewMode === 'workweek' || viewMode === 'week') {
      base.setDate(base.getDate() - 7)
    } else if (viewMode === 'month') {
      base.setMonth(base.getMonth() - 1)
    } else {
      base.setDate(base.getDate() - 14)
    }
    setCurrentDate(base)
  }

  const handleNext = () => {
    const base = new Date(currentDate)
    if (viewMode === 'day') {
      base.setDate(base.getDate() + 1)
    } else if (viewMode === 'workweek' || viewMode === 'week') {
      base.setDate(base.getDate() + 7)
    } else if (viewMode === 'month') {
      base.setMonth(base.getMonth() + 1)
    } else {
      base.setDate(base.getDate() + 14)
    }
    setCurrentDate(base)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!evtTitle.trim()) return

    // Construct start and end ISO strings in browser timezone
    const startIso = new Date(`${evtDate}T${evtStartTime}:00`).toISOString()
    const endIso = new Date(`${evtDate}T${evtEndTime}:00`).toISOString()

    let finalRecurrence = evtRecurrence
    if (evtRecurrence === 'custom_weekly') {
      if (customWeeklyDays.length === 0) {
        alert('Please select at least one day for weekly recurrence.')
        return
      }
      finalRecurrence = `custom_weekly:${customWeeklyDays.sort((a, b) => a - b).join(',')}`
    } else if (evtRecurrence === 'custom_monthly') {
      if (customMonthlyDays.length === 0) {
        alert('Please select at least one day for monthly recurrence.')
        return
      }
      finalRecurrence = `custom_monthly:${customMonthlyDays.sort((a, b) => a - b).join(',')}`
    }

    if (editingEventId) {
      await updateEvent({
        id: editingEventId,
        title: evtTitle.trim(),
        description: evtDesc.trim() || null,
        start_at: startIso,
        end_at: endIso,
        project_id: evtProject === '' ? null : evtProject,
        recurrence: finalRecurrence
      })
    } else {
      await createEvent({
        title: evtTitle.trim(),
        description: evtDesc.trim() || null,
        start_at: startIso,
        end_at: endIso,
        project_id: evtProject === '' ? null : evtProject,
        recurrence: finalRecurrence
      })
    }

    handleCloseAddModal()
  }

  // Hours array for Grid rendering (00:00 - 23:00)
  const hours = Array.from({ length: 24 }).map((_, i) => i)

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] text-zinc-100 overflow-hidden relative view-container" id="calendar-workspace">
      {/* Calendar Tab Heading Header */}
      <header className="p-5 sm:p-6 border-b border-zinc-900 bg-zinc-950/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-15 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-650/10 border border-purple-500/20 text-purple-400">
            <Calendar size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-100 tracking-wide flex items-center gap-1.5 leading-none">
              Developer Calendar
              <span className="text-[10px] text-purple-400 font-extrabold uppercase bg-purple-500/10 border border-purple-500/10 px-1.5 py-0.5 rounded-full">Pro</span>
            </h1>
            <p className="text-[10px] text-zinc-500 mt-1 font-medium">
              Unified appointments, routine habit check-ins, and task deadlines.
            </p>
          </div>
        </div>

        {/* View Mode selection */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-zinc-900/60 border border-zinc-850 p-0.5 rounded-xl">
            {(['day', 'workweek', 'week', 'month', 'agenda'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  viewMode === mode
                    ? 'bg-zinc-800 text-zinc-50 border border-zinc-700/50 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {mode === 'workweek' ? 'Work Week' : mode}
              </button>
            ))}
          </div>

          <button
            onClick={handleStartAddEvent}
            className="flex items-center justify-center gap-1 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-md shadow-purple-950/20"
            id="register-evt-btn"
          >
            <Plus size={13} />
            Schedule
          </button>
        </div>
      </header>

      {/* Control panel: Prev, Today, Next + Label */}
      <section className="px-5 py-3 border-b border-zinc-900 bg-zinc-950/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            title="Backward"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1 rounded-lg border border-zinc-850 bg-zinc-900/45 hover:bg-zinc-900 text-xs font-semibold text-zinc-300 cursor-pointer"
          >
            Today
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            title="Forward"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Date scope string display */}
        <p className="text-xs font-bold text-zinc-300 flex items-center gap-2">
          {viewMode === 'day' && currentDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {viewMode === 'month' && currentDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
          {(viewMode === 'week' || viewMode === 'workweek' || viewMode === 'agenda') && (
            <>
              <span>{dateRange.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              <span className="text-zinc-650">—</span>
              <span>{dateRange.end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </>
          )}
        </p>
      </section>

      {/* Main Render Section */}
      <div 
        className={`flex-1 min-h-0 relative p-4 sm:p-6 ${
          viewMode === 'agenda' ? 'overflow-y-auto' : 'overflow-hidden flex flex-col'
        }`}
        id="calendar-grid-container"
      >
        {eventsLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-450 border border-zinc-900 border-dashed rounded-2xl p-12">
            <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            <p className="text-xs">Sychronizing events database...</p>
          </div>
        ) : viewMode === 'agenda' ? (
          <AgendaListView events={resolvedEvents} tasks={tasks} deleteEvent={deleteEvent} projects={projects} completeTask={completeTask} onEditEvent={handleStartEditEvent} />
        ) : viewMode === 'month' ? (
          <MonthViewGrid 
            days={columns} 
            events={resolvedEvents} 
            tasks={tasks} 
            habits={habits}
            logs={logs}
            completeTask={completeTask}
            projects={projects}
            activeMonth={currentDate.getMonth()}
            onDeleteEvent={deleteEvent}
            onEditEvent={handleStartEditEvent}
          />
        ) : (
          /* Day, Week, and WorkWeek with detailed scrollable hourly grids */
          <HourGridColumns 
            days={columns} 
            events={resolvedEvents} 
            tasks={tasks} 
            habits={habits}
            logs={logs}
            projects={projects}
            now={now}
            hours={hours}
            viewMode={viewMode}
            onDeleteEvent={deleteEvent}
            onEditEvent={handleStartEditEvent}
          />
        )}
      </div>

      {/* Event Details and creation Dialog */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm" id="cal-add-modal">
            <motion.div
              ref={addEventRef}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={addEventShakeKey > 0 ? {
                x: [0, -6, 6, -6, 6, -4, 4, 0],
                opacity: 1,
                scale: 1
              } : { scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn(
                "bg-zinc-950 border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 transition-all duration-300",
                addEventIsFlashing
                  ? "border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-2 ring-amber-500/40"
                  : "border-zinc-850"
              )}
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-zinc-900">
                <h2 className="text-sm font-bold text-zinc-150 flex items-center gap-1.5">
                  <PlusCircle className="text-purple-400" size={16} />
                  {editingEventId ? 'Edit Appointment / Series' : 'Schedule Appointment / Series'}
                </h2>
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="p-1 rounded bg-zinc-900 text-zinc-450 hover:text-zinc-200 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="mt-4 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] text-white/60">Event Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sync with product design squad"
                    value={evtTitle}
                    onChange={(e) => setEvtTitle(e.target.value)}
                    className="text-[17px] p-2 min-h-10 bg-zinc-800 rounded-lg border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-purple-400 placeholder:text-white/30 text-zinc-100 outline-none w-full transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[13px] text-white/60">Description (Notes)</label>
                  <textarea
                    placeholder="Add meeting agenda notes, Zoom links or files..."
                    rows={2}
                    value={evtDesc}
                    onChange={(e) => setEvtDesc(e.target.value)}
                    className="text-[17px] p-2 min-h-16 bg-zinc-800 rounded-lg border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-purple-400 placeholder:text-white/30 text-zinc-100 outline-none w-full transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[13px] text-white/60">Category Project</label>
                    <select
                      value={evtProject}
                      onChange={(e) => setEvtProject(e.target.value)}
                      className="text-[17px] p-2 min-h-10 bg-zinc-800 rounded-lg border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-purple-400 placeholder:text-white/30 text-zinc-100 outline-none w-full transition-all cursor-pointer"
                    >
                      <option value="">Independent (No Project)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Repetitive Series</label>
                    <select
                      value={evtRecurrence}
                      onChange={(e) => setEvtRecurrence(e.target.value)}
                      className="px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-350 focus:outline-none"
                    >
                      <option value="none">No Repeat</option>
                      <option value="daily">Repeats Daily</option>
                      <option value="weekly">Repeats Weekly</option>
                      <option value="monthly">Repeats Monthly</option>
                      <option value="custom_weekly">Custom Weekly Days...</option>
                      <option value="custom_monthly">Custom Monthly Dates...</option>
                    </select>
                  </div>

                  {evtRecurrence === 'custom_weekly' && (
                    <div className="flex flex-col gap-2 p-3 bg-zinc-950/40 border border-zinc-800/80 rounded-xl mt-1 col-span-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Repeat on Days of the Week
                      </label>
                      <div className="flex justify-between items-center gap-1 mt-1 flex-wrap">
                        {[
                          { label: 'Sun', value: 0 },
                          { label: 'Mon', value: 1 },
                          { label: 'Tue', value: 2 },
                          { label: 'Wed', value: 3 },
                          { label: 'Thu', value: 4 },
                          { label: 'Fri', value: 5 },
                          { label: 'Sat', value: 6 },
                        ].map((day) => {
                          const isSelected = customWeeklyDays.includes(day.value)
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => {
                                setCustomWeeklyDays(prev => {
                                  if (prev.includes(day.value)) {
                                    return prev.length > 1 ? prev.filter(d => d !== day.value) : prev
                                  }
                                  return [...prev, day.value]
                                })
                              }}
                              className={`flex-1 py-1 px-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center ${
                                isSelected
                                  ? 'bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/20'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {day.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {evtRecurrence === 'custom_monthly' && (
                    <div className="flex flex-col gap-2 p-3 bg-zinc-950/40 border border-zinc-800/80 rounded-xl mt-1 col-span-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Repeat on Days of the Month
                      </label>
                      <div className="grid grid-cols-7 gap-1 mt-1.5 max-w-sm mx-auto w-full">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((dayNum) => {
                          const isSelected = customMonthlyDays.includes(dayNum)
                          return (
                            <button
                              key={dayNum}
                              type="button"
                              onClick={() => {
                                setCustomMonthlyDays(prev => {
                                  if (prev.includes(dayNum)) {
                                    return prev.length > 1 ? prev.filter(d => d !== dayNum) : prev
                                  }
                                  return [...prev, dayNum]
                                })
                              }}
                              className={`h-7 w-7 text-[10px] font-bold rounded-md flex items-center justify-center border transition-all cursor-pointer mx-auto ${
                                isSelected
                                  ? 'bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/10'
                                  : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {dayNum}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[13px] text-white/60">Occurrence Date</label>
                  <input
                    type="date"
                    required
                    value={evtDate}
                    onChange={(e) => setEvtDate(e.target.value)}
                    className="text-[17px] p-2 min-h-10 bg-zinc-800 rounded-lg border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-purple-400 placeholder:text-white/30 text-zinc-100 outline-none w-full transition-all color-scheme-dark"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[13px] text-white/60">Start Time</label>
                    <input
                      type="time"
                      required
                      value={evtStartTime}
                      onChange={(e) => setEvtStartTime(e.target.value)}
                      className="text-[17px] p-2 min-h-10 bg-zinc-800 rounded-lg border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-purple-400 placeholder:text-white/30 text-zinc-100 outline-none w-full transition-all color-scheme-dark"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[13px] text-white/60">End Time</label>
                    <input
                      type="time"
                      required
                      value={evtEndTime}
                      onChange={(e) => setEvtEndTime(e.target.value)}
                      className="text-[17px] p-2 min-h-10 bg-zinc-800 rounded-lg border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-purple-400 placeholder:text-white/30 text-zinc-100 outline-none w-full transition-all color-scheme-dark"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-end mt-4 pt-3.5 border-t border-zinc-900">
                  {editingEventId && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!isConfirmingModalDelete) {
                          setIsConfirmingModalDelete(true)
                        } else {
                          await deleteEvent(editingEventId)
                          setIsConfirmingModalDelete(false)
                          handleCloseAddModal()
                        }
                      }}
                      onMouseLeave={() => setIsConfirmingModalDelete(false)}
                      className={cn(
                        "mr-auto px-4 py-1.5 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm",
                        isConfirmingModalDelete
                          ? "bg-red-600 text-white border-transparent hover:bg-red-750 animate-pulse font-bold"
                          : "bg-red-950/40 hover:bg-red-900/40 border border-red-900/30 text-red-450 hover:text-red-300 shadow-red-950/10"
                      )}
                    >
                      {isConfirmingModalDelete ? 'Confirm Delete? Click again' : 'Delete'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCloseAddModal}
                    className="px-4 py-1.5 text-xs font-semibold text-zinc-450 hover:text-zinc-250 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl text-xs cursor-pointer shadow-sm active:scale-95 transition-all"
                  >
                    {editingEventId ? 'Save Changes' : 'Create Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* =========================================
   AGENDA VIEW COMPONENT
   ========================================= */
interface AgendaListViewProps {
  events: CalendarEvent[]
  tasks: Task[]
  projects: any[]
  completeTask: (id: string) => Promise<any>
  deleteEvent: (id: string) => Promise<void>
  onEditEvent: (evt: CalendarEvent) => void
}
function AgendaListView({ events, tasks, projects, completeTask, deleteEvent, onEditEvent }: AgendaListViewProps): React.JSX.Element {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  // Extract all distinct days that have either events or tasks with due_dates in future
  const agendaItems = useMemo(() => {
    const datesMap: { [dateStr: string]: { events: CalendarEvent[]; tasks: Task[] } } = {}

    // Populate events
    events.forEach(e => {
      const dateStr = new Date(e.start_at).toLocaleDateString('en-CA')
      if (!datesMap[dateStr]) datesMap[dateStr] = { events: [], tasks: [] }
      datesMap[dateStr].events.push(e)
    })

    // Populate tasks
    tasks.forEach(t => {
      if (t.due_date && t.status !== 'done' && t.status !== 'deleted') {
        const dateStr = t.due_date
        if (!datesMap[dateStr]) datesMap[dateStr] = { events: [], tasks: [] }
        datesMap[dateStr].tasks.push(t)
      }
    })

    // Sort dates
    const sortedDatesStr = Object.keys(datesMap).sort()
    return sortedDatesStr.map(dateStr => {
      const d = new Date(dateStr + 'T12:00:00') // avoid timezone shifts
      const displays = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      return {
        dateStr,
        displayLabel: displays,
        events: datesMap[dateStr].events,
        tasks: datesMap[dateStr].tasks
      }
    })
  }, [events, tasks])

  if (agendaItems.length === 0) {
    return (
      <div className="border border-dashed border-zinc-800 rounded-3xl p-12 text-center max-w-sm mx-auto my-12">
        <Sparkles size={24} className="text-zinc-500 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-zinc-300">Agenda is Empty</h3>
        <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
          No appointments or task deadlines scheduled for the next 14 days. Create some to stay aligned.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6" id="agenda-list">
      {agendaItems.map((item) => (
        <div key={item.dateStr} className="space-y-3">
          <div className="sticky top-0 bg-[#09090b] py-1 z-10 flex items-center gap-2">
            <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {item.displayLabel}
            </span>
            <div className="flex-1 h-px bg-zinc-900" />
          </div>

          <div className="space-y-2 pl-2">
            {/* Display Events */}
            {item.events.map((evt) => {
              const start = new Date(evt.start_at)
              const end = new Date(evt.end_at)
              const timeRange = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              const project = projects.find(p => p.id === evt.project_id)
              const cleanId = evt.id.split('-repeat-')[0]

              return (
                <div 
                  key={evt.id} 
                  onClick={() => onEditEvent(evt)}
                  className="p-3 bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-900/60 hover:border-zinc-800 rounded-xl flex items-center justify-between gap-4 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-zinc-950 text-zinc-450 border border-zinc-850 shrink-0 mt-0.5" title={project?.name || 'General'}>
                      {project ? (
                        project.icon && project.icon.startsWith('data:image/') ? (
                          <img 
                            src={project.icon} 
                            alt={project.name}
                            className="w-3.5 h-3.5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                        )
                      ) : (
                        <Clock size={12} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">{evt.title}</h4>
                      {evt.description && <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed text-justify max-w-md">{evt.description}</p>}
                      <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 mt-1 font-semibold uppercase tracking-wider">
                        <Clock size={10} />
                        <span>{timeRange}</span>
                        {evt.recurrence !== 'none' && (
                          <span className="bg-purple-950/20 text-purple-400 px-1 py-0.2 rounded font-extrabold text-[8px]">
                            {formatRecurrenceLabel(evt.recurrence)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Safely clean repeat entries based on matching pattern */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const cleanId = evt.id.split('-repeat-')[0]
                      if (confirmingDeleteId !== cleanId) {
                        setConfirmingDeleteId(cleanId)
                      } else {
                        deleteEvent(cleanId)
                        setConfirmingDeleteId(null)
                      }
                    }}
                    onMouseLeave={() => setConfirmingDeleteId(null)}
                    className={cn(
                      "p-1 rounded-lg transition-all cursor-pointer shrink-0 text-[10px] font-semibold flex items-center gap-1",
                      confirmingDeleteId === cleanId
                        ? "bg-red-650/20 border border-red-500/30 text-red-400 animate-pulse font-bold"
                        : "text-zinc-650 hover:text-red-400 hover:bg-red-500/5"
                    )}
                    title={confirmingDeleteId === cleanId ? "Click again to confirm" : "Delete Event"}
                  >
                    <Trash2 size={12} />
                    {confirmingDeleteId === cleanId && <span>Confirm?</span>}
                  </button>
                </div>
              )
            })}

            {/* Display Tasks */}
            {item.tasks.map((task) => {
              const project = projects.find(p => p.id === task.project_id)
              return (
                <div
                  key={task.id}
                  className="p-3 bg-zinc-950/20 border border-zinc-900 border-dashed rounded-xl flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => completeTask(task.id)}
                      className={cn(
                        "w-4 h-4 rounded-full border cursor-pointer flex items-center justify-center transition-all text-zinc-500",
                        task.priority === 3
                          ? "border-indigo-500/90 bg-indigo-500/10 hover:border-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-450"
                          : task.priority === 2
                            ? "border-amber-500/90 bg-amber-500/10 hover:border-amber-400 hover:bg-amber-500/20 hover:text-amber-450"
                            : task.priority === 1
                              ? "border-zinc-500 bg-zinc-500/10 hover:border-zinc-400 hover:bg-zinc-500/20 hover:text-zinc-300"
                              : "border-zinc-800 bg-zinc-950 hover:border-purple-500 hover:text-purple-400"
                      )}
                      title="Mark as Complete"
                    >
                      <Check size={10} />
                    </button>
                    <div>
                      <span className="text-xs font-bold text-zinc-350 line-through opacity-70 group-hover:text-zinc-200">{task.title}</span>
                      <div className="flex items-center gap-1.5 text-[9px] text-zinc-605 mt-1 font-bold tracking-wide">
                        <span className="text-orange-400 font-extrabold uppercase">Task Deadline</span>
                        {project && (
                          <>
                            <span className="text-zinc-700">|</span>
                            <span className="text-zinc-500 font-medium">{project.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* =========================================
   MONTH VIEW GRID VIEW
   ========================================= */
interface MonthViewGridProps {
  days: Date[]
  events: CalendarEvent[]
  tasks: Task[]
  habits: Habit[]
  logs: HabitLog[]
  completeTask: (id: string) => Promise<any>
  projects: any[]
  activeMonth: number
  onDeleteEvent: (id: string) => Promise<void>
  onEditEvent: (evt: CalendarEvent) => void
}
function MonthViewGrid({ 
  days, 
  events, 
  tasks, 
  habits, 
  logs, 
  completeTask, 
  projects, 
  activeMonth,
  onDeleteEvent,
  onEditEvent
}: MonthViewGridProps): React.JSX.Element {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  return (
    <div className="h-full flex flex-col" id="month-grid">
      {/* Weekday labels */}
      <div className="grid grid-cols-7 border-b border-zinc-900 pb-2 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest shrink-0">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* 42 grid cells */}
      <div className="grid grid-cols-7 grid-rows-6 flex-1 min-h-[460px] border-l border-t border-zinc-900">
        {days.map((day, cellIdx) => {
          const dateStr = day.toLocaleDateString('en-CA')
          const isCurrentMonth = day.getMonth() === activeMonth
          const isToday = new Date().toLocaleDateString('en-CA') === dateStr

          // Filter day milestones
          const dayEvents = events.filter(e => new Date(e.start_at).toLocaleDateString('en-CA') === dateStr)
          const dayTasks = tasks.filter(t => t.due_date === dateStr && t.status !== 'done' && t.status !== 'deleted')
          
          // Habits check-in rate logs for this day
          const dayLogs = logs.filter(l => l.date === dateStr)

          return (
            <div 
              key={cellIdx}
              className={`p-2 border-r border-b border-zinc-900 flex flex-col justify-between overflow-hidden group relative transition-colors ${
                isToday 
                  ? 'bg-purple-953/5' 
                  : isCurrentMonth 
                    ? 'hover:bg-zinc-950/20' 
                    : 'opacity-25 bg-zinc-950/5'
              }`}
              id={`month-cell-${dateStr}`}
            >
              {/* Day Number Label */}
              <div className="flex items-center justify-between pb-1">
                <span className={`text-[10px] font-bold shrink-0 ${
                  isToday 
                    ? 'bg-purple-600 text-white rounded w-4.5 h-4.5 flex items-center justify-center p-0.5' 
                    : isCurrentMonth 
                      ? 'text-zinc-400' 
                      : 'text-zinc-600'
                }`}>
                  {day.getDate()}
                </span>

                {/* Habit tiny bullets indicator to reveal habit streaks directly in calendar cell */}
                {dayLogs.length > 0 && (
                  <div className="flex items-center gap-0.5" title={`${dayLogs.length} habits completed on this date`}>
                    {dayLogs.map((log) => {
                      const parentHab = habits.find(h => h.id === log.habit_id)
                      const proj = projects.find(p => p.id === parentHab?.project_id)
                      return (
                        <span 
                          key={log.id} 
                          className="w-1.5 h-1.5 rounded-full block border border-zinc-950 shadow-sm"
                          style={{ backgroundColor: proj?.color || '#a855f7' }}
                        />
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Event Stack inside Cell */}
              <div className="flex-1 overflow-y-auto space-y-1 mt-1 scrollbar-none max-h-[75px]">
                {dayEvents.map(evt => {
                  const project = projects.find(p => p.id === evt.project_id)
                  const startHour = new Date(evt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                  const rootId = evt.id.split('-repeat-')[0]
                  return (
                    <div 
                      key={evt.id}
                      onClick={() => onEditEvent(evt)}
                      className="text-[9px] font-bold px-1 py-0.5 rounded truncate flex items-center justify-between group/evt transition-all border shrink-0 text-zinc-300 cursor-pointer hover:brightness-125 hover:scale-[1.02]"
                      style={{ 
                        backgroundColor: project ? `${project.color}15` : '#27272a44',
                        borderColor: project ? `${project.color}35` : '#3f3f4655' 
                      }}
                    >
                      <span className="truncate" title={`${startHour} ${evt.title}`}>
                        {evt.title}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const rootId = evt.id.split('-repeat-')[0]
                          if (confirmingDeleteId !== rootId) {
                            setConfirmingDeleteId(rootId)
                          } else {
                            onDeleteEvent(rootId)
                            setConfirmingDeleteId(null)
                          }
                        }}
                        onMouseLeave={() => setConfirmingDeleteId(null)}
                        className={cn(
                          "transition-all",
                          confirmingDeleteId === rootId
                            ? "opacity-100 text-red-400 font-bold text-[9px] bg-red-950/30 px-1 py-0.2 rounded border border-red-500/20 scale-105 animate-pulse"
                            : "opacity-0 group-hover/evt:opacity-100 text-zinc-500 hover:text-red-400 font-normal scale-90 cursor-pointer"
                        )}
                        title={confirmingDeleteId === rootId ? "Click again to confirm delete" : "Delete appointment"}
                      >
                        {confirmingDeleteId === rootId ? 'Confirm?' : '×'}
                      </button>
                    </div>
                  )
                })}

                {/* Day Tasks */}
                {dayTasks.map(task => (
                  <div 
                    key={task.id}
                    className="text-[9px] font-semibold text-zinc-400 bg-zinc-950/50 p-0.5 border border-dashed border-zinc-800 rounded truncate flex items-center gap-1 shrink-0"
                    title={`Task due today: ${task.title}`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        completeTask(task.id)
                      }}
                      className={cn(
                        "w-2.5 h-2.5 rounded-full border shrink-0 cursor-pointer transition-colors",
                        task.priority === 3
                          ? "border-indigo-500/95 bg-indigo-500/15 hover:border-indigo-400 hover:bg-indigo-500/25"
                          : task.priority === 2
                            ? "border-amber-500/95 bg-amber-500/15 hover:border-amber-400 hover:bg-amber-500/25"
                            : task.priority === 1
                              ? "border-zinc-500 bg-zinc-500/15 hover:border-zinc-400 hover:bg-zinc-500/25"
                              : "border-zinc-700 hover:border-purple-500 bg-transparent"
                      )}
                    />
                    <span className="truncate line-through opacity-75">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* =========================================
   HOURLY HOURS COLUMNS GRID (Day, Week, Work Week)
   ========================================= */
interface HourGridProps {
  days: Date[]
  events: CalendarEvent[]
  tasks: Task[]
  habits: Habit[]
  logs: HabitLog[]
  projects: any[]
  now: Date
  hours: number[]
  viewMode: CalendarViewMode
  onDeleteEvent: (id: string) => Promise<void>
  onEditEvent: (evt: CalendarEvent) => void
}
function HourGridColumns({
  days,
  events,
  tasks,
  habits,
  logs,
  projects,
  now,
  hours,
  viewMode,
  onDeleteEvent,
  onEditEvent
}: HourGridProps): React.JSX.Element {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  // Height constants for grid alignment
  const hourHeight = 60 // 1 hour = 60px height
  const nowLinePos = useMemo(() => {
    // Return relative top offset of current time in pixels
    const currH = now.getHours()
    const currM = now.getMinutes()
    return currH * hourHeight + (currM / 60) * hourHeight
  }, [now])

  const todayStr = now.toLocaleDateString('en-CA')

  useEffect(() => {
    const grid = document.getElementById('scrollable-hour-grid')
    if (grid) {
      const scrollTarget = Math.max(0, nowLinePos - 150)
      grid.scrollTop = scrollTarget
    }
  }, [nowLinePos])

  return (
    <div className="flex flex-col h-full overflow-x-auto select-none" id="hourly-flexible-grid">
      {/* 1. Header Grid labels columns */}
      <div className="flex bg-zinc-950/20 border border-zinc-900 rounded-xl mb-3 shrink-0">
        {/* Time hour padding block left */}
        <div className="w-14 shrink-0 text-center text-[10px] text-zinc-500 font-bold uppercase flex items-center justify-center border-r border-zinc-900">
          Time
        </div>

        {/* Days columns labels */}
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(130px, 1fr))` }}>
          {days.map((day, idx) => {
            const dateStr = day.toLocaleDateString('en-CA')
            const isToday = dateStr === todayStr
            const isFirst = idx === 0
            
            // Collect day tasks & active habits checked on this day
            const dayLogs = logs.filter(l => l.date === dateStr)
            const dayTasksCount = tasks.filter(t => t.due_date === dateStr && t.status !== 'done' && t.status !== 'deleted').length

            return (
              <div 
                key={dateStr}
                className={`py-3 px-3 text-center flex flex-col justify-center items-center gap-1.5 ${
                  !isFirst ? 'border-l border-zinc-900' : ''
                } ${isToday ? 'bg-purple-953/5' : ''}`}
              >
                <div className="leading-none">
                  <p className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider">
                    {day.toLocaleDateString(undefined, { weekday: 'short' })}
                  </p>
                  <p className={`text-base font-black mt-1 mt-0.5 leading-none ${isToday ? 'text-purple-400' : 'text-zinc-300'}`}>
                    {day.getDate()}
                  </p>
                </div>

                {/* Day status links summary */}
                {(dayTasksCount > 0 || dayLogs.length > 0) && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {dayTasksCount > 0 && (
                      <span className="text-[8px] font-bold bg-amber-500/10 border border-amber-500/10 text-amber-400 px-1 py-0.2 rounded" title={`${dayTasksCount} pending milestones due today`}>
                        {dayTasksCount}td
                      </span>
                    )}
                    {dayLogs.length > 0 && (
                      <div className="flex items-center -space-x-1" title={`${dayLogs.length} habits done`}>
                        {dayLogs.map((log) => {
                          const hab = habits.find(h => h.id === log.habit_id)
                          const proj = projects.find(p => p.id === hab?.project_id)
                          return (
                            <span 
                              key={log.id} 
                              className="w-1.5 h-1.5 rounded-full border border-zinc-950"
                              style={{ backgroundColor: proj?.color || '#a855f7' }}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. Scrollable Body containing hour intervals and events */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto relative border border-zinc-900 rounded-2xl bg-zinc-950/10 flex flex-row"
        id="scrollable-hour-grid"
      >
        
        {/* Hour Interval labels sidebar */}
        <div 
          className="w-14 shrink-0 bg-zinc-950/20 border-r border-[#151518] hover:border-zinc-900/60 flex flex-col pt-0" 
          style={{ height: `${24 * hourHeight}px` }}
        >
          {hours.map((hr) => (
            <div 
              key={hr} 
              className="text-[9px] font-bold text-zinc-500/70 border-b border-zinc-900/60 flex items-start justify-center pt-1"
              style={{ height: `${hourHeight}px` }}
            >
              <span>{hr === 12 ? '12 PM' : hr === 0 ? '12 AM' : hr > 12 ? `${hr - 12} PM` : `${hr} AM`}</span>
            </div>
          ))}
        </div>

        {/* Calendar days grid tracks panel */}
        <div 
          className="flex-1 grid relative" 
          style={{ 
            height: `${24 * hourHeight}px`,
            gridTemplateColumns: `repeat(${days.length}, minmax(130px, 1fr))`
          }}
        >
          {/* Solid hour-lines & dashed half-hour lines */}
          {Array.from({ length: 24 }).map((_, i) => (
            <Fragment key={i}>
              {/* Solid Hour Line */}
              {i > 0 && (
                <div 
                  className="absolute left-0 right-0 border-t border-zinc-900/60 pointer-events-none z-0" 
                  style={{ top: `${i * hourHeight}px` }}
                />
              )}
              {/* Dashed Half-Hour Line */}
              <div 
                className="absolute left-0 right-0 border-t border-dashed border-zinc-900/25 pointer-events-none z-0" 
                style={{ top: `${i * hourHeight + 30}px` }}
              />
            </Fragment>
          ))}

          {days.map((day, colIdx) => {
            const dateStr = day.toLocaleDateString('en-CA')
            const isToday = dateStr === todayStr

            // Gather elements for this column only
            const colEvents = events.filter(e => new Date(e.start_at).toLocaleDateString('en-CA') === dateStr)

            return (
              <div 
                key={dateStr}
                className={`relative h-full z-10 ${
                  colIdx > 0 ? 'border-l border-zinc-900/40' : ''
                } ${isToday ? 'bg-purple-903/2 bg-[#0c081720]' : ''}`}
                id={`col-track-${dateStr}`}
              >
                {/* Now Line Indicator inside today column */}
                {isToday && (
                  <div 
                    className="absolute left-0 right-0 h-0.5 bg-red-500 z-30 pointer-events-none flex items-center shadow-lg shadow-red-500/50"
                    style={{ top: `${nowLinePos}px` }}
                    id="grid-now-line"
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-500/30 -ml-1 shrink-0 animate-ping absolute" />
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 -ml-0.8 shrink-0 relative" />
                  </div>
                )}

                {/* Thinner, more transparent now-line adjacent to the current-day one in week/workweek layouts */}
                {!isToday && (viewMode === 'week' || viewMode === 'workweek') && (
                  <div 
                    className="absolute left-0 right-0 h-[1px] bg-red-500/20 z-20 pointer-events-none"
                    style={{ top: `${nowLinePos}px` }}
                  />
                )}

                {/* Day events visual cards */}
                {colEvents.map((evt) => {
                  const evdStart = new Date(evt.start_at)
                  const evdEnd = new Date(evt.end_at)
                  
                  const startRatio = evdStart.getHours() + evdStart.getMinutes() / 60
                  const endRatio = evdEnd.getHours() + evdEnd.getMinutes() / 60
                  const durationHrs = Math.max(0.5, endRatio - startRatio) // min half hour card size

                  const topOffsetPx = startRatio * hourHeight
                  const heightPx = durationHrs * hourHeight

                  const project = projects.find(p => p.id === evt.project_id)
                  const timeStr = `${evdStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  const rootId = evt.id.split('-repeat-')[0]

                  // Sizing variables for flexible/dynamic layout adaptibility
                  const isTiny = heightPx <= 38
                  const isSmall = heightPx > 38 && heightPx <= 55
                  const isMedium = heightPx > 55 && heightPx <= 80

                  let cardPadding = 'p-3.5'
                  let titleClass = 'text-[11px] font-black group-hover:text-white'

                  if (isTiny) {
                    cardPadding = 'px-2 py-0.5'
                    titleClass = 'text-[9.5px] font-bold leading-none'
                  } else if (isSmall) {
                    cardPadding = 'px-2.5 py-1.5'
                    titleClass = 'text-[10px] font-extrabold leading-none'
                  } else if (isMedium) {
                    cardPadding = 'px-3 py-2'
                    titleClass = 'text-[10.5px] font-extrabold leading-tight'
                  }

                  return (
                    <div
                      key={evt.id}
                      onClick={() => onEditEvent(evt)}
                      className={`absolute left-1.5 right-1.5 rounded-xl border ${cardPadding} overflow-hidden group cursor-pointer transition-all duration-300 shadow shadow-black/20 hover:scale-98 active:scale-99 hover:-translate-y-0.2 z-20`}
                      style={{
                        top: `${topOffsetPx}px`,
                        height: `${heightPx}px`,
                        backgroundColor: project ? `${project.color}15` : '#18181b77',
                        borderColor: project ? `${project.color}35` : '#27272a77',
                      }}
                      id={`cal-card-${evt.id}`}
                    >
                      {isTiny ? (
                        /* Tiny Sizing layout (Single tight horizontal row) */
                        <div className="flex items-center justify-between gap-1.5 h-full w-full">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {project && (
                              project.icon && project.icon.startsWith('data:image/') ? (
                                <img src={project.icon} alt={project.name} className="w-2.5 h-2.5 rounded-full object-cover shrink-0" title={project.name} />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} title={project?.name} />
                              )
                            )}
                            <h4 className={`${titleClass} text-zinc-150 truncate`} title={evt.title}>
                              {evt.title}
                            </h4>
                          </div>
                          
                          <div className="flex items-center shrink-0">
                            <span className="text-[8px] font-bold font-mono text-zinc-500 group-hover:hidden whitespace-nowrap">
                              {timeStr}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const rootId = evt.id.split('-repeat-')[0]
                                if (confirmingDeleteId !== rootId) {
                                  setConfirmingDeleteId(rootId)
                                } else {
                                  onDeleteEvent(rootId)
                                  setConfirmingDeleteId(null)
                                }
                              }}
                              onMouseLeave={() => setConfirmingDeleteId(null)}
                              className={cn(
                                "rounded transition-all",
                                confirmingDeleteId === rootId
                                  ? "opacity-100 text-red-400 bg-red-950/40 px-1 py-0.2 rounded border border-red-500/20 scale-105"
                                  : "hidden group-hover:block text-zinc-500 hover:text-red-400 p-0.5 cursor-pointer"
                              )}
                              title={confirmingDeleteId === rootId ? "Click again to delete" : "Delete"}
                            >
                              {confirmingDeleteId === rootId ? (
                                <span className="text-[7px] font-bold">Confirm?</span>
                              ) : (
                                <Trash2 size={9} />
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Flexible adaptive column layout */
                        <div className="flex flex-col h-full justify-between">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <h4 className={`${titleClass} text-zinc-150 truncate`} title={evt.title}>
                                {evt.title}
                              </h4>
                              
                              {/* Dynamic description lines depending on container height */}
                              {evt.description && !isSmall && (
                                <p 
                                  className="text-[9px] text-zinc-450 font-medium leading-none mt-0.5"
                                  style={
                                    isMedium 
                                      ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
                                      : {
                                          display: '-webkit-box',
                                          WebkitLineClamp: heightPx > 110 ? 3 : 2,
                                          WebkitBoxOrient: 'vertical',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          lineHeight: '1.25'
                                        }
                                  }
                                >
                                  {evt.description}
                                </p>
                              )}
                            </div>

                            {/* Top corner color handle */}
                            {project && (
                              project.icon && project.icon.startsWith('data:image/') ? (
                                <img src={project.icon} alt={project.name} className="w-2.5 h-2.5 rounded-full object-cover shrink-0 mt-0.5" title={project.name} />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-0.8" style={{ backgroundColor: project.color }} title={project.name} />
                              )
                            )}
                          </div>

                          {/* Card Footer controls */}
                          <div className="flex items-center justify-between text-[8px] font-bold tracking-wider text-zinc-500/80 uppercase mt-0.5">
                            <span className="flex items-center gap-0.5 shrink-0">
                              <Clock size={8} /> {timeStr}
                            </span>

                            {evt.recurrence !== 'none' && !isSmall && (
                              <span className="bg-purple-950/30 text-purple-400 px-1 py-0.2 rounded shrink-0 font-extrabold scale-90">
                                {formatRecurrenceLabel(evt.recurrence)}
                              </span>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const rootId = evt.id.split('-repeat-')[0]
                                if (confirmingDeleteId !== rootId) {
                                  setConfirmingDeleteId(rootId)
                                } else {
                                  onDeleteEvent(rootId)
                                  setConfirmingDeleteId(null)
                                }
                              }}
                              onMouseLeave={() => setConfirmingDeleteId(null)}
                              className={cn(
                                "rounded transition-all scale-105",
                                confirmingDeleteId === rootId
                                  ? "opacity-100 text-red-400 bg-red-950/45 px-1.5 py-0.5 rounded border border-red-500/20 scale-110"
                                  : "opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-0.5 cursor-pointer"
                              )}
                              title={confirmingDeleteId === rootId ? "Click again to delete" : "Delete"}
                            >
                              {confirmingDeleteId === rootId ? (
                                <span className="text-[7.5px] font-bold animate-pulse">Confirm?</span>
                              ) : (
                                <Trash2 size={10} />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
