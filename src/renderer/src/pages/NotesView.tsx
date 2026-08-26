// src/renderer/src/pages/NotesView.tsx
import { useState, useEffect } from 'react'
import { 
  FileText, Plus, Pin, Archive, Trash2, Search, Link as LinkIcon, 
  Download, RefreshCw, FolderOpen, AlertCircle, PinOff, Calendar
} from 'lucide-react'
import { MarkdownEditor } from '../components/notes/MarkdownEditor'
import { motion, AnimatePresence } from 'motion/react'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../lib/utils'

export function NotesView() {
  const [notes, setNotes] = useState<any[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [selectedNote, setSelectedNote] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [tab, setTab] = useState<'all' | 'pinned' | 'archived'>('all')
  const [backlinks, setBacklinks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [notesFeatureEnabled, setNotesFeatureEnabled] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState<{ success: boolean; path?: string; count?: number } | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const setActiveView = useAppStore(state => state.setActiveView)
  const setSelectedProjectId = useAppStore(state => state.setSelectedProject)
  const featureVisibility = useAppStore(state => state.featureVisibility)

  useEffect(() => {
    loadNotesFeatureToggle()
    loadNotes().then(() => {
      const storedId = localStorage.getItem('selected_notes_view_id')
      if (storedId) {
        setSelectedNoteId(storedId)
        localStorage.removeItem('selected_notes_view_id')
      }
    })
  }, [])

  useEffect(() => {
    if (selectedNoteId) {
      loadSelectedNoteDetails(selectedNoteId)
    } else {
      setSelectedNote(null)
      setBacklinks([])
    }
  }, [selectedNoteId])

  const loadNotesFeatureToggle = async () => {
    if (!window.electronAPI) return
    try {
      const val = await window.electronAPI.getSetting('notes.enabled', 'true')
      setNotesFeatureEnabled(val === 'true')
    } catch (e) {
      console.error('Failed reading notes setting toggle:', e)
    }
  }

  const loadNotes = async () => {
    if (!window.electronAPI) return
    setIsLoading(true)
    try {
      const all = await window.electronAPI.listAllNotes()
      setNotes(all)
    } catch (e) {
      console.error('Failed to load notes:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSelectedNoteDetails = async (id: string) => {
    if (!window.electronAPI) return
    try {
      const note = await window.electronAPI.getNoteById(id)
      setSelectedNote(note)
      if (note) {
        const bl = await window.electronAPI.getNoteBacklinks(id)
        setBacklinks(bl)
      }
    } catch (e) {
      console.error('Failed to fetch selected note detail:', e)
    }
  }

  const handleCreateNote = async (parentType: 'standalone' | 'task' | 'project' | 'session' = 'standalone', parentId: string | null = null) => {
    if (!window.electronAPI) return
    try {
      const newNote = await window.electronAPI.createNote({
        title: 'Untitled Note',
        body_md: '',
        parent_type: parentType,
        parent_id: parentId,
        pinned: 0,
        archived: 0
      })
      await loadNotes()
      setSelectedNoteId(newNote.id)
    } catch (e) {
      console.error('Failed creating note:', e)
    }
  }

  const handleUpdateBody = async (bodyMd: string) => {
    if (!selectedNote || !window.electronAPI) return
    try {
      const updated = await window.electronAPI.updateNote({
        id: selectedNote.id,
        body_md: bodyMd
      })
      setSelectedNote(updated)
      // Refresh list to keep updated_at and preview synchronized
      const updatedNotes = notes.map(n => n.id === updated.id ? updated : n)
      setNotes(updatedNotes)
    } catch (e) {
      console.error('Failed updating note body:', e)
    }
  }

  const handleUpdateTitle = async (newTitle: string) => {
    if (!selectedNote || !window.electronAPI) return
    try {
      const updated = await window.electronAPI.updateNote({
        id: selectedNote.id,
        title: newTitle
      })
      setSelectedNote(updated)
      setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))
    } catch (e) {
      console.error('Failed updating note title:', e)
    }
  }

  const handleTogglePin = async () => {
    if (!selectedNote || !window.electronAPI) return
    try {
      const nextPin = selectedNote.pinned === 1 ? 0 : 1
      await window.electronAPI.pinNote(selectedNote.id, nextPin === 1)
      setSelectedNote((prev: any) => prev ? { ...prev, pinned: nextPin } : null)
      await loadNotes()
    } catch (e) {
      console.error('Toggle pin failed:', e)
    }
  }

  const handleToggleArchive = async () => {
    if (!selectedNote || !window.electronAPI) return
    try {
      const nextArchive = selectedNote.archived === 1 ? 0 : 1
      await window.electronAPI.archiveNote(selectedNote.id, nextArchive === 1)
      setSelectedNoteId(null)
      setSelectedNote(null)
      await loadNotes()
    } catch (e) {
      console.error('Toggle archive failed:', e)
    }
  }

  const handleDelete = async () => {
    if (!selectedNote || !window.electronAPI) return
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    try {
      await window.electronAPI.deleteNote(selectedNote.id)
      setSelectedNoteId(null)
      setSelectedNote(null)
      setConfirmingDelete(false)
      await loadNotes()
    } catch (e) {
      console.error('Delete note failed:', e)
    }
  }

  const handleExportVault = async () => {
    if (!window.electronAPI) return
    setExporting(true)
    setExportResult(null)
    try {
      const res = await window.electronAPI.exportAllNotes()
      if (res.success) {
        setExportResult({ success: true, path: res.folderPath, count: res.count })
      } else if (res.canceled) {
        setExportResult(null)
      } else {
        setExportResult({ success: false })
      }
    } catch (e) {
      console.error('Failed vault export:', e)
      setExportResult({ success: false })
    } finally {
      setExporting(false)
    }
  }

  const handleWikiLinkNavigation = async (title: string) => {
    // Navigate via wiki backlinks
    const found = notes.find(n => n.title.toLowerCase() === title.toLowerCase() && n.archived === 0)
    if (found) {
      setSelectedNoteId(found.id)
    } else {
      // Create a new note automatically with this title if none exists! (Standard Obsidian/Heptabase value!)
      if (!window.electronAPI) return
      if (confirm(`Note "${title}" does not exist. Would you like to create it?`)) {
        try {
          const newNote = await window.electronAPI.createNote({
            title,
            body_md: `# ${title}\n\nCreated automatically from [[${title}]]`,
            parent_type: 'standalone'
          })
          await loadNotes()
          setSelectedNoteId(newNote.id)
        } catch (e) {
          console.error('Wiki-link creation failed:', e)
        }
      }
    }
  }

  const handleNavigateToParent = (parentType: string, parentId: string) => {
    if (parentType === 'project') {
      setSelectedProjectId(parentId)
      setActiveView('project')
    } else if (parentType === 'task') {
      setActiveView('today')
    } else if (parentType === 'session') {
      setActiveView('analytics')
    }
  }

  // Filter notes based on Tab search selection
  const filteredNotesByTab = notes.filter(n => {
    if (tab === 'pinned') return n.pinned === 1 && n.archived === 0
    if (tab === 'archived') return n.archived === 1
    return n.archived === 0 // default all
  })

  const filteredNotes = filteredNotesByTab.filter(n => {
    if (!searchQuery.trim()) return true
    return (
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.body_md.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  // Format Helper for parent display
  const getParentLabel = (note: any) => {
    if (note.parent_type === 'standalone') return null
    return note.parent_type.charAt(0).toUpperCase() + note.parent_type.slice(1)
  }

  if (!notesFeatureEnabled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-base)] text-slate-400 p-8">
        <AlertCircle className="w-12 h-12 text-slate-600 mb-4 animate-bounce" />
        <h2 className="text-lg font-bold text-slate-200 mb-2">Knowledge Vault is Disabled</h2>
        <p className="text-sm text-slate-500 max-w-sm text-center mb-6">
          The Notes feature has been toggled off in settings. Your data remains perfectly preserved, but user interface elements are hidden.
        </p>
        <button
          onClick={async () => {
            if (!window.electronAPI) return
            await window.electronAPI.setSetting('notes.enabled', 'true')
            setNotesFeatureEnabled(true)
            loadNotes()
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
        >
          Enable Notes Feature
        </button>
      </div>
    )
  }

  if (!featureVisibility.notesBoard) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 p-8 font-sans h-full">
        <div className="text-center max-w-md space-y-3 p-8 border border-zinc-900 rounded-2xl bg-zinc-950/40">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Notes Workspace is Hidden</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The Notes and Knowledge Base is currently hidden to keep your dashboard clean. You can activate this feature any time in Settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex h-full bg-[var(--bg-base)] text-[var(--text-primary)] select-none view-container">
      {/* LEFT: Notes Sidebar List */}
      <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/10 shrink-0">
        <div className="p-4 border-b border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold tracking-tight text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Knowledge Vault
            </h1>
            <button
              onClick={() => handleCreateNote('standalone')}
              className="flex items-center justify-center w-7 h-7 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow cursor-pointer transition-all"
              title="Create New Standalone Note"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 outline-none placeholder-slate-600 focus:border-indigo-500/50 transition"
            />
          </div>

          {/* Tab Selector Filter */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850">
            <button
              onClick={() => setTab('all')}
              className={`flex-1 text-center py-1 rounded text-[10px] font-bold tracking-wider uppercase cursor-pointer transition ${
                tab === 'all' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTab('pinned')}
              className={`flex-1 text-center py-1 rounded text-[10px] font-bold tracking-wider uppercase cursor-pointer transition ${
                tab === 'pinned' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Pinned
            </button>
            <button
              onClick={() => setTab('archived')}
              className={`flex-1 text-center py-1 rounded text-[10px] font-bold tracking-wider uppercase cursor-pointer transition ${
                tab === 'archived' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Archived
            </button>
          </div>
        </div>

        {/* Note List Scroll View */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-600 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading notes...</span>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center text-slate-600 text-xs italic py-12">
              No notes found
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = note.id === selectedNoteId
              const preview = note.body_md
                ? note.body_md
                    .replace(/[#\*\`\[\]\-]/g, '')
                    .substring(0, 75) + (note.body_md.length > 75 ? '...' : '')
                : 'Empty note...'

              const label = getParentLabel(note)

              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition duration-150 flex flex-col gap-1.5 select-none ${
                    isSelected
                      ? 'bg-indigo-950/20 border-indigo-500/40'
                      : 'bg-slate-900/10 border-slate-850 hover:bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs text-slate-100 truncate flex-1 leading-snug">
                      {note.title || 'Untitled Note'}
                    </span>
                    {note.pinned === 1 && (
                      <Pin className="w-3 h-3 text-amber-500 shrink-0 fill-amber-500 mt-0.5" />
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed select-none">
                    {preview}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-650 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-600" />
                      {note.updated_at ? note.updated_at.split(' ')[0] : 'Today'}
                    </span>

                    {label && (
                      <span className="px-1.5 py-0.5 bg-slate-800 rounded font-bold text-[9px] text-indigo-400">
                        {label}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* RIGHT: Note Workspace / Active Selected Details */}
      <div className="flex-1 flex flex-col bg-slate-950/20 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {selectedNote ? (
            <motion.div
              key={selectedNote.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col overflow-hidden p-6 gap-4 h-full"
            >
              {/* Note Header / Meta controls */}
              <div className="flex items-center justify-between gap-4 border-b border-slate-850 pb-4 shrink-0">
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={selectedNote.title}
                    onChange={(e) => handleUpdateTitle(e.target.value)}
                    placeholder="Note Title"
                    className="bg-transparent border-none text-lg font-bold text-slate-150 outline-none w-full placeholder-slate-700 h-10 select-text"
                  />
                </div>

                {/* Header Action Tools */}
                <div className="flex items-center gap-1.5">
                   <button
                    onClick={handleTogglePin}
                    className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-xl border cursor-pointer transition",
                      selectedNote.pinned === 1
                        ? "bg-amber-950/25 border-amber-500/30 text-amber-500 hover:bg-amber-950/40"
                        : "border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                    )}
                    title={selectedNote.pinned === 1 ? 'Unpin Note' : 'Pin Note'}
                  >
                    {selectedNote.pinned === 1 ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={handleToggleArchive}
                    className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-xl border cursor-pointer transition",
                      selectedNote.archived === 1
                        ? "bg-emerald-900/35 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/45"
                        : "border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                    )}
                    title={selectedNote.archived === 1 ? 'Unarchive Note' : 'Archive Note'}
                  >
                    <Archive className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleDelete}
                    onMouseLeave={() => setConfirmingDelete(false)}
                    className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-xl border transition cursor-pointer ml-4",
                      confirmingDelete
                        ? "bg-rose-950/40 border border-rose-500/30 text-rose-400 animate-pulse text-[9px] font-semibold"
                        : "border-slate-800 text-slate-400 hover:bg-rose-950/20 hover:border-rose-500/30 hover:text-rose-500"
                    )}
                    title={confirmingDelete ? "Click again to confirm delete" : "Permanently Delete Note"}
                  >
                    {confirmingDelete ? (
                      <span>Confirm?</span>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Parent Association Bar */}
              {selectedNote.parent_type !== 'standalone' && selectedNote.parent_id && (
                <div className="flex items-center gap-2 px-3 py-2 border border-slate-850 bg-slate-900/30 rounded-xl text-xs text-slate-400 shrink-0 select-none">
                  <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Linked to {selectedNote.parent_type} context: {selectedNote.parent_id.substring(0, 8)}</span>
                  <button
                    type="button"
                    onClick={() => handleNavigateToParent(selectedNote.parent_type, selectedNote.parent_id)}
                    className="ml-auto text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer focus:outline-none"
                  >
                    Navigate to {selectedNote.parent_type === 'standalone' ? 'note' : selectedNote.parent_type}
                  </button>
                </div>
              )}

              {/* Core Markdown Editor Layout */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <MarkdownEditor
                  value={selectedNote.body_md}
                  onChange={handleUpdateBody}
                  onWikiLinkClick={handleWikiLinkNavigation}
                  placeholder="Capture knowledge... Type [[Other Note Title]] to create wiki backlinks."
                />
              </div>

              {/* Bottom Lightweight Backlinks Column */}
              <div className="border-t border-slate-850 pt-3 shrink-0 flex flex-col gap-1.5 select-none">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <LinkIcon className="w-3 h-3 text-slate-600" />
                  <span>Linked from / Backlinks ({backlinks.length})</span>
                </div>
                {backlinks.length === 0 ? (
                  <p className="text-[10px] text-slate-600 italic">No incoming connections. Reference this note with [[{selectedNote.title || 'Note Title'}]]</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mt-1 overflow-x-auto">
                    {backlinks.map((blNote) => (
                      <span
                        key={blNote.id}
                        onClick={() => setSelectedNoteId(blNote.id)}
                        className="cursor-pointer text-[10.5px] font-semibold text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 hover:text-indigo-300 px-2 py-1 rounded-lg border border-indigo-500/15 transition"
                      >
                        {blNote.title || 'Untitled'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* Empty State Layout */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <FileText className="w-16 h-16 text-slate-700/65 mb-4 stroke-[1.2px]" />
              <h2 className="text-sm font-semibold text-slate-300 mb-1">Knowledge Workspace</h2>
              <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
                Choose a note from sidebar or create a new one. Keystone maps notes organically to tasks, projects, and active pomodoro focus sessions.
              </p>

              {/* Vault Wide export and setting trigger */}
              <div className="flex flex-col gap-3 max-w-[280px] w-full">
                <button
                  onClick={handleExportVault}
                  disabled={exporting}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition shadow-lg shrink-0"
                >
                  <Download className="w-4 h-4 text-indigo-400" />
                  {exporting ? 'Exporting Vault...' : 'Export Entire Vault (.md)'}
                </button>

                {exportResult && (
                  <div className={`p-3 rounded-xl border text-left text-xs ${
                    exportResult.success ? 'bg-emerald-950/20 border-emerald-500/25 text-emerald-400' : 'bg-rose-950/25 border-rose-500/25 text-rose-400'
                  }`}>
                    {exportResult.success ? (
                      <div>
                        <div className="font-semibold flex items-center gap-1.5">
                          <FolderOpen className="w-4 h-4 text-emerald-400" />
                          <span>Export Successful!</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                          Successfully written <strong>{exportResult.count}</strong> Obsidian-compatible files to path: <span className="font-mono text-[9px] block bg-slate-900 px-1 py-0.5 rounded text-slate-300 select-text overflow-x-auto whitespace-pre">{exportResult.path}</span>
                        </p>
                      </div>
                    ) : (
                      <span>Vault export failed. Please check folder permissions and select a valid directory.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
