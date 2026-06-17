// src/renderer/src/pages/HabitsView.tsx
import { useState } from 'react'
import { useHabits } from '../hooks/useHabits'
import { useProjects } from '../hooks/useProjects'
import { 
  Flame, 
  Pause, 
  Play, 
  Link2, 
  Plus, 
  Trash2, 
  Check, 
  Calendar, 
  Folder, 
  Sparkles,
  Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

export function HabitsView() {
  const { 
    habits, 
    logs, 
    loading, 
    createHabit, 
    updateHabit, 
    deleteHabit, 
    checkIn, 
    uncheckIn 
  } = useHabits()

  const { projects } = useProjects()

  // Form states
  const [showAddForm, setShowAddForm] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitProject, setNewHabitProject] = useState<string>('')
  const [newHabitSessionLink, setNewHabitSessionLink] = useState(false)

  // Filters
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all')

  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD

  // Generate last 16 weeks of dates (112 days) for the calendar heatmap
  const getHeatmapDays = () => {
    const days: string[] = []
    const today = new Date()
    for (let i = 111; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      days.push(d.toLocaleDateString('en-CA'))
    }
    return days
  }

  const heatmapDays = getHeatmapDays()

  // Filter habits
  const filteredHabits = habits.filter(h => {
    if (projectFilter && h.project_id !== projectFilter) return false
    if (statusFilter === 'active' && h.is_paused === 1) return false
    if (statusFilter === 'paused' && h.is_paused === 0) return false
    return true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newHabitName.trim()) return

    await createHabit({
      name: newHabitName.trim(),
      frequency: 'daily',
      project_id: newHabitProject === '' ? null : newHabitProject,
      session_link: newHabitSessionLink ? 1 : 0,
      is_paused: 0
    })

    // Reset Form
    setNewHabitName('')
    setNewHabitProject('')
    setNewHabitSessionLink(false)
    setShowAddForm(false)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 sm:p-8 bg-[#09090b] text-zinc-100" id="habits-view-container">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-zinc-50 tracking-tight flex items-center gap-2">
            <Sparkles className="text-purple-400" size={20} />
            Habit Tracker
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Build good habits and stop bad ones! Check in daily and watch yourself grow.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-lg shadow-purple-950/20"
          id="toggle-add-habit-btn"
        >
          <Plus size={14} />
          Create Habit
        </button>
      </div>

      {/* Creation Drawer / Collapse Panel */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <form 
              onSubmit={handleSubmit}
              className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-xl flex flex-col gap-4"
              id="add-habit-form"
            >
              <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-widest flex items-center gap-1.5">
                <Plus size={12} /> New Habit Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Habit Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Code for 1 hour, Write tech summary..."
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/80 transition-all font-medium"
                  />
                </div>

                {/* Project / Category */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Project Categorization</label>
                  <select
                    value={newHabitProject}
                    onChange={(e) => setNewHabitProject(e.target.value)}
                    className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-350 focus:outline-none focus:border-purple-500/80 transition-all"
                  >
                    <option value="">Independent (No Project Mapping)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggle Box */}
              <div className="flex bg-zinc-950/40 border border-zinc-850 p-3 rounded-xl items-center justify-between mt-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-505/10 text-indigo-400 border border-indigo-500/10">
                    <Link2 size={15} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-zinc-250">Link to Focus Sessions</p>
                    <p className="text-[10px] text-zinc-450 leading-relaxed">
                      Completing a session (optionally belonging to the project card) automatically checks this habit for today.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewHabitSessionLink(!newHabitSessionLink)}
                  className={`w-10 h-6 p-0.5 rounded-full transition-colors cursor-pointer flex ${
                    newHabitSessionLink ? 'bg-indigo-650 justify-end' : 'bg-zinc-800 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-sm block" />
                </button>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-zinc-100 text-zinc-950 font-semibold rounded-xl text-xs cursor-pointer active:scale-95 transition-all shadow-sm"
                >
                  Save Habit
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-zinc-900 pb-4">
        {/* Status Tab buttons */}
        <div className="flex items-center gap-2 bg-zinc-900/30 p-1 border border-zinc-850 rounded-xl">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'all' 
                ? 'bg-zinc-800 text-zinc-100' 
                : 'text-zinc-450 hover:text-zinc-250'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'active' 
                ? 'bg-zinc-805 text-zinc-100' 
                : 'text-zinc-450 hover:text-zinc-250'
            }`}
          >
            Active Habits
          </button>
          <button
            onClick={() => setStatusFilter('paused')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'paused' 
                ? 'bg-zinc-805 text-zinc-100' 
                : 'text-zinc-450 hover:text-zinc-250'
            }`}
          >
            Paused (Vacation Mode)
          </button>
        </div>

        {/* Project filtering selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Project:</span>
          <select
            value={projectFilter || ''}
            onChange={(e) => setProjectFilter(e.target.value === '' ? null : e.target.value)}
            className="px-2.5 py-1 bg-zinc-900 border border-zinc-850 rounded-lg text-xs text-zinc-350 focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && habits.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center gap-2 p-12 text-zinc-450">
          <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-xs">Accessing SQL database...</p>
        </div>
      ) : filteredHabits.length === 0 ? (
        <div className="flex-1 border border-dashed border-zinc-800 rounded-2xl flex flex-col justify-center items-center p-12 text-center" id="empty-habits-fallback">
          <Calendar className="text-zinc-500 mb-3" size={24} />
          <h3 className="text-sm font-semibold text-zinc-300">No Habits Found</h3>
          <p className="text-xs text-zinc-500 max-w-xs mt-1 leading-relaxed">
            Create some beautiful core habits, map them to work projects, or turn on the vacation mode skip button.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold rounded-xl text-zinc-320 cursor-pointer"
          >
            Create Your First Habit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6" id="habits-grid">
          {filteredHabits.map((habit) => {
            const mappedProject = projects.find(p => p.id === habit.project_id)
            const habitLogs = logs.filter(l => l.habit_id === habit.id)
            const completedCount = habitLogs.length

            const habitLogDates = habitLogs.map(l => l.date)
            // Pre-calculate indices of checked in days for distance-based fading
            const checkedInIndices = heatmapDays
              .map((day, idx) => habitLogDates.includes(day) ? idx : -1)
              .filter(idx => idx !== -1)

            const getBlankDotOpacity = (globalIndex: number) => {
              if (checkedInIndices.length === 0) {
                // If there are no checked-in days, fade them out smoothly relative to today (the right-most element, index 111)
                const distToToday = 111 - globalIndex
                return Math.max(0.015, 0.16 - distToToday * 0.0016)
              }
              const minDistance = Math.min(...checkedInIndices.map(idx => Math.abs(idx - globalIndex)))
              // Hyperbolic falloff: higher opacity near checked in days, fading out smoothly farther away
              return Math.max(0.015, 0.22 / (1 + minDistance * 0.08))
            }

            // Calculate total days since habit was created, inclusive of today
            const parseDate = (dStr: string) => {
              let normalized = dStr
              if (!normalized.includes('T') && normalized.includes(' ')) {
                normalized = normalized.replace(' ', 'T')
              }
              if (!normalized.endsWith('Z')) {
                normalized = normalized + 'Z'
              }
              return new Date(normalized)
            }
            const createdDateStr = parseDate(habit.created_at || new Date().toISOString()).toLocaleDateString('en-CA')
            const todayDateStr = new Date().toLocaleDateString('en-CA')
            const createdMidnight = new Date(createdDateStr)
            const todayMidnight = new Date(todayDateStr)
            const diffTime = todayMidnight.getTime() - createdMidnight.getTime()
            const diffDays = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1)
            const completionRate = Math.min(100, Math.round((completedCount / diffDays) * 100))

            const isCompletedToday = logs.some(l => l.habit_id === habit.id && l.date === todayStr)

            return (
              <div 
                key={habit.id}
                className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden relative ${
                  habit.is_paused === 1 
                    ? 'bg-zinc-950/30 border-zinc-900/50 opacity-60' 
                    : isCompletedToday
                      ? 'bg-zinc-900/30 border-purple-950/30 shadow-sm shadow-purple-950/5'
                      : 'bg-zinc-900/20 border-zinc-800/50 hover:border-zinc-800'
                }`}
                id={`habit-${habit.id}`}
              >
                {/* Visual Glow behind highly consistent items */}
                {habit.current_streak >= 3 && habit.is_paused === 0 && (
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-orange-600/10 blur-2xl rounded-full pointer-events-none" />
                )}

                {/* Top Section */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold text-zinc-150 tracking-wide leading-snug">
                        {habit.name}
                      </h2>
                      {habit.is_paused === 1 && (
                        <span className="text-[9px] font-bold bg-zinc-850 text-zinc-400 border border-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Paused / Skipping
                        </span>
                      )}
                      {habit.session_link === 1 && (
                        <span className="text-[9px] font-bold bg-indigo-505/10 text-indigo-400 border border-indigo-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Link2 size={9} /> AutoFocus
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      {mappedProject ? (
                        <span 
                          className="text-[10px] items-center font-semibold px-2 py-0.5 rounded-full border flex gap-1 cursor-default text-zinc-400"
                          style={{ borderColor: `${mappedProject.color}30`, backgroundColor: `${mappedProject.color}10` }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: mappedProject.color }} />
                          {mappedProject.name}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-zinc-500 flex items-center gap-1.5">
                          <Folder size={11} /> General Habit
                        </span>
                      )}
                    </div>
                  </div>

                  {/* One-Tap Click Check-In circle */}
                  <button
                    onClick={() => {
                      if (habit.is_paused === 1) return
                      if (isCompletedToday) {
                        uncheckIn(habit.id, todayStr)
                      } else {
                        checkIn(habit.id, todayStr)
                      }
                    }}
                    disabled={habit.is_paused === 1}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer active:scale-90 transition-all shadow-md group border ${
                      isCompletedToday
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : habit.is_paused === 1
                          ? 'bg-zinc-900 border-transparent text-zinc-600 cursor-not-allowed'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-750 text-transparent hover:text-zinc-600'
                    }`}
                    title={habit.is_paused === 1 ? "Unpause to check in" : isCompletedToday ? "Completed today! Click to undo." : "Click to check-in!"}
                    id={`habit-check-in-${habit.id}`}
                  >
                    <Check size={16} className={isCompletedToday ? "stroke-[3px]" : "group-hover:text-zinc-400"} />
                  </button>
                </div>

                {/* Middle Streak Stats Panel */}
                <div className="grid grid-cols-3 gap-3 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900/60 my-4 items-center">
                  <div className="flex flex-col gap-0.5 text-center sm:text-left">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Streaks</p>
                    <div className="flex items-center justify-center sm:justify-start gap-1 mt-1 text-orange-400 font-bold text-sm">
                      <Flame size={15} className={habit.current_streak > 0 ? "fill-orange-400/20" : "opacity-30"} />
                      <span>{habit.current_streak}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5 text-center border-x border-zinc-900 px-1 leading-none">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Longest</p>
                    <p className="mt-1 text-zinc-200 font-bold text-sm">
                      {habit.longest_streak}d
                    </p>
                  </div>

                  <div className="flex flex-col gap-0.5 text-center sm:text-right">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Consistency</p>
                    <p className="mt-1 text-purple-400 font-bold text-xs">
                      {completionRate}%
                    </p>
                  </div>
                </div>

                {/* Interactive Heatmap contribution grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] text-zinc-500 font-semibold px-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} /> Past 16 Weeks History:
                    </span>
                    <span>{completedCount} check-ins</span>
                  </div>

                  {/* 16 week tiny grid container */}
                  <div className="flex gap-1.2 overflow-x-auto whitespace-nowrap bg-zinc-950/30 p-2.5 rounded-xl border border-zinc-900/60 scrollbar-none justify-between">
                    {/* Visualizing 16 weeks as columns of 7 elements */}
                    {Array.from({ length: 16 }).map((_, weekIndex) => {
                      const weekDays = heatmapDays.slice(weekIndex * 7, (weekIndex + 1) * 7)
                      return (
                        <div key={weekIndex} className="flex flex-col gap-1.2">
                          {weekDays.map((dayStr, dayInWeekIndex) => {
                            const globalIndex = weekIndex * 7 + dayInWeekIndex
                            const isDone = logs.some(l => l.habit_id === habit.id && l.date === dayStr)
                            return (
                              <div
                                key={dayStr}
                                className={`w-2 h-2 rounded-sm transition-all hover:scale-150 hover:!opacity-85 hover:brightness-125 relative group cursor-pointer ${
                                  isDone
                                    ? mappedProject 
                                      ? 'brightness-110 shadow-sm'
                                      : 'bg-purple-600 shadow-sm'
                                    : ''
                                }`}
                                style={isDone 
                                  ? (mappedProject ? { backgroundColor: mappedProject.color } : {})
                                  : { 
                                      backgroundColor: mappedProject ? mappedProject.color : '#818cf8',
                                      opacity: getBlankDotOpacity(globalIndex)
                                    }
                                }
                              >
                                {/* Tooltip on hover */}
                                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[8px] px-1.5 py-0.5 rounded border border-zinc-800 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg whitespace-nowrap">
                                  {dayStr}: {isDone ? 'Checked In' : 'No Log'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Bottom Card Actions: Vacation Pause Toggle, linking Toggle, Delete */}
                <div className="flex items-center justify-between gap-4 mt-4 pt-3.5 border-t border-zinc-900/80">
                  <div className="flex items-center gap-2">
                    {/* Pause Toggle button */}
                    <button
                      onClick={() => updateHabit({ id: habit.id, is_paused: habit.is_paused === 1 ? 0 : 1 })}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors border ${
                        habit.is_paused === 1
                          ? 'bg-amber-600/10 border-amber-500/20 text-amber-400 hover:bg-amber-655/20'
                          : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-320 hover:bg-zinc-900'
                      }`}
                      title={habit.is_paused === 1 ? "Resume Habit streak counting!" : "Pause streak (vacation mode)"}
                      id={`habit-pause-toggle-${habit.id}`}
                    >
                      {habit.is_paused === 1 ? <Play size={10} /> : <Pause size={10} />}
                      <span>{habit.is_paused === 1 ? 'Resume Work' : 'Vacation Pause'}</span>
                    </button>

                    {/* Linking switch */}
                    <button
                      onClick={() => updateHabit({ id: habit.id, session_link: habit.session_link === 1 ? 0 : 1 })}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors border ${
                        habit.session_link === 1
                          ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400'
                          : 'bg-zinc-950 border-zinc-850 text-zinc-500 hover:text-zinc-400'
                      }`}
                      id={`habit-session-toggle-${habit.id}`}
                    >
                      <Link2 size={10} />
                      <span>{habit.session_link === 1 ? 'Linked Session' : 'Manual Log'}</span>
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete the habit "${habit.name}"? This deletes all history logs and reset streaks.`)) {
                        deleteHabit(habit.id)
                      }
                    }}
                    className="p-1.5 text-zinc-650 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors cursor-pointer"
                    title="Delete Habit"
                    id={`habit-delete-btn-${habit.id}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info card at the bottom */}
      <div className="mt-8 p-4 bg-zinc-950/20 border border-zinc-900 rounded-2xl flex items-start gap-3">
        <Info className="text-zinc-500 shrink-0 mt-0.5" size={16} />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-zinc-300">Habit Streaks & Pauses</p>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Streaks are kept alive if a habit is checked-in without missing scheduled days. Enabling "Vacation Pause" freezes the streak at its last check-in state, keeping you from losing the streak and letting you resume building habits easily.
          </p>
        </div>
      </div>
    </div>
  )
}
