// src/renderer/src/components/rituals/MorningPlan.tsx
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap'
import { 
  Sunrise, 
  Check, 
  ChevronRight, 
  ArrowRight, 
  Trash2, 
  Clock, 
  Calendar, 
  Plus, 
  AlertTriangle,
  RefreshCw,
  X,
  Target
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useTasks } from '../../hooks/useTasks'

interface CapacityState {
  available: number
  committed: number
  ratio: number
  status: 'light' | 'balanced' | 'tight' | 'overloaded'
}

export function MorningPlan() {
  const [step, setStep] = useState(1)
  const { tasks, updateTask, deleteTask } = useTasks()
  const { setShowMorningPlan, incrementTasksRevision } = useAppStore()

  const containerRef = useModalFocusTrap<HTMLDivElement>({
    isOpen: true,
    onClose: () => setShowMorningPlan(false)
  })
  
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), [])
  
  // Confetti / Completion state
  const [isCompleted, setIsCompleted] = useState(false)

  // Suggestion blocks
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)

  // Capacity states
  const [capacity, setCapacity] = useState<CapacityState>({
    available: 6.5,
    committed: 0,
    ratio: 0,
    status: 'light'
  })

  // Load capacity & suggestions
  const [yesterdayFeedback, setYesterdayFeedback] = useState<string>('')

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getWellnessAnalytics().then(an => {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toLocaleDateString('en-CA')
        
        const rec = an?.dailyDeepWork?.find((d: any) => d.date === yesterdayStr)
        if (rec && rec.minutes > 0) {
          const hrs = (rec.minutes / 60).toFixed(1).replace('.0', '')
          setYesterdayFeedback(`You had ${hrs}hrs of deep work yesterday — a solid focus day for your cycle.`)
        } else {
          setYesterdayFeedback('Ready to build a mindful day of focus? Keeping your commitments tight protects your cognitive capacity.')
        }
      }).catch(console.error)
    }
  }, [])

  const refreshCapacityAndSuggestions = async () => {
    if (window.electronAPI) {
      try {
        const cap = await window.electronAPI.getCapacityToday()
        setCapacity(cap)
        
        setIsLoadingSuggestions(true)
        const suggs = await window.electronAPI.generateSuggestions()
        setSuggestions(suggs || [])
      } catch (err) {
        console.error('Failed to load morning ritual data:', err)
      } finally {
        setIsLoadingSuggestions(false)
      }
    }
  }

  useEffect(() => {
    refreshCapacityAndSuggestions()
  }, [tasks])

  // 1. Fetch overdue tasks (todo/in_progress with due_date in the past)
  const overdueTasks = useMemo(() => {
    return tasks.filter(t => 
      (t.status === 'todo' || t.status === 'in_progress' || (t as any).status === 'todo') && 
      t.due_date && 
      t.due_date < todayStr
    )
  }, [tasks, todayStr])

  // 2. Fetch today's current focus committed tasks (due today)
  const todayTasks = useMemo(() => {
    return tasks.filter(t => 
      (t.status === 'todo' || t.status === 'in_progress') && 
      t.due_date === todayStr
    )
  }, [tasks, todayStr])

  // 3. Keep a pool of backlog tasks (undated or inside inbox) that can be committed to Today
  const backlogTasks = useMemo(() => {
    return tasks.filter(t => 
      (t.status === 'todo' || t.status === 'in_progress') && 
      (!t.due_date || t.due_date === '')
    )
  }, [tasks])

  // Complete Morning Plan Ritual
  const handleFinalize = async () => {
    const payload = {
      tasksCommitted: todayTasks.map(t => t.id),
      capacity: {
        available: capacity.available,
        committed: capacity.committed
      },
      completedAt: new Date().toISOString()
    }

    if (window.electronAPI) {
      try {
        await window.electronAPI.saveRitualEntry('morning', todayStr, JSON.stringify(payload))
        incrementTasksRevision()
      } catch (err) {
        console.error('Failed to save morning ritual entry:', err)
      }
    }

    setIsCompleted(true)
    setTimeout(() => {
      setShowMorningPlan(false)
    }, 2000)
  }

  // Quick Action Handlers for Carry-Forward (Step 1)
  const handleMoveToToday = (taskId: string) => {
    updateTask({ id: taskId, due_date: todayStr })
  }

  const handleDeferTomorrow = (taskId: string) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    updateTask({ id: taskId, due_date: tomorrow.toLocaleDateString('en-CA') })
  }

  const handleBulkMoveToToday = () => {
    overdueTasks.forEach(t => {
      updateTask({ id: t.id, due_date: todayStr })
    })
  }

  const handleBulkDeferTomorrow = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA')
    overdueTasks.forEach(t => {
      updateTask({ id: t.id, due_date: tomorrowStr })
    })
  }

  // Suggestion acceptor
  const handleAcceptSuggestion = async (suggId: string) => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.acceptSuggestion(suggId)
        // Refresh suggestions
        const newSuggs = await window.electronAPI.generateSuggestions()
        setSuggestions(newSuggs || [])
        incrementTasksRevision()
      } catch (err) {
        console.error('Error accepting suggestion:', err)
      }
    }
  }

  // Capacity styling helper
  const getCapacityStatusAlert = () => {
    if (capacity.status === 'overloaded') {
      return {
        bg: 'bg-red-500/10 border-red-500/30 text-red-200',
        icon: <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />,
        heading: 'Capacity Overloaded',
        desc: 'You have estimated more focus hours than you physically have available. Consider deferring some tasks or shortening your focus targets.'
      }
    }
    if (capacity.status === 'tight') {
      return {
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
        icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
        heading: 'Slightly Packed',
        desc: 'You are right at your maximum focus limits. Ensure you take rest buffers between these intense deep-work sprints.'
      }
    }
    if (capacity.status === 'balanced') {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
        icon: <Check className="w-5 h-5 text-emerald-400 shrink-0" />,
        heading: 'Perfect Alignment',
        desc: 'Your day looks beautifully structured. You have a balanced load of tasks and ample break buffers planned!'
      }
    }
    return {
      bg: 'bg-indigo-500/10 border-indigo-505/30 text-indigo-200',
      icon: <Check className="w-5 h-5 text-indigo-400 shrink-0" />,
      heading: 'Smooth Path Ahead',
      desc: 'You have plenty of breathing room. Feel free to pull in a secondary backlog item, or stick with a cozy, low-stress day of deep work.'
    }
  }

  const alertDetails = getCapacityStatusAlert()

  // Steps Configuration
  const stepsMeta = [
    { num: 1, label: 'Carry Forward' },
    { num: 2, label: 'Today\'s Focus' },
    { num: 3, label: 'Capacity Review' },
    { num: 4, label: 'Smart Suggestions' }
  ]

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4 outline-none" 
      id="morning-plan-overlay"
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
    >
      <AnimatePresence mode="wait">
        {isCompleted ? (
          <motion.div 
            key="complete-splash"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center shadow-2xl relative overflow-hidden"
            id="morning-plan-complete"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-purple-500/5 to-transparent pointer-events-none" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-20 h-20 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 text-amber-300"
            >
              <Sunrise className="w-10 h-10 animate-pulse" />
            </motion.div>
            <h2 className="text-2xl font-bold font-sans text-zinc-100 mb-2">My Day is Placed</h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
              You are beautifully aligned. Go forward with absolute intentionality and crush your focus goals.
            </p>
          </motion.div>
        ) : (
          <motion.div 
            key="plan-modal"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            className="w-full max-w-4xl h-[650px] bg-zinc-950/90 border border-zinc-800/80 rounded-2xl shadow-2xl backdrop-blur-2xl flex flex-col relative overflow-hidden"
            id="morning-plan-container"
          >
            {/* Top color tag */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 opacity-90" />

            {/* Header */}
            <header className="px-6 py-5 border-b border-zinc-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Sunrise className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-md font-semibold text-zinc-100 font-sans tracking-tight">Morning Plan</h1>
                  <p className="text-xs text-zinc-400">Frictionless ritual to command your day</p>
                </div>
              </div>

              {/* Steps Indicator */}
              <div className="hidden sm:flex items-center gap-1.5" id="morning-plan-steps-indicator">
                {stepsMeta.map(it => {
                  const isActive = step === it.num;
                  const isCompleted = step > it.num;
                  return (
                    <div key={it.num} className="flex items-center">
                      <div 
                        className={`h-6 rounded-full text-xs font-medium flex items-center justify-center transition-all duration-300 ${
                          isActive 
                            ? 'px-3 bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow shadow-amber-500/10 gap-1.5' 
                            : isCompleted
                              ? 'w-6 bg-zinc-800/40 border border-zinc-700/40 text-zinc-400'
                              : 'w-6 bg-zinc-900/20 border border-transparent text-zinc-600'
                        }`}
                        title={it.label}
                      >
                        <span>{it.num}</span>
                        {isActive && <span className="whitespace-nowrap transition-opacity duration-300">{it.label}</span>}
                      </div>
                      {it.num < 4 && <ChevronRight className="w-3.5 h-3.5 text-zinc-700/60 mx-1" />}
                    </div>
                  );
                })}
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setShowMorningPlan(false)} 
                className="w-10 h-10 rounded-lg hover:bg-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                aria-label="Close morning plan"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 min-h-0">
              
              {/* STEP 1: Carry Forward Yesterday's Unfinished Tasks */}
              {step === 1 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  className="space-y-6"
                >
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-semibold text-zinc-200">Unfinished Yesterday & Prior Columns</h2>
                    <p className="text-xs text-zinc-400">
                      We caught yesterday's leftovers. Move them to today, defer, or discard to avoid visual clutter.
                    </p>
                  </div>

                  {yesterdayFeedback && (
                    <div className="bg-purple-950/20 border border-purple-500/25 px-4 py-3 rounded-xl text-xs text-purple-300 flex items-center gap-2.5">
                      <Target className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>{yesterdayFeedback}</span>
                    </div>
                  )}

                  {overdueTasks.length === 0 ? (
                    <div className="border border-dashed border-zinc-800 rounded-xl p-10 text-center flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <Check className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-medium text-zinc-300">Clean slate!</h3>
                      <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
                        No outstanding rollover tasks. You completely cleared the block or yesterday was fully processed!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Bulk Actions */}
                      <div className="flex items-center gap-3 bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/60 justify-between">
                        <span className="text-xs text-zinc-400 font-sans font-medium">
                          {overdueTasks.length} rollover items pending reviews
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleBulkMoveToToday}
                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-lg transition-all cursor-pointer border border-amber-500/25"
                          >
                            All to Today
                          </button>
                          <button
                            onClick={handleBulkDeferTomorrow}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 text-xs font-semibold rounded-lg transition-all cursor-pointer border border-zinc-700"
                          >
                            All to Tomorrow
                          </button>
                        </div>
                      </div>

                      {/* Overdue Task List */}
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {overdueTasks.map(task => (
                          <div 
                            key={task.id} 
                            className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center justify-between hover:border-zinc-700/80 transition-all"
                          >
                            <div>
                              <p className="text-sm font-medium text-zinc-200">{task.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {task.project_id && task.project_id !== 'inbox-default' && (
                                  <span className="text-[10px] uppercase font-semibold text-purple-400 px-1.5 py-0.5 bg-purple-500/10 rounded">
                                    {task.project_id}
                                  </span>
                                )}
                                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> Due {task.due_date}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleMoveToToday(task.id)}
                                className="px-3 min-h-10 min-w-10 flex items-center justify-center hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium rounded-lg transition-all cursor-pointer border border-zinc-800"
                                title="Move to Today"
                              >
                                Today
                              </button>
                              <button
                                onClick={() => handleDeferTomorrow(task.id)}
                                className="px-3 min-h-10 min-w-10 flex items-center justify-center hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium rounded-lg transition-all cursor-pointer border border-zinc-800"
                                title="Defer to Tomorrow"
                              >
                                Defer
                              </button>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="w-10 h-10 flex items-center justify-center hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-all cursor-pointer border border-transparent ml-4"
                                title="Delete task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 2: Today's Commit Zone */}
              {step === 2 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  className="space-y-6"
                >
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-semibold text-zinc-200">Commit Today's Core Drivers</h2>
                    <p className="text-xs text-zinc-400">
                      Sunsama philosophy relies on committing to a small, focused list. Aim for 3-5 core items.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[330px]">
                    {/* Backlog / Inbox List (Pool) */}
                    <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 flex flex-col h-full">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/40 mb-3">
                        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">backlog & inbox</span>
                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-85c px-1.5 py-0.5 rounded">
                          {backlogTasks.length} items
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {backlogTasks.length === 0 ? (
                          <div className="text-center py-10 text-zinc-600 text-xs flex flex-col items-center justify-center gap-2">
                            <span>No backlogged items.</span>
                            <button 
                              onClick={() => {
                                const title = prompt('Create a quick backlog task:')
                                if (title && window.electronAPI) {
                                  window.electronAPI.createTask?.({
                                    title,
                                    status: 'todo',
                                    priority: 1,
                                    due_date: null
                                  } as any).then(() => incrementTasksRevision())
                                }
                              }}
                              className="text-[10px] text-amber-400 underline hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Quick add task
                            </button>
                          </div>
                        ) : (
                          backlogTasks.map(task => (
                            <div 
                              key={task.id}
                              className="p-2.5 bg-zinc-900/50 border border-zinc-900 hover:border-zinc-800/80 rounded-lg flex items-center justify-between transition-all group"
                            >
                              <span className="text-xs font-medium text-zinc-300 truncate max-w-[200px]">{task.title}</span>
                              <button
                                onClick={() => handleMoveToToday(task.id)}
                                className="w-6 h-6 rounded bg-zinc-800/60 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                                title="Commit to Today"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Today's Focus List (Committed) */}
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex flex-col h-full">
                      <div className="flex items-center justify-between pb-3 border-b border-amber-500/15 mb-3">
                        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-amber-400" /> Today's committed
                        </span>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          {todayTasks.length} committed
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {todayTasks.length === 0 ? (
                          <div className="text-center py-12 text-zinc-500 text-xs leading-relaxed max-w-[250px] mx-auto">
                            No tasks committed to today yet. Click the arrow button on any backlog task to draft them in!
                          </div>
                        ) : (
                          todayTasks.map(task => (
                            <div 
                              key={task.id}
                              className="p-2.5 bg-zinc-900/50 border border-amber-500/10 hover:border-amber-500/20 rounded-lg flex items-center justify-between transition-all"
                            >
                              <span className="text-xs font-medium text-zinc-200 truncate max-w-[200px]">{task.title}</span>
                              <button
                                onClick={() => updateTask({ id: task.id, due_date: null })}
                                className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-all cursor-pointer"
                                title="Return to Backlog"
                              >
                                Backlog
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* capacity prompt helper */}
                      <div className="pt-2 text-center">
                        <p className={`text-[10px] font-sans ${todayTasks.length > 7 ? 'text-amber-400' : 'text-zinc-500'}`}>
                          {todayTasks.length > 7 
                            ? '🚨 Over 7 items increases cognitive fatigue. Keep it tight!' 
                            : '👌 Nice, highly realistic planning volume.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Capacity Review (Capacity Heuristic visualizers) */}
              {step === 3 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  className="space-y-6"
                >
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-semibold text-zinc-200">Focus Hours Capacity Check</h2>
                    <p className="text-xs text-zinc-400">
                      Calculated from your working hours, calendar scheduling commitments, and buffer buffers.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Heuristic blocks */}
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 text-center">
                      <span className="text-xs text-zinc-500 uppercase font-semibold">Available Focus Today</span>
                      <p className="text-3xl font-bold font-sans text-zinc-100 mt-2">{capacity.available} h</p>
                      <p className="text-[10px] text-zinc-500 mt-1">Working hrs - calendar events - buffer</p>
                    </div>

                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 text-center">
                      <span className="text-xs text-zinc-500 uppercase font-semibold">Committed Load Estimate</span>
                      <p className="text-3xl font-bold font-sans text-amber-400 mt-2">{capacity.committed} h</p>
                      <p className="text-[10px] text-zinc-500 mt-1">Sum of committed tasks durations</p>
                    </div>

                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 text-center">
                      <span className="text-xs text-zinc-500 uppercase font-semibold">Load Ratio Status</span>
                      <p className="text-3xl font-bold font-sans text-zinc-100 mt-2">
                        {Math.round(capacity.ratio * 100)} %
                      </p>
                      <p className={`text-[10px] font-semibold mt-1 uppercase ${
                        capacity.status === 'overloaded' ? 'text-red-400' :
                        capacity.status === 'tight' ? 'text-amber-400' :
                        capacity.status === 'balanced' ? 'text-emerald-400' : 'text-indigo-400'
                      }`}>
                        {capacity.status}
                      </p>
                    </div>
                  </div>

                  {/* High Accuracy Visual gauge bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Total committed load ({capacity.committed}h)</span>
                      <span>Your focus boundary ({capacity.available}h)</span>
                    </div>
                    <div className="h-4 w-full bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden relative">
                      {/* Threshold boundary line */}
                      <div className="absolute top-0 bottom-0 left-[100%] border-l-2 border-dashed border-red-500 z-10" />
                      
                      {/* Spent/committed progress bar */}
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          capacity.status === 'overloaded' ? 'bg-gradient-to-r from-red-500 to-rose-600' :
                          capacity.status === 'tight' ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                          'bg-gradient-to-r from-emerald-400 to-teal-500'
                        }`}
                        style={{ width: `${Math.min(100, (capacity.committed / (capacity.available || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Heuristic dynamic advice block */}
                  <div className={`p-4 border rounded-xl flex gap-3.5 items-start ${alertDetails.bg}`}>
                    {alertDetails.icon}
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">{alertDetails.heading}</h4>
                      <p className="text-xs leading-relaxed opacity-90">{alertDetails.desc}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Optional Suggestion Acceptor */}
              {step === 4 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  className="space-y-6"
                >
                  <div className="space-y-1.5 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-200">Accept Scheduling Suggestions (Optional)</h2>
                      <p className="text-xs text-zinc-400">
                        Our pure-function scheduling engine calculated optimized time blocks. Accept or skip.
                      </p>
                    </div>
                    <button 
                      onClick={refreshCapacityAndSuggestions}
                      className="w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                      title="Regenerate suggestions"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {isLoadingSuggestions ? (
                    <div className="flex flex-col items-center justify-center p-14 gap-2 text-zinc-500">
                      <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                      <span className="text-xs">Computing optimal scheduling blocks...</span>
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="border border-dashed border-zinc-800 rounded-xl p-10 text-center flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-medium text-zinc-300">No suggestions pending</h3>
                      <p className="text-xs text-zinc-500 max-w-sm">
                        Either no available time slots found today matching task parameters, or all recommended slots were already processed!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
                      {suggestions.map(s => {
                        const start = new Date(s.suggested_start)
                        const end = new Date(s.suggested_end)
                        const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

                        return (
                          <div 
                            key={s.id}
                            className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl flex flex-col [@media(min-width:640px)]:flex-row [@media(min-width:640px)]:items-center justify-between gap-4 hover:border-zinc-700/60"
                          >
                            <div className="space-y-1 max-w-[500px]">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                                  {Math.round((s.confidence ?? s.confidence_score ?? 0.8) * 100)}% Conf
                                </span>
                                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-zinc-500" /> {timeStr}
                                </h4>
                              </div>
                              <p className="text-sm font-semibold text-zinc-100">{s.task_title ?? 'Focus block'}</p>
                              <p className="text-xs text-zinc-400 italic leading-snug">"{s.rationale}"</p>
                            </div>

                            <button
                              onClick={() => handleAcceptSuggestion(s.id)}
                              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-zinc-950 text-xs font-bold rounded-xl transition-all shadow shadow-amber-500/10 self-start [@media(min-width:640px)]:self-auto cursor-pointer"
                            >
                              Quick Accept
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}

            </div>

            {/* Footer Buttons */}
            <footer className="px-6 py-5 border-t border-zinc-800/60 flex items-center justify-between bg-zinc-950/40">
              <button
                onClick={() => setShowMorningPlan(false)}
                className="px-4 py-2 hover:bg-zinc-900 text-zinc-400 hover:text-white text-xs font-semibold rounded-xl transition-all cursor-pointer border border-transparent"
              >
                Skip Ritual
              </button>

              <div className="flex items-center gap-3">
                {step > 1 && (
                  <button
                    onClick={() => setStep(prev => prev - 1)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-zinc-800"
                  >
                    Back
                  </button>
                )}

                {step < 4 ? (
                  <button
                    onClick={() => setStep(prev => prev + 1)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-xl transition-all shadow shadow-amber-500/10 flex items-center gap-1.5 cursor-pointer"
                  >
                    Next Step <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleFinalize}
                    className="px-5 py-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-505 hover:brightness-105 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/5 flex items-center gap-1.5 cursor-pointer"
                  >
                    Finish morning plan <Sunrise className="w-4 h-4" />
                  </button>
                )}
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
