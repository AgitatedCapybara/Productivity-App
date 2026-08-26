// src/renderer/src/components/projects/ProjectEditModal.tsx
import React, { useState, useEffect, useMemo } from 'react'
import { Plus, X, FolderKanban, Trash2, Image as ImageIcon, Camera } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '../../lib/utils'
import { useProjects } from '../../hooks/useProjects'
import { useAppStore } from '../../store/useAppStore'
import type { Project } from '../../types'
import { CircularCropper } from '../CircularCropper'
import { dialogTransition } from '../../lib/motion-tokens'
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap'
import { useSafeClickOutside } from '../../hooks/useSafeClickOutside'

interface ProjectEditModalProps {
  isOpen: boolean
  onClose: () => void
  initialEditProjectId?: string | null
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#a855f7', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#64748b'  // Slate
]

export function ProjectEditModal({ isOpen, onClose, initialEditProjectId }: ProjectEditModalProps) {
  const { projects, createProject, updateProject, deleteProject } = useProjects()
  const { selectedProjectId, setSelectedProject, setActiveView } = useAppStore()

  // Screen modes: 'list' | 'editor'
  const [screen, setScreen] = useState<'list' | 'editor'>('list')
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  // Editor states
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [icon, setIcon] = useState('folder') // stores 'folder' or a base64 image
  const [isCustomImage, setIsCustomImage] = useState(false)
  const [rawImage, setRawImage] = useState<string | null>(null)
  const [isCropping, setIsCropping] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const containerRef = useModalFocusTrap<HTMLDivElement>({ isOpen, onClose })

  const isProjectFormDirty = useMemo(() => {
    if (screen !== 'editor') return false
    if (editingProject) {
      return (
        name !== editingProject.name ||
        color !== editingProject.color ||
        (isCustomImage && rawImage ? rawImage : 'folder') !== (editingProject.icon || 'folder')
      )
    } else {
      return (
        name !== '' ||
        color !== '#6366f1' ||
        isCustomImage !== false
      )
    }
  }, [screen, editingProject, name, color, isCustomImage, rawImage])

  const {
    shakeKey: projectShakeKey,
    isFlashing: projectIsFlashing
  } = useSafeClickOutside({
    isOpen,
    onClose,
    isDirty: isProjectFormDirty,
    externalRef: containerRef
  })

  // Handles initialization
  useEffect(() => {
    if (isOpen) {
      if (initialEditProjectId) {
        const found = projects.find(p => p.id === initialEditProjectId)
        if (found) {
          handleStartEdit(found)
        } else {
          setScreen('list')
        }
      } else {
        setScreen('list')
      }
    } else {
      setScreen('list')
      setEditingProject(null)
      setRawImage(null)
      setIsCropping(false)
      setDeleteConfirm(false)
    }
  }, [isOpen, initialEditProjectId, projects])

  const handleStartCreate = () => {
    setEditingProject(null)
    setName('')
    setColor('#6366f1')
    setIcon('folder')
    setIsCustomImage(false)
    setRawImage(null)
    setIsCropping(false)
    setDeleteConfirm(false)
    setScreen('editor')
  }

  const handleStartEdit = (proj: Project) => {
    setEditingProject(proj)
    setName(proj.name)
    setColor(proj.color)
    setIcon(proj.icon || 'folder')
    const hasBase64 = !!(proj.icon && proj.icon.startsWith('data:image/'))
    setIsCustomImage(hasBase64)
    if (hasBase64) {
      setRawImage(proj.icon)
    } else {
      setRawImage(null)
    }
    setIsCropping(false)
    setDeleteConfirm(false)
    setScreen('editor')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === 'string') {
        setRawImage(event.target.result)
        setIsCropping(true)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!name.trim()) return

    const inputData = {
      name: name.trim(),
      color,
      icon: isCustomImage && rawImage ? rawImage : 'folder',
      sort_order: editingProject ? editingProject.sort_order : (projects.length ? Math.max(...projects.map(p => p.sort_order)) + 1 : 0)
    }

    if (editingProject) {
      await updateProject(editingProject.id, inputData)
    } else {
      await createProject(inputData)
    }

    setScreen('list')
    setEditingProject(null)
  }

  const handleDelete = async () => {
    if (!editingProject) return
    if (editingProject.id === 'inbox-default') return // Never delete inbox!

    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }

    const deadId = editingProject.id
    await deleteProject(deadId)

    // Reset view if the currently loaded project in ProjectView was deleted
    if (selectedProjectId === deadId) {
      setSelectedProject(null)
      setActiveView('today')
    }

    setScreen('list')
    setEditingProject(null)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={dialogTransition}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[6px] flex items-center justify-center p-4"
          id="project-edit-modal-backdrop"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={projectShakeKey > 0 ? {
              x: [0, -6, 6, -6, 6, -4, 4, 0],
              opacity: 1,
              scale: 1
            } : { scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={dialogTransition}
            className={cn(
              "glass w-full max-w-lg rounded-2xl border p-6 flex flex-col max-h-[90vh] text-zinc-100 overflow-y-auto custom-scrollbar shadow-2xl relative outline-none transition-all duration-300",
              projectIsFlashing
                ? "border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-2 ring-amber-500/40"
                : "border-zinc-805"
            )}
            id="project-edit-modal-card"
            onClick={(e) => e.stopPropagation()}
            ref={containerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Top Header */}
            <header className="flex items-center justify-between border-b border-zinc-900 pb-3.5 mb-5 select-none" id="project-edit-modal-header">
              <div className="flex items-center gap-2.5">
                <FolderKanban className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-semibold tracking-wide text-zinc-100 HeaderText">
                  {screen === 'list' ? 'Manage Projects' : editingProject ? `Configure Project: ${editingProject.name}` : 'Create New Project'}
                </h2>
              </div>
              <button 
                type="button" 
                onClick={onClose}
                className="w-10 h-10 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                title="Close panel"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </header>

        {/* SCREEN 1: LIST VIEW */}
        {screen === 'list' && (
          <div className="flex flex-col gap-4 flex-1 h-full" id="project-edit-screen-list">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">All workspace areas</span>
              <button
                onClick={handleStartCreate}
                className="text-[10px] select-none font-bold uppercase tracking-wider bg-indigo-650 hover:bg-indigo-600 active:scale-95 text-indigo-50 px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                <Plus size={12} strokeWidth={2.5} />
                Create Project
              </button>
            </div>

            <div className="space-y-1.5 max-h-[45vh] overflow-y-auto custom-scrollbar pr-0.5 mt-2">
              {projects.map((proj) => {
                const isImg = proj.icon && proj.icon.startsWith('data:image/')
                return (
                  <div 
                    key={proj.id}
                    onClick={() => handleStartEdit(proj)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl border border-zinc-900/40 bg-zinc-900/20 hover:bg-zinc-900/60 hover:border-zinc-800/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      {isImg ? (
                        <img 
                          src={proj.icon} 
                          alt={proj.name} 
                          className="w-[22px] h-[22px] rounded-full object-cover border border-zinc-800"
                        />
                      ) : (
                        <div 
                          className="w-[22px] h-[22px] rounded-full flex-shrink-0 flex items-center justify-center font-mono border border-zinc-800" 
                          style={{ backgroundColor: proj.color }}
                        />
                      )}
                      <span className="text-xs font-semibold text-zinc-200 tracking-wide">{proj.name}</span>
                      {proj.id === 'inbox-default' && (
                        <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">Default Inbox</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-500 group-hover:text-indigo-450 transition-colors">Edit Setting</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* SCREEN 2: EDITOR (CREATE & EDIT) */}
        {screen === 'editor' && (
          <div className="flex flex-col gap-4 flex-1" id="project-edit-screen-editor">
            {isCropping && rawImage ? (
              <CircularCropper 
                imageSrc={rawImage}
                onSave={(cropped) => {
                  setRawImage(cropped)
                  setIcon(cropped)
                  setIsCropping(false)
                }}
                onCancel={() => {
                  setIsCropping(false)
                  if (icon && icon.startsWith('data:image/')) {
                    // Revert to old image
                  } else {
                    setRawImage(null)
                    setIsCustomImage(false)
                  }
                }}
              />
            ) : (
              <div className="space-y-4">
                {/* Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] text-white/60">Project Title</label>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Work, Side Projects, Travel Planner..."
                    className="text-[17px] p-2 min-h-10 bg-zinc-800 rounded-lg border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-purple-400 placeholder:text-white/30 text-zinc-100 outline-none w-full transition-all"
                    maxLength={32}
                  />
                </div>

                {/* Bullet Type Toggle */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Project Icon Type</label>
                  <div className="grid grid-cols-2 gap-2 mt-0.5">
                    <button
                      type="button"
                      onClick={() => setIsCustomImage(false)}
                      className={cn(
                        "py-2 px-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer",
                        !isCustomImage 
                          ? "bg-zinc-900 border-indigo-500 text-indigo-400" 
                          : "bg-zinc-900/20 border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      Color Bullet
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomImage(true)}
                      className={cn(
                        "py-2 px-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer",
                        isCustomImage 
                          ? "bg-zinc-900 border-indigo-500 text-indigo-400" 
                          : "bg-zinc-900/20 border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Custom Image Logo
                    </button>
                  </div>
                </div>

                {/* Subview depending on Bullet Type */}
                {!isCustomImage ? (
                  /* Color Selection */
                  <div className="space-y-3 p-3.5 bg-zinc-900/20 border border-zinc-900 rounded-xl">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block ">Bullet Colour Swatch</label>
                    <div className="flex flex-wrap items-center gap-3">
                      {PRESET_COLORS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setColor(preset)}
                          className={cn(
                            "w-[26px] h-[26px] rounded-full border flex-shrink-0 transition-transform active:scale-90 cursor-pointer relative",
                            color === preset ? "border-indigo-455 scale-110" : "border-zinc-900"
                          )}
                          style={{ backgroundColor: preset }}
                        >
                          {color === preset && (
                            <div className="absolute inset-0.5 rounded-full border-2 border-zinc-950 flex items-center justify-center" />
                          )}
                        </button>
                      ))}

                      {/* Custom color picker */}
                      <label 
                        className={cn(
                          "w-[26px] h-[26px] rounded-full border border-dashed flex items-center justify-center cursor-pointer transition-transform relative hover:bg-zinc-900/80 active:scale-90",
                          !PRESET_COLORS.includes(color) ? "border-indigo-400 scale-110" : "border-zinc-700 hover:border-zinc-550"
                        )}
                        style={{ backgroundColor: !PRESET_COLORS.includes(color) ? color : 'transparent' }}
                      >
                        <input 
                          type="color" 
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        {PRESET_COLORS.includes(color) ? (
                          <span className="text-[14px] font-bold text-zinc-500 flex items-center justify-center select-none">+</span>
                        ) : (
                          <div className="absolute inset-0.5 rounded-full border-2 border-zinc-950" />
                        )}
                      </label>
                    </div>
                  </div>
                ) : (
                  /* Image Upload and Preview Selection */
                  <div className="space-y-3 p-3.5 bg-zinc-900/20 border border-zinc-900 rounded-xl">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block">Upload Logo Illustration</label>
                    
                    {rawImage ? (
                      <div className="flex items-center gap-4">
                        <img 
                          src={rawImage} 
                          alt="Loaded avatar" 
                          className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 shadow-md shadow-indigo-500/10"
                        />
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs text-zinc-300 font-semibold">Cropped image loaded</span>
                          <div className="flex gap-2">
                            <label className="text-[10px] uppercase tracking-wider font-bold cursor-pointer text-indigo-400 hover:text-indigo-300 border border-zinc-900 hover:border-zinc-800 bg-zinc-950/20 hover:bg-zinc-900 px-2.5 py-1 rounded-md transition-all flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              Replace
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleFileChange}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsCropping(true)}
                              className="text-[10px] uppercase tracking-wider font-bold bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800 px-2.5 py-1 rounded-md text-zinc-300 hover:text-zinc-100 font-sans transition-all"
                            >
                              Recrop Image
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2.5 p-5 border border-dashed border-zinc-800 rounded-xl hover:border-zinc-650 cursor-pointer hover:bg-zinc-900/20 hover:text-indigo-400 text-zinc-500 transition-all select-none">
                        <ImageIcon className="w-7 h-7" />
                        <div className="flex flex-col items-center text-center">
                          <span className="text-xs font-medium text-zinc-300">Click to upload your custom image</span>
                          <span className="text-[9px] text-zinc-500 font-mono mt-0.5">PNG, JPG, SVG or WEBP bounds</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* Bottom Editors Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-900 mt-6 md:gap-4">
                  {editingProject && editingProject.id !== 'inbox-default' ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className={cn(
                        "text-[10px] select-none font-bold uppercase tracking-wider px-3.5 min-h-10 min-w-10 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                        deleteConfirm 
                          ? "bg-rose-650 hover:bg-rose-600 border-rose-650 hover:border-rose-600 text-rose-50 animate-pulse" 
                          : "bg-zinc-950 border-zinc-900 hover:border-rose-550 hover:text-rose-450 text-zinc-500"
                      )}
                      onMouseLeave={() => setDeleteConfirm(false)}
                      title="Delete project category"
                    >
                      <Trash2 size={13} />
                      {deleteConfirm ? 'Are you sure? Click again' : 'Delete Project'}
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setScreen('list')}
                      className="text-[10px] select-none font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 border border-zinc-900 hover:border-zinc-800 bg-zinc-950/20 hover:bg-zinc-900 px-3.5 rounded-xl transition-all h-10 min-w-10 flex items-center justify-center cursor-pointer"
                    >
                      Back List
                    </button>
                    <button
                      type="button"
                      disabled={!name.trim()}
                      onClick={handleSave}
                      className="text-[10px] select-none font-bold uppercase tracking-wider bg-indigo-650 hover:bg-indigo-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-indigo-50 px-4 rounded-xl transition-all h-10 min-w-10 flex items-center justify-center cursor-pointer"
                    >
                      {editingProject ? 'Save Changes' : 'Create Project'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
