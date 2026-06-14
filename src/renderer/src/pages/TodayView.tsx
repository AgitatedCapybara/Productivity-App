import { useMemo, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useTasks } from '../hooks/useTasks'
import { QuickAdd } from '../components/tasks/QuickAdd'
import { SessionQuickStart } from '../components/tasks/SessionQuickStart'
import { TaskSection } from '../components/tasks/TaskSection'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export function TodayView() {
  const { tasks, completedTasks, deletedTasks, isLoading, error, purgeDeletedTasks } = useTasks(true)
  const [todaySessions, setTodaySessions] = useState<any[]>([])
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingSessionName, setEditingSessionName] = useState<string>('')
  
  const setActiveView = useAppStore(state => state.setActiveView)
  const setPreselectedSessionId = useAppStore(state => state.setPreselectedSessionId)

  // Safe confirmation states (instead of blocking window.confirm)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [isConfirmingClear, setIsConfirmingClear] = useState(false)
  const [isConfirmingPurge, setIsConfirmingPurge] = useState(false)

  const handlePurgeDeleted = async () => {
    if (!isConfirmingPurge) {
      setIsConfirmingPurge(true)
      return
    }
    await purgeDeletedTasks()
    setIsConfirmingPurge(false)
  }

  const handleSessionClick = (sessionId: string) => {
    setPreselectedSessionId(sessionId)
    setActiveView('analytics')
  }

  const fetchTodaySessions = () => {
    if (window.electronAPI && window.electronAPI.getTodaySessions) {
      window.electronAPI.getTodaySessions().then(setTodaySessions).catch(console.error)
    }
  }

  const handleDeleteSession = async (id: string) => {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id)
      return
    }
    // Optimistic update
    setTodaySessions(prev => prev.filter(s => s.id !== id))
    setConfirmingDeleteId(null)
    
    if (window.electronAPI && window.electronAPI.deleteSession) {
      try {
        await window.electronAPI.deleteSession(id)
      } catch (err) {
        console.error(err)
        fetchTodaySessions()
      }
    }
  }

  const handleClearHistory = async () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true)
      return
    }
    // Optimistic update
    setTodaySessions([])
    setIsConfirmingClear(false)
    
    if (window.electronAPI && window.electronAPI.clearSessionHistory) {
      try {
        await window.electronAPI.clearSessionHistory()
      } catch (err) {
        console.error(err)
        fetchTodaySessions()
      }
    }
  }

  useEffect(() => {
    fetchTodaySessions()

    if (window.electronAPI && window.electronAPI.onSessionStateChanged) {
      const removeStateListener = window.electronAPI.onSessionStateChanged(() => {
        fetchTodaySessions()
      })
      return () => {
        if (typeof removeStateListener === 'function') removeStateListener()
      }
    }
    return undefined
  }, [])

  const getSessionDurationString = (session: any) => {
    if (session.started_at && session.ended_at) {
      const start = new Date(session.started_at).getTime()
      const end = new Date(session.ended_at).getTime()
      const diffSeconds = Math.floor((end - start) / 1000)
      
      if (diffSeconds < 0) return '0s'
      
      const mins = Math.floor(diffSeconds / 60)
      const secs = diffSeconds % 60
      
      if (mins === 0) {
        return `${secs}s`
      }
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
    }
    return `${session.duration_mins || 0}m`
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const overdue = useMemo(() => {
    return tasks.filter(t => t.status !== 'done' && t.due_date !== null && t.due_date < todayStr)
  }, [tasks, todayStr])

  const todayTasks = useMemo(() => {
    return tasks.filter(t => t.status !== 'done' && t.due_date === todayStr)
  }, [tasks, todayStr])

  const inbox = useMemo(() => {
    return tasks.filter(t => t.status !== 'done' && t.due_date === null && (!window.electronAPI ? (!t.project_id || t.project_id === 'inbox-default') : true))
  }, [tasks])

  return (
    <div className="flex-1 overflow-y-auto px-8 relative outline-none custom-scrollbar">
      <div className="max-w-2xl w-full mx-auto h-full pt-16 pb-20">
        
        {/* Header */}
        <header className="mb-8 select-none">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">Today</h1>
          <p className="text-[var(--text-secondary)] text-sm">{format(new Date(), "EEEE, MMMM d")}</p>
        </header>

        {error && (
          <div className="p-4 bg-[var(--color-overdue)]/10 border border-[var(--color-overdue)]/20 text-[var(--color-overdue)] rounded-xl text-sm mb-6">
            <strong>Backend Error:</strong> {error}
          </div>
        )}
        {!window.electronAPI && (
          <div className="p-4 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 text-[var(--color-warning)] rounded-xl text-sm mb-6">
            <strong>Preview Warning:</strong> Electron IPC is not available in the web browser. Export and run via desktop environment to test SQLite and native OS integrations.
          </div>
        )}

        {/* Input */}
        <QuickAdd />
        
        {/* Custom Focus Session Quick Start Picker */}
        <SessionQuickStart />

        {/* Sections */}
        {isLoading ? (
          <div className="space-y-4 mt-8">
            <div className="h-12 w-full rounded-xl bg-[var(--bg-elevated)] opacity-50 animate-pulse"></div>
            <div className="h-12 w-full rounded-xl bg-[var(--bg-elevated)] opacity-40 animate-pulse"></div>
            <div className="h-12 w-full rounded-xl bg-[var(--bg-elevated)] opacity-30 animate-pulse"></div>
            <div className="h-12 w-full rounded-xl bg-[var(--bg-elevated)] opacity-20 animate-pulse"></div>
          </div>
        ) : (
          <>
            <TaskSection 
              title="Overdue" 
              tasks={overdue} 
              accentColor="var(--color-overdue)" 
              defaultOpen 
            />
            
            <TaskSection 
              title="Today" 
              tasks={todayTasks} 
              accentColor="var(--text-secondary)" 
              defaultOpen 
            />
            
            <TaskSection 
              title="Inbox" 
              tasks={inbox} 
              accentColor="var(--text-muted)" 
              defaultOpen 
            />
            
            <TaskSection 
              title="Completed" 
              tasks={completedTasks} 
              accentColor="var(--text-muted)" 
              defaultOpen={false} 
            />
            
            <TaskSection 
              title="Deleted" 
              tasks={deletedTasks || []} 
              accentColor="var(--text-muted)" 
              defaultOpen={false} 
              headerAction={
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePurgeDeleted()
                  }}
                  onMouseLeave={() => setIsConfirmingPurge(false)}
                  className={`text-[10px] flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all duration-150 select-none font-semibold ${
                    isConfirmingPurge 
                      ? 'bg-[var(--color-overdue)]/10 text-[var(--color-overdue)] border-[var(--color-overdue)]/30 scale-105' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--color-overdue)] border-transparent hover:bg-[var(--bg-elevated)]'
                  }`}
                  title={isConfirmingPurge ? 'Permanently empty trash?' : 'Empty trash'}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isConfirmingPurge ? 'Confirm Empty?' : 'Delete All'}</span>
                </button>
              }
            />

            {todaySessions.length > 0 && (
              <div className="mt-8 mb-4">
                <div className="flex items-center justify-between mb-3 select-none">
                  <h3 className="text-sm font-semibold tracking-tight text-[var(--text-secondary)] flex items-center gap-2">
                    Today's Sessions
                  </h3>
                  <button 
                    onClick={handleClearHistory}
                    onMouseLeave={() => setIsConfirmingClear(false)}
                    className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all duration-150 ${
                      isConfirmingClear 
                        ? 'bg-[var(--color-overdue)]/10 text-[var(--color-overdue)] border-[var(--color-overdue)]/30 font-medium' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border-transparent hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isConfirmingClear ? 'Confirm Clear?' : 'Clear History'}
                  </button>
                </div>
                <div className="space-y-2">
                  {todaySessions.map((session, i) => {
                    const sessionName = session.customName || session.custom_name || session.task_title || (tasks.find(t => t.id === session.task_id)?.title) || 'Focus Session';
                    const isEditing = editingSessionId === session.id;

                    return (
                      <div 
                        key={session.id || i} 
                        onClick={() => !isEditing && handleSessionClick(session.id)}
                        className="group flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-indigo-500/45 hover:bg-zinc-800/40 active:scale-[0.99] cursor-pointer transition-all duration-150"
                      >
                        {isEditing ? (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (editingSessionName.trim() && window.electronAPI && window.electronAPI.renameSession) {
                                await window.electronAPI.renameSession(session.id, editingSessionName.trim())
                                setEditingSessionId(null)
                                fetchTodaySessions()
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 flex-1 max-w-[65%]"
                          >
                            <input
                              type="text"
                              value={editingSessionName}
                              onChange={(e) => setEditingSessionName(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  e.preventDefault()
                                  setEditingSessionId(null)
                                }
                              }}
                              className="bg-zinc-800 text-white border border-indigo-500/50 rounded-md px-2 py-0.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="submit"
                              className="p-1 hover:bg-zinc-700/80 rounded text-emerald-400 transition"
                            >
                              <Check className="w-3.5 h-3.5 animate-pulse" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingSessionId(null)
                              }}
                              className="p-1 hover:bg-zinc-700/80 rounded text-rose-400 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        ) : (
                          <span 
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => {
                              e.stopPropagation()
                              setEditingSessionId(session.id)
                              setEditingSessionName(sessionName)
                            }}
                            className="text-[var(--text-primary)] font-medium truncate max-w-[55%] group-hover:text-white transition-colors"
                            title="Double-click to rename"
                          >
                            {sessionName}
                          </span>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="text-[var(--text-secondary)] text-xs select-none">
                            {getSessionDurationString(session)} · {session.distraction_count || 0} distraction{session.distraction_count === 1 ? '' : 's'}
                          </span>
                          
                          {!isEditing && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingSessionId(session.id)
                                setEditingSessionName(sessionName)
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-indigo-400 hover:bg-[var(--bg-elevated)] rounded transition-all duration-150"
                              title="Rename focus session"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteSession(session.id)
                            }}
                            onMouseLeave={() => {
                              if (confirmingDeleteId === session.id) setConfirmingDeleteId(null)
                            }}
                            className={`flex items-center rounded transition-all duration-150 ${
                              confirmingDeleteId === session.id
                                ? 'opacity-100 bg-[var(--color-overdue)]/15 text-[var(--color-overdue)] px-1.5 py-0.5 border border-[var(--color-overdue)]/30'
                                : 'opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-[var(--color-overdue)] hover:bg-[var(--bg-elevated)]'
                            }`}
                            title={confirmingDeleteId === session.id ? "Click again to delete" : "Delete session"}
                          >
                            <span className="flex items-center gap-1 text-[11px] font-semibold leading-none">
                              {confirmingDeleteId === session.id && <span>Confirm?</span>}
                              <Trash2 className="w-3.5 h-3.5" />
                            </span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {tasks.length === 0 && window.electronAPI && (
              <div className="text-center mt-12 text-[var(--text-muted)] text-sm italic select-none">
                No tasks found. Begin your focus session by adding one above.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
