// src/renderer/src/pages/ViewsView.tsx
import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import {
  Plus,
  Trash2,
  SlidersHorizontal,
  Layout,
  CheckCircle2,
  CalendarDays,
  Image,
  Clock,
  Map,
  Play
} from 'lucide-react'
import { ViewPreset, Task, Project, Note, CardPlacement, Action } from '../types'
import { SpatialBoard } from '../components/spatial/SpatialBoard'
import { Logo } from '../components/Logo'
import { cn } from '../lib/utils'
import { motion, AnimatePresence } from 'motion/react'
import { Skeleton } from '../components/ui/Skeleton'

export function ViewsView() {
  const featureVisibility = useAppStore(state => state.featureVisibility)
  const [presets, setPresets] = useState<ViewPreset[]>([])
  const [activePresetId, setActivePresetId] = useState<string>('preset-kanban')
  const [viewData, setViewData] = useState<{
    preset: ViewPreset | null
    tasks: Task[]
    projects: Project[]
    notes: Note[]
    placements: CardPlacement[]
  }>({
    preset: null,
    tasks: [],
    projects: [],
    notes: [],
    placements: []
  })

  // Presets and Actions lists
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Sorting in memory for silky-smooth response
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')

  // Modals
  const [showCreatePreset, setShowCreatePreset] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetLayout, setNewPresetLayout] = useState<'kanban' | 'calendar' | 'gallery' | 'timeline' | 'board'>('kanban')

  const [showCreateAction, setShowCreateAction] = useState(false)
  const [newActionName, setNewActionName] = useState('')
  const [newActionCmd, setNewActionCmd] = useState('tasks:create')
  const [newActionIcon] = useState('Zap')
  const [newActionContext] = useState('task')

  // Load Presets & Actions
  const initEngine = async () => {
    if (!window.electronAPI) return
    const fetchedPresets = await window.electronAPI.listViews()
    setPresets(fetchedPresets)

    const fetchedActions = await window.electronAPI.listActions()
    setActions(fetchedActions)

    setLoading(false)
  }

  // Load single preset view data
  const loadActiveViewData = async (presetId: string) => {
    if (!window.electronAPI) return
    try {
      const data = await window.electronAPI.getViewData(presetId)
      setViewData({
        preset: data.preset,
        tasks: data.tasks || [],
        projects: data.projects || [],
        notes: data.notes || [],
        placements: data.placements || []
      })
    } catch (err) {
      console.error('Failed to query view dataset:', err)
    }
  }

  useEffect(() => {
    initEngine()
  }, [])

  useEffect(() => {
    if (activePresetId) {
      loadActiveViewData(activePresetId)
    }
  }, [activePresetId])

  const handleCreatePreset = async () => {
    if (!newPresetName.trim() || !window.electronAPI) return
    const created = await window.electronAPI.createView({
      name: newPresetName,
      layout: newPresetLayout,
      filters: '{}',
      sort: '[]',
      group_by: ''
    })
    setNewPresetName('')
    setShowCreatePreset(false)
    initEngine()
    setActivePresetId(created.id)
  }

  const handleDeletePreset = async (presetId: string) => {
    if (!window.electronAPI) return
    const success = await window.electronAPI.deleteView(presetId)
    if (success) {
      setActivePresetId('preset-kanban')
      initEngine()
    }
  }

  // Action programmable trigger
  const handleExecuteAction = async (action: Action) => {
    if (!window.electronAPI) return
    try {
      // Direct call supporting diverse system and content commands
      if (action.command === 'tasks:create') {
        await window.electronAPI.createTask({
          title: `Automated Task: ${action.name}`,
          notes: 'Executed via programmable preset buttons'
        })
      } else if (action.command === 'window:maximize') {
        const maximize = window.electronAPI.maximizeWindow
        if (maximize) await maximize()
      } else if (action.command === 'window:minimize') {
        const minimize = window.electronAPI.minimizeWindow
        if (minimize) await minimize()
      } else if (action.command === 'window:toggleFullscreen') {
        const toggle = window.electronAPI.toggleFullscreen
        if (toggle) await toggle()
      } else if (action.command === 'tasks:purgeDeleted') {
        const purge = window.electronAPI.purgeDeletedTasks
        if (purge) await purge()
      } else {
        // Fallback for custom commands
        console.warn(`Action command '${action.command}' is executed as template automation.`)
      }
      loadActiveViewData(activePresetId)
    } catch (err) {
      console.error('Automated action failed to execute:', err)
    }
  }

  const handleCreateAction = async () => {
    if (!newActionName.trim() || !window.electronAPI) return
    await window.electronAPI.createAction({
      name: newActionName,
      command: newActionCmd,
      icon: newActionIcon,
      context: newActionContext
    })
    setNewActionName('')
    setShowCreateAction(false)
    initEngine()
  }

  const handleDeleteAction = async (actionId: string) => {
    if (!window.electronAPI) return
    await window.electronAPI.deleteAction(actionId)
    initEngine()
  }

  const handleTaskStatusChange = async (task: Task, newStatus: Task['status']) => {
    if (!window.electronAPI) return
    await window.electronAPI.updateTask({
      id: task.id,
      status: newStatus
    })
    loadActiveViewData(activePresetId)
  }

  // Filter Tasks and Notes
  const filteredTasks = viewData.tasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (priorityFilter !== 'all' && t.priority !== Number(priorityFilter)) return false
    if (projectFilter !== 'all' && t.project_id !== projectFilter) return false
    return true
  })

  // OS File Drag-and-Drop state and handlers
  const [isDragActive, setIsDragActive] = useState(false)
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null)

  const handleFileDragOver = (e: React.DragEvent) => {
    const isFileDrag = e.dataTransfer.types && e.dataTransfer.types.includes('Files')
    if (isFileDrag) {
      e.preventDefault()
      setIsDragActive(true)
    }
  }

  const handleFileDragLeave = () => {
    setIsDragActive(false)
  }

  const handleFileDrop = async (e: React.DragEvent) => {
    const isFileDrag = e.dataTransfer.types && e.dataTransfer.types.includes('Files')
    if (!isFileDrag) return

    e.preventDefault()
    setIsDragActive(false)

    if (!window.electronAPI) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    // Retrieve zoom & pan values from the DOM to calculate exact drop position
    const gridEl = document.querySelector('.canvas-grid') as HTMLElement
    let zoom = 1
    let pan = { x: 0, y: 0 }
    if (gridEl) {
      const bgSize = gridEl.style.backgroundSize
      const bgPos = gridEl.style.backgroundPosition
      if (bgSize) {
        const matchSize = bgSize.match(/^([\d.]+)px/)
        if (matchSize) {
          zoom = parseFloat(matchSize[1]) / 8
        }
      }
      if (bgPos) {
        const matchPos = bgPos.match(/^(-?[\d.]+)px\s+(-?[\d.]+)px/)
        if (matchPos) {
          pan.x = parseFloat(matchPos[1])
          pan.y = parseFloat(matchPos[2])
        }
      }
    }

    const canvasEl = document.querySelector('.cursor-grab, .cursor-grabbing') as HTMLElement
    let dropX = 184
    let dropY = 120

    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const x = (mouseX - pan.x) / zoom
      const y = (mouseY - pan.y) / zoom

      // Snap to 8px grid
      dropX = Math.round(x / 8) * 8
      dropY = Math.round(y / 8) * 8
    }

    const allowedExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.css', '.html', '.csv']
    let createdCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
      const isSupported = allowedExtensions.includes(ext)

      if (!isSupported) {
        setRejectionMessage(`Unsupported file format: ${file.name}. Only plain text/markdown/code files are allowed.`)
        setTimeout(() => {
          setRejectionMessage(null)
        }, 4000)
        continue
      }

      const filePath = (file as any).path || file.name
      const title = file.name

      // Create note card
      const newNote = await window.electronAPI.createNote({
        parent_type: 'standalone',
        title,
        body_md: `File Reference: \`${filePath}\`\n\nDrop time: ${new Date().toLocaleString()}`
      })

      // Placement offset slightly for multiple files to avoid overlap
      const finalX = dropX + i * 24
      const finalY = dropY + i * 24

      await window.electronAPI.saveViewPlacement({
        note_id: newNote.id,
        view_id: activePresetId,
        position_x: finalX,
        position_y: finalY,
        z_index: viewData.placements.length + 1 + i
      })
      createdCount++
    }

    if (createdCount > 0) {
      loadActiveViewData(activePresetId)
    }
  }

  const currentLayout = viewData.preset?.layout || 'kanban'

  if (!featureVisibility.notesBoard) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 p-8 font-sans h-full">
        <div className="text-center max-w-md space-y-3 p-8 border border-zinc-900 rounded-2xl bg-zinc-950/40">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Boards Space is Hidden</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The Spatial Boards and Multi-View Console are currently hidden to keep your dashboard clean. You can activate this feature any time in Settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 text-zinc-100 relative view-container">
      {/* View presets header shelf */}
      <div className="px-6 py-4 border-b border-zinc-900 bg-zinc-950 flex flex-wrap items-center justify-between gap-4 select-none shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="p-2 bg-indigo-505/10 border border-indigo-500/20 text-indigo-400 rounded-xl" id="views-icon-wrapper">
            <Layout size={18} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Multi-View Console</h1>
            <p className="text-[10px] text-zinc-500">Relational layouts, spatial boards, and customizable actions</p>
          </div>
        </div>

        {/* Preset switch board */}
        <div className="flex items-center gap-2 max-w-md overflow-x-auto scrollbar-none py-1">
          {presets.map(p => {
            const isSelected = p.id === activePresetId
            return (
              <div key={p.id} className="relative group/preset flex items-center shrink-0">
                <button
                  onClick={() => setActivePresetId(p.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2",
                    isSelected
                      ? "bg-indigo-600 text-white font-semibold"
                      : "bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white"
                  )}
                >
                  {p.layout === 'kanban' && <CheckCircle2 size={12} />}
                  {p.layout === 'calendar' && <CalendarDays size={12} />}
                  {p.layout === 'gallery' && <Image size={12} />}
                  {p.layout === 'timeline' && <Clock size={12} />}
                  {p.layout === 'board' && <Map size={12} />}
                  <span>{p.name}</span>
                </button>
                {!['preset-kanban', 'preset-calendar', 'preset-gallery', 'preset-timeline', 'preset-board'].includes(p.id) && (
                  <button
                    onClick={() => handleDeletePreset(p.id)}
                    className="absolute -top-1 -right-1 p-0.5 rounded-full bg-zinc-950 border border-zinc-850 hover:border-rose-500 hover:text-rose-400 text-zinc-500 opacity-0 group-hover/preset:opacity-100 transition-opacity z-10"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            )
          })}
          <button
            onClick={() => setShowCreatePreset(true)}
            className="p-1.5 rounded-lg bg-zinc-900/50 hover:bg-zinc-850 border border-zinc-850/40 text-zinc-400 hover:text-white transition-all"
            title="Create Custom Preset View"
            id="add-new-view-preset-btn"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {currentLayout !== 'board' && (
        /* Filters and Options Row */
        <div className="px-6 py-3 border-b border-zinc-900 bg-zinc-950/40 flex flex-wrap items-center justify-between gap-4 shrink-0 select-none">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              <SlidersHorizontal size={12} />
              <span>Filter Dataset:</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-850 rounded-lg px-2 py-1 text-zinc-300 focus:outline-none"
              >
                <option value="all">Any Status</option>
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>

              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-850 rounded-lg px-2 py-1 text-zinc-300 focus:outline-none"
              >
                <option value="all">Any Priority</option>
                <option value="3">Urgent</option>
                <option value="2">High</option>
                <option value="1">Medium</option>
                <option value="0">Low</option>
              </select>

              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-850 rounded-lg px-2 py-1 text-zinc-300 focus:outline-none max-w-[150px]"
              >
                <option value="all">Any Project</option>
                {viewData.projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[10px] text-zinc-500 font-mono tracking-wider">
            Rendering {filteredTasks.length} canonical rows
          </div>
        </div>
      )}

      {/* Main Core viewport section */}
      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 flex flex-col min-h-0 relative">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton-loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 p-6 overflow-hidden flex flex-col gap-4"
              >
              {currentLayout === 'kanban' ? (
                <div className="flex-1 grid grid-cols-3 gap-6 h-full">
                  {[1, 2, 3].map(col => (
                    <div key={col} className="flex flex-col bg-zinc-900/20 border border-zinc-900/60 p-4 rounded-xl h-full space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <Skeleton width="120px" height="18px" />
                        <Skeleton width="24px" height="18px" />
                      </div>
                      <Skeleton variant="card" className="h-28 opacity-65" />
                      <Skeleton variant="card" className="h-32 opacity-45" />
                      <Skeleton variant="card" className="h-24 opacity-30" />
                    </div>
                  ))}
                </div>
              ) : currentLayout === 'board' ? (
                <div className="flex-1 relative w-full h-full bg-zinc-950/20 rounded-2xl border border-zinc-900 overflow-hidden p-8">
                  <div className="absolute top-10 left-10 w-64">
                    <Skeleton variant="card" className="h-32 opacity-75" />
                  </div>
                  <div className="absolute top-24 right-16 w-80">
                    <Skeleton variant="card" className="h-44 opacity-60" />
                  </div>
                  <div className="absolute bottom-16 left-48 w-72">
                    <Skeleton variant="card" className="h-36 opacity-45" />
                  </div>
                </div>
              ) : currentLayout === 'gallery' ? (
                <div className="flex-1 grid grid-cols-4 gap-6 h-full overflow-y-auto">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(idx => (
                    <div key={idx} className="bg-zinc-900/25 border border-zinc-900 p-4 rounded-xl flex flex-col justify-between h-36">
                      <div>
                        <Skeleton variant="text" className="w-11/12 h-4 mb-2" />
                        <Skeleton variant="text" className="w-2/3 h-3 opacity-60" />
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <Skeleton variant="text" className="w-16 h-3 opacity-40" />
                        <Skeleton variant="text" className="w-6 h-3 opacity-50" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Timeline or Calendar generic layout
                <div className="flex-1 max-w-xl mx-auto space-y-6 w-full pt-4">
                  {[1, 2, 3, 4].map(idx => (
                    <div key={idx} className="flex gap-4 items-start">
                      <Skeleton className="w-12 h-4 rounded mt-1 opacity-50" />
                      <div className="flex-1 bg-zinc-900/25 border border-zinc-900 p-4 rounded-xl space-y-2">
                        <Skeleton variant="text" className="w-1/2 h-4" />
                        <Skeleton variant="text" className="w-11/12 h-3 opacity-55" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="layout-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {currentLayout === 'board' ? (
                <div
                  onDragOver={handleFileDragOver}
                  onDragLeave={handleFileDragLeave}
                  onDrop={handleFileDrop}
                  className={cn(
                    "flex-1 flex flex-col min-h-0 relative transition-all duration-150",
                    isDragActive && "border-2 border-dashed border-indigo-400/60 m-2 rounded-2xl bg-indigo-500/5"
                  )}
                  id="spatial-board-drag-drop-zone"
                >
                  <SpatialBoard
                    viewId={activePresetId}
                    notes={viewData.notes}
                    placements={viewData.placements}
                    onRefresh={() => loadActiveViewData(activePresetId)}
                  />
                  <AnimatePresence>
                    {rejectionMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 15 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-rose-950/95 border border-rose-800/40 text-rose-200 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2"
                        id="spatial-board-rejection-banner"
                      >
                        <span>⚠️</span>
                        <span>{rejectionMessage}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : currentLayout === 'kanban' ? (
            <div className="flex-1 p-6 grid grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
              {/* Columns: Todo, In Progress, Done */}
              {(['todo', 'in_progress', 'done'] as Task['status'][]).map(colStatus => {
                const columnTasks = filteredTasks.filter(t => t.status === colStatus)
                return (
                  <div key={colStatus} className="flex flex-col bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-4 border-b border-zinc-850 pb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        {colStatus === 'todo' && '⏳ Backlog/Todo'}
                        {colStatus === 'in_progress' && '⚡ Active / Focus'}
                        {colStatus === 'done' && '🎉 Completed'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-semibold text-zinc-500">
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                      {columnTasks.map(t => (
                        <div
                          key={t.id}
                          className="p-3 bg-zinc-900 border border-zinc-850 hover:border-zinc-700/80 rounded-xl transition-all shadow-sm flex flex-col gap-2 relative group"
                        >
                          <div className="text-xs font-semibold text-zinc-100">{t.title}</div>
                          {t.notes && <div className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">{t.notes}</div>}

                          <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-zinc-900">
                            {/* Project Dot Tag */}
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                              {viewData.projects.find(p => p.id === t.project_id)?.name || 'Solo task'}
                            </span>

                            {/* Set status buttons */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {colStatus !== 'todo' && (
                                <button
                                  onClick={() => handleTaskStatusChange(t, 'todo')}
                                  className="px-1.5 py-0.5 bg-zinc-950 text-[9px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white rounded"
                                >
                                  Backlog
                                </button>
                              )}
                              {colStatus !== 'in_progress' && (
                                <button
                                  onClick={() => handleTaskStatusChange(t, 'in_progress')}
                                  className="px-1.5 py-0.5 bg-indigo-950 text-[9px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 rounded"
                                >
                                  Focus
                                </button>
                              )}
                              {colStatus !== 'done' && (
                                <button
                                  onClick={() => handleTaskStatusChange(t, 'done')}
                                  className="px-1.5 py-0.5 bg-emerald-950 text-[9px] font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 rounded"
                                >
                                  Done
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : currentLayout === 'calendar' ? (
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center text-center">
              <div className="text-3xl mb-4">📅</div>
              <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Synchronized Unified Calendar</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
                Relational query matches due-dates of {filteredTasks.filter(t => t.due_date).length} tasks inside correct matrix boundaries.
              </p>
              <div className="mt-6 w-full max-w-2xl bg-zinc-900/60 border border-zinc-900 rounded-xl p-4 divide-y divide-zinc-850">
                {filteredTasks.filter(t => t.due_date).map(t => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-100">{t.title}</span>
                    <span className="font-mono text-indigo-400 bg-indigo-950/20 px-2.5 py-1 rounded-md">{t.due_date}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : currentLayout === 'gallery' ? (
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-4 gap-6">
                {filteredTasks.map(t => (
                  <div key={t.id} className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl hover:border-zinc-700 transition-all shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-zinc-100 tracking-tight leading-snug line-clamp-2">{t.title}</div>
                      <div className="text-[10px] text-zinc-500 mt-2 line-clamp-3">{t.notes || 'No description notes provided.'}</div>
                    </div>
                    <div className="mt-4 pt-2 border-t border-zinc-850 flex items-center justify-between text-[10px] text-zinc-550 font-mono">
                      <span>Status: {t.status}</span>
                      <span className="font-semibold text-zinc-400">P{t.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Timeline Layout */
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              <div className="max-w-xl mx-auto space-y-4">
                <div className="border-l border-zinc-800 ml-3 space-y-6">
                  {filteredTasks.map(t => (
                    <div key={t.id} className="relative pl-6">
                      <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 -translate-x-1.5 ring-4 ring-zinc-950" />
                      <div className="text-xs font-mono text-zinc-500 mb-1">{t.due_date || 'No target date'}</div>
                      <div className="bg-zinc-900 border border-zinc-850 p-3.5 rounded-xl">
                        <h4 className="text-xs font-bold text-zinc-200">{t.title}</h4>
                        {t.notes && <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1">{t.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          </motion.div>
        )}
        </AnimatePresence>
      </div>

        {/* Coda-Style Programmable Actions Sidebar Panel */}
        {currentLayout !== 'board' && (
          <div className="w-[280px] bg-zinc-950 border-l border-zinc-900 flex flex-col select-none">
            <div className="p-4 border-b border-zinc-900 bg-zinc-950 flex items-center justify-between shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 flex items-center gap-2">
                <Logo size={18} showCircle={false} strokeWidth={3.0} className="text-indigo-400" />
                <span>Custom Actions</span>
              </span>
              <button
                onClick={() => setShowCreateAction(true)}
                className="p-1 hover:bg-zinc-900 border border-zinc-850/60 rounded-md text-zinc-400 hover:text-white"
                id="create-custom-action-btn"
              >
                <Plus size={12} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar bg-zinc-950/40">
              {actions.map(action => (
                <div
                  key={action.id}
                  className="p-3 bg-zinc-900/60 border border-zinc-900 hover:border-zinc-850 hover:bg-zinc-900 rounded-xl transition-all flex flex-col gap-2 group/action"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">{action.name}</span>
                    <button
                      onClick={() => handleDeleteAction(action.id)}
                      className="text-zinc-650 hover:text-rose-400 opacity-0 group-hover/action:opacity-100 transition-opacity p-0.5"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <div className="text-[9px] font-mono text-zinc-500 truncate mb-1">
                    CMD: {action.command}
                  </div>
                  <button
                    onClick={() => handleExecuteAction(action)}
                    className="w-full py-1.5 bg-indigo-650/40 border border-indigo-600/30 text-[10px] uppercase font-bold text-indigo-405 hover:bg-indigo-600 hover:text-white rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-98"
                  >
                    <Play size={10} className="fill-current" />
                    <span>Trigger Macro</span>
                  </button>
                </div>
              ))}

              {actions.length === 0 && (
                <div className="text-[10px] text-zinc-600 text-center py-6 leading-relaxed">
                  No programmable automation buttons added yet. Create one above!
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal - Create Preset */}
      {showCreatePreset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-905 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100 mb-4">Create Layout View</h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-semibold text-zinc-500">Preset View Name</label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition-all"
                  placeholder="e.g. Sprint Backlog"
                  id="new-view-name-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-semibold text-zinc-500">Core Layout Archetype</label>
                <select
                  value={newPresetLayout}
                  onChange={(e) => setNewPresetLayout(e.target.value as any)}
                  className="w-full bg-zinc-955 border border-zinc-850 rounded-xl px-3.5 py-2 text-sm text-zinc-300 focus:outline-none"
                  id="new-view-layout-select"
                >
                  <option value="kanban">Kanban Columns</option>
                  <option value="calendar">Interactive Calendar</option>
                  <option value="gallery">Bento Grid Gallery</option>
                  <option value="timeline">Chronological Timeline</option>
                  <option value="board">Heptabase Spatial Canvas</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowCreatePreset(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePreset}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 rounded-xl text-xs font-semibold text-white shadow-md active:scale-98"
                  id="confirm-create-view-btn"
                >
                  Create Preset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Create Action */}
      {showCreateAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-905 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100 mb-4">Create Custom Action Macro</h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-semibold text-zinc-500">Action Label</label>
                <input
                  type="text"
                  value={newActionName}
                  onChange={(e) => setNewActionName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-505 transition-all"
                  placeholder="e.g. Maximize Workspace"
                  id="new-action-name-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-semibold text-zinc-500">Automated Function Command</label>
                <select
                  value={newActionCmd}
                  onChange={(e) => setNewActionCmd(e.target.value)}
                  className="w-full bg-zinc-955 border border-zinc-850 rounded-xl px-3.5 py-2 text-sm text-zinc-300 focus:outline-none"
                  id="new-action-command-select"
                >
                  <option value="tasks:create">tasks:create - Custom task</option>
                  <option value="window:maximize">window:maximize - Toggle fullscreen size</option>
                  <option value="window:minimize">window:minimize - Minimize browser wrapper</option>
                  <option value="window:toggleFullscreen">window:toggleFullscreen - Full screen immersion</option>
                  <option value="tasks:purgeDeleted">tasks:purgeDeleted - Purge deleted items backlog</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowCreateAction(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAction}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 rounded-xl text-xs font-semibold text-white shadow-md active:scale-98"
                  id="confirm-create-action-btn"
                >
                  Save Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
