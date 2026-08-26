// src/renderer/src/components/help/Shortcuts.tsx
import { motion, AnimatePresence } from 'motion/react'
import { X, Keyboard, ArrowRight } from 'lucide-react'
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap'
import { dialogTransition } from '../../lib/motion-tokens'

interface ShortcutsProps {
  isOpen: boolean
  onClose: () => void
}

export function Shortcuts({ isOpen, onClose }: ShortcutsProps) {
  const containerRef = useModalFocusTrap<HTMLDivElement>({ isOpen, onClose })

  const categories = [
    {
      title: "Global Navigation Center",
      items: [
        { keys: ["Ctrl", "K"], description: "Activate Command Bar / Command Discovery" },
        { keys: ["Ctrl", "\\"], description: "Toggle Sidebar Width" },
        { keys: ["?"], description: "Expose Keyboard Shortcuts Help Overlay" },
        { keys: ["Esc"], description: "Instantly dismiss active dialogs, overlays, or menus" }
      ]
    },
    {
      title: "Task Capture & Control",
      items: [
        { keys: ["j", "k"], description: "Traverse / Highlight Tasks" },
        { keys: ["Space"], description: "Toggle Selected Task Detail Peek" },
        { keys: ["c"], description: "Toggle Highlighted Task Completion State" },
        { keys: ["Enter"], description: "Inline Rename Highlighted Task" },
        { keys: ["Shift", "Enter"], description: "Start Focus Session for Task" },
        { keys: ["Delete"], description: "Purge Highlighted Task" }
      ]
    },
    {
      title: "Page & Workspace Navigation",
      items: [
        { keys: ["g", "t"], description: "Switch View to Today" },
        { keys: ["g", "d"], description: "Switch View to Focus (Deep Work)" },
        { keys: ["g", "v"], description: "Switch View to Boards" }
      ]
    }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={dialogTransition}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4"
          id="shortcuts-modal-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={dialogTransition}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-zinc-950/95 border border-zinc-900 rounded-2xl p-5 shadow-2xl relative outline-none"
            tabIndex={-1}
            ref={containerRef}
            id="shortcuts-modal-content"
            role="dialog"
            aria-labelledby="shortcuts-dialog-title"
            aria-modal="true"
          >
            {/* Top border glowing highlight */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-505 opacity-60" />

            <header className="flex items-center justify-between border-b border-zinc-900/65 pb-3">
              <h3 id="shortcuts-dialog-title" className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 font-sans">
                <Keyboard className="w-4 h-4 text-indigo-400" />
                Keyboard Shortcuts Help
              </h3>
              <button
                onClick={onClose}
                className="w-10 h-10 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                aria-label="Close Shortcuts modal"
                id="shortcuts-modal-close-btn"
              >
                <X size={16} />
              </button>
            </header>

            <main className="mt-4 space-y-5 overflow-y-auto max-h-[60vh] pr-1.5 custom-scrollbar">
              {categories.map((cat, idx) => (
                <div key={idx} className="space-y-2">
                  <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-sans pl-1">
                    {cat.title}
                  </h4>
                  <div className="space-y-1">
                    {cat.items.map((item, itemIdx) => (
                      <div 
                        key={itemIdx} 
                        className="flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-zinc-900/30 font-medium text-[11px] hover:text-zinc-200 text-zinc-400 transition-colors"
                      >
                        <span className="font-sans font-semibold">{item.description}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((k, keyIdx) => (
                            <span 
                              key={keyIdx} 
                              className="bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded tracking-normal min-w-[20px] text-center shadow-sm select-none"
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

            <footer className="mt-5 pt-3.5 border-t border-zinc-900/65 flex items-center justify-between text-[10px] text-zinc-550 select-none">
              <div className="flex items-center gap-1">
                <span>Keystone Core</span>
                <ArrowRight size={10} />
                <span className="font-mono text-[9px]">Speed Oriented Design</span>
              </div>
              <span>Press <kbd className="bg-zinc-900 px-1 py-0.5 rounded border border-zinc-850 font-mono text-[9px]">Esc</kbd> to exit help overlay</span>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
