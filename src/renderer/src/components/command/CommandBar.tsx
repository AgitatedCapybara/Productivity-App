// src/renderer/src/components/command/CommandBar.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'motion/react'
import { 
  Search, 
  ArrowRight, 
  FolderPlus, 
  Sparkles, 
  Layout, 
  Play, 
  Pause, 
  Square, 
  Bookmark,
  Plus,
  Check
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

interface CommandBarProps {
  isOpen: boolean
  onClose: () => void
}

interface CommandItem {
  id: string
  title: string
  section: string
  icon: React.ReactNode
  action: () => void
}

export function CommandBar({ isOpen, onClose }: CommandBarProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [templates, setTemplates] = useState<any[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { setActiveView, incrementTasksRevision, tasks, completedTasks, projects } = useAppStore()

  // Fetch templates when open
  useEffect(() => {
    if (isOpen && window.electronAPI) {
      ;(window.electronAPI as any).listTemplates().then(setTemplates).catch(console.error)
      setSearch('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [isOpen])

  // Ctrl+K key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (isOpen) onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Static & dynamic commands list
  const commandsList = useMemo(() => {
    const items: CommandItem[] = [
      {
        id: 'nav-today',
        title: 'Go to Today Board [G → T]',
        section: 'Navigation',
        icon: <Layout className="w-4 h-4 text-sky-400" />,
        action: () => setActiveView('today')
      },
      {
        id: 'nav-deepwork',
        title: 'Go to Deep Work Cycle [G → D]',
        section: 'Navigation',
        icon: <Layout className="w-4 h-4 text-purple-400" />,
        action: () => setActiveView('deepwork')
      },
      {
        id: 'nav-views',
        title: 'Go to Views cockpit [G → V]',
        section: 'Navigation',
        icon: <Layout className="w-4 h-4 text-amber-500" />,
        action: () => setActiveView('views')
      },
      {
        id: 'nav-upcoming',
        title: 'Go to Upcoming Tasks',
        section: 'Navigation',
        icon: <Layout className="w-4 h-4 text-emerald-400" />,
        action: () => setActiveView('upcoming')
      },
      {
        id: 'nav-habits',
        title: 'Go to Habits Tracker',
        section: 'Navigation',
        icon: <Layout className="w-4 h-4 text-rose-450" />,
        action: () => setActiveView('habits')
      },
      {
        id: 'nav-circle',
        title: 'Go to Circle Sharing cockpit',
        section: 'Navigation',
        icon: <Layout className="w-4 h-4 text-indigo-400" />,
        action: () => setActiveView('circle')
      },
      {
        id: 'nav-settings',
        title: 'Go to System Settings',
        section: 'Navigation',
        icon: <Layout className="w-4 h-4 text-slate-400" />,
        action: () => setActiveView('settings')
      },
      {
        id: 'focus-start',
        title: 'Start Deep Work Cycle (25m)',
        section: 'Focus Mode',
        icon: <Play className="w-4 h-4 text-emerald-400" />,
        action: () => {
          if (window.electronAPI) {
            window.electronAPI.startSession({ targetDurationMins: 25 }).catch(console.error)
          }
        }
      },
      {
        id: 'focus-pause',
        title: 'Pause Active focus session',
        section: 'Focus Mode',
        icon: <Pause className="w-4 h-4 text-amber-400" />,
        action: () => {
          if (window.electronAPI) {
            window.electronAPI.pauseSession().catch(console.error)
          }
        }
      },
      {
        id: 'focus-resume',
        title: 'Resume focus session',
        section: 'Focus Mode',
        icon: <Play className="w-4 h-4 text-teal-400" />,
        action: () => {
          if (window.electronAPI) {
            window.electronAPI.resumeSession().catch(console.error)
          }
        }
      },
      {
        id: 'focus-stop',
        title: 'Stop/Save Focus Session',
        section: 'Focus Mode',
        icon: <Square className="w-4 h-4 text-rose-500" />,
        action: () => {
          if (window.electronAPI) {
            window.electronAPI.stopSession().catch(console.error)
          }
        }
      },
      {
        id: 'ritual-morning',
        title: 'Start Morning Plan Ritual',
        section: 'Rituals & Planning',
        icon: <Sparkles className="w-4 h-4 text-amber-400" />,
        action: () => {
          useAppStore.getState().setShowMorningPlan(true)
        }
      },
      {
        id: 'ritual-evening',
        title: 'Start Evening Shutdown Ritual',
        section: 'Rituals & Planning',
        icon: <Sparkles className="w-4 h-4 text-purple-400" />,
        action: () => {
          useAppStore.getState().setShowEveningShutdown(true)
        }
      }
    ]

    // Append Active Tasks to result list
    tasks.forEach(task => {
      const projName = task.project_id ? projects.find(p => p.id === task.project_id)?.name : ''
      items.push({
        id: `task-${task.id}`,
        title: task.title + (projName ? ` (${projName})` : ''),
        section: 'Active Tasks',
        icon: <Bookmark className="w-4 h-4 text-indigo-400" />,
        action: () => {
          setActiveView('today')
          useAppStore.getState().setKeyboardSelectedTaskId(task.id)
          useAppStore.getState().setKeyboardDetailsPeekOpen(true)
        }
      })
    })

    // Append Completed Tasks to result list
    completedTasks.forEach(task => {
      items.push({
        id: `completed-task-${task.id}`,
        title: task.title,
        section: 'Completed Tasks',
        icon: <Check className="w-4 h-4 text-zinc-500" />,
        action: () => {
          setActiveView('today')
          useAppStore.getState().setKeyboardSelectedTaskId(task.id)
          useAppStore.getState().setKeyboardDetailsPeekOpen(true)
        }
      })
    })

    // Append dynamic Template selectors
    templates.forEach(tpl => {
      items.push({
        id: `tpl-${tpl.id}`,
        title: `Apply Template: ${tpl.name}`,
        section: 'Templates',
        icon: <Bookmark className="w-4 h-4 text-indigo-400" />,
        action: () => {
          if (window.electronAPI) {
            ;(window.electronAPI as any).applyTemplate(tpl.id).then(() => {
              incrementTasksRevision()
            }).catch(console.error)
          }
        }
      })
    })

    // Dynamic direct creator commands based on what is typed
    if (search.startsWith('+project ')) {
      const projName = search.substring(9).trim()
      if (projName) {
        items.unshift({
          id: 'create-project',
          title: `Create Project: "${projName}"`,
          section: 'Quick Creators',
          icon: <FolderPlus className="w-4 h-4 text-teal-400" />,
          action: () => {
            if (window.electronAPI) {
              window.electronAPI.createProject({ name: projName, color: '#3b82f6', sort_order: 0, icon: 'folder' }).then(() => {
                if (window.electronAPI) {
                  window.electronAPI.getProjects().then((projs) => {
                    useAppStore.getState().setProjects(projs)
                  }).catch(console.error)
                }
              }).catch(console.error)
            }
          }
        })
      }
    }

    if (search.startsWith('+habit ')) {
      const habitName = search.substring(7).trim()
      if (habitName) {
        items.unshift({
          id: 'create-habit',
          title: `Create Habit: "${habitName}"`,
          section: 'Quick Creators',
          icon: <Plus className="w-4 h-4 text-rose-400" />,
          action: () => {
            if (window.electronAPI) {
              window.electronAPI.createHabit({ name: habitName, frequency: 'daily' }).catch(console.error)
            }
          }
        })
      }
    }

    // Filter by search text
    const query = search.toLowerCase().trim()
    if (!query || query === '+project' || query === '+habit') {
      return items
    }

    if (query.startsWith('+')) {
      return items.filter(item => item.section === 'Quick Creators')
    }

    return items.filter(
      item => 
        item.title.toLowerCase().includes(query) || 
        item.section.toLowerCase().includes(query)
    )
  }, [search, templates, tasks, completedTasks, projects, setActiveView, incrementTasksRevision])

  // Reset selected bounds when results set changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [commandsList])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isInputFocused = document.activeElement === inputRef.current

    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (
      e.key === 'ArrowDown' || 
      (e.ctrlKey && e.key === 'j') || 
      (!isInputFocused && e.key.toLowerCase() === 'j')
    ) {
      e.preventDefault()
      setSelectedIndex(prev => (prev < commandsList.length - 1 ? prev + 1 : 0))
    } else if (
      e.key === 'ArrowUp' || 
      (e.ctrlKey && e.key === 'k') || 
      (!isInputFocused && e.key.toLowerCase() === 'k')
    ) {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : commandsList.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selectedCommand = commandsList[selectedIndex]
      if (selectedCommand) {
        selectedCommand.action()
        onClose()
      }
    }
  }

  // Segment commands by sections for nice render grouping
  const sectionsGrouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>()
    commandsList.forEach((item, globalIdx) => {
      const itemWithIdx = { ...item, globalIdx }
      const list = map.get(item.section) || []
      list.push(itemWithIdx as any)
      map.set(item.section, list)
    })
    return Array.from(map.entries())
  }, [commandsList])

  if (!isOpen) return null

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Command palette overlay"
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh] px-4 bg-zinc-950/60 backdrop-blur-sm transition-all duration-80"
    >
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.98, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -4 }}
        transition={{ duration: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="w-[560px] bg-zinc-950 border border-zinc-850 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col font-sans z-10"
        onKeyDown={handleKeyDown}
      >
        {/* Search header with proper high-contrast border */}
        <div className="relative flex items-center border-b border-zinc-850 px-4 py-3.5">
          <Search className="w-5 h-5 text-zinc-400 mr-2.5 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="command-results-list"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, system views, rituals, or type +project..."
            className="w-full bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-550 font-medium text-sm focus:ring-0 mr-2"
          />
          <kbd className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono select-none uppercase shadow-sm">
            ESC
          </kbd>
        </div>

        {/* List of results */}
        <div 
          id="command-results-list"
          role="listbox"
          aria-label="Search results"
          className="max-h-[350px] overflow-y-auto p-2 space-y-2.5"
        >
          {commandsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-zinc-650 animate-pulse" aria-hidden="true" />
              <p className="text-sm font-semibold text-zinc-300">No matching views or tasks found</p>
              <p className="text-xs text-zinc-500 font-mono">Try typing "+project [Name]" to quick-create an empty workspace</p>
            </div>
          ) : (
            sectionsGrouped.map(([sectionName, list]) => (
              <div key={sectionName} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 select-none">
                  {sectionName}
                </div>
                {list.map((item: any) => {
                  const isSelected = selectedIndex === item.globalIdx
                  return (
                    <div
                      key={item.id}
                      role="option"
                      aria-selected={isSelected ? "true" : "false"}
                      aria-label={item.title}
                      onClick={() => {
                        item.action()
                        onClose()
                      }}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all duration-100 ${
                        isSelected 
                          ? 'bg-purple-950/40 text-purple-200 border border-purple-500/35 ring-1 ring-purple-500/25 shadow-[0_0_12px_rgba(168,85,247,0.15)]' 
                          : 'bg-transparent text-zinc-300 border border-transparent hover:bg-zinc-900/50 hover:text-zinc-100'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="shrink-0">{item.icon}</span>
                        <span className="text-sm font-medium truncate">{item.title}</span>
                      </div>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[9px] font-extrabold font-mono text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded shadow-sm select-none">
                          ENTER <ArrowRight className="w-2.5 h-2.5 text-purple-400" />
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer with high-contrast text */}
        <div className="px-4 py-3.5 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500 font-mono bg-zinc-950/70 select-none">
          <div className="flex items-center gap-3.5">
            <span>[Ctrl+K] TOGGLE</span>
            <span>[▲][▼] or [J][K] NAVIGATE</span>
          </div>
          <span className="uppercase tracking-wider font-extrabold text-[9px] text-purple-500">Mnemonic Engine</span>
        </div>
      </motion.div>
    </div>
  )
}
