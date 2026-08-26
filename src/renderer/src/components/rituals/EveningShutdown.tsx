// src/renderer/src/components/rituals/EveningShutdown.tsx
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap'
import { 
  Moon, 
  Check, 
  Flame, 
  MoonStar,
  ChevronRight,
  X,
  Compass
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useTasks } from '../../hooks/useTasks'

export function EveningShutdown() {
  const [step, setStep] = useState(1)
  const { tasks, updateTask } = useTasks()
  const { setShowEveningShutdown, incrementTasksRevision } = useAppStore()

  const containerRef = useModalFocusTrap<HTMLDivElement>({
    isOpen: true,
    onClose: () => setShowEveningShutdown(false)
  })
  
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), [])
  const tomorrowStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString('en-CA')
  }, [])

  // Achievements, reflections and completed items
  const [reflection, setReflection] = useState('')
  const [allEvents, setAllEvents] = useState<any[]>([])
  const [isCompleted, setIsCompleted] = useState(false)
  const [todayFocusStats, setTodayFocusStats] = useState<{ hours: number; sessionsCount: number; distractionCount: number } | null>(null)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getWellnessAnalytics().then(an => {
        const today = new Date().toLocaleDateString('en-CA')
        const rec = an?.dailyDeepWork?.find((d: any) => d.date === today)
        const mins = rec ? rec.minutes : 0
        const hrs = parseFloat((mins / 60).toFixed(1))
        
        setTodayFocusStats({
          hours: hrs,
          sessionsCount: mins >= 25 ? Math.ceil(mins / 25) : 0,
          distractionCount: an?.interruptionTrends?.find((t: any) => t.date === today)?.totalDistractions || 0
        })
      }).catch(console.error)
    }
  }, [])

  // 1. Fetch completed items today
  // If tasks has status 'done' or similar
  const completedToday = useMemo(() => {
    return tasks.filter(t => t.status === 'done' && t.due_date === todayStr)
  }, [tasks, todayStr])

  // 2. Fetch incomplete items remaining for today
  const incompleteToday = useMemo(() => {
    return tasks.filter(t => 
      (t.status === 'todo' || t.status === 'in_progress') && 
      t.due_date === todayStr
    )
  }, [tasks, todayStr])

  // Fetch calendar events to show tomorrow's agenda review
  useEffect(() => {
    if (window.electronAPI) {
      const api = window.electronAPI as any
      if (typeof api.getEvents === 'function') {
        api.getEvents().then((res: any) => {
          setAllEvents(res || [])
        }).catch(console.error)
      }
    }
  }, [])

  const tomorrowEvents = useMemo(() => {
    return allEvents.filter(ev => {
      return ev.start_at && ev.start_at.startsWith(tomorrowStr)
    })
  }, [allEvents, tomorrowStr])

  // Defer controllers
  const handleDeferToTomorrow = (taskId: string) => {
    updateTask({ id: taskId, due_date: tomorrowStr })
  }

  const handleReturnToBacklog = (taskId: string) => {
    updateTask({ id: taskId, due_date: null })
  }

  // Final shut down closer
  const handleCloseWork = async () => {
    const payload = {
      completedTasksCount: completedToday.length,
      incompleteRemainingCount: incompleteToday.length,
      reflection,
      actualFocusTimeHrs: 2.5, // placeholder focused hour tracker statistic
      completedAt: new Date().toISOString()
    }

    if (window.electronAPI) {
      try {
        await window.electronAPI.saveRitualEntry('evening', todayStr, JSON.stringify(payload))
        
        // Quiet mode for non-essential notifications (set setting in DB to disable triggers until tomorrow)
        const d = new Date()
        d.setHours(23, 59, 59, 0)
        await window.electronAPI.setSetting?.('rituals.quiet_mode_until', d.toISOString())
        incrementTasksRevision()
      } catch (err) {
        console.error('Failed to save evening ritual entry:', err)
      }
    }

    setIsCompleted(true)
    setTimeout(() => {
      setShowEveningShutdown(false)
    }, 2000)
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 outline-none" 
      id="evening-shutdown-overlay"
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
            id="evening-shutdown-complete"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-indigo-500/5 to-transparent pointer-events-none" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-20 h-20 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-6 text-purple-300"
            >
              <MoonStar className="w-10 h-10 animate-pulse" />
            </motion.div>
            <h2 className="text-2xl font-bold font-sans text-zinc-100 mb-2">Workday Suspended</h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
              Work details cleared. Notifications are silenced. Rest deeply and recover for tomorrow.
            </p>
          </motion.div>
        ) : (
          <motion.div 
            key="shutdown-modal"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            className="w-full max-w-4xl h-[620px] bg-zinc-950/90 border border-zinc-800/80 rounded-2xl shadow-2xl backdrop-blur-2xl flex flex-col relative overflow-hidden"
            id="evening-shutdown-container"
          >
            {/* Top color tag */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-400 via-indigo-505 to-purple-600 opacity-90" />

            {/* Header */}
            <header className="px-6 py-5 border-b border-zinc-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-md font-semibold text-zinc-100 font-sans tracking-tight">Evening Shutdown</h1>
                  <p className="text-xs text-zinc-400">Frictionless ritual to disconnect and recharge</p>
                </div>
              </div>

              {/* Steps Indicator */}
              <div className="hidden sm:flex items-center gap-1.5" id="evening-shutdown-steps-indicator">
                {[
                  { num: 1, label: 'Accomplishments' },
                  { num: 2, label: 'Leftover Check' },
                  { num: 3, label: 'Tomorrow Preview & Reflect' }
                ].map(it => {
                  const isActive = step === it.num;
                  const isCompleted = step > it.num;
                  return (
                    <div key={it.num} className="flex items-center">
                      <div 
                        className={`h-6 rounded-full text-xs font-medium flex items-center justify-center transition-all duration-300 ${
                          isActive 
                            ? 'px-3 bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow shadow-purple-500/10 gap-1.5' 
                            : isCompleted
                              ? 'w-6 bg-zinc-800/40 border border-zinc-700/40 text-zinc-400'
                              : 'w-6 bg-zinc-900/20 border border-transparent text-zinc-600'
                        }`}
                        title={it.label}
                      >
                        <span>{it.num}</span>
                        {isActive && <span className="whitespace-nowrap transition-opacity duration-300">{it.label}</span>}
                      </div>
                      {it.num < 3 && <ChevronRight className="w-3.5 h-3.5 text-zinc-700/60 mx-1" />}
                    </div>
                  );
                })}
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setShowEveningShutdown(false)} 
                className="w-10 h-10 rounded-lg hover:bg-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                aria-label="Close evening shutdown"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 min-h-0">
              
              {/* STEP 1: Review Accomplishments */}
              {step === 1 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  className="space-y-6"
                >
                  <div className="space-y-1.5 text-center max-w-lg mx-auto">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400 mb-2">
                      <Flame className="w-6 h-6 animate-pulse" />
                    </div>
                    <h2 className="text-lg font-bold text-zinc-200">Reflect on Your Wins Today</h2>
                    <p className="text-xs text-zinc-400">
                      Sunsama philosophy highlights celebration. Acknowledge what you got done, no matter how tiny.
                    </p>
                  </div>

                  {todayFocusStats && todayFocusStats.hours > 0 && (
                    <div className="max-w-md mx-auto grid grid-cols-3 gap-3 bg-purple-950/20 border border-purple-500/20 p-4 rounded-xl text-center shadow-lg">
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Focus Time</span>
                        <p className="text-xs sm:text-sm font-extrabold text-purple-200">{todayFocusStats.hours} hrs</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold font-sans">Sessions</span>
                        <p className="text-xs sm:text-sm font-extrabold text-purple-200">{todayFocusStats.sessionsCount} blocks</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Distractions</span>
                        <p className="text-xs sm:text-sm font-extrabold text-purple-200">{todayFocusStats.distractionCount} log</p>
                      </div>
                    </div>
                  )}

                  {completedToday.length === 0 ? (
                    <div className="border border-zinc-800/80 rounded-xl p-8 text-center bg-zinc-900/20 max-w-md mx-auto">
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        No tasks officially checked off today. That is perfectly normal! Some days are spent laying seeds, reading, planning, or deep-diving on hard topics. You showed up, and that's what counts.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-xl mx-auto">
                      <div className="text-center font-sans font-medium text-xs text-purple-400 uppercase tracking-wider mb-2">
                        🎉 {completedToday.length} completed objectives today
                      </div>
                      
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                        {completedToday.map(task => (
                          <div 
                            key={task.id} 
                            className="p-3 bg-semibold bg-purple-500/5 border border-purple-500/10 rounded-xl flex items-center gap-3.5"
                          >
                            <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                              <Check className="w-3 h-3" />
                            </div>
                            <span className="text-xs font-semibold text-zinc-200 truncate">{task.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 2: Handle Incomplete Remaining Today Items */}
              {step === 2 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  className="space-y-6"
                >
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-semibold text-zinc-200">Realign Leftover Objectives</h2>
                    <p className="text-xs text-zinc-400">
                      You have these incomplete items on today's list. Defer them to tomorrow, move them back to the general backlog, or keep them as is.
                    </p>
                  </div>

                  {incompleteToday.length === 0 ? (
                    <div className="border border-dashed border-zinc-800 rounded-xl p-10 text-center flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <Check className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-medium text-zinc-300">Absolute completion!</h3>
                      <p className="text-xs text-zinc-500 max-w-sm">
                        Fantastic job, you cleared all committed items today. Go enjoy your evening fully!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-2">
                      {incompleteToday.map(task => (
                        <div 
                          key={task.id}
                          className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center justify-between hover:border-zinc-700/80 transition-all"
                        >
                          <span className="text-xs font-semibold text-zinc-200 truncate max-w-[320px]">{task.title}</span>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDeferToTomorrow(task.id)}
                              className="px-2.5 py-1.5 bg-zinc-800/60 hover:bg-zinc-800 hover:text-white text-[10px] sm:text-xs text-zinc-300 font-semibold rounded-lg border border-zinc-75c transition-all cursor-pointer"
                            >
                              Tomorrow
                            </button>
                            <button
                              onClick={() => handleReturnToBacklog(task.id)}
                              className="px-2.5 py-1.5 bg-zinc-800/60 hover:bg-zinc-800 hover:text-white text-[10px] sm:text-xs text-zinc-300 font-semibold rounded-lg border border-zinc-75c transition-all cursor-pointer"
                            >
                              Backlog
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 3: Preview Tomorrow and Reflection micro-journal */}
              {step === 3 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Left: Tomorrow Review */}
                    <div className="space-y-4">
                      <div className="space-y-1 pt-1">
                        <h2 className="text-lg font-semibold text-zinc-200">Tomorrows Mental Setup</h2>
                        <p className="text-xs text-zinc-400">
                          Previewing scheduled blocks or meetings so they don't surprise you in the morning.
                        </p>
                      </div>

                      {tomorrowEvents.length === 0 ? (
                        <div className="border border-zinc-90 w-full rounded-xl p-6 text-center bg-zinc-900/10 text-zinc-500 font-sans text-xs">
                          No calendar events scheduled for tomorrow. A beautiful open landscape!
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                          {tomorrowEvents.map(ev => {
                            const startTime = ev.start_at ? new Date(ev.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                            return (
                              <div key={ev.id} className="p-3 bg-zinc-900 border border-zinc-800/80 rounded-xl flex items-center justify-between">
                                <span className="text-xs font-semibold text-zinc-200 truncate pr-2">{ev.title}</span>
                                <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">{startTime}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Right: Write Reflection Micro-journal */}
                    <div className="space-y-4 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest flex items-center gap-1">
                          <Compass className="w-3.5 h-3.5" /> 1-Line reflection
                        </span>
                        <h3 className="text-md font-semibold text-zinc-250">Write down a quick evening wrap notes</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          Clear up mental bandwidth of work threads before you close shop. What is on your mind?
                        </p>
                      </div>

                      <div className="flex-1 mt-2">
                        <textarea
                          value={reflection}
                          onChange={(e) => setReflection(e.target.value)}
                          placeholder="E.g., Secured critical refactors. Ready to start design tasks tomorrow morning..."
                          maxLength={300}
                          rows={4}
                          className="w-full bg-zinc-900 border border-zinc-800/80 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-650 focus:border-purple-500 focus:outline-none resize-none transition-all leading-relaxed"
                        />
                        <div className="text-right text-[10px] text-zinc-600 font-mono mt-1 pr-1">
                          {reflection.length}/300 chars
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}

            </div>

            {/* Footer Buttons */}
            <footer className="px-6 py-5 border-t border-zinc-800/60 flex items-center justify-between bg-zinc-950/40">
              <button
                onClick={() => setShowEveningShutdown(false)}
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

                {step < 3 ? (
                  <button
                    onClick={() => setStep(prev => prev + 1)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-all shadow shadow-purple-500/10 flex items-center gap-1.5 cursor-pointer"
                  >
                    Next Step <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleCloseWork}
                    className="px-5 py-2 bg-gradient-to-r from-purple-55c via-indigo-600 to-purple-600 hover:brightness-105 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    Disconnect & Close work <MoonStar className="w-4 h-4" />
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
