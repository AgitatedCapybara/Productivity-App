// src/renderer/src/components/onboarding/FirstRunFlow.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckSquare, Brain, FileText, ArrowRight, Check, HelpCircle } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { sheetTransition } from '../../lib/motion-tokens'
import { cn } from '../../lib/utils'

type Choice = 'tasks' | 'focus' | 'notes'

interface ToggleItem {
  id: string
  label: string
  description: string
  keys: string[]
  checked: boolean
}

export function FirstRunFlow() {
  const { setFirstRunComplete, setActiveView } = useAppStore()
  const [step, setStep] = useState<number>(1)
  const [choice, setChoice] = useState<Choice>('tasks')
  
  const [toggles, setToggles] = useState<ToggleItem[]>([
    {
      id: 'planning',
      label: 'Calendar & Planning',
      description: 'Incorporate schedule blocks and plan your days visually.',
      keys: ['calendar', 'plan'],
      checked: true
    },
    {
      id: 'habits',
      label: 'Habit Tracking',
      description: 'Maintain daily or weekly rhythms without punishment or guilt.',
      keys: ['habits'],
      checked: true
    },
    {
      id: 'deepwork',
      label: 'Deep Work Analytics',
      description: 'Understand where your focus goes and protect your wellness.',
      keys: ['deepwork', 'analytics'],
      checked: true
    },
    {
      id: 'circle',
      label: 'Peer Circle Sharing',
      description: 'Share and synchronize with friends securely in a local trusted circle.',
      keys: ['circle'],
      checked: false
    }
  ])

  const handleToggle = (id: string) => {
    setToggles(prev =>
      prev.map(t => (t.id === id ? { ...t, checked: !t.checked } : t))
    )
  }

  const handleSkip = async () => {
    // Write defaults
    if (window.electronAPI?.setSetting) {
      await window.electronAPI.setSetting('app.first_run_complete', 'true')
    }
    setFirstRunComplete(true)
  }

  const handleNextStep = () => {
    if (step < 3) {
      setStep(prev => prev + 1)
    }
  }

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(prev => prev - 1)
    }
  }

  const handleComplete = async () => {
    // 1. Save all toggles to the settings table
    if (window.electronAPI?.setSetting) {
      for (const t of toggles) {
        for (const viewKey of t.keys) {
          await window.electronAPI.setSetting(`sidebar.view.${viewKey}`, t.checked ? 'true' : 'false')
        }
      }
      // Save onboarding choice
      await window.electronAPI.setSetting('app.first_run_choice', choice)
      // Save first run complete
      await window.electronAPI.setSetting('app.first_run_complete', 'true')
    }

    // 2. Set view in app store based on user choice
    if (choice === 'tasks') {
      setActiveView('today')
    } else if (choice === 'focus') {
      setActiveView('deepwork')
    } else if (choice === 'notes') {
      setActiveView('views')
    }

    // 3. Mark complete in App state
    setFirstRunComplete(true)
  }

  const stepCopy = {
    tasks: {
      title: 'Your Task Space Is Ready',
      desc: "We've prepared your clean, high-contrast workspace for daily task management. Take deep breaths, capture tasks instantly with hotkeys, and clear your mind."
    },
    focus: {
      title: 'Your Focus Space Is Ready',
      desc: 'Your deep work session timers and active distraction protection are primed. Self-regulation is your superpower; protect your attention from cognitive residue.'
    },
    notes: {
      title: 'Your Spatial Bento Is Ready',
      desc: 'Your 2D spatial canvas is waiting. Create, drag, resize, and connect note cards naturally, without rigid hierarchies or forced order constraint.'
    }
  }

  return (
    <div id="first-run-onboarding-container" className="fixed inset-0 z-50 flex flex-col justify-between bg-zinc-950 text-zinc-100 font-sans p-8 md:p-16 select-none overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-indigo-400 font-mono tracking-widest text-xs uppercase">Keystone // Space to Think</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono">
          <span>STEP {step} OF 3</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-center items-center my-12 w-full max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={sheetTransition}
              className="w-full flex flex-col items-center text-center space-y-8"
              id="onboarding-step-1"
            >
              <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-sans font-medium tracking-tight text-white">
                  Welcome. This is your space to think clearly.
                </h1>
                <p className="text-zinc-400 max-w-xl mx-auto text-sm leading-relaxed">
                  We design tools to offload cognitive burden and defend focus. What core practice would you like to start with today?
                </p>
              </div>

              {/* Grid Options - Rule of Three */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-6">
                {/* Tasks Option */}
                <button
                  id="onboarding-choice-tasks"
                  onClick={() => setChoice('tasks')}
                  className={cn(
                    "flex flex-col items-start p-6 rounded-2xl border transition-all text-left duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500",
                    choice === 'tasks'
                      ? "bg-indigo-500/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)] text-white"
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-xl mb-4",
                    choice === 'tasks' ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-400"
                  )}>
                    <CheckSquare size={22} />
                  </div>
                  <h3 className="font-semibold text-base text-white mb-2">Daily Tasks</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    A minimal checklist to log, prioritize, and structure your daily action list cleanly.
                  </p>
                </button>

                {/* Focus Option */}
                <button
                  id="onboarding-choice-focus"
                  onClick={() => setChoice('focus')}
                  className={cn(
                    "flex flex-col items-start p-6 rounded-2xl border transition-all text-left duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500",
                    choice === 'focus'
                      ? "bg-indigo-500/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)] text-white"
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-xl mb-4",
                    choice === 'focus' ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-400"
                  )}>
                    <Brain size={22} />
                  </div>
                  <h3 className="font-semibold text-base text-white mb-2">Deep Work</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Set customized focus timers paired with real-time distraction monitors and flow states.
                  </p>
                </button>

                {/* Notes Option */}
                <button
                  id="onboarding-choice-notes"
                  onClick={() => setChoice('notes')}
                  className={cn(
                    "flex flex-col items-start p-6 rounded-2xl border transition-all text-left duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500",
                    choice === 'notes'
                      ? "bg-indigo-500/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)] text-white"
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-xl mb-4",
                    choice === 'notes' ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-400"
                  )}>
                    <FileText size={22} />
                  </div>
                  <h3 className="font-semibold text-base text-white mb-2">Spatial Notes</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Organize your ideas on an infinite 2D bento grid. Drag, resize, and connect freely.
                  </p>
                </button>
              </div>

              <div className="pt-4">
                <button
                  id="onboarding-next-1"
                  onClick={handleNextStep}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium px-8 py-3 rounded-xl transition duration-150 shadow-lg cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={sheetTransition}
              className="w-full flex flex-col items-center space-y-8"
              id="onboarding-step-2"
            >
              <div className="text-center space-y-3">
                <h1 className="text-3xl font-sans font-medium tracking-tight text-white">
                  Personalize your workspace
                </h1>
                <p className="text-zinc-400 max-w-xl mx-auto text-sm leading-relaxed">
                  Tailor your sidebar layout. Choose which workspace panels remain visible to minimize sensory clutter.
                </p>
              </div>

              {/* Personalization list */}
              <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 divide-y divide-zinc-800/60">
                {toggles.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="space-y-1 pr-6">
                      <h4 className="text-sm font-semibold text-white">{item.label}</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
                    </div>
                    
                    <button
                      id={`onboarding-toggle-${item.id}`}
                      onClick={() => handleToggle(item.id)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500",
                        item.checked ? "bg-indigo-600" : "bg-zinc-700"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                          item.checked ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  id="onboarding-back-2"
                  onClick={handlePrevStep}
                  className="bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-300 font-medium px-6 py-3 rounded-xl transition duration-150 cursor-pointer"
                >
                  Back
                </button>
                <button
                  id="onboarding-next-2"
                  onClick={handleNextStep}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium px-8 py-3 rounded-xl transition duration-150 shadow-lg cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={sheetTransition}
              className="w-full flex flex-col items-center text-center space-y-8"
              id="onboarding-step-3"
            >
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400">
                <Check size={32} className="mx-auto animate-pulse" />
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-sans font-medium tracking-tight text-white">
                  {stepCopy[choice].title}
                </h1>
                <p className="text-zinc-400 max-w-xl mx-auto text-sm leading-relaxed">
                  {stepCopy[choice].desc}
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  id="onboarding-back-3"
                  onClick={handlePrevStep}
                  className="bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-300 font-medium px-6 py-3 rounded-xl transition duration-150 cursor-pointer"
                >
                  Back
                </button>
                <button
                  id="onboarding-complete"
                  onClick={handleComplete}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium px-8 py-3 rounded-xl transition duration-150 shadow-lg cursor-pointer"
                >
                  <span>Enter Workspace</span>
                  <Check size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer / Skip Link */}
      <div className="flex justify-between items-center w-full max-w-4xl mx-auto mt-6 text-zinc-500 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <HelpCircle size={14} className="text-zinc-600" />
          <span>Defaults can be fully modified in settings at any time.</span>
        </div>
        <button
          id="onboarding-skip"
          onClick={handleSkip}
          className="hover:text-zinc-300 active:text-white transition duration-150 underline decoration-zinc-700 hover:decoration-zinc-500 cursor-pointer focus:outline-none"
        >
          Skip onboarding & explore
        </button>
      </div>
    </div>
  )
}
