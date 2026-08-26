// src/renderer/capture/Capture.tsx
import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Plus, 
  Sparkles, 
  Folder, 
  AlertCircle, 
  Calendar, 
  Clock, 
  Tag, 
  Zap, 
  MapPin, 
  Bell, 
  Repeat,
  Terminal,
  FileText
} from 'lucide-react'
import { parseTaskInput } from '../src/hooks/useTasks'

interface Project {
  id: string
  name: string
  color?: string
}

interface Template {
  id: string
  name: string
  payload_json: string
  use_count: number
}

export function Capture() {
  const [inputVal, setInputVal] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch projects and templates
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getProjects().then(setProjects).catch(console.error)
      ;(window.electronAPI as any).listTemplates().then(setTemplates).catch(console.error)
    }
  }, [])

  // Auto-focus input on mount and window focus
  useEffect(() => {
    const handleFocus = () => {
      inputRef.current?.focus()
    }
    window.addEventListener('focus', handleFocus)
    inputRef.current?.focus()
    // Periodic safety check to keep input focused
    const interval = setInterval(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus()
      }
    }, 100)

    return () => {
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [])

  const knownProjectNames = projects.map(p => p.name)
  const parsed = parseTaskInput(inputVal, false, [], knownProjectNames)
  
  // Handlers
  const handleClose = () => {
    setMessage(null)
    setInputVal('')
    setSelectedTemplateIndex(-1)
    if (window.electronAPI) {
      window.electronAPI.closeWindow()
    }
  }

  const handleApplyTemplate = async (templateId: string) => {
    setLoading(true)
    try {
      if (window.electronAPI) {
        await (window.electronAPI as any).applyTemplate(templateId)
        setMessage('Template applied successfully!')
        setTimeout(() => {
          handleClose()
          setLoading(false)
        }, 600)
      }
    } catch (err: any) {
      console.error(err)
      setMessage('Failed to apply template')
      setLoading(false)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputVal.trim()) return

    // If a template is currently highlighted via keyboard arrows
    if (selectedTemplateIndex >= 0 && selectedTemplateIndex < templates.length) {
      await handleApplyTemplate(templates[selectedTemplateIndex].id)
      return
    }

    setLoading(true)
    try {
      if (window.electronAPI) {
        await (window.electronAPI as any).createTask(inputVal)
        setMessage('Task created successfully')
        setTimeout(() => {
          handleClose()
          setLoading(false)
        }, 600)
      }
    } catch (err: any) {
      console.error(err)
      setMessage('Failed to create task')
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedTemplateIndex(prev => 
        prev < templates.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedTemplateIndex(prev => (prev > -1 ? prev - 1 : -1))
    }
  }

  // Helper colors for raw matching priorities
  const getPriorityColor = (priority: number) => {
    if (priority === 3) return 'bg-rose-500/10 text-rose-405 border border-rose-500/20'
    if (priority === 2) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
    if (priority === 1) return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
    return 'bg-zinc-800/20 text-zinc-400 border border-zinc-800/50'
  }

  return (
    <div 
      className="w-full h-screen flex items-start justify-center p-4 bg-transparent select-none font-sans"
      onKeyDown={handleKeyDown}
    >
      <motion.div 
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="w-[580px] bg-zinc-950 border border-zinc-850 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col"
      >
        {/* Input area */}
        <form onSubmit={handleSubmit} className="relative flex items-center border-b border-zinc-850 px-4 py-3.5 bg-zinc-950/40">
          <Sparkles className="w-5 h-5 text-purple-400 mr-3 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value)
              setSelectedTemplateIndex(-1)
            }}
            placeholder="Type task... e.g. p1 Deploy backend for 90m every Monday @office #ops"
            className="w-full bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-550 font-medium text-base py-1.5 focus:ring-0 focus:border-none"
            disabled={loading}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-[10px] font-mono text-zinc-400 select-none uppercase shadow-sm">
            <span>⏎</span>
          </kbd>
        </form>

        {/* Dynamic Parse Preview & Action list */}
        <div className="flex-1 overflow-y-auto max-h-[380px] p-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {message ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-center p-6 text-center"
              >
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-450">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="text-emerald-450 font-medium text-sm">{message}</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Parse Preview Container */}
                {inputVal.trim().length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1 font-mono tracking-wider uppercase text-zinc-500 font-bold">
                        <Terminal className="w-3.5 h-3.5 text-purple-400" /> parse diagnostics
                      </span>
                      <span className="bg-purple-950/40 text-purple-300 font-mono scale-95 border border-purple-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                        Confidence: {Math.round(parsed.confidence * 100)}%
                      </span>
                    </div>

                    {/* Tags Flow */}
                    <div className="flex flex-wrap gap-2 p-3.5 bg-zinc-900/30 border border-zinc-900 rounded-xl">
                      {/* Title */}
                      <div className="w-full text-sm font-semibold text-zinc-200 flex items-center py-1">
                        <span className="text-zinc-500 mr-2 text-xs font-mono select-none">Title:</span>
                        {parsed.title || <span className="text-zinc-600 italic font-normal">No Title</span>}
                      </div>

                      {/* Project */}
                      {parsed.projectTag && (
                        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
                          <Folder className="w-3.5 h-3.5" />
                          <span>@{parsed.projectTag}</span>
                        </div>
                      )}

                      {/* Priority */}
                      {parsed.priority > 0 && (
                        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium ${getPriorityColor(parsed.priority)}`}>
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>P{4 - parsed.priority}</span>
                        </div>
                      )}

                      {/* Recurrence */}
                      {parsed.recurrence && (
                        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 font-medium">
                          <Repeat className="w-3.5 h-3.5" />
                          <span>{parsed.recurrence}</span>
                        </div>
                      )}

                      {/* Due Date */}
                      {parsed.due_date && (
                        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{parsed.due_date} {parsed.due_time || ''}</span>
                        </div>
                      )}

                      {/* Duration */}
                      {parsed.time_estimate_mins > 0 && (
                        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{parsed.time_estimate_mins} mins</span>
                        </div>
                      )}

                      {/* Labels */}
                      {parsed.labels.map((lbl: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-zinc-800/60 text-zinc-300 border border-zinc-700/50 font-medium">
                          <Tag className="w-3.5 h-3.5" />
                          <span>#{lbl}</span>
                        </div>
                      ))}

                      {/* Energy */}
                      {parsed.energy_tag && (
                        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                          <Zap className="w-3.5 h-3.5" />
                          <span>{parsed.energy_tag}</span>
                        </div>
                      )}

                      {/* Location */}
                      {parsed.location && (
                        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>@{parsed.location}</span>
                        </div>
                      )}

                      {/* Reminder */}
                      {parsed.reminder && (
                        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                          <Bell className="w-3.5 h-3.5" />
                          <span>Remind {parsed.reminder}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Templates Section */}
                {templates.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono tracking-wider uppercase font-bold">
                      <FileText className="w-3.5 h-3.5 text-purple-400" /> Fast Templates Tracker
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {templates.map((tpl, idx) => {
                        const isSelected = selectedTemplateIndex === idx
                        return (
                          <div
                            key={tpl.id}
                            onClick={() => handleApplyTemplate(tpl.id)}
                            className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                              isSelected
                                ? 'bg-purple-950/40 border-purple-500/50 ring-1 ring-purple-500/25 shadow-lg shadow-purple-950/20'
                                : 'bg-zinc-900/30 border-zinc-900 hover:bg-zinc-900 hover:border-zinc-800'
                            }`}
                          >
                            <span className="flex items-center text-sm font-semibold text-zinc-200">
                              <Plus className="w-4 h-4 text-purple-400 mr-2.5 shrink-0" />
                              {tpl.name}
                            </span>
                            <span className="text-[10px] bg-zinc-900 text-zinc-550 border border-zinc-800/50 px-2.5 py-0.5 rounded-full font-bold">
                              Used {tpl.use_count}x
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Hotkeys indicator */}
                <div className="pt-3 border-t border-zinc-900/50 flex justify-between items-center text-[10px] text-zinc-500 font-mono select-none">
                  <span>⏎ Create task / Apply template</span>
                  <span>[↑][↓] Navigate templates / ESC cancel</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
