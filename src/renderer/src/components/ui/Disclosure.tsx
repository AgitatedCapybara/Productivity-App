// src/renderer/src/components/ui/Disclosure.tsx
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '../../lib/utils'

interface DisclosureProps {
  title?: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
  panelClassName?: string
  buttonClassName?: string
}

export function Disclosure({
  title = "Show advanced options",
  children,
  defaultOpen = false,
  className = "",
  panelClassName = "",
  buttonClassName = ""
}: DisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={cn("w-full rounded-xl overflow-hidden text-xs", className)} id="progressive-disclosure-wrapper">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-zinc-500 hover:text-zinc-300 select-none transition-colors duration-150 py-1.5 focus:outline-none focus-ring rounded outline-none",
          buttonClassName
        )}
        aria-expanded={isOpen}
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
        >
          <ChevronRight size={12} className="text-zinc-500 shrink-0" />
        </motion.div>
        <span>{isOpen ? "Hide parameters" : title}</span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className={cn("pt-2 pb-1 border-l border-zinc-850 pl-3 ml-1.5 space-y-3", panelClassName)}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
