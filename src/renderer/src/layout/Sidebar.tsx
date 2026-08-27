// src/renderer/src/layout/Sidebar.tsx
import { useState, useEffect } from 'react'
import { 
  CheckSquare, 
  CalendarDays, 
  Calendar, 
  Sparkles, 
  Flame, 
  Users, 
  Settings, 
  BarChart3, 
  FolderKanban, 
  Brain, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  ChevronLeft,
  ArchiveRestore,
  LucideIcon,
  Play,
  Pause,
  Square,
  Timer,
  Keyboard
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../lib/utils'
import { View } from '../types'
import { ProjectEditModal } from '../components/projects/ProjectEditModal'
import { Logo } from '../components/Logo'

interface NavItem {
  id: View
  icon: LucideIcon
  title: string
  isAdvanced?: boolean
}

export function Sidebar() {
  const { activeView, setActiveView, projects, selectedProjectId, setSelectedProject, tasks, featureVisibility, setShortcutsOpen } = useAppStore()
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)
  
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [modalInitialId, setModalInitialId] = useState<string | null>(null)

  // Active session details for the peripheral sidebar card
  const activeSessionId = useAppStore((state) => state.activeSessionId)
  const activeSessionElapsedSeconds = useAppStore((state) => state.activeSessionElapsedSeconds)
  const activeSessionDistractionCount = useAppStore((state) => state.activeSessionDistractionCount)
  const activeSessionTargetDurationMins = useAppStore((state) => state.activeSessionTargetDurationMins)
  const activeTaskId = useAppStore((state) => state.activeTaskId)

  const [isSessionPaused, setIsSessionPaused] = useState(false)

  // Synchronize pause state when the session status or activeSessionId updates
  useEffect(() => {
    if (!window.electronAPI || !activeSessionId) return

    const checkPauseState = async () => {
      try {
        const active = await window.electronAPI.getActiveSession()
        if (active) {
          setIsSessionPaused(active.status === 'paused')
        }
      } catch (err) {
        console.error('Error checking active session pause state in sidebar:', err)
      }
    }

    checkPauseState()

    const removeStateListener = window.electronAPI.onSessionStateChanged(() => {
      checkPauseState()
    })

    return () => {
      if (typeof removeStateListener === 'function') removeStateListener()
    }
  }, [activeSessionId])

  const activeTask = tasks.find(t => t.id === activeTaskId)
  const targetSeconds = activeSessionTargetDurationMins * 60
  const isOvertime = activeSessionElapsedSeconds > targetSeconds
  const displaySeconds = isOvertime 
    ? (activeSessionElapsedSeconds - targetSeconds) 
    : (targetSeconds - activeSessionElapsedSeconds)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Expandable/Collapsible width state from store
  const isExpanded = useAppStore((state) => state.sidebarExpanded)
  const toggleSidebarWidth = useAppStore((state) => state.toggleSidebarExpanded)

  // Advanced views "More" toggle state
  const [showMore, setShowMore] = useState<boolean>(() => {
    return localStorage.getItem('keystone_sidebar_show_more') === 'true'
  })

  // Visibility toggling states for all views
  const [visibleViews, setVisibleViews] = useState<Record<string, boolean>>({
    today: true,
    upcoming: true,
    calendar: true,
    plan: true,
    habits: true,
    notes: true,
    views: true,
    analytics: true,
    deepwork: true,
    circle: true,
    inbox: true
  })

  // Load preferences from local storage or sqlite settings
  useEffect(() => {
    let isMounted = true
    const loadPreferences = async () => {
      const keys = ['today', 'upcoming', 'calendar', 'plan', 'habits', 'notes', 'views', 'analytics', 'deepwork', 'circle', 'inbox']
      if (window.electronAPI && window.electronAPI.getSetting) {
        try {
          const results = await Promise.allSettled(
            keys.map(k => window.electronAPI.getSetting(`sidebar.view.${k}`, 'true'))
          )
          if (!isMounted) return
          const updated: Record<string, boolean> = {}
          keys.forEach((key, idx) => {
            const res = results[idx]
            if (res.status === 'fulfilled') {
              updated[key] = res.value !== 'false'
            } else {
              updated[key] = localStorage.getItem(`sidebar.view.${key}`) !== 'false'
            }
          })
          setVisibleViews(updated)
        } catch {
          if (!isMounted) return
          const fallback: Record<string, boolean> = {}
          keys.forEach(k => { fallback[k] = localStorage.getItem(`sidebar.view.${k}`) !== 'false' })
          setVisibleViews(fallback)
        }
      } else {
        if (!isMounted) return
        const fallback: Record<string, boolean> = {}
        keys.forEach(k => { fallback[k] = localStorage.getItem(`sidebar.view.${k}`) !== 'false' })
        setVisibleViews(fallback)
      }
    }

    loadPreferences()

    return () => {
      isMounted = false
    }
  }, [])

  const toggleShowMore = () => {
    const nextVal = !showMore
    setShowMore(nextVal)
    localStorage.setItem('keystone_sidebar_show_more', String(nextVal))
  }

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
    return undefined
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
  }, [tasks, lastViewedUpcoming])

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

  // Structural divisions
  const sections = [
    {
      label: 'Plan',
      items: [
        { id: 'today' as View, icon: CheckSquare, title: 'Today' },
        { id: 'calendar' as View, icon: Calendar, title: 'Calendar' },
        { id: 'upcoming' as View, icon: CalendarDays, title: 'Upcoming', isAdvanced: true },
        { id: 'plan' as View, icon: Sparkles, title: 'Planner', isAdvanced: true }
      ]
    },
    {
      label: 'Do',
      items: [
        { id: 'deepwork' as View, icon: Brain, title: 'Focus' },
        { id: 'habits' as View, icon: Flame, title: 'Habits' }
      ]
    },
    {
      label: 'Learn',
      items: [
        { id: 'analytics' as View, icon: BarChart3, title: 'Analytics' }
      ]
    },
    {
      label: 'Capture',
      items: [
        { id: 'inbox' as View, icon: ArchiveRestore, title: 'Inbox' },
        { id: 'notes' as View, icon: FileText, title: 'Notes' },
        { id: 'views' as View, icon: FolderKanban, title: 'Boards', isAdvanced: true },
        { id: 'circle' as View, icon: Users, title: 'Circle', isAdvanced: true }
      ]
    }
  ]

  // Render individual buttons with keyboard support (ARIA matching)
  const renderItemButton = (item: NavItem) => {
    const Icon = item.icon
    const isActive = activeView === item.id && selectedProjectId === null
    const upcomingDotActive = item.id === 'upcoming' && showUpcomingDot

    return (
      <button
        key={item.id}
        onClick={() => { setActiveView(item.id); }}
        className={cn(
          "rounded-xl flex items-center transition-all duration-150 relative focus-visible:outline-none outline-none select-none target-md min-h-10",
          isExpanded ? "w-full px-3.5 py-2.5 gap-3" : "w-full h-10 justify-center",
          isActive ? "bg-white/10 text-white text-body font-semibold" : "hover:bg-[var(--bg-hover)] text-secondary"
        )}
        title={isExpanded ? "" : item.title}
        role="tab"
        aria-selected={isActive ? "true" : "false"}
        id={`sidebar-item-${item.id}`}
      >
        <Icon 
          size={isExpanded ? 15 : 17} 
          strokeWidth={isActive ? 2.5 : 2} 
          className={cn(
            "transition-colors shrink-0",
            isActive ? "text-white" : "text-white/70"
          )} 
          aria-hidden="true"
        />
        
        {isExpanded && (
          <span className="truncate">{item.title}</span>
        )}

        {/* Selected Accent line */}
        {isActive && (
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-md rounded-l-none opacity-100",
            isExpanded ? "left-0" : "-left-2"
          )} />
        )}

        {upcomingDotActive && (
          <span className={cn("absolute flex h-2 w-2", isExpanded ? "right-3.5 top-1/2 -translate-y-1/2" : "top-[7px] right-[7px]")}>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
        )}
      </button>
    )
  }

  return (
    <aside 
      style={{
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        minWidth: 0,
      }}
      className={cn(
        "h-full flex flex-col select-none",
        isExpanded && !sidebarCollapsed ? "px-4 py-4" : "items-center px-2 py-4"
      )}
      role="navigation"
      aria-label="Main Sidebar Navigation"
      id="application-sidebar-container"
    >
      {/* Sidebar Header Panel */}
      <div className={cn("flex items-center w-full mb-6 relative", isExpanded ? "justify-between pl-1" : "justify-center")}>
        <button 
          type="button"
          onClick={toggleSidebarWidth}
          className="flex items-center gap-3 cursor-pointer outline-none focus-visible:outline-none rounded-lg p-0.5 bg-transparent border-0 text-left target-md"
          title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          aria-label={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          id="sidebar-logo-trigger"
        >
          <Logo size={isExpanded ? 52 : 44} glow={true} showCircle={true} />
          {isExpanded && (
            <span className="text-[22px] font-extrabold tracking-tight text-[var(--text-primary)] font-sans">
              Keystone
            </span>
          )}
        </button>

        {isExpanded && (
          <button 
            type="button"
            onClick={toggleSidebarWidth} 
            className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-850/60 cursor-pointer outline-none"
            title="Collapse panel"
            aria-label="Collapse panel"
            id="sidebar-collapse-button"
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Nav List with Tablist role */}
      <nav 
        role="tablist"
        aria-label="Sidebar Navigation Tabs"
        className={cn(
          "w-full flex-1 flex flex-col gap-5 no-drag overflow-y-auto custom-scrollbar pt-1 pb-4",
          isExpanded ? "pr-1" : "px-0"
        )}
        style={{ opacity: 1, transition: 'opacity 0.25s ease-in-out' }}
      >
        {sections.map((section, sIdx) => {
          const isViewVisibleByFeature = (viewId: string): boolean => {
            if (!featureVisibility) return true
            switch (viewId) {
              case 'today':
                return featureVisibility.todayView
              case 'deepwork':
                return featureVisibility.focusTimer
              case 'notes':
              case 'views':
                return featureVisibility.notesBoard
              case 'analytics':
                return featureVisibility.wellnessAnalytics
              case 'habits':
                return featureVisibility.habitTracking
              case 'plan':
                return featureVisibility.aiSuggestions
              default:
                return true
            }
          }

          // Filter out views disabled in preferences or feature visibility master switches
          const standardItems = section.items.filter(item => !item.isAdvanced && visibleViews[item.id] && isViewVisibleByFeature(item.id))
          const advancedItems = section.items.filter(item => item.isAdvanced && visibleViews[item.id] && isViewVisibleByFeature(item.id))

          // If no items in this section are visible, don't show the section at all
          if (standardItems.length === 0 && (!showMore || advancedItems.length === 0)) {
            return null
          }

          return (
            <div key={sIdx} className="w-full flex flex-col gap-1">
              {/* Optional Section Header */}
              {isExpanded && (
                <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-550 pl-2 py-0.5 select-none font-sans">
                  {section.label}
                </div>
              )}

              {/* Collapsed simple visual line divider */}
              {!isExpanded && sIdx > 0 && (
                <div className="h-[1px] w-8 bg-zinc-900 mx-auto my-1 shrink-0" />
              )}

              {/* Standard visible items */}
              <div className="flex flex-col gap-1 w-full">
                {standardItems.map(item => renderItemButton(item))}
              </div>

              {/* Advanced toggle items */}
              {advancedItems.length > 0 && showMore && (
                <div className={cn(
                  "flex flex-col gap-1 w-full mt-1",
                  isExpanded ? "border-l border-[var(--color-border-default)] pl-1 ml-1" : ""
                )}>
                  {advancedItems.map(item => renderItemButton(item))}
                </div>
              )}
            </div>
          )
        })}

        {/* Advanced "More" trigger to expand/reveal advanced views */}
        <div className={cn("w-full mt-2 pt-2", isExpanded ? "border-t border-zinc-900/60" : "flex flex-col items-center")}>
          {!isExpanded && (
            <div className="h-[1px] w-8 bg-zinc-900 mx-auto mb-2 shrink-0" />
          )}
          <button
            type="button"
            onClick={toggleShowMore}
            className={cn(
              "rounded-xl flex items-center transition-all duration-150 text-secondary hover:text-white hover:bg-[var(--bg-hover)] focus:outline-none select-none target-md min-h-10",
              isExpanded ? "w-full px-3.5 py-2.5 gap-3" : "w-full h-10 justify-center"
            )}
            title={isExpanded ? "" : (showMore ? "Hide Advanced Views" : "Show Advanced Views")}
            aria-label={showMore ? "Collapse Advanced views" : "Show Advanced views"}
            id="sidebar-more-utility-toggle"
          >
            {showMore ? (
              <ChevronDown size={isExpanded ? 15 : 17} className="transition-transform duration-150 text-amber-500 shrink-0" />
            ) : (
              <ChevronRight size={isExpanded ? 15 : 17} className="transition-transform duration-150 text-zinc-550 shrink-0" />
            )}
            
            {isExpanded && (
              <span className="text-xs font-semibold tracking-wide">
                {showMore ? "Collapse Advanced" : "Advanced Modules"}
              </span>
            )}
          </button>
        </div>

        {/* Projects segment */}
        {projects.length > 0 && (
          <div className="w-full mt-2 pt-2 border-t border-zinc-900/60">
            {isExpanded && (
              <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-550 pl-2 pb-1.5 font-sans">
                Projects
              </div>
            )}
            
            <div className="flex flex-col gap-1 w-full">
              {projects.map((project) => {
                const isActive = activeView === 'project' && selectedProjectId === project.id
                const isImg = project.icon && project.icon.startsWith('data:image/')
                
                return (
                  <button
                    key={project.id}
                    onClick={() => { setSelectedProject(project.id); }}
                    className={cn(
                      "rounded-xl flex items-center transition-all duration-150 outline-none focus:outline-none select-none target-md min-h-10",
                      isExpanded ? "w-full px-3.5 py-2.5 gap-3" : "w-full h-10 justify-center",
                      isActive ? "bg-white/10 text-white text-body font-semibold" : "hover:bg-[var(--bg-hover)] text-secondary"
                    )}
                    title={isExpanded ? "" : project.name}
                    role="tab"
                    aria-selected={isActive ? "true" : "false"}
                    id={`sidebar-project-${project.id}`}
                  >
                    {isImg ? (
                      <img 
                        src={project.icon} 
                        alt={project.name}
                        className={cn(
                          "w-4 h-4 rounded-full object-cover border border-[var(--border-subtle)] transition-transform shrink-0",
                          isActive ? "scale-110" : "opacity-80"
                        )}
                      />
                    ) : (
                      <div 
                        className={cn(
                          "w-2.5 h-2.5 rounded-full transition-transform shrink-0",
                          isActive ? "scale-115" : ""
                        )} 
                        style={{ backgroundColor: project.color }} 
                        aria-hidden="true"
                      />
                    )}

                    {isExpanded && (
                      <span className="truncate">
                        {project.name}
                      </span>
                    )}

                    {isActive && (
                      <div 
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-md rounded-l-none",
                          isExpanded ? "left-0" : "-left-2"
                        )}
                        style={{ backgroundColor: project.color || '#fff' }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Project additions trigger */}
        <div className="flex items-center justify-center p-1 w-full shrink-0">
          <button
            onClick={() => {
              setModalInitialId(null)
              setProjectModalOpen(true)
            }}
            className={cn(
              "rounded-lg hover:bg-[var(--bg-hover)] text-zinc-550 hover:text-[var(--text-primary)] transition-colors flex items-center justify-center cursor-pointer focus:outline-none target-md min-h-10",
              isExpanded ? "w-full py-2 px-3 justify-start gap-3.5" : "w-full h-10"
            )}
            title="Manage Projects"
            aria-label="Manage spaces and projects"
            id="sidebar-manage-projects"
          >
            <FolderKanban size={13} className="shrink-0" aria-hidden="true" />
            {isExpanded && <span className="text-[10.5px] font-bold font-sans tracking-wide">Manage Spaces</span>}
          </button>
        </div>

        {/* Keyboard Shortcuts trigger button */}
        <div className="flex items-center justify-center p-1 w-full shrink-0">
          <button
            onClick={() => setShortcutsOpen(true)}
            className={cn(
              "rounded-lg hover:bg-[var(--bg-hover)] text-zinc-550 hover:text-[var(--text-primary)] transition-colors flex items-center justify-center cursor-pointer focus:outline-none target-md min-h-10",
              isExpanded ? "w-full py-2 px-3 justify-start gap-3.5" : "w-full h-10"
            )}
            title="Keyboard Shortcuts"
            aria-label="Keyboard Shortcuts"
            aria-haspopup="dialog"
            id="sidebar-keyboard-shortcuts-btn"
          >
            <Keyboard size={13} className="shrink-0" aria-hidden="true" />
            {isExpanded && <span className="text-[10.5px] font-bold font-sans tracking-wide">Shortcuts</span>}
          </button>
        </div>
      </nav>

      {/* Active Focus Session Peripheral Sidebar Card */}
      {activeSessionId && (
        <div className={cn(
          "mx-3 mb-2 p-3 rounded-xl border border-indigo-500/30 bg-indigo-950/10 shadow-lg flex flex-col gap-2 relative overflow-hidden shrink-0",
          !isExpanded && "mx-0 p-2 items-center justify-center border-indigo-500/20"
        )}>
          <Logo size={90} showCircle={false} className="absolute -right-6 -bottom-6 opacity-8 dark:opacity-5 pointer-events-none stroke-indigo-500/30" />
          {/* Subtle glowing pulse indicator */}
          <div className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              isSessionPaused ? "bg-amber-400" : "bg-indigo-400"
            )}></span>
            <span className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              isSessionPaused ? "bg-amber-500" : "bg-indigo-500"
            )}></span>
          </div>

          {isExpanded ? (
            <>
              {/* Card Header & Metadata */}
              <div 
                onClick={() => setActiveView('deepwork')}
                className="cursor-pointer group leading-none min-w-0"
              >
                <div className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors">
                  <Timer size={13} className="shrink-0" />
                  <span className="text-[10px] uppercase font-bold tracking-wider font-sans">Active Focus</span>
                </div>
                <div className="mt-1.5 text-xs font-semibold text-zinc-200 truncate group-hover:text-white transition-colors" title={activeTask?.title || "Deep Focus"}>
                  {activeTask ? activeTask.title : "Deep Focus"}
                </div>
              </div>

              {/* Timer Countdown Display */}
              <div 
                onClick={() => setActiveView('deepwork')}
                className="cursor-pointer flex items-baseline gap-2 py-0.5"
              >
                <span className="font-mono text-xl font-bold tracking-tight text-indigo-300 tabular-nums leading-none">
                  {formatTime(displaySeconds)}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium font-sans leading-none">
                  {isOvertime ? "overtime" : "remaining"}
                </span>
              </div>

              {/* Distractions status bar */}
              <div className="flex items-center justify-between text-[10px] text-zinc-400 border-t border-zinc-900/40 pt-1.5">
                <span className="flex items-center gap-1">
                  <Flame size={10} className="text-zinc-500" />
                  <span>{activeSessionDistractionCount} {activeSessionDistractionCount === 1 ? 'distraction' : 'distractions'}</span>
                </span>
              </div>

              {/* Actions Quick-control bar */}
              <div className="flex items-center gap-1.5 mt-1 border-t border-zinc-900/40 pt-2">
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (!window.electronAPI) return
                    try {
                      if (isSessionPaused) {
                        await window.electronAPI.resumeSession()
                        setIsSessionPaused(false)
                      } else {
                        await window.electronAPI.pauseSession()
                        setIsSessionPaused(true)
                      }
                    } catch (err) {
                      console.error('Error toggling pause/resume from sidebar card:', err)
                    }
                  }}
                  className={cn(
                    "flex-1 py-1 rounded-md flex items-center justify-center gap-1 text-[10.5px] font-semibold border transition-all cursor-pointer",
                    isSessionPaused 
                      ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30" 
                      : "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                  )}
                  title={isSessionPaused ? "Resume Session" : "Pause Session"}
                >
                  {isSessionPaused ? (
                    <>
                      <Play size={10} />
                      <span>Resume</span>
                    </>
                  ) : (
                    <>
                      <Pause size={10} />
                      <span>Pause</span>
                    </>
                  )}
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (!window.electronAPI) return
                    if (confirm("Stop the focus session?")) {
                      try {
                        await window.electronAPI.stopSession()
                      } catch (err) {
                        console.error('Error stopping focus session from sidebar card:', err)
                      }
                    }
                  }}
                  className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 rounded-md flex items-center justify-center transition-colors cursor-pointer"
                  title="Stop Focus Session"
                >
                  <Square size={10} fill="currentColor" className="text-red-400" />
                </button>
              </div>
            </>
          ) : (
            /* Collapsed mini visual item */
            <button
              onClick={() => setActiveView('deepwork')}
              className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/20 hover:text-white transition-all cursor-pointer relative group/collapsed"
              title={`${formatTime(displaySeconds)} left | ${activeSessionDistractionCount} distractions`}
            >
              <Timer size={15} className={cn("shrink-0", !isSessionPaused && "animate-pulse")} />
              
              {/* Tiny absolute badge for distraction count if greater than 0 */}
              {activeSessionDistractionCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-zinc-950 text-[8px] font-bold px-1 rounded-full leading-tight">
                  {activeSessionDistractionCount}
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Bottom Settings Trigger node */}
      <div className={cn(
        "mt-auto w-full border-t border-[var(--color-border-default)] shrink-0",
        isExpanded ? "p-3" : "py-3 px-1"
      )}>
        <button
          onClick={() => setActiveView('settings')}
          className={cn(
            "rounded-xl flex items-center transition-all duration-150 relative focus:outline-none outline-none select-none target-md min-h-10",
            isExpanded ? "w-full px-3.5 py-2.5 gap-3" : "w-full h-10 justify-center",
            activeView === 'settings' ? "bg-white/10 text-white text-body font-semibold" : "hover:bg-[var(--bg-hover)] text-secondary"
          )}
          title={isExpanded ? "" : "Application Settings"}
          role="tab"
          aria-selected={activeView === 'settings' ? "true" : "false"}
          id="sidebar-item-settings"
        >
          <Settings 
            size={isExpanded ? 15 : 17} 
            className={cn(
              "transition-colors shrink-0",
              activeView === 'settings' ? "text-white" : "text-white/70"
            )} 
            aria-hidden="true"
          />
          {isExpanded && (
            <span className="truncate">
              Settings
            </span>
          )}
        </button>
      </div>

      {/* Project configuration panel */}
      <ProjectEditModal 
        isOpen={projectModalOpen} 
        onClose={() => setProjectModalOpen(false)} 
        initialEditProjectId={modalInitialId} 
      />
    </aside>
  )
}
