import { useState, useEffect } from 'react'
import { CheckSquare, CalendarDays, Flame, Users, Settings } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../lib/utils'
import { View } from '../types'

export function Sidebar() {
  const { activeView, setActiveView, projects, selectedProjectId, setSelectedProject, tasks } = useAppStore()
  
  const [lastViewedUpcoming, setLastViewedUpcoming] = useState<number>(() => {
    const stored = localStorage.getItem('last_viewed_upcoming')
    return stored ? parseInt(stored, 10) : 0
  })

  useEffect(() => {
    if (activeView === 'upcoming') {
      const updateTime = () => {
        const now = Date.now()
        setLastViewedUpcoming(now)
        localStorage.setItem('last_viewed_upcoming', String(now))
      }
      updateTime()
      return updateTime
    }
  }, [activeView])

  const [hasUpcomingElectron, setHasUpcomingElectron] = useState(false)

  useEffect(() => {
    if (!window.electronAPI) return

    let active = true
    const checkUpcoming = async () => {
      try {
        const upcoming = await window.electronAPI.getTasksUpcoming()
        if (active) {
          const hasNew = upcoming.some(t => {
            if (t.status !== 'todo') return false
            
            const parseSqliteDate = (str: string | undefined | null) => {
              if (!str) return 0
              // If it lacks timezone info, assume UTC from SQLite and convert to ISO format
              const safeStr = str.includes('T') ? str : str.replace(' ', 'T') + 'Z'
              return new Date(safeStr).getTime()
            }
            
            const taskTime = Math.max(
              parseSqliteDate(t.created_at),
              parseSqliteDate(t.updated_at)
            )
            return taskTime > lastViewedUpcoming
          })
          setHasUpcomingElectron(hasNew)
        }
      } catch (err) {
        console.error('Failed to check upcoming tasks:', err)
      }
    }

    checkUpcoming()

    return () => {
      active = false
    }
  }, [activeView, tasks, lastViewedUpcoming])

  const d = new Date()
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  
  const hasUpcomingWeb = tasks.some(t => {
    if (t.status !== 'todo' || !t.due_date || t.due_date <= todayStr) return false
    
    const parseDate = (str: string | undefined | null) => {
      if (!str) return 0
      const safeStr = str.includes('T') ? str : str.replace(' ', 'T') + 'Z'
      return new Date(safeStr).getTime()
    }
    
    const taskTime = Math.max(
      parseDate(t.created_at),
      parseDate(t.updated_at)
    )
    return taskTime > lastViewedUpcoming
  })
  
  const showUpcomingDot = activeView !== 'upcoming' && (window.electronAPI ? hasUpcomingElectron : hasUpcomingWeb)

  const navItems: { id: View, icon: any }[] = [
    { id: 'today', icon: CheckSquare },
    { id: 'upcoming', icon: CalendarDays },
    { id: 'habits', icon: Flame },
    { id: 'circle', icon: Users },
  ]

  return (
    <div className="w-[52px] h-full flex flex-col items-center py-4 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] relative z-40 select-none">
      {/* App Logo */}
      <div className="w-7 h-7 bg-indigo-500 rounded-md mb-8 flex items-center justify-center shadow-lg shadow-indigo-500/20 drag-region">
        <div className="w-2 h-2 bg-white rounded-full" />
      </div>

      {/* Nav Items */}
      <nav className="w-full flex-1 flex flex-col items-center gap-3 no-drag overflow-y-auto custom-scrollbar pt-2 pb-4">
        <div className="flex flex-col items-center gap-2 w-full">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id && selectedProjectId === null
            return (
              <button
                key={item.id}
                onClick={() => { setActiveView(item.id); }}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 group relative",
                  isActive ? "bg-[var(--accent-primary-muted)]" : "hover:bg-[var(--bg-hover)]"
                )}
              >
                <Icon 
                  size={18} 
                  strokeWidth={isActive ? 2.5 : 2} 
                  className={cn(
                    "transition-colors",
                    isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                  )} 
                />
                {isActive && (
                  <div className="absolute -left-[8px] top-1/2 -translate-y-1/2 w-1 h-4 bg-[var(--accent-primary)] rounded-r-md rounded-l-none opacity-100" />
                )}
                {item.id === 'upcoming' && showUpcomingDot && (
                  <span className="absolute top-[6px] right-[6px] flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Projects */}
        <div className="w-full flex flex-col items-center gap-2 mt-4 pt-4 border-t border-[var(--border-subtle)]">
          {projects.map((project) => {
            const isActive = activeView === 'project' && selectedProjectId === project.id
            return (
              <button
                key={project.id}
                onClick={() => { setSelectedProject(project.id); }}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 group relative",
                  isActive ? "bg-[var(--bg-elevated)]" : "hover:bg-[var(--bg-hover)]"
                )}
                title={project.name}
              >
                <div 
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-transform",
                    isActive ? "scale-110" : ""
                  )} 
                  style={{ backgroundColor: project.color }} 
                />
                {isActive && (
                  <div 
                    className="absolute -left-[8px] top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-md rounded-l-none opacity-100" 
                    style={{ backgroundColor: project.color }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Bottom Settings */}
      <div className="mt-auto no-drag">
        <button
          onClick={() => setActiveView('settings')}
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 group relative",
            activeView === 'settings' ? "bg-[var(--accent-primary-muted)]" : "hover:bg-[var(--bg-hover)]"
          )}
        >
          <Settings 
            size={18} 
            className={cn(
              "transition-colors",
              activeView === 'settings' ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
            )} 
          />
        </button>
      </div>
    </div>
  )
}
