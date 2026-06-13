// src/renderer/src/components/tasks/PostSessionOverview.tsx
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { 
  Sparkles, 
  TrendingDown, 
  ArrowRight, 
  CheckCircle, 
  Activity, 
  Brain, 
  Zap, 
  Clipboard,
  X,
  Pencil
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useTasks } from '../../hooks/useTasks'
import { cn } from '../../lib/utils'

interface PostSessionOverviewProps {
  summary: any
  targetMinutes: number
  onClose: () => void
  isHistorical?: boolean
}

export function PostSessionOverview({ summary, targetMinutes, onClose, isHistorical = false }: PostSessionOverviewProps) {
  const tasks = useAppStore(state => state.tasks)
  const projects = useAppStore(state => state.projects)
  const { updateTask } = useTasks()

  // State - initialized from summary if available
  const [reflection, setReflection] = useState(summary?.reflection || '')
  const [clarityRating, setClarityRating] = useState<number>(summary?.clarityRating || summary?.clarity_rating || 8)
  const [energyRating, setEnergyRating] = useState<number>(summary?.energyRating || summary?.energy_rating || 7)
  const [markCompleted, setMarkCompleted] = useState(false)
  const [saving, setSaving] = useState(false)

  // Track the loaded session ID to avoid resets on re-render/external updates
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>(summary?.sessionId || summary?.id || null)

  // Name Editing State (allowing renames inside the evaluation dialog/drawer directly)
  const defaultNameVal = summary?.customName || summary?.custom_name || summary?.taskTitle || summary?.task_title || (summary?.taskId ? tasks.find(t => t.id === summary.taskId)?.title : null) || 'Focus Session'
  const [isEditingName, setIsEditingName] = useState(false)
  const [sessionName, setSessionName] = useState(defaultNameVal)

  // Sync state variables if default values/dependencies change in parent context
  useEffect(() => {
    if (summary) {
      const currentId = summary.sessionId || summary.id
      if (currentId !== loadedSessionId) {
        setLoadedSessionId(currentId)
        setReflection(summary.reflection || '')
        setClarityRating(summary.clarityRating || summary.clarity_rating || 8)
        setEnergyRating(summary.energyRating || summary.energy_rating || 7)
        
        const newDefaultName = summary.customName || summary.custom_name || summary.taskTitle || summary.task_title || (summary.taskId ? tasks.find((t: any) => t.id === summary.taskId)?.title : null) || 'Focus Session'
        setSessionName(newDefaultName)
        setIsEditingName(false)
      }
    }
  }, [summary, tasks, loadedSessionId])

  const handleSaveName = async () => {
    const sessId = summary?.sessionId || summary?.id
    if (!sessId || !sessionName.trim()) return

    if (window.electronAPI && window.electronAPI.renameSession) {
      try {
        await window.electronAPI.renameSession(sessId, sessionName.trim())
        // Mutate summary in place so that the currently rendered view immediately matches
        summary.customName = sessionName.trim()
        summary.custom_name = sessionName.trim()
        setIsEditingName(false)
      } catch (err) {
        console.error('Failed to rename focus session inside PostSessionOverview:', err)
      }
    }
  }

  // Find linked task & project
  const linkedTask = summary?.taskId ? tasks.find(t => t.id === summary.taskId) : null
  const sessionProject = projects.find(p => p.id === (summary?.projectId || summary?.project_id || linkedTask?.project_id))

  // Calculated values
  const durationSecs = summary?.durationSeconds ?? ((summary?.durationMins ?? 0) * 60)
  const distractionCountVal = summary?.distractionCount ?? 0
  const productivePct = summary?.productivePercent ?? (distractionCountVal > 0 ? 80 : 100)
  const productiveSecs = summary?.productiveSeconds ?? Math.max(0, durationSecs - (distractionCountVal * 15))
  const averageFocusStreakSecs = summary?.averageFocusStreakSeconds ?? (distractionCountVal > 0 ? Math.round(productiveSecs / (distractionCountVal + 1)) : productiveSecs)
  const topApps = summary?.topDistractions ?? []

  const formatSecs = (totalSecs: number) => {
    if (totalSecs < 60) return `${totalSecs}s`
    const m = Math.floor(totalSecs / 60)
    const s = totalSecs % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }

  // Energy descriptors
  const getEnergyData = (rating: number) => {
    if (rating <= 2) return { label: "Fully Drained", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", glow: "shadow-rose-500/20", emoji: "🥀" }
    if (rating <= 4) return { label: "Low Battery", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", glow: "shadow-amber-500/10", emoji: "🔋" }
    if (rating <= 6) return { label: "Sustaining Pace", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20", glow: "shadow-yellow-400/10", emoji: "⚡" }
    if (rating <= 8) return { label: "High Capacity", color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20", glow: "shadow-teal-500/15", emoji: "💪" }
    return { label: "Supercharged", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", glow: "shadow-emerald-500/20", emoji: "🔥" }
  }

  // Clarity descriptors
  const getClarityData = (rating: number) => {
    if (rating <= 2) return { label: "Deeply Scattered", desc: "Attention constantly snapped by external variables." }
    if (rating <= 4) return { label: "Surface Layer Focus", desc: "Mind drifting frequently; keeping task in sight required high effort." }
    if (rating <= 6) return { label: "Steady Execution", desc: "Solid performance, standard attention retention." }
    if (rating <= 8) return { label: "Deep Cognitive Flow", desc: "Excellent speed, quick problem-solving bursts." }
    return { label: "Sublime Insight State", desc: "Prism focus. Time blurred as blocks of logic connected seamlessly." }
  }

  const activeEnergy = getEnergyData(energyRating)
  const activeClarity = getClarityData(clarityRating)

  // Save changes
  const handleSaveAndClose = async () => {
    const sessId = summary?.sessionId || summary?.id

    if (!window.electronAPI) {
      onClose()
      return
    }

    try {
      setSaving(true)
      
      // Update session ratings & reflection comments
      if (window.electronAPI.updateSessionReflection && sessId) {
        await window.electronAPI.updateSessionReflection(
          sessId,
          reflection,
          clarityRating,
          energyRating
        )
      }

      // Mark linked task as done if checked (only if not historical)
      if (!isHistorical && markCompleted && linkedTask) {
        if (window.electronAPI.completeTask) {
          await window.electronAPI.completeTask(linkedTask.id)
        } else {
          await updateTask({ id: linkedTask.id, status: 'done', completed_at: new Date().toISOString() })
        }
      }

    } catch (err) {
      console.error('Failed to log session post-reflection:', err)
    } finally {
      setSaving(false)
      onClose()
    }
  }

  // Performance tier mapping matching requested metrics: 0% red, 50% yellow, 80% green, 100% blue
  let performanceTier = {
    title: "Flow State Master",
    desc: "Impeccable execution! Absolute shield integrity during the entire developer block.",
    color: "text-blue-400",
    accent: "from-blue-500/10 to-indigo-500/5",
    border: "border-blue-500/25",
    ringColor: "#3b82f6", // blue-500
    icon: "🏆"
  }

  if (productivePct < 50) {
    performanceTier = {
      title: "Needs Alignment",
      desc: "Significant stream-switches detected. Try refining your blacklist or environment blockers.",
      color: "text-rose-450",
      accent: "from-rose-500/10 to-transparent",
      border: "border-rose-500/25",
      ringColor: "#f43f5e", // red-500
      icon: "⚠️"
    }
  } else if (productivePct < 80) {
    performanceTier = {
      title: "Steady Apprentice",
      desc: "Solid concentration effort. Continue building stamina to shield your focus windows.",
      color: "text-yellow-450",
      accent: "from-yellow-500/10 to-transparent",
      border: "border-yellow-500/25",
      ringColor: "#eab308", // yellow-500
      icon: "⚡"
    }
  } else if (productivePct < 100) {
    performanceTier = {
      title: "Cognitive Flow",
      desc: "Focus maintained! Unproductive focus-swapping windows were kept thoroughly at bay.",
      color: "text-emerald-450",
      accent: "from-emerald-500/10 to-transparent",
      border: "border-emerald-500/25",
      ringColor: "#10b981", // emerald-500
      icon: "🟢"
    }
  }

  const radius = 38
  const circumference = 2 * Math.PI * radius // 238.76
  const strokeDashoffset = circumference - (circumference * productivePct) / 100

  return (
    <div className={cn(
      "flex items-center justify-center p-4 md:p-8 text-white relative select-none overflow-y-auto custom-scrollbar w-full",
      isHistorical 
        ? "fixed inset-0 bg-black/85 backdrop-blur-md z-50 h-full overflow-y-auto" 
        : "flex-1 bg-[#09090b] h-full"
    )}>
      {/* Visual background atmospheric elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/[0.03] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-500/[0.03] blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-4xl w-full bg-zinc-900/40 backdrop-blur-3xl border border-zinc-805/80 p-6 md:p-8 rounded-3xl shadow-2xl relative my-auto grid grid-cols-1 lg:grid-cols-12 gap-8"
      >
        {/* Dynamic dismiss/close button */}
        <button
          onClick={handleSaveAndClose}
          className="absolute top-5 right-5 p-2 hover:bg-zinc-800/80 hover:text-white text-zinc-400 rounded-xl transition-all cursor-pointer z-10 border border-zinc-800/30 bg-zinc-900/50"
          title={isHistorical ? "Close details" : "Dismiss summary"}
        >
          <X size={16} />
        </button>

        {/* LEFT COLUMN: Data and Stats (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Header Row */}
          <div className="flex items-center gap-3.5 pb-4 border-b border-zinc-900 pr-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-405 shadow-md">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  {isHistorical ? "Historical Block Summary" : "Session Evaluated"}
                </h2>
                {sessionProject && (
                  <span 
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold flex items-center gap-1 bg-zinc-855 border border-zinc-800/80"
                    style={{ borderColor: `${sessionProject.color}15`, color: sessionProject.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sessionProject.color }} />
                    {sessionProject.name}
                  </span>
                )}
              </div>
              <p className="text-zinc-550 text-xs font-mono mt-0.5">
                BLOCK ID: {summary?.sessionId || summary?.id || 'N/A'}
              </p>
            </div>
          </div>

          {/* Core Score & KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Radial score ring */}
            <div className="md:col-span-5 flex flex-col items-center justify-center bg-zinc-950/30 border border-zinc-800/30 rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="relative w-36 h-36 flex items-center justify-center mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle 
                    className="text-zinc-850/40" 
                    strokeWidth="5" 
                    fill="transparent" 
                    r="38" 
                    cx="50" 
                    cy="50" 
                  />
                  <motion.circle 
                    style={{ 
                      stroke: performanceTier.ringColor,
                      filter: `drop-shadow(0 0 6px ${performanceTier.ringColor}50)`
                    }}
                    className="transition-all duration-1000 ease-out"
                    strokeWidth="6" 
                    strokeLinecap="round"
                    fill="transparent" 
                    r="38" 
                    cx="50" 
                    cy="50" 
                    strokeDasharray={2 * Math.PI * 38}
                    initial={{ strokeDashoffset: 2 * Math.PI * 38 }}
                    animate={{ strokeDashoffset }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center gap-0.5">
                  <span className="text-4xl font-extrabold font-mono tracking-tight text-white">
                    {productivePct}%
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">Focus Score</span>
                </div>
              </div>

              <div className="text-center">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-sans inline-flex items-center gap-1 shadow-inner">
                  <span>{performanceTier.icon}</span>
                  <span>{performanceTier.title}</span>
                </span>
              </div>
            </div>

            {/* Micro stats metrics */}
            <div className="md:col-span-7 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-zinc-950/30 border border-zinc-800/30 p-3 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider block mb-0.5">Total Duration</span>
                    <span className="text-lg font-extrabold font-mono text-zinc-100">{formatSecs(durationSecs)}</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 block mt-1 leading-tight">Mins target: {targetMinutes}m</span>
                </div>

                <div className="bg-zinc-950/30 border border-zinc-800/30 p-3 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider block mb-0.5">On-Task Time</span>
                    <span className="text-lg font-extrabold font-mono text-emerald-450">{formatSecs(productiveSecs)}</span>
                  </div>
                  <span className="text-[9px] text-emerald-500/60 block mt-1 leading-tight">Direct dev framework</span>
                </div>
              </div>

              <div className="bg-zinc-950/30 border border-zinc-800/30 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider block mb-0.5">Average Focus Streak</span>
                  <span className="text-sm font-bold font-mono text-indigo-400">{formatSecs(averageFocusStreakSecs)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider block mb-0.5 font-sans">Switches</span>
                  <span className={cn(
                    "text-sm font-bold font-mono",
                    distractionCountVal > 0 ? "text-rose-400" : "text-emerald-400"
                  )}>
                    {distractionCountVal}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback block description text */}
          <div className={cn(
            "p-3 rounded-xl bg-gradient-to-r border text-xs leading-relaxed",
            performanceTier.accent,
            performanceTier.border,
            performanceTier.color
          )}>
            <strong>Evaluation: </strong> {performanceTier.desc}
          </div>

          {/* Wasted Streams panel */}
          <div className="flex-1 flex flex-col justify-start">
            <h3 className="text-[11px] font-bold text-zinc-400 mb-2.5 flex items-center gap-1.5 font-mono uppercase tracking-wider">
              {distractionCountVal > 0 ? (
                <>
                  <TrendingDown size={14} className="text-rose-450" />
                  Primary Distractors
                </>
              ) : (
                <>
                  <CheckCircle size={14} className="text-emerald-400" />
                  Pristine Shield Active
                </>
              )}
            </h3>
            
            {distractionCountVal > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {topApps.map((ta: any, idx: number) => {
                  const distractSecs = Math.floor(ta.durationMs / 1000)
                  const totalWastedMs = topApps.reduce((acc: number, app: any) => acc + (app.durationMs || 0), 0)
                  const weightPct = totalWastedMs > 0 ? Math.round((ta.durationMs / totalWastedMs) * 100) : 100

                  return (
                    <div key={idx} className="bg-zinc-950/20 border border-zinc-850 p-2.5 rounded-xl flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs font-sans">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 select-none" />
                          <span className="font-bold text-zinc-200">{ta.appName}</span>
                          <span className="text-[9.5px] text-zinc-505">({ta.count} focus switch{ta.count === 1 ? '' : 'es'})</span>
                        </div>
                        <span className="font-mono text-[11px] text-zinc-450 leading-none">
                          {formatSecs(distractSecs)}
                        </span>
                      </div>
                      
                      {/* Distraction metric progress slider line */}
                      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden select-none">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${weightPct}%` }}
                          transition={{ duration: 0.8, delay: 0.1 * idx }}
                          className="h-full bg-rose-500/80 rounded-full"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl flex items-start gap-3">
                <span className="text-xl shrink-0 select-none">🛡️</span>
                <div>
                  <h4 className="text-xs font-bold text-emerald-400">Pristine Safety Shield</h4>
                  <p className="text-zinc-500 text-xs mt-0.5 leading-normal">
                    You did not launch any blocked tabs, applications, or unproductive focus-swapping windows during this block. Total clarity maintained.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Self-Reflection Form (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-zinc-900/30 border border-zinc-800/40 rounded-2.5xl p-5 md:p-6 shadow-inner gap-5">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
              <Activity size={16} className="text-indigo-400" />
              Self-Reflection Log
            </h3>
            <p className="text-zinc-500 text-[11px] mt-0.5">
              Evaluate your mental states to track your developer productivity metrics and logs over time.
            </p>
          </div>

          {/* Clarity segment block selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <Brain size={12} className="text-indigo-400" />
                Cognitive Clarity
              </span>
              <span className="text-xs font-bold text-indigo-400 font-mono">
                {clarityRating}/10
              </span>
            </div>
            
            {/* Horizontal segments */}
            <div className="grid grid-cols-10 gap-1.5 select-none h-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                const isActive = num <= clarityRating
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setClarityRating(num)}
                    className={cn(
                      "h-full rounded-md border text-[9px] font-bold font-mono transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95",
                      isActive 
                        ? "bg-gradient-to-t from-indigo-500/20 to-indigo-500/10 border-indigo-500/40 text-indigo-300"
                        : "bg-zinc-950/20 border-zinc-800 text-zinc-650 hover:border-zinc-700 hover:text-zinc-400"
                    )}
                  >
                    {num}
                  </button>
                )
              })}
            </div>
            
            {/* Evaluator descriptor notes */}
            <div className="bg-zinc-950/40 border border-zinc-900/50 p-2.5 rounded-xl min-h-12 flex flex-col justify-center text-[11px]">
              <span className="font-bold text-indigo-300 block">{activeClarity.label}</span>
              <span className="text-zinc-500 mt-0.5 leading-normal">{activeClarity.desc}</span>
            </div>
          </div>

          {/* Core Battery Energy Meter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <Zap size={12} className="text-yellow-405" />
                Mental Energy Level
              </span>
              <span className={cn("text-xs font-bold font-mono", activeEnergy.color)}>
                {energyRating}/10 ({activeEnergy.label})
              </span>
            </div>

            <div className="flex items-center gap-3.5 bg-zinc-950/10 border border-zinc-850/60 p-3 rounded-xl">
              {/* Battery cell visual widget */}
              <div className="relative w-11 h-20 bg-zinc-950 border-2 border-zinc-800 rounded-xl px-1 py-1.5 flex flex-col justify-end overflow-hidden shrink-0 select-none">
                {/* Battery contact knob top */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[2px] w-4 h-[3px] bg-zinc-800 rounded-t-sm" />
                
                {/* Visual grid ticks overlay */}
                <div className="absolute inset-0 flex flex-col justify-between p-1 z-10 pointer-events-none opacity-20">
                  <div className="h-[1px] w-full bg-zinc-400" />
                  <div className="h-[1px] w-full bg-zinc-400" />
                  <div className="h-[1px] w-full bg-zinc-400" />
                  <div className="h-[1px] w-full bg-zinc-400" />
                </div>

                {/* Filled charge level height */}
                <motion.div 
                  className={cn("w-full rounded-[4px] ease-out-quad transition-all blur-[0.5px]", activeEnergy.bg, activeEnergy.glow)}
                  style={{ height: `${energyRating * 10}%` }}
                  animate={{ height: `${energyRating * 10}%` }}
                />
              </div>

              {/* Slider & Emojis list */}
              <div className="flex-1 flex flex-col gap-2.5">
                <input 
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={energyRating}
                  onChange={(e) => setEnergyRating(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex items-center justify-between font-mono text-[9px] text-zinc-500 font-semibold px-0.5">
                  <span onClick={() => setEnergyRating(1)} className="hover:text-rose-400 cursor-pointer">🥀 DRAINED</span>
                  <span onClick={() => setEnergyRating(5)} className="hover:text-yellow-400 cursor-pointer">⚡ STEADY</span>
                  <span onClick={() => setEnergyRating(10)} className="hover:text-emerald-400 cursor-pointer">🔥 PEAK</span>
                </div>
              </div>
            </div>
          </div>

          {/* Development Log Notes text area */}
          <div className="space-y-2 flex-1 flex flex-col">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1">
              <Clipboard size={12} className="text-zinc-450" />
              Development Reflection Log
            </span>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Document your milestones completed, bugs solved, or mental roadblocks conquered in this focus block..."
              className="flex-1 min-h-[110px] bg-zinc-950/40 border border-zinc-800/80 p-3 rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 font-sans leading-relaxed resize-none custom-scrollbar"
            />
          </div>

          {/* Associated Task Status */}
          <div className="space-y-3">
            {/* Session Name editing section */}
            <div className="bg-zinc-950/30 border border-zinc-850/60 p-3 rounded-xl flex items-center justify-between">
              <div className="flex flex-col gap-1 w-full">
                <span className="text-[10px] font-bold text-zinc-550 block font-mono uppercase tracking-tight">Session Name</span>
                {isEditingName ? (
                  <div className="flex items-center gap-1.5 w-full mt-1">
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleSaveName()
                        } else if (e.key === 'Escape') {
                          setIsEditingName(false)
                          setSessionName(defaultNameVal)
                        }
                      }}
                      className="bg-zinc-900 border border-indigo-500/50 rounded-md px-2 py-0.5 text-xs text-white w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="p-1 hover:bg-zinc-800 rounded text-emerald-400 transition cursor-pointer"
                      title="Save Name"
                    >
                      <CheckCircle size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingName(false)
                        setSessionName(defaultNameVal)
                      }}
                      className="p-1 hover:bg-zinc-800 rounded text-rose-400 transition cursor-pointer"
                      title="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full group/name mt-0.5 select-none">
                    <span 
                      onDoubleClick={() => setIsEditingName(true)}
                      className="text-xs font-bold text-zinc-350 font-sans truncate block select-text cursor-pointer hover:text-white"
                      title="Double-click to edit name"
                    >
                      {sessionName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="p-1 text-zinc-500 opacity-0 group-hover/name:opacity-100 hover:text-indigo-400 hover:bg-zinc-800 rounded transition-all cursor-pointer"
                      title="Edit focus block name"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {linkedTask && (
              <div className="bg-zinc-950/30 border border-zinc-850/60 p-3 rounded-xl flex items-center justify-between">
                <div className="max-w-[75%]">
                  <span className="text-[10px] font-bold text-zinc-550 block font-mono uppercase tracking-tight">Linked App Task</span>
                  <span className="text-xs font-bold text-zinc-300 font-sans truncate block mt-0.5 select-text">{linkedTask.title}</span>
                </div>
                
                {linkedTask.status === 'done' ? (
                  <span className="text-[10.5px] font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1 font-mono">
                    <CheckCircle size={11} />
                    COMPLETED
                  </span>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer group select-none">
                    <input 
                      type="checkbox"
                      checked={markCompleted}
                      onChange={(e) => setMarkCompleted(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-800 accent-indigo-500 cursor-pointer focus:ring-0 focus:ring-offset-0 bg-transparent"
                    />
                    <span className="text-[11.5px] font-bold text-zinc-450 group-hover:text-zinc-350 transition-colors">
                    Mark as Done
                  </span>
                </label>
              )}
            </div>
          )}
          </div>

          {/* Action button */}
          <button
            onClick={handleSaveAndClose}
            disabled={saving}
            className="w-full py-3.5 bg-zinc-105 hover:bg-white text-[#09090b] text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-white/5 active:scale-98 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                {isHistorical ? "Saving evaluations..." : "Saving session evaluations..."}
              </>
            ) : (
              <>
                {isHistorical ? "Save Reflection & Close Details" : "Save Reflection & Exit Workspace"}
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </div>

      </motion.div>
    </div>
  )
}
