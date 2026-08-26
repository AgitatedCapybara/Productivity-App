import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Task } from '../../types'
import { TaskList } from './TaskList'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible'
import { cn } from '../../lib/utils'

interface TaskSectionProps {
  title: string
  tasks: Task[]
  accentColor?: string
  defaultOpen?: boolean
  headerAction?: React.ReactNode
}

export function TaskSection({ title, tasks, accentColor, defaultOpen = true, headerAction }: TaskSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const hasTasks = tasks.length > 0

  return (
    <motion.div
      animate={{
        height: hasTasks ? 'auto' : 0,
        opacity: hasTasks ? 1 : 0,
        marginBottom: 0,
        pointerEvents: hasTasks ? 'auto' : 'none'
      }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 32,
        mass: 0.9
      }}
      className="w-full overflow-hidden"
    >
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="w-full relative bg-transparent pb-2"
      >
        <div className="flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-2 py-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors px-1 group no-drag text-left select-none">
            <div 
              className={cn(
                "w-4 h-4 flex items-center justify-center transition-transform duration-200",
                isOpen ? "rotate-90" : "rotate-0"
              )}
            >
              <ChevronRight size={14} className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
            </div>
            <span 
              className="text-[17px] font-semibold" 
              style={{ color: accentColor || 'var(--text-secondary)' }}
            >
              {title}
            </span>
            <span className="text-[13px] text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded-md min-w-[20px] text-center font-normal">
              {tasks.length}
            </span>
          </CollapsibleTrigger>
          
          {headerAction && (
            <div className="flex items-center pr-1 h-full">
              {headerAction}
            </div>
          )}
        </div>
        
        <AnimatePresence initial={false}>
          {isOpen && (
            <CollapsibleContent asChild forceMount>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-1">
                  <TaskList tasks={tasks} />
                </div>
              </motion.div>
            </CollapsibleContent>
          )}
        </AnimatePresence>
      </Collapsible>
    </motion.div>
  )
}
