import { useState } from 'react'
import { motion } from 'motion/react'
import { Plus, Clock, Target, Check } from 'lucide-react'
import { useAppStore, type AppState } from '../../store/useAppStore'
import { useTasks } from '../../hooks/useTasks'
import { cn } from '../../lib/utils'
import type { Project } from '../../types'

export function SessionQuickStart() {
  const [isOpen, setIsOpen] = useState(false)
  const { startSession } = useTasks()
  const projects = useAppStore((state: AppState) => state.projects)
  
  const storeTargetBreakMins = useAppStore((state: AppState) => state.targetBreakDurationMins)
  const storeTargetStudyMins = useAppStore((state: AppState) => state.targetStudyDurationMins)
  const setTargetStudyDurationMins = useAppStore((state: AppState) => state.setTargetStudyDurationMins)
  const setTargetBreakDurationMins = useAppStore((state: AppState) => state.setTargetBreakDurationMins)
  const setCurrentPhase = useAppStore((state: AppState) => state.setCurrentPhase)
  const setSessionTargetDurationMins = useAppStore((state: AppState) => state.setSessionTargetDurationMins)

  // Choose Inbox/default project by default
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [durationMins, setDurationMins] = useState(storeTargetStudyMins || 25)
  const [isPomodoro, setIsPomodoro] = useState(false)
  const [breakMins, setBreakMins] = useState(storeTargetBreakMins || 5)
  const [isStarting, setIsStarting] = useState(false)

  const presets = [15, 25, 45, 60, 90]

  const handleStart = async () => {
    setIsStarting(true)
    try {
      if (isPomodoro) {
        setCurrentPhase('study')
        setSessionTargetDurationMins(durationMins)
        setTargetStudyDurationMins(durationMins)
        setTargetBreakDurationMins(breakMins)
      } else {
        setCurrentPhase('study')
        setSessionTargetDurationMins(durationMins)
        setTargetStudyDurationMins(durationMins)
      }

      await startSession({
        projectId: selectedProjectId,
        targetDurationMins: durationMins,
        targetBreakDurationMins: isPomodoro ? breakMins : undefined
      })
      setIsOpen(false)
    } catch (err) {
      console.error('Failed to start project session:', err)
    } finally {
      setIsStarting(false)
    }
  }

  const selectedProject = projects.find((p: Project) => p.id === selectedProjectId)

  return (
    <div className="mb-6 relative no-drag">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl transition-all text-sm hover:border-[var(--accent-primary)] group opacity-80 hover:opacity-100 shadow-sm"
          id="btn-session-quick-start"
        >
          <div className="flex items-center gap-3">
            {/* The requested circle graphic with plus sign inside */}
            <div className="w-6 h-6 rounded-full border-2 border-[var(--text-muted)] flex items-center justify-center text-[var(--text-secondary)] group-hover:border-[var(--accent-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
              <Plus size={14} strokeWidth={2.5} />
            </div>
            <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors font-medium">
              Start a custom Focus Session...
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">
            <Clock size={13} />
            <span>Set timer</span>
          </div>
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--bg-elevated)] border border-[var(--accent-primary)] rounded-xl p-4 shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
               <Target size={16} className="text-[var(--accent-primary)]" />
              Configure Focus Session
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-4">
            {/* Project Selection */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
                Associate Project Group
              </label>
              <div className="flex flex-wrap gap-2">
                {/* Inbox/None Option */}
                <button
                  type="button"
                  onClick={() => setSelectedProjectId(null)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all",
                    selectedProjectId === null
                      ? "bg-[var(--bg-hover)] border-[var(--border-default)] text-[var(--text-primary)]"
                      : "bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-muted)]"
                  )}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>General Focus</span>
                  {selectedProjectId === null && <Check size={10} className="ml-1 text-[var(--accent-primary)]" />}
                </button>

                {/* Rest of Projects */}
                {projects.filter((p: Project) => p.id !== 'inbox-default').map((project: Project) => {
                  const isSelected = selectedProjectId === project.id
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => setSelectedProjectId(project.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all",
                        isSelected
                          ? "bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold"
                          : "bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-muted)]"
                      )}
                      style={{
                        borderColor: isSelected ? project.color : 'var(--border-default)',
                        borderWidth: '1px'
                      }}
                    >
                      {project.icon && project.icon.startsWith('data:image/') ? (
                        <img 
                          src={project.icon} 
                          alt={project.name}
                          className="w-3.5 h-3.5 rounded-full object-cover border border-[var(--border-subtle)]"
                        />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                      )}
                      <span>{project.name}</span>
                      {isSelected && <Check size={10} className="ml-1" style={{ color: project.color }} />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time Slider & Presets */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                    ⏱️ {isPomodoro ? 'FOCUS DURATION' : 'SESSION DURATION'}
                  </label>
                  <span className={cn(
                    "text-sm font-semibold font-mono transition-colors",
                    isPomodoro ? "text-indigo-400" : "text-[var(--accent-primary)]"
                  )}>
                    {durationMins} minutes
                  </span>
                </div>
                
                {/* Presets Grid */}
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {presets.map((p: number) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDurationMins(p)}
                      className={cn(
                        "py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer text-xs font-mono",
                        durationMins === p
                          ? isPomodoro
                            ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/40 font-bold"
                            : "bg-[var(--accent-primary-muted)] text-[var(--accent-primary)] border-[var(--accent-primary)]/30 font-bold"
                          : "bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                      )}
                    >
                      {p}m
                    </button>
                  ))}
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="5"
                  max="180"
                  step="5"
                  value={durationMins}
                  onChange={(e) => setDurationMins(parseInt(e.target.value))}
                  className={cn(
                    "w-full h-1 bg-[var(--border-subtle)] rounded-lg appearance-none cursor-pointer mb-2 transition-colors",
                    isPomodoro ? "accent-indigo-500" : "accent-[var(--accent-primary)]"
                  )}
                />
              </div>

              {/* Pomodoro Session Toggle Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsPomodoro(!isPomodoro)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all",
                    isPomodoro
                      ? "bg-red-500/10 border-red-500/30 text-red-400"
                      : "bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  )}
                  id="toggle-pomodoro-mode"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🍅</span>
                    <div className="text-left">
                      <span className="block font-bold">Pomodoro Mode</span>
                      <span className="block text-[10px] text-[var(--text-muted)] font-normal mt-0.5">
                        Automatically alternate focus sessions with breaks
                      </span>
                    </div>
                  </div>
                  <div className={cn(
                    "w-8 h-4 rounded-full p-0.5 transition-colors relative flex items-center",
                    isPomodoro ? "bg-red-500" : "bg-[var(--border-muted)]"
                  )}>
                    <motion.div
                      layout
                      className="w-3 h-3 bg-white rounded-full shadow"
                      animate={{ x: isPomodoro ? 16 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </div>
                </button>
              </div>

              {/* Expanded Break Config Section */}
              {isPomodoro && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="space-y-3 pt-3 border-t border-[var(--border-subtle)]"
                  id="pomodoro-break-config"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                      ☕ BREAK DURATION
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {breakMins} minutes
                    </span>
                  </div>

                  {/* Break Presets */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {[3, 5, 10, 15, 20].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setBreakMins(p)}
                        className={cn(
                          "py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer text-xs font-mono font-bold",
                          breakMins === p
                            ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/40"
                            : "bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                        )}
                        id={`quick-break-duration-${p}`}
                      >
                        {p}m
                      </button>
                    ))}
                  </div>

                  {/* Break Slider */}
                  <input
                    type="range"
                    min="1"
                    max="60"
                    step="1"
                    value={breakMins}
                    onChange={(e) => setBreakMins(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-[var(--border-subtle)] rounded-lg appearance-none cursor-pointer"
                    id="quick-break-duration-slider"
                  />
                </motion.div>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleStart}
              disabled={isStarting}
              className={cn(
                "w-full py-2.5 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:shadow-lg disabled:opacity-50",
                isPomodoro
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)]"
              )}
            >
              {isPomodoro ? (
                <>🍅 Start {selectedProject ? `"${selectedProject.name}"` : 'General'} Pomodoro ({durationMins}m + {breakMins}m Break)</>
              ) : (
                <>🚀 Start {selectedProject ? `"${selectedProject.name}"` : 'General'} Focus Session ({durationMins}m)</>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}