// src/renderer/src/pages/InboxView.tsx
import { useMemo } from 'react'
import { useTasks } from '../hooks/useTasks'
import { QuickAdd } from '../components/tasks/QuickAdd'
import { TaskSection } from '../components/tasks/TaskSection'
import { useAppStore } from '../store/useAppStore'
import { OnboardingTips } from '../components/help/OnboardingTips'
import { Sparkles, ArchiveRestore } from 'lucide-react'

export function InboxView() {
  const { tasks, completedTasks, isLoading, error } = useTasks(true, 'inbox')
  const setViewState = useAppStore(state => state.setActiveView)

  const inboxTasks = useMemo(() => {
    // Uncompleted, unscheduled (no due date)
    return tasks.filter(t => t.status !== 'done' && t.due_date === null)
  }, [tasks])

  const completedInboxTasks = useMemo(() => {
    // Completed and unscheduled (no due date)
    return completedTasks.filter(t => t.due_date === null)
  }, [completedTasks])

  return (
    <div className="flex-1 overflow-y-auto px-8 relative outline-none custom-scrollbar view-container">
      <div className="max-w-2xl w-full mx-auto h-full pt-16 pb-20">
        
        {/* Header */}
        <header className="mb-8 select-none">
          <div className="flex items-center gap-1.5 text-zinc-550 mb-1">
            <ArchiveRestore className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-sans">GTD Capturing Node</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1 font-sans">Inbox</h1>
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed max-w-md font-sans">
            Your frictionless holding bay. Enter loose objectives here to declutter your mind, then schedule or block them when you are prepared.
          </p>
        </header>

        {error && (
          <div className="p-4 bg-[var(--color-overdue)]/10 border border-[var(--color-overdue)]/20 text-[var(--color-overdue)] rounded-xl text-sm mb-6 font-semibold">
            <strong>Backend Error:</strong> {error}
          </div>
        )}

        {/* Input */}
        <QuickAdd />

        {/* Progressive Onboarding tips */}
        <OnboardingTips activeView="inbox" onViewChange={setViewState} />

        {/* Active List */}
        {isLoading ? (
          <div className="space-y-4 mt-8">
            <div className="h-12 w-full rounded-xl bg-[var(--bg-elevated)] opacity-40 animate-pulse"></div>
            <div className="h-12 w-full rounded-xl bg-[var(--bg-elevated)] opacity-20 animate-pulse"></div>
          </div>
        ) : (
          <div className="space-y-4 mt-6">
            <TaskSection 
              title="Active Inbox Tasks" 
              tasks={inboxTasks} 
              accentColor="var(--accent-primary)" 
              defaultOpen 
            />

            <TaskSection 
              title="Completed Inbox Tasks" 
              tasks={completedInboxTasks} 
              accentColor="var(--text-muted)" 
              defaultOpen={false} 
            />

            {inboxTasks.length === 0 && (
              <div 
                className="text-center py-10 px-4 mt-8 rounded-2xl bg-zinc-950/15 border border-zinc-900/60 select-none animate-fadeIn" 
                id="inbox-empty-state-notice"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-90 w-10 h-10 flex items-center justify-center text-zinc-500 mx-auto mb-3 border border-zinc-850">
                  <Sparkles size={16} className="text-indigo-400/80 animate-pulse" />
                </div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 mb-1 font-sans">
                  Mind Clean & Clear
                </h4>
                <p className="text-[10.5px] text-zinc-500 leading-normal max-w-sm mx-auto font-sans font-medium">
                  Your inbox is completely clear. No outstanding thoughts are waiting. Write a swift capture above and tap Enter to register.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
