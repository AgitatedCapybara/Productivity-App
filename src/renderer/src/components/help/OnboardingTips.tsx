// src/renderer/src/components/help/OnboardingTips.tsx
import { useState, useEffect } from 'react'
import { Sparkles, Calendar, Flame, Brain, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

export interface TipItem {
  id: string
  day: number
  title: string
  description: string
  icon: any
  actionText?: string
  actionView?: string
}

export function OnboardingTips({ activeView, onViewChange }: { activeView: string; onViewChange: (view: any) => void }) {
  const [showTips, setShowTips] = useState(true)
  const [appAgeDays, setAppAgeDays] = useState(1)
  const [dismissed, setDismissed] = useState<string[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // 1. First run initialization
    const firstRun = localStorage.getItem('keystone_first_run_time')
    if (!firstRun) {
      localStorage.setItem('keystone_first_run_time', String(Date.now()))
    }

    // 2. Read preferences
    const tipsPref = localStorage.getItem('keystone_show_feature_tips') !== 'false'
    setShowTips(tipsPref)

    // 3. Read simulated age or calculate real age
    const simulatedAgeStr = localStorage.getItem('keystone_simulated_age_days')
    if (simulatedAgeStr) {
      setAppAgeDays(parseInt(simulatedAgeStr, 10))
    } else if (firstRun) {
      const diffMs = Date.now() - parseInt(firstRun, 10)
      const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)
      setAppAgeDays(diffDays)
    }

    // 4. Read dismissed tips
    try {
      const dismissedList = JSON.parse(localStorage.getItem('keystone_dismissed_tips') || '[]')
      setDismissed(dismissedList)
    } catch {
      setDismissed([])
    }

    setIsLoaded(true)
  }, [activeView])

  // Sync simulated age updates instantly
  useEffect(() => {
    const handleStorageChange = () => {
      const simulatedAgeStr = localStorage.getItem('keystone_simulated_age_days')
      if (simulatedAgeStr) {
        setAppAgeDays(parseInt(simulatedAgeStr, 10))
      }
      const tipsPref = localStorage.getItem('keystone_show_feature_tips') !== 'false'
      setShowTips(tipsPref)
      try {
        const dismissedList = JSON.parse(localStorage.getItem('keystone_dismissed_tips') || '[]')
        setDismissed(dismissedList)
      } catch {
        // Safe fallback
      }
    }
    window.addEventListener('storage', handleStorageChange)
    const interval = setInterval(handleStorageChange, 1000) // fast poll to sync changes in views
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  if (!isLoaded || !showTips) return null

  const tips: TipItem[] = [
    {
      id: 'tip-day1',
      day: 1,
      title: 'Mindful Task Capture',
      description: 'Keystone is modeled around deep individual focus. Begin your day by entering your first major objective in the input above. Press Enter to dispatch it directly to your calm Inbox.',
      icon: Sparkles
    },
    {
      id: 'tip-day2',
      day: 2,
      title: 'Habits Tracker Unlocked',
      description: 'Progressive Tip: Establishing solid, repetitive routines is simple. Your habits list is now available in the sidebar to trace your consecutive streaks.',
      icon: Flame,
      actionText: 'View Habits',
      actionView: 'habits'
    },
    {
      id: 'tip-day3',
      day: 3,
      title: 'Focus Pomodoro Unlocked',
      description: 'Progressive Tip: Need absolute concentration? Your Focus Station is unlocked. Start a Pomodoro timer and the desktop app will monitor active distractions of other open windows.',
      icon: Brain,
      actionText: 'Focus Station',
      actionView: 'deepwork'
    },
    {
      id: 'tip-day7',
      day: 7,
      title: 'Morning Rituals Active',
      description: 'Progressive Tip: Intentional day planning delivers mental clarity. Try launching the Morning Planner under Calendar to design your daily time schedule blocks.',
      icon: Calendar,
      actionText: 'Go to Calendar',
      actionView: 'calendar'
    }
  ]

  // Filter tips based on current simulated app age and dismissal state
  const activeTips = tips.filter(tip => {
    if (appAgeDays < tip.day) return false
    if (dismissed.includes(tip.id)) return false
    return true
  })

  // We only show ONE tip at a time (prioritize day, keeping UI clear)
  if (activeTips.length === 0) return null
  const currentTip = activeTips[0]

  const handleDismiss = () => {
    const updated = [...dismissed, currentTip.id]
    setDismissed(updated)
    localStorage.setItem('keystone_dismissed_tips', JSON.stringify(updated))
  }

  const Icon = currentTip.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
        className="mb-6 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 hover:border-indigo-500/20 transition-colors relative flex gap-3.5 shadow-sm select-none"
        id={`onboarding-tip-${currentTip.id}`}
      >
        <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0 h-10 w-10 flex items-center justify-center border border-indigo-500/15">
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 pr-6 space-y-1">
          <header className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest font-sans">
              {currentTip.title}
            </h4>
            <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/10 text-indigo-400">
              DAY {currentTip.day}
            </span>
          </header>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans max-w-xl font-medium">
            {currentTip.description}
          </p>
          {currentTip.actionText && currentTip.actionView && (
            <div className="pt-1.5">
              <button
                onClick={() => onViewChange(currentTip.actionView)}
                className="px-2.5 py-1 bg-indigo-600/35 hover:bg-indigo-605 border border-indigo-500/15 hover:border-indigo-500/25 text-indigo-300 hover:text-white rounded-lg text-[9.5px] font-bold cursor-pointer transition-all"
              >
                {currentTip.actionText}
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 text-zinc-550 hover:text-zinc-300 p-1 rounded-md hover:bg-zinc-900/40 transition-colors"
          title="Dismiss tip permanently"
          id={`dismiss-${currentTip.id}-btn`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
