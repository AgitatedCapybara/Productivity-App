// src/renderer/src/pages/DeepWorkView.tsx
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useSafeClickOutside } from '../hooks/useSafeClickOutside'
import { useAppStore } from '../store/useAppStore'
import { useTasks } from '../hooks/useTasks'
import { 
  Brain, 
  Trash2, 
  Download, 
  HeartHandshake, 
  Compass, 
  Hourglass, 
  ShieldAlert, 
  RotateCcw,
  Check,
  CheckCircle,
  Sparkles,
  Target,
  Rocket,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Square,
  Eye,
  EyeOff,
  X,
  SlidersHorizontal,
  Clock,
  ShieldCheck,
  Coffee
} from 'lucide-react'
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  LineChart,
  Line
} from 'recharts'
import { cn } from '../lib/utils'

interface WellnessSignal {
  id: string
  severity: 'info' | 'caution' | 'warning'
  pattern_name: string
  observation: string
  gentle_suggestion: string
}

export function DeepWorkView() {
  const [signals, setSignals] = useState<WellnessSignal[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [showSystemResumePrompt, setShowSystemResumePrompt] = useState<boolean>(false)
  const [showPermissionGuidelines, setShowPermissionGuidelines] = useState<boolean>(false)

  const {
    containerRef: permissionRef,
    shakeKey: permissionShakeKey,
    isFlashing: permissionIsFlashing
  } = useSafeClickOutside({
    isOpen: showPermissionGuidelines,
    isDirty: false,
    onClose: () => setShowPermissionGuidelines(false)
  })

  const trackerDegraded = useAppStore((state) => state.trackerDegraded)
  const setTrackerDegraded = useAppStore((state) => state.setTrackerDegraded)
  const activeSessionId = useAppStore((state) => state.activeSessionId)
  const featureVisibility = useAppStore((state) => state.featureVisibility)
  const usageMilestones = useAppStore((state) => state.usageMilestones)
  const dismissedTips = useAppStore((state) => state.dismissedTips)
  const dismissTip = useAppStore((state) => state.dismissTip)

  // Custom Self-Regulated Focus Timer controls
  const { startSession, stopSession } = useTasks()
  const tasks = useAppStore((state) => state.tasks)
  const projects = useAppStore((state) => state.projects)
  const activeSessionElapsedSeconds = useAppStore((state) => state.activeSessionElapsedSeconds)
  const activeSessionDistractionCount = useAppStore((state) => state.activeSessionDistractionCount)
  const activeTaskId = useAppStore((state) => state.activeTaskId)

  const [activeSession, setActiveSessionObj] = useState<any>(null)
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState<boolean>(false)
  const [isDistractionDetailsExpanded, setIsDistractionDetailsExpanded] = useState<boolean>(false)
  const [sessionDistractions, setSessionDistractions] = useState<any[]>([])

  const [visibleDistractionCount, setVisibleDistractionCount] = useState<number>(0)
  const [lastDistractionUpdate, setLastDistractionUpdate] = useState<number>(0)

  const targetStudyDurationMins = useAppStore((state) => state.targetStudyDurationMins)
  const targetBreakDurationMins = useAppStore((state) => state.targetBreakDurationMins)
  const setTargetStudyDurationMins = useAppStore((state) => state.setTargetStudyDurationMins)
  const setTargetBreakDurationMins = useAppStore((state) => state.setTargetBreakDurationMins)
  const setCurrentPhase = useAppStore((state) => state.setCurrentPhase)
  const setSessionTargetDurationMins = useAppStore((state) => state.setSessionTargetDurationMins)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isStartingSession, setIsStartingSession] = useState<boolean>(false)
  
  // Rule checks
  const [sidebarEnabled, setSidebarEnabled] = useState<boolean>(true)
  const [generalEnabled, setGeneralEnabled] = useState<boolean>(true)
  const [rules, setRules] = useState<Record<string, boolean>>({
    overtime_boundaries: true,
    meeting_strain: true,
    sleep_erosion: true,
    task_spillover: true,
    habit_dropout: true,
    sustainability_ratio: true,
  })

  const [confirmPurge, setConfirmPurge] = useState<boolean>(false)
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showAdvancedPanel, setShowAdvancedPanel] = useState<boolean>(false)
  const [showBreakSettings, setShowBreakSettings] = useState<boolean>(false)

  const loadAllData = async () => {
    if (!window.electronAPI) return
    try {
      // 1. Load wellness dynamic settings
      const mainEnabled = await window.electronAPI.getSetting('wellness.signals.enabled', 'true')
      setGeneralEnabled(mainEnabled === 'true')

      const sideEnabled = await window.electronAPI.getSetting('wellness.sidebar.enabled', 'true')
      setSidebarEnabled(sideEnabled === 'true')

      const rulesMap: Record<string, boolean> = {}
      for (const key of Object.keys(rules)) {
        const val = await window.electronAPI.getSetting(`wellness.signal.${key}.enabled`, 'true')
        rulesMap[key] = val === 'true'
      }
      setRules(rulesMap)

      // 2. Load computed real-time active signals
      const activeSignals = await window.electronAPI.getWellnessSignals()
      setSignals(activeSignals || [])

      // 3. Load aggregated analytics database payload
      const deepWorkAnalytics = await window.electronAPI.getWellnessAnalytics()
      setAnalytics(deepWorkAnalytics)

      // 4. Load active session details
      const sessionObj = await window.electronAPI.getActiveSession()
      setActiveSessionObj(sessionObj)
    } catch (err) {
      console.error('Failed loading local deep work intelligence data:', err)
    }
  }

  useEffect(() => {
    const now = Date.now()
    // rate-limit update to once per 5 minutes (300000 ms) unless it's first update or 0
    if (activeSessionDistractionCount === 0 || lastDistractionUpdate === 0 || now - lastDistractionUpdate >= 300000) {
      setVisibleDistractionCount(activeSessionDistractionCount)
      setLastDistractionUpdate(now)
    }
  }, [activeSessionDistractionCount])

  useEffect(() => {
    async function fetchDistractions() {
      if (!window.electronAPI) return
      if (activeSessionId && isDistractionDetailsExpanded) {
        try {
          const list = await window.electronAPI.getSessionDistractions(activeSessionId)
          setSessionDistractions(list || [])
        } catch (err) {
          console.error('Failed to fetch session distractions:', err)
        }
      }
    }
    fetchDistractions()
  }, [activeSessionId, isDistractionDetailsExpanded, activeSessionDistractionCount])

  useEffect(() => {
    loadAllData()

    if (!window.electronAPI) return

    const removeResumeListener = window.electronAPI.onSessionSystemResumed?.((sessionId) => {
      console.log('[DEEP WORK VIEW] System resumed for session:', sessionId)
      setShowSystemResumePrompt(true)
    })

    const removeTrackerDegradedListener = window.electronAPI.onTrackerDegraded?.((msg) => {
      console.log('[DEEP WORK VIEW] Monitoring degraded:', msg)
      setTrackerDegraded(true)
    })

    const removeStateChangedListener = window.electronAPI.onSessionStateChanged?.(() => {
      loadAllData()
    })

    return () => {
      if (typeof removeResumeListener === 'function') removeResumeListener()
      if (typeof removeTrackerDegradedListener === 'function') removeTrackerDegradedListener()
      if (typeof removeStateChangedListener === 'function') removeStateChangedListener()
    }
  }, [activeSessionId, activeSessionElapsedSeconds])

  const handleToggleGeneral = async (checked: boolean) => {
    if (!window.electronAPI) return
    setGeneralEnabled(checked)
    await window.electronAPI.setSetting('wellness.signals.enabled', checked ? 'true' : 'false')
    // Refresh calculations
    setTimeout(loadAllData, 100)
  }

  const handleToggleSidebar = async (checked: boolean) => {
    if (!window.electronAPI) return
    setSidebarEnabled(checked)
    await window.electronAPI.setSetting('wellness.sidebar.enabled', checked ? 'true' : 'false')
  }

  const handleToggleRule = async (ruleId: string, checked: boolean) => {
    if (!window.electronAPI) return
    const updated = { ...rules, [ruleId]: checked }
    setRules(updated)
    await window.electronAPI.setSetting(`wellness.signal.${ruleId}.enabled`, checked ? 'true' : 'false')
    // Refresh active advisory signals
    setTimeout(async () => {
      const activeSignals = await window.electronAPI.getWellnessSignals()
      setSignals(activeSignals || [])
    }, 100)
  }

  const handleDismissSignal = async (id: string) => {
    if (!window.electronAPI) return
    await window.electronAPI.dismissWellnessSignal(id)
    // Filter locally instantly and reload
    setSignals(prev => prev.filter(s => s.id !== id))
  }

  const handleResetDismissed = async () => {
    if (!window.electronAPI) return
    await window.electronAPI.resetDismissedWellnessSignals()
    loadAllData()
  }

  const handleExportData = async () => {
    if (!window.electronAPI) return
    setExportMessage(null)
    const result = await window.electronAPI.exportWellnessData()
    if (result.success) {
      setExportMessage({
        type: 'success',
        text: `Export successfully written to location: ${result.filePath}`
      })
      setTimeout(() => setExportMessage(null), 8000)
    } else if (result.error) {
      setExportMessage({
        type: 'error',
        text: `Export error: ${result.error}`
      })
    }
  }

  const handlePurgeHistory = async () => {
    if (!window.electronAPI) return
    await window.electronAPI.clearSessionHistory()
    setConfirmPurge(false)
    loadAllData()
  }

  // Pre-process 24H bento focus blocks
  const bentoHours = Array.from({ length: 24 }, (_, h) => {
    const minRecorded = analytics?.weeklyDistribution?.find((d: any) => d.hour === h)?.minutes || 0
    let intensity = 0
    if (minRecorded > 0) {
      if (minRecorded < 30) intensity = 1
      else if (minRecorded < 60) intensity = 2
      else if (minRecorded < 120) intensity = 3
      else intensity = 4
    }
    return { hour: h, minutes: minRecorded, intensity }
  })

  // Format charts data
  const chartData = analytics?.dailyDeepWork ? analytics.dailyDeepWork.map((d: any) => {
    // dates are formatted in YYYY-MM-DD local timezone, format to MM/DD
    const parts = d.date.split('-')
    const shortDate = parts.length === 3 ? `${parts[1]}/${parts[2]}` : d.date
    return {
      date: shortDate,
      minutes: d.minutes
    }
  }) : []

  // Format distraction and preservation trend data
  const distractionData = analytics?.interruptionTrends ? analytics.interruptionTrends.map((t: any) => {
    const parts = t.date.split('-')
    const shortDate = parts.length === 3 ? `${parts[1]}/${parts[2]}` : t.date
    return {
      date: shortDate,
      avgDistractions: t.avgDistractions,
      totalDistractions: t.totalDistractions,
      focusPreservationRate: t.focusPreservationRate
    }
  }) : []

  const [isConfirmingStop, setIsConfirmingStop] = useState<boolean>(false)
  const isSessionPaused = activeSession?.status === 'paused'
  const handlePauseResume = async () => {
    if (!window.electronAPI) return
    try {
      if (isSessionPaused) {
        await window.electronAPI.resumeSession?.()
      } else {
        await window.electronAPI.pauseSession?.()
      }
      loadAllData()
    } catch (err) {
      console.error('Failed to toggle session pause/resume state:', err)
    }
  }

  if (!featureVisibility.focusTimer) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 p-8 font-sans h-full">
        <div className="text-center max-w-md space-y-3 p-8 border border-zinc-900 rounded-2xl bg-zinc-950/40">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Focus Workspace is Hidden</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The Focus Workspace and Pomodoro Timer are currently hidden to keep your dashboard clean. You can activate this feature any time in Settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <section 
      aria-label="Deep Work and Burnout Intelligence Dashboard"
      className="w-full h-full flex flex-col p-6 overflow-y-auto custom-scrollbar select-none relative view-container" 
      id="deepwork-view-container"
    >
      {/* Gentle Non-Punitive System Resume Prompt */}
      <AnimatePresence>
        {showSystemResumePrompt && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-3rem)] bg-zinc-950/95 border border-indigo-500/20 rounded-2xl p-4 shadow-2xl backdrop-blur-xl"
            id="system-resume-prompt-banner-dw"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mt-0.5 shrink-0">
                <Sparkles size={16} className="animate-pulse" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-bold text-xs text-zinc-100 uppercase tracking-widest">System Pause Recovered</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Welcome back! Your focus block has been securely held. Shall we resume your workspace flow?
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={async () => {
                      if (window.electronAPI && window.electronAPI.resumeSession) {
                        await window.electronAPI.resumeSession()
                        setShowSystemResumePrompt(false)
                        loadAllData()
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                  >
                    Resume Flow
                  </button>
                  <button
                    onClick={() => setShowSystemResumePrompt(false)}
                    className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-semibold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                  >
                    Keep Paused
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5 mb-6 drag-region">
        <div className="flex items-center gap-3 no-drag">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Brain size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-[30px] font-bold tracking-tight text-zinc-100 mb-0.5" id="deepwork-view-title">
              Focus & Deep Work
            </h1>
            <p className="text-xs text-zinc-400">
              Distraction-free environment for deep, self-regulated work sessions.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 no-drag shrink-0">
          <button
            type="button"
            onClick={() => setShowAdvancedPanel(prev => !prev)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-sm",
              showAdvancedPanel
                ? "bg-purple-600/20 border-purple-500/40 text-purple-300 ring-1 ring-purple-500/20"
                : "bg-zinc-900/60 hover:bg-zinc-850 border-zinc-800 text-zinc-350 hover:text-zinc-100"
            )}
            id="toggle-advanced-rules-btn"
          >
            <SlidersHorizontal size={13} className={showAdvancedPanel ? "text-purple-400" : "text-zinc-400"} />
            <span>Advanced Rules & Privacy</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded font-mono font-bold",
              generalEnabled ? "bg-purple-500/20 text-purple-300" : "bg-zinc-800 text-zinc-500"
            )}>
              {generalEnabled ? "Rules ON" : "Off"}
            </span>
          </button>
        </div>
      </div>

      {/* Advanced Rules & Diagnostics Drawer/Panel */}
      <AnimatePresence>
        {showAdvancedPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="p-6 rounded-2xl bg-zinc-950/80 border border-purple-500/20 shadow-2xl backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <SlidersHorizontal size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                      Advanced Focus Intelligence & Rules Engine
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Customize local burnout signals, biometric pacing, and security sandbox preferences.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 px-3 py-1 rounded-xl">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Heuristics Engine:</span>
                    <button
                      onClick={() => handleToggleGeneral(!generalEnabled)}
                      className={cn(
                        "relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        generalEnabled ? "bg-purple-600" : "bg-zinc-700"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          generalEnabled ? "translate-x-3.5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  <button
                    onClick={() => setShowAdvancedPanel(false)}
                    className="text-xs text-zinc-400 hover:text-zinc-200 px-2.5 py-1 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    Hide Settings
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Granular Rules (7 cols) */}
                <div className="lg:col-span-7 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                    Burnout & Fatigue Guardrails
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { id: 'overtime_boundaries', label: 'Overtime Focus Habit', desc: 'Alerts when focus blocks repeatedly fall past 8 PM or before 8 AM.' },
                      { id: 'meeting_strain', label: 'Meeting Overhead Strain', desc: 'Warns about high-density calendar meeting days lacking focus blocks.' },
                      { id: 'sleep_erosion', label: 'Sleep Boundary Protection', desc: 'Triggers when task completions regularly erode late-night boundaries.' },
                      { id: 'task_spillover', label: 'Commitment Over-estimation', desc: 'Cautions when >60% of today committed tasks roll over due date.' },
                      { id: 'habit_dropout', label: 'Habit De-calibration Tracker', desc: 'Spots when active streak habits lapse to lower consistency risks.' },
                      { id: 'sustainability_ratio', label: 'Sustainability Deficit alert', desc: 'Heuristic comparing extreme grinding focus vs self-rated fatigue.' }
                    ].map(rule => (
                      <div key={rule.id} className="flex items-start justify-between gap-2.5 p-3 rounded-xl border border-zinc-900 bg-zinc-900/30">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold leading-tight text-zinc-200">{rule.label}</p>
                          <p className="text-[10px] text-zinc-450 leading-relaxed">{rule.desc}</p>
                        </div>
                        <button
                          onClick={() => handleToggleRule(rule.id, !rules[rule.id])}
                          className={cn(
                            "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none self-start mt-0.5",
                            rules[rule.id] ? "bg-purple-600" : "bg-zinc-700"
                          )}
                        >
                          <span
                            className={cn(
                              "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                              rules[rule.id] ? "translate-x-3" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-zinc-900 flex items-center justify-between p-2 rounded-xl bg-zinc-900/20">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold leading-none text-zinc-200">Show in main Sidebar</p>
                      <p className="text-[10px] text-zinc-400">Places a quick-shortcut Brain icon on the main app drawer.</p>
                    </div>
                    <button
                      onClick={() => handleToggleSidebar(!sidebarEnabled)}
                      className={cn(
                        "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none self-center",
                        sidebarEnabled ? "bg-purple-600" : "bg-zinc-700"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          sidebarEnabled ? "translate-x-3" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Diagnostics & Sandbox (5 cols) */}
                <div className="lg:col-span-5 space-y-4 bg-zinc-900/20 p-4 rounded-xl border border-zinc-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                    Security Guarantee & Local Sandbox
                  </span>

                  <div className="space-y-2 text-xs text-zinc-400">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold bg-emerald-950/20 border border-emerald-900/30 px-3 py-2 rounded-xl text-xs">
                      <ShieldCheck size={16} />
                      <span>LOCAL_ONLY_WELLNESS_PROCESSING = TRUE</span>
                    </div>

                    <div className="space-y-1">
                      <p className="font-bold uppercase tracking-wider text-[10px] text-zinc-500">Database sandbox path</p>
                      <p className="font-mono bg-zinc-950/50 p-2 rounded-lg border border-zinc-900 text-[10px] text-zinc-400 break-all leading-tight">
                        {analytics?.privacy?.localDbPath || 'app.db (sandboxedUserDataDirectory)'}
                      </p>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleExportData}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl transition-all cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Export Safety JSON</span>
                      </button>
                    </div>

                    {/* Purge Box */}
                    <div className="p-3 bg-red-950/10 border border-red-950/30 rounded-xl space-y-2 mt-3">
                      <div className="flex items-start gap-2 text-red-400">
                        <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                        <div className="space-y-0.5">
                          <p className="font-bold text-[11px]">Purge Wellness Sandbox</p>
                          <p className="text-[10px] leading-relaxed text-zinc-450">
                            Wipe focus logs, reflections, and telemetry tables.
                          </p>
                        </div>
                      </div>

                      {confirmPurge ? (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => setConfirmPurge(false)}
                            className="flex-1 py-1 text-[10px] font-bold bg-zinc-900 text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors uppercase cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handlePurgeHistory}
                            className="flex-1 py-1 text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors uppercase cursor-pointer"
                          >
                            Confirm Purge
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmPurge(true)}
                          className="w-full flex items-center justify-center gap-1.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-white bg-red-900/10 hover:bg-red-600 border border-red-900/20 rounded-lg transition-all cursor-pointer mt-1"
                        >
                          <Trash2 size={11} />
                          <span>Purge Wellness Tables</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {exportMessage && (
        <div 
          className={cn(
            "p-3 rounded-xl border mb-6 text-xs flex items-start gap-2.5",
            exportMessage.type === 'success' 
              ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400" 
              : "bg-red-950/20 border-red-500/20 text-red-400"
          )}
          id="export-message-banner"
        >
          {exportMessage.type === 'success' ? (
            <CheckCircle size={15} className="shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert size={15} className="shrink-0 mt-0.5" />
          )}
          <span>{exportMessage.text}</span>
        </div>
      )}

      {/* Tracker Degraded Badge */}
      {trackerDegraded && (
        <div 
          onClick={() => setShowPermissionGuidelines(true)}
          className="mb-6 p-4 rounded-xl border border-amber-500/10 bg-amber-950/10 text-amber-300 hover:bg-amber-950/20 transition-all cursor-pointer text-xs flex items-center justify-between gap-3 shrink-0"
          id="tracker-degraded-badge"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-500 animate-pulse">
              <ShieldAlert size={12} />
            </div>
            <span>System monitoring running in basic simulation mode. Click here to check operating system execution rights.</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-amber-500/80 tracking-widest border border-amber-500/20 rounded px-1.5 py-0.5 shrink-0">
            Fix Issue
          </span>
        </div>
      )}

      {/* Permission Guidelines Modal/Card */}
      <AnimatePresence>
        {showPermissionGuidelines && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            id="permission-guidelines-modal-bg"
          >
            <motion.div 
              ref={permissionRef}
              initial={{ scale: 0.95, y: 15 }}
              animate={permissionShakeKey > 0 ? {
                x: [0, -6, 6, -6, 6, -4, 4, 0],
                opacity: 1,
                scale: 1,
                y: 0
              } : { scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className={cn(
                "bg-zinc-950 border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 transition-all duration-300",
                permissionIsFlashing
                  ? "border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-2 ring-amber-500/40"
                  : "border-zinc-850"
              )}
              id="permission-guidelines-modal-content"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={18} className="text-amber-500 animate-pulse" />
                  <p className="font-bold text-sm text-zinc-200 uppercase tracking-wider">Tracker Permissions Guide</p>
                </div>
                <button 
                  onClick={() => setShowPermissionGuidelines(false)}
                  className="text-zinc-500 hover:text-zinc-350 font-bold text-xs uppercase"
                >
                  Close
                </button>
              </div>

              <div className="text-xs text-zinc-400 space-y-3 leading-relaxed">
                <p>
                  Keystone uses native operating system APIs to monitor active workspace metrics. If spawning fails or execution permissions are denied, it degrades gracefully to simulation mode so you never crash.
                </p>

                <div className="border border-zinc-900 bg-zinc-900/10 rounded-xl p-3.5 space-y-2">
                  <p className="font-bold text-zinc-300">Windows 11 (PowerShell Execution Policy):</p>
                  <p className="text-[11px]">
                    Ensure local scripting is permitted by opening an Admin PowerShell and running:
                  </p>
                  <pre className="p-2 rounded bg-zinc-900/50 font-mono text-[10px] text-zinc-300 border border-zinc-800/60 overflow-x-auto">
                    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
                  </pre>
                </div>

                <div className="border border-zinc-900 bg-zinc-900/10 rounded-xl p-3.5 space-y-2">
                  <p className="font-bold text-zinc-300">macOS (Screen Recording & AppleScript Permission):</p>
                  <p className="text-[11px]">
                    To capture foreground app names using AppleScript CLI, you must check operating system entitlements:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>Go to System Settings &gt; Privacy & Security &gt; Accessibility</li>
                    <li>Toggle "Keystone" / "Terminal" / "Electron" to permitted.</li>
                    <li>Under System Settings &gt; Screen Recording, ensure the permissions are granted.</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-zinc-900">
                <button
                  onClick={() => setShowPermissionGuidelines(false)}
                  className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-350 hover:text-white font-semibold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                >
                  Acknowledge
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time active wellness advisory banner */}
      {generalEnabled && (
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs px-1 text-zinc-400 font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Compass size={13} className="text-zinc-500" />
              <span>Active Wellness Advisory ({signals.length})</span>
            </div>
            {signals.length === 0 && (
              <button 
                onClick={handleResetDismissed}
                className="text-[10px] text-zinc-500 hover:text-zinc-350 transition-colors uppercase font-bold tracking-widest flex items-center gap-1 cursor-pointer"
                title="Restore any closed warnings"
              >
                <RotateCcw size={11} />
                <span>Restore Dismissed</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {signals.length > 0 ? (
              signals.map(sig => {
                const isWarning = sig.severity === 'warning'
                const isCaution = sig.severity === 'caution'
                return (
                  <div
                    key={sig.id}
                    className={cn(
                      "flex flex-col md:flex-row md:items-start justify-between gap-4 p-4 rounded-2xl border backdrop-blur-xl relative overflow-hidden transition-all shadow-md",
                      isWarning && "bg-red-950/10 border-red-500/20 text-red-200",
                      isCaution && "bg-amber-955/10 border-amber-500/20 text-amber-200",
                      sig.severity === 'info' && "bg-indigo-950/10 border-indigo-500/20 text-indigo-200"
                    )}
                    id={`wellness-signal-${sig.id}`}
                  >
                    {/* Background faint gradient */}
                    <div 
                      className={cn(
                        "absolute -right-16 -bottom-16 w-32 h-32 rounded-full filter blur-3xl opacity-10 pointer-events-none",
                        isWarning && "bg-red-500",
                        isCaution && "bg-amber-500",
                        sig.severity === 'info' && "bg-indigo-500"
                      )} 
                    />

                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5",
                        isWarning && "bg-red-500/10 border-red-500/10 text-red-400",
                        isCaution && "bg-amber-500/10 border-amber-500/10 text-amber-400",
                        sig.severity === 'info' && "bg-indigo-500/10 border-indigo-500/10 text-indigo-400"
                      )}>
                        <ShieldAlert size={14} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                            isWarning && "bg-red-500/10 text-red-400 border border-red-500/10",
                            isCaution && "bg-amber-500/10 text-amber-400 border border-amber-500/10",
                            sig.severity === 'info' && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/10"
                          )}>
                            {sig.pattern_name}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-zinc-300/90">{sig.observation}</p>
                        <p className="text-xs text-zinc-400/80 leading-relaxed max-w-3xl">{sig.gentle_suggestion}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDismissSignal(sig.id)}
                      className="shrink-0 px-2.5 py-1 text-[11px] font-bold tracking-wider text-zinc-400 hover:text-zinc-200 bg-zinc-900/50 hover:bg-zinc-850 hover:border-zinc-750 border border-zinc-850/60 rounded-xl transition-all h-fit cursor-pointer uppercase self-end md:self-center"
                    >
                      Dismiss
                    </button>
                  </div>
                )
              })
            ) : (
              <div className="p-5 border border-zinc-900 bg-zinc-900/10 rounded-2xl flex items-center gap-3.5 text-zinc-400 text-xs">
                <HeartHandshake size={18} className="text-purple-400 shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-zinc-200">No active fatigue loops detected.</p>
                  <p>All safety wellness thresholds are calibrated green. Your workload boundary represents healthy focus density.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progressive Wellness Insights Tip */}
      <AnimatePresence>
        {!activeSessionId && !featureVisibility.wellnessAnalytics && usageMilestones.sessionsCompleted >= 3 && !dismissedTips.includes('tip-wellness-insights') && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="mb-6 p-4 bg-zinc-800/60 border border-zinc-700/35 rounded-xl relative flex items-center justify-between gap-3 shadow-sm text-[13px] text-zinc-100/60"
            id="tip-wellness-insights-banner"
          >
            <span className="font-sans font-medium">
              You've been building a great rhythm. Wellness insights can help you sustain it. Enable it in Settings.
            </span>
            <button
              type="button"
              onClick={() => dismissTip('tip-wellness-insights')}
              className="p-1 text-zinc-400 hover:text-zinc-250 hover:bg-zinc-700/40 rounded-lg transition-all cursor-pointer shrink-0"
              aria-label="Dismiss tip"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Focus Session Dashboard or Self-Regulated Focus Timer Section */}
      {activeSessionId ? (
        <div className="mb-6 p-6 border border-purple-500/10 bg-purple-950/5 backdrop-blur-md rounded-2xl flex flex-col gap-5" id="active-session-panel">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-900/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Brain size={16} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-150 uppercase tracking-wider leading-none">
                  Active Focus Session
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {activeSession?.status === 'paused' ? 'Focus flow is paused' : 'Your workspace boundary is protected'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-400">
                {activeSession?.status || 'Active'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Timer Counter */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">Elapsed / Target</span>
              <div className="font-mono text-4xl font-semibold tracking-tight text-purple-400">
                {(() => {
                  const targetMins = activeSession?.targetDurationMins || activeSession?.target_duration_mins || 25
                  
                  const formatTime = (m: number, s: number) => 
                    `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`

                  // If count-down preferred:
                  const targetSecs = targetMins * 60
                  if (activeSessionElapsedSeconds > targetSecs) {
                    const overSecs = activeSessionElapsedSeconds - targetSecs
                    return `+${formatTime(Math.floor(overSecs / 60), overSecs % 60)}`
                  } else {
                    const remainingSecs = targetSecs - activeSessionElapsedSeconds
                    return formatTime(Math.floor(remainingSecs / 60), remainingSecs % 60)
                  }
                })()}
              </div>
              <span className="text-[10px] text-zinc-500 mt-2 font-mono">
                Target: {activeSession?.targetDurationMins || activeSession?.target_duration_mins || 25}m
              </span>
            </div>

            {/* Context Details */}
            <div className="md:col-span-8 flex flex-col gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Focusing On</span>
                <h4 className="text-base font-bold text-zinc-200">
                  {(() => {
                    const activeTask = tasks.find(t => t.id === activeTaskId || t.id === activeSession?.taskId)
                    return activeTask?.title || "General Focus & Craftsmanship Flow"
                  })()}
                </h4>
                {activeSession?.projectId && (
                  <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-850">
                    <span 
                      className="w-1.5 h-1.5 rounded-full" 
                      style={{ backgroundColor: projects.find(p => p.id === activeSession.projectId)?.color || '#a855f7' }} 
                    />
                    {projects.find(p => p.id === activeSession.projectId)?.name || 'Project'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rate-limited Distraction metric display */}
                <div className="p-4 rounded-xl bg-zinc-950/30 border border-zinc-900/60">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Distractions Intercepted</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-semibold text-zinc-200 font-mono">{visibleDistractionCount}</span>
                    <span className="text-[10px] text-zinc-500">(Updates periodically)</span>
                  </div>
                  <p className="text-[10px] text-zinc-450 leading-relaxed mt-1">
                    Distraction counts are smoothed in real-time to protect focus boundaries.
                  </p>
                </div>

                {/* Wellness Advisory mini block */}
                <div className="p-4 rounded-xl bg-zinc-950/30 border border-zinc-900/60 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Wellness Pulse</span>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {signals.length > 0 
                        ? `${signals.length} wellness advisory notifications current.` 
                        : "Your cognitive load parameters are fully green. Enjoy the flow state."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Distraction Progressive Details Disclosure */}
              <div className="pt-2 border-t border-zinc-900/40">
                <button
                  onClick={() => setIsDistractionDetailsExpanded(!isDistractionDetailsExpanded)}
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                >
                  {isDistractionDetailsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  <span>Monitored Activity Detail ({visibleDistractionCount})</span>
                </button>

                {isDistractionDetailsExpanded && (
                  <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                    {sessionDistractions.length > 0 ? (
                      sessionDistractions.map((d, idx) => (
                        <div key={d.id || idx} className="flex items-center justify-between text-[11px] px-3 py-2 bg-zinc-900/10 border border-zinc-900/40 rounded-xl">
                          <span className="font-mono text-[10px] font-semibold text-zinc-400 uppercase">
                            {d.appName}
                          </span>
                          <span className="text-zinc-500 font-mono text-[9px]">
                            {new Date(d.createdAt || d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-zinc-500 italic pl-1">No distraction events logged during this segment yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Control Action Buttons (spaced apart to prevent accidental quit clicks) */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-900/60 mt-2">
            {/* Pause / Resume Button */}
            <button
              onClick={handlePauseResume}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600/15 hover:bg-purple-600/35 text-purple-400 hover:text-purple-300 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-all border border-purple-500/10"
            >
              {activeSession?.status === 'paused' ? (
                <>
                  <Play size={14} />
                  <span>Resume session</span>
                </>
              ) : (
                <>
                  <Pause size={14} />
                  <span>Pause session</span>
                </>
              )}
            </button>

            {/* Destructive gap implemented here to avoid accidental quit clicks */}
            <div className="flex items-center gap-8 mr-8">
              {isConfirmingStop ? (
                <div className="flex items-center gap-3 bg-red-950/5 border border-red-900/15 p-2 rounded-xl">
                  <span className="text-[11px] text-zinc-400 font-medium">Stop focus segment?</span>
                  <button
                    onClick={() => setIsConfirmingStop(false)}
                    className="px-2.5 py-1 text-[10px] uppercase font-bold text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Keep
                  </button>
                  <button
                    onClick={async () => {
                      await stopSession()
                      setIsConfirmingStop(false)
                      loadAllData()
                    }}
                    className="px-2.5 py-1 text-[10px] uppercase font-bold bg-red-650 hover:bg-red-600 text-white rounded-lg cursor-pointer"
                  >
                    Stop
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsConfirmingStop(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-950/40 hover:bg-zinc-900/40 border border-zinc-900/60 text-red-400/80 hover:text-red-400 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-all"
                >
                  <Square size={12} />
                  <span>Stop session</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Self-Regulated Focus Timer Section */
        <div className="mb-6 p-6 border border-zinc-900 bg-zinc-900/20 backdrop-blur-md rounded-2xl flex flex-col gap-6" id="self-regulated-timer-panel">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Target size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider leading-none">
                  Focus Timer
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Choose a comfortable block duration to begin deep, distraction-free work.
                </p>
              </div>
            </div>

            {/* Quick Break Settings Toggle */}
            <button
              type="button"
              onClick={() => setShowBreakSettings(prev => !prev)}
              className={cn(
                "self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                showBreakSettings
                  ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400"
                  : "bg-zinc-900/60 hover:bg-zinc-850 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Coffee size={13} />
              <span>{showBreakSettings ? "Hide Break Interval" : "+ Add Break Interval"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Focus Duration Selection */}
            <div className="space-y-4" id="study-track-container">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Clock size={13} className="text-indigo-400" />
                  Focus Duration
                </span>
                <span className="text-sm font-mono font-bold text-indigo-400 bg-indigo-950/30 border border-indigo-500/20 px-2.5 py-0.5 rounded-lg">
                  {targetStudyDurationMins} minutes
                </span>
              </div>

              {/* Study Presets */}
              <div className="grid grid-cols-5 gap-2">
                {[15, 25, 45, 60, 90].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTargetStudyDurationMins(p)}
                    className={cn(
                      "py-2.5 px-1 rounded-xl border text-center transition-all cursor-pointer text-xs font-mono font-bold active:scale-95",
                      targetStudyDurationMins === p
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20 font-bold"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200"
                    )}
                    id={`study-duration-${p}`}
                  >
                    {p}m
                  </button>
                ))}
              </div>

              {/* Study Slider */}
              <div className="space-y-1.5 pt-1">
                <input
                  type="range"
                  min="5"
                  max="180"
                  step="5"
                  value={targetStudyDurationMins}
                  onChange={(e) => setTargetStudyDurationMins(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  id="study-duration-slider"
                />
                <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                  <span>5m</span>
                  <span>45m</span>
                  <span>90m</span>
                  <span>180m</span>
                </div>
              </div>
            </div>

            {/* Right Column: Project & Break Selection */}
            <div className="space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 block">
                Associated Project (Optional)
              </span>

              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                {/* General Focus Option */}
                <button
                  type="button"
                  onClick={() => setSelectedProjectId(null)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all",
                    selectedProjectId === null
                      ? "bg-zinc-800 border-zinc-600 text-white shadow-sm"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  )}
                  id="project-option-general"
                >
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>General Focus</span>
                  {selectedProjectId === null && <Check size={11} className="ml-1 text-purple-400" />}
                </button>

                {/* Projects List */}
                {projects.filter((p: any) => p.id !== 'inbox-default').map((project: any) => {
                  const isSelected = selectedProjectId === project.id
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => setSelectedProjectId(project.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all",
                        isSelected
                          ? "bg-zinc-800 text-white font-bold border-zinc-600 shadow-sm"
                          : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      )}
                      style={{
                        borderColor: isSelected ? project.color : undefined
                      }}
                      id={`project-option-${project.id}`}
                    >
                      {project.icon && project.icon.startsWith('data:image/') ? (
                        <img 
                          src={project.icon} 
                          alt={project.name}
                          className="w-3.5 h-3.5 rounded-full object-cover border border-zinc-800"
                        />
                      ) : (
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                      )}
                      <span>{project.name}</span>
                      {isSelected && <Check size={11} className="ml-1" style={{ color: project.color }} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Expandable Break Track */}
          <AnimatePresence>
            {showBreakSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-3 border-t border-zinc-900/80"
              >
                <div className="space-y-3 bg-zinc-950/40 p-4 rounded-xl border border-zinc-900" id="break-track-container">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Coffee size={13} />
                      Break Interval (Pomodoro Rest)
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                      {targetBreakDurationMins} minutes
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {[3, 5, 10, 15, 20].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTargetBreakDurationMins(p)}
                        className={cn(
                          "py-2 px-1 rounded-xl border text-center transition-all cursor-pointer text-xs font-mono font-bold",
                          targetBreakDurationMins === p
                            ? "bg-emerald-600 text-white border-emerald-500 font-bold"
                            : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200"
                        )}
                        id={`break-duration-${p}`}
                      >
                        {p}m
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="45"
                    step="1"
                    value={targetBreakDurationMins}
                    onChange={(e) => setTargetBreakDurationMins(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    id="break-duration-slider"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Launch Action */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
            <span className="text-xs text-zinc-400 hidden sm:inline">
              Ready to focus on uninterrupted work.
            </span>

            <button
              onClick={async () => {
                setIsStartingSession(true)
                try {
                  setCurrentPhase('study')
                  setSessionTargetDurationMins(targetStudyDurationMins)
                  await startSession({
                    projectId: selectedProjectId,
                    targetDurationMins: targetStudyDurationMins,
                    targetBreakDurationMins: targetBreakDurationMins
                  })
                } catch (err) {
                  console.error('Failed to start self-regulated session:', err)
                } finally {
                  setIsStartingSession(false)
                }
              }}
              disabled={isStartingSession}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
              id="btn-launch-self-regulated"
            >
              <Rocket size={15} />
              <span>Start Focus Session ({targetStudyDurationMins}m)</span>
            </button>
          </div>
        </div>
      )}

      {/* Full-Width Historical Analytics & Trends */}
      <div className="w-full flex flex-col gap-6 mb-6">
        {chartData.length === 0 ? (
          <div className="p-8 text-center bg-zinc-900/10 border border-zinc-900 rounded-2xl select-none flex flex-col items-center justify-center gap-4 border-dashed">
            <div className="p-3 bg-purple-600/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Hourglass size={24} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">No focus history yet</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Launch your first focus session above. Your daily deep work trends and bio-rhythms will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5 border border-zinc-900 bg-zinc-900/10 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Compass size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-150 uppercase tracking-wider leading-none">
                    Historical Analytics & Trends
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Explore long-term focus metrics and bio-rhythms. All telemetry remains fully local.
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setIsAnalyticsExpanded(!isAnalyticsExpanded)}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                {isAnalyticsExpanded ? (
                  <>
                    <EyeOff size={13} />
                    <span>Hide Trends</span>
                  </>
                ) : (
                  <>
                    <Eye size={13} />
                    <span>Show Trends</span>
                  </>
                )}
              </button>
            </div>

            {isAnalyticsExpanded && (
              <div className="pt-4 border-t border-zinc-900/60 flex flex-col gap-6 animate-fade-in">
                {/* 30-Day Trends Chart */}
                <div className="border border-zinc-900 bg-zinc-900/20 backdrop-blur-md rounded-2xl p-5 flex flex-col h-72">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">30-Day Trends</span>
                      <h3 className="text-xs font-semibold text-zinc-250 uppercase tracking-widest">
                        Daily Deep Work Minutes
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-zinc-400">Blocks &gt;= 25min</span>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 w-full select-none text-zinc-400">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <XAxis 
                          dataKey="date" 
                          stroke="#52525b" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#52525b" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          width={30}
                        />
                        <Tooltip 
                          contentStyle={{ background: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '11px', color: '#f4f4f5' }}
                          cursor={{ fill: 'rgba(168, 85, 247, 0.05)' }}
                          labelFormatter={(label) => `Date: ${label}`}
                          formatter={(value) => [`${value} minutes`, 'Completed focus']}
                        />
                        <Bar 
                          dataKey="minutes" 
                          fill="url(#purpleGlow)" 
                          radius={[4, 4, 0, 0]}
                        />
                        <defs>
                          <linearGradient id="purpleGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Focus Preservation & Distraction Cycles LineChart */}
                <div className="border border-zinc-900 bg-zinc-900/20 backdrop-blur-md rounded-2xl p-5 flex flex-col h-72" id="distraction-trend-card">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Cognitive Flow</span>
                      <h3 className="text-xs font-semibold text-zinc-250 uppercase tracking-widest">
                        Focus Preservation & Distractions
                      </h3>
                    </div>
                    <div className="text-right flex items-center gap-4 text-[10px] font-semibold">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-0.5 bg-emerald-400" />
                        <span className="text-zinc-400">Preservation Rate (%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-0.5 bg-amber-400" />
                        <span className="text-zinc-400">Avg Distractions</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 w-full select-none text-zinc-400">
                    {distractionData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-zinc-500 italic">
                        No distraction trends compiled yet. Keep flowing!
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={distractionData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }} id="distraction-trend-line-chart">
                          <XAxis 
                            dataKey="date" 
                            stroke="#52525b" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#52525b" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            width={30}
                          />
                          <Tooltip 
                            contentStyle={{ background: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '11px', color: '#f4f4f5' }}
                            labelFormatter={(label) => `Date: ${label}`}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="focusPreservationRate" 
                            stroke="#34d399" 
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#34d399', strokeWidth: 0 }}
                            activeDot={{ r: 5 }}
                            name="Preservation Rate"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="avgDistractions" 
                            stroke="#fbbf24" 
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#fbbf24', strokeWidth: 0 }}
                            activeDot={{ r: 5 }}
                            name="Avg Distractions"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Peak Focus Hourly Distribution */}
                <div className="border border-zinc-900 bg-zinc-900/20 backdrop-blur-md rounded-2xl p-5 flex flex-col">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-2 border-b border-zinc-900">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Local Bio-Rhythm map</span>
                      <h3 className="text-xs font-semibold text-zinc-250 uppercase tracking-widest">
                        Peak Focus Hourly Distribution
                      </h3>
                    </div>
                    
                    {analytics?.peakFocusWindow && (
                      <div className="bg-purple-950/25 border border-purple-900/30 rounded-xl px-3 py-1 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider leading-none">Optimal Window:</span>
                        <span className="text-xs text-purple-100 font-bold leading-none">{analytics.peakFocusWindow.peakWindow}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
                    Based on historical deep focus sessions concluded inside your SQLite sandbox. Hours represent your local clock.
                  </p>

                  {/* Hourly contribution map */}
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-2.5">
                    {bentoHours.map(cell => {
                      const isAm = cell.hour < 12
                      const dispHour = cell.hour === 0 ? 12 : cell.hour > 12 ? cell.hour - 12 : cell.hour
                      const label = `${dispHour}${isAm ? 'am' : 'pm'}`

                      return (
                        <div
                          key={cell.hour}
                          className="flex flex-col items-center justify-between p-2 rounded-xl border border-zinc-900 bg-zinc-950/20 h-16 relative group"
                        >
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide leading-none">{label}</span>
                          
                          <div 
                            className={cn(
                              "w-full h-4 rounded-md transition-all border border-transparent",
                              cell.intensity === 0 && "bg-zinc-900/40 border-zinc-900/35",
                              cell.intensity === 1 && "bg-purple-950/30 border-purple-900/10 hover:border-purple-800",
                              cell.intensity === 2 && "bg-purple-900/40 border-purple-800/15 hover:border-purple-600",
                              cell.intensity === 3 && "bg-purple-600/50 border-purple-500/10 hover:border-purple-400",
                              cell.intensity === 4 && "bg-purple-500/80 border-purple-400/10 hover:border-purple-300"
                            )} 
                          />

                          <span className="text-[9px] font-semibold text-zinc-400 tracking-tight leading-none">
                            {cell.minutes > 0 ? `${cell.minutes}m` : '0m'}
                          </span>

                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
                            <div className="bg-zinc-950 border border-zinc-800 px-2 py-1 rounded-md shadow-xl text-[9px] leading-relaxed text-zinc-300 whitespace-nowrap text-center space-y-0.5">
                              <p className="font-bold text-zinc-100">{label} Focus Segment</p>
                              <p>{cell.minutes} completed focus minutes</p>
                            </div>
                            <div className="w-1.5 h-1.5 bg-zinc-950 border-r border-b border-zinc-805 transform rotate-45 -mt-1" />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex items-center gap-3 mt-4 self-end text-[10px] text-zinc-500 font-semibold select-none">
                    <span>Less focus</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded bg-zinc-900 border border-zinc-900" />
                      <div className="w-2.5 h-2.5 rounded bg-purple-950/30" />
                      <div className="w-2.5 h-2.5 rounded bg-purple-900/40" />
                      <div className="w-2.5 h-2.5 rounded bg-purple-600/50" />
                      <div className="w-2.5 h-2.5 rounded bg-purple-500/80" />
                    </div>
                    <span>More focus</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer subtle helper */}
      <div className="mt-auto pt-4 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-900/40">
        <span>Protected by local SQLite telemetry</span>
        <button
          onClick={() => setShowAdvancedPanel(true)}
          className="text-zinc-400 hover:text-purple-400 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
        >
          <SlidersHorizontal size={12} />
          <span>Configure Burnout Guardrails & Sandbox Settings</span>
        </button>
      </div>
    </section>
  )
}
export default DeepWorkView
