// src/renderer/src/components/search/SearchPalette.tsx
import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Search, Folder, Calendar, CheckSquare, Sparkles, Command, ArrowRight } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

interface SearchPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchPalette({ isOpen, onClose }: SearchPaletteProps) {
  const [searchText, setSearchText] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { setActiveView, setSelectedProject, setHighlightedTaskId } = useAppStore()

  // Listen to escape and enter, up/down arrows for navigation
  useEffect(() => {
    if (isOpen) {
      setSearchText('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Query search DB trigger
  useEffect(() => {
    if (!isOpen) return

    if (!searchText.trim()) {
      setResults([])
      return
    }

    let active = true
    const delayDebounce = setTimeout(async () => {
      if (!window.electronAPI || !window.electronAPI.searchQuery) return
      try {
        const data = await window.electronAPI.searchQuery(searchText)
        if (active) {
          setResults(data || [])
          setSelectedIndex(0)
        }
      } catch (err) {
        console.error('Search failure:', err)
      }
    }, 120) // Fast 120ms debounce

    return () => {
      active = false
      clearTimeout(delayDebounce)
    }
  }, [searchText, isOpen])

  const handleSelect = (item: any) => {
    if (!item) return
    onClose()

    if (item.type === 'task') {
      const task = item.data
      if (task) {
        setHighlightedTaskId(task.id)
        if (task.project_id && task.project_id !== 'inbox-default') {
          setSelectedProject(task.project_id)
        } else {
          setActiveView('today')
        }
      }
    } else if (item.type === 'project') {
      const project = item.data
      if (project) {
        setSelectedProject(project.id)
      }
    } else if (item.type === 'event') {
      setActiveView('calendar')
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (results.length > 0 ? (prev + 1) % results.length : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-start justify-center pt-[15vh] p-4 select-none"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="w-full max-w-xl bg-zinc-900/90 border border-zinc-800/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow header bar accent */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-60" />

        {/* Input area */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800/50">
          <Search className="text-zinc-400 shrink-0" size={18} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-0 outline-none p-0 text-sm font-normal text-zinc-100 placeholder-zinc-500 focus:ring-0"
            placeholder="Search tasks, projects, events..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
          <div className="flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800/60 text-[10px] font-semibold text-zinc-405 shrink-0">
            <span className="text-[10px] font-sans">ESC</span>
          </div>
        </div>

        {/* Results view */}
        <div className="max-h-[350px] overflow-y-auto p-2 custom-scrollbar">
          {searchText.trim() === '' ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-zinc-500">
              <Command size={22} className="text-zinc-600 animate-pulse" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Search Keystone Database</p>
              <p className="text-[11px] text-zinc-500">Type keywords to search instantly across all models</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-zinc-500">
              <Sparkles size={20} className="text-zinc-600" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">No Matches Found</p>
              <p className="text-[11px] text-zinc-500">Try checking spelling or utilizing simpler terms</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {results.map((item, index) => {
                const isSelected = index === selectedIndex
                const isTask = item.type === 'task'
                const isProject = item.type === 'project'
                const isEvent = item.type === 'event'

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => handleSelect(item)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-zinc-800/70 border border-zinc-700/50 text-zinc-100' 
                        : 'border border-transparent text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      isSelected ? 'bg-zinc-900 border border-zinc-800/80 text-indigo-400' : 'bg-zinc-950 border border-zinc-900/30 text-zinc-500'
                    }`}>
                      {isTask && <CheckSquare size={13} />}
                      {isProject && <Folder size={13} style={{ color: item.data?.color }} />}
                      {isEvent && <Calendar size={13} />}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className={`text-[12.5px] font-medium truncate leading-snug ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}>
                        {item.title}
                      </span>
                      {item.content && (
                        <span className="text-[10px] text-zinc-500 truncate mt-0.5 max-w-[400px]">
                          {item.content}
                        </span>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        isTask ? 'text-blue-400/90 bg-blue-500/5 border-blue-500/10' :
                        isProject ? 'text-indigo-400/90 bg-indigo-500/5 border-indigo-500/10' :
                        'text-emerald-400/90 bg-emerald-500/5 border-emerald-500/10'
                      }`}>
                        {item.type}
                      </span>
                      
                      {isSelected && (
                        <motion.div layoutId="arrow-nav" className="text-zinc-300">
                          <ArrowRight size={12} />
                        </motion.div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="bg-zinc-950/40 px-4 py-2 border-t border-zinc-800/20 flex items-center justify-between text-[10px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigation</span>
            <span>↵ Select</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Command size={10} />
            <span>+ K Toggle</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
