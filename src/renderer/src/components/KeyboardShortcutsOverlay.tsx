// src/renderer/src/components/KeyboardShortcutsOverlay.tsx
import { motion, AnimatePresence } from 'motion/react'
import { X, Keyboard, Compass, Target, Sparkles, BookOpen } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'

export function KeyboardShortcutsOverlay() {
  const { isShortcutsOpen, setShortcutsOpen } = useAppStore()
  const overlayRef = useRef<HTMLDivElement>(null)

  // Handle escape key to dismiss overlay
  useEffect(() => {
    if (!isShortcutsOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setShortcutsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isShortcutsOpen, setShortcutsOpen])

  // Focus trap for accessibility
  useEffect(() => {
    if (!isShortcutsOpen) return

    const currentActive = document.activeElement as HTMLElement
    overlayRef.current?.focus()

    return () => {
      currentActive?.focus()
    }
  }, [isShortcutsOpen])

  const categories = [
    {
      title: 'Navigation',
      icon: <Compass className="w-4 h-4 text-emerald-400" />,
      items: [
        { keys: ['Ctrl', '\\'], description: 'Toggle Sidebar Width' },
        { keys: ['g', 't'], description: 'Switch View to Today' },
        { keys: ['g', 'd'], description: 'Switch View to Focus (Deep Work)' },
        { keys: ['g', 'v'], description: 'Switch View to Boards' },
        { keys: ['Ctrl', 'I'], description: 'Toggle Side AI Inspector Panel' },
        { keys: ['Ctrl', 'K'], description: 'Open Search / Global Command Bar' },
        { keys: ['?'], description: 'Toggle Shortcuts Overlay' },
        { keys: ['Esc'], description: 'Dismiss Dialogs & Overlays' }
      ]
    },
    {
      title: 'Tasks & Capture',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      items: [
        { keys: ['j', 'k'], description: 'Traverse / Highlight Tasks' },
        { keys: ['Space'], description: 'Toggle Selected Task Detail Peek' },
        { keys: ['c'], description: 'Toggle Highlighted Task Completion' },
        { keys: ['Enter'], description: 'Inline Rename Highlighted Task' },
        { keys: ['Shift', 'Enter'], description: 'Start Focus Session for Task' },
        { keys: ['Delete'], description: 'Purge Highlighted Task' }
      ]
    },
    {
      title: 'Multi-Selection',
      icon: <Sparkles className="w-4 h-4 text-pink-400" />,
      items: [
        { keys: ['Shift', 'Click'], description: 'Select Range of Tasks' },
        { keys: ['Ctrl', 'Click'], description: 'Toggle Individual Task Selection' },
        { keys: ['Delete'], description: 'Purge Selected Tasks in Bulk' },
        { keys: ['Esc'], description: 'Clear All Active Task Selections' }
      ]
    },
    {
      title: 'Focus Mode',
      icon: <Target className="w-4 h-4 text-indigo-400" />,
      items: [
        { keys: ['Space'], description: 'Pause / Resume Current Focus Session' },
        { keys: ['Ctrl', 'D'], description: 'Quickly Log Distraction' },
        { keys: ['Esc'], description: 'Cancel / Abort Focus Session Setup' }
      ]
    },
    {
      title: 'Board & Spatial',
      icon: <BookOpen className="w-4 h-4 text-amber-400" />,
      items: [
        { keys: ['Arrow Keys'], description: 'Nudge Selected Card by 1px' },
        { keys: ['Shift', 'Arrows'], description: 'Nudge Selected Card by 10px' },
        { keys: ['Ctrl', 'Drag'], description: 'Drag Card Freely (Bypass Grid Snap)' }
      ]
    },
    {
      title: 'System',
      icon: <Keyboard className="w-4 h-4 text-sky-400" />,
      items: [
        { keys: ['F11'], description: 'Toggle Fullscreen Mode' }
      ]
    }
  ]

  return (
    <AnimatePresence>
      {isShortcutsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[1000] flex items-center justify-center p-4"
          id="keyboard-shortcuts-overlay-container"
          onClick={() => setShortcutsOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl bg-zinc-950/75 border border-zinc-900/80 rounded-[2rem] p-8 shadow-2xl relative outline-none backdrop-blur-md overflow-hidden"
            tabIndex={-1}
            ref={overlayRef}
            id="keyboard-shortcuts-overlay-card"
            role="dialog"
            aria-labelledby="shortcuts-overlay-title"
            aria-modal="true"
          >
            {/* Top border ambient glow */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 opacity-80" />

            {/* Ambient Background Radial Blur */}
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <header className="flex items-center justify-between border-b border-zinc-900/60 pb-5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="shortcuts-overlay-title" className="text-lg font-bold tracking-tight text-zinc-100 font-sans">
                    Command & Keyboard Shortcuts
                  </h3>
                  <p className="text-xs text-zinc-500">Fluid control shortcuts designed for high-density speed</p>
                </div>
              </div>
              <button
                onClick={() => setShortcutsOpen(false)}
                className="w-10 h-10 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-250 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Close Shortcuts modal"
                id="shortcuts-overlay-close-btn"
              >
                <X size={16} />
              </button>
            </header>

            <main className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
              {categories.map((cat, idx) => (
                <div key={idx} className="flex flex-col gap-4 bg-zinc-900/25 border border-zinc-900/40 rounded-3xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-900/50">
                    {cat.icon}
                    <h4 className="text-xs font-bold text-zinc-350 uppercase tracking-widest font-sans">
                      {cat.title}
                    </h4>
                  </div>
                  <div className="flex flex-col gap-3">
                    {cat.items.map((item, itemIdx) => (
                      <div 
                        key={itemIdx} 
                        className="flex flex-col gap-1.5 py-1"
                      >
                        <span className="font-sans font-medium text-[11.5px] leading-relaxed text-zinc-400">
                          {item.description}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {item.keys.map((k, keyIdx) => (
                            <span 
                              key={keyIdx} 
                              className="bg-zinc-900/90 border border-zinc-800/80 text-zinc-350 font-mono text-[9.5px] font-semibold px-2 py-0.5 rounded-full shadow-sm tracking-normal select-none min-w-[22px] text-center"
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </main>

            <footer className="mt-6 pt-4 border-t border-zinc-900/60 flex items-center justify-between text-[10.5px] text-zinc-550 select-none relative z-10">
              <div className="flex items-center gap-1.5">
                <BookOpen size={12} className="text-zinc-650" />
                <span>Keystone Productivity Suite</span>
              </div>
              <span className="font-sans">
                Press <kbd className="bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-850 font-mono text-[9px] text-zinc-400">Esc</kbd> to exit
              </span>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
