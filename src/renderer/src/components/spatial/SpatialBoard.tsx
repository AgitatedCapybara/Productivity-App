// src/renderer/src/components/spatial/SpatialBoard.tsx
import { useState, useRef, MouseEvent, useMemo, useEffect } from 'react'
import { Plus, Trash2, Edit3, GripHorizontal, FileText, Magnet, Star, ZoomIn, ZoomOut, X } from 'lucide-react'
import { Note, CardPlacement } from '../../types'
import { cn } from '../../lib/utils'
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap'
import { overlaySlide } from '../../lib/motion-tokens'
import { 
  DndContext, 
  useDraggable, 
  useDroppable, 
  DragOverlay, 
  DragEndEvent, 
  DragStartEvent, 
  DragMoveEvent, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core'
import { motion, AnimatePresence } from 'motion/react'

interface SpatialBoardProps {
  viewId: string
  notes: Note[]
  placements: CardPlacement[]
  onRefresh: () => void
}

export function SpatialBoard({ viewId, notes, placements, onRefresh }: SpatialBoardProps) {
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')

  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Selection state
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([])
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)

  const panStart = useRef({ x: 0, y: 0 })
  const selectionStart = useRef({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  const sidebarRef = useModalFocusTrap<HTMLDivElement>({
    isOpen: !!editingCardId,
    onClose: () => setEditingCardId(null)
  })

  // Track modifier keys (Cmd/Ctrl) to disable snapping dynamically
  const isCtrlOrMetaPressed = useRef(false)

  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        isCtrlOrMetaPressed.current = true
      }
    }
    const handleKeyUpGlobal = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        isCtrlOrMetaPressed.current = false
      }
    }
    window.addEventListener('keydown', handleKeyDownGlobal)
    window.addEventListener('keyup', handleKeyUpGlobal)
    return () => {
      window.removeEventListener('keydown', handleKeyDownGlobal)
      window.removeEventListener('keyup', handleKeyUpGlobal)
    }
  }, [])

  // Keyboard Arrow Nudging
  useEffect(() => {
    const handleKeyDownNudge = async (e: KeyboardEvent) => {
      if (!selectedCardId) return
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
      if (!arrowKeys.includes(e.key)) return

      // Prevent scrolling / default canvas behavior
      e.preventDefault()

      const placement = placements.find(p => p.note_id === selectedCardId)
      if (!placement || !window.electronAPI) return

      const nudgeAmount = e.shiftKey ? 10 : 1
      let dx = 0
      let dy = 0

      if (e.key === 'ArrowUp') dy = -nudgeAmount
      if (e.key === 'ArrowDown') dy = nudgeAmount
      if (e.key === 'ArrowLeft') dx = -nudgeAmount
      if (e.key === 'ArrowRight') dx = nudgeAmount

      const newX = placement.position_x + dx
      const newY = placement.position_y + dy

      await window.electronAPI.saveViewPlacement({
        note_id: placement.note_id,
        view_id: viewId,
        position_x: newX,
        position_y: newY,
        z_index: placement.z_index
      })
      onRefresh()
    }

    window.addEventListener('keydown', handleKeyDownNudge)
    return () => {
      window.removeEventListener('keydown', handleKeyDownNudge)
    }
  }, [selectedCardId, placements, viewId, onRefresh])

  // Setup sensors for dnd-kit. Drag starts only after 5px movement so that normal clicks (buttons) fire raw.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    })
  )

  // Snap to nearest 8px grid & alignment lines calculation helper
  const getSnappedPosition = (noteId: string, positionX: number, positionY: number, deltaX: number, deltaY: number) => {
    const targetX = positionX + deltaX / zoom
    const targetY = positionY + deltaY / zoom

    if (isCtrlOrMetaPressed.current) {
      return { x: Math.round(targetX), y: Math.round(targetY) }
    }

    // Default snap to 8px
    let snappedX = Math.round(targetX / 8) * 8
    let snappedY = Math.round(targetY / 8) * 8

    // Check alignment guides snapping (8px tolerance)
    const activeW = 256
    const activeH = 160
    const activeCX = snappedX + activeW / 2
    const activeCY = snappedY + activeH / 2

    for (const p of placements) {
      if (p.note_id === noteId) continue

      const otherX = p.position_x
      const otherY = p.position_y
      const otherW = 256
      const otherH = 160
      const otherCX = otherX + otherW / 2
      const otherCY = otherY + otherH / 2

      const tolerance = 8

      // X snapping
      if (Math.abs(snappedX - otherX) <= tolerance) {
        snappedX = otherX
      } else if (Math.abs((snappedX + activeW) - (otherX + otherW)) <= tolerance) {
        snappedX = otherX
      } else if (Math.abs(activeCX - otherCX) <= tolerance) {
        snappedX = otherCX - activeW / 2
      }

      // Y snapping
      if (Math.abs(snappedY - otherY) <= tolerance) {
        snappedY = otherY
      } else if (Math.abs((snappedY + activeH) - (otherY + otherH)) <= tolerance) {
        snappedY = otherY
      } else if (Math.abs(activeCY - otherCY) <= tolerance) {
        snappedY = otherCY - activeH / 2
      }
    }

    return { x: snappedX, y: snappedY }
  }

  // Realtime alignment guides calculation based on coordinates of placements
  const alignmentLines = useMemo(() => {
    if (!activeDragId || !dragDelta) return []
    const activePlacement = placements.find(p => p.note_id === activeDragId)
    if (!activePlacement) return []

    // Get the exact snapped position dynamically
    const { x: activeX, y: activeY } = getSnappedPosition(
      activeDragId, 
      activePlacement.position_x, 
      activePlacement.position_y, 
      dragDelta.x, 
      dragDelta.y
    )

    const activeW = 256
    const activeH = 160
    const activeCX = activeX + activeW / 2
    const activeCY = activeY + activeH / 2

    const lines: { type: 'h' | 'v'; coord: number; text?: string }[] = []

    placements.forEach(p => {
      if (p.note_id === activeDragId) return
      
      const otherX = p.position_x
      const otherY = p.position_y
      const otherW = 256
      const otherH = 160
      const otherCX = otherX + otherW / 2
      const otherCY = otherY + otherH / 2

      // Match left edges (vertical line)
      if (Math.abs(activeX - otherX) < 1) {
        lines.push({ type: 'v', coord: otherX, text: 'Edge Align (L)' })
      }
      // Match right edges (vertical line)
      else if (Math.abs((activeX + activeW) - (otherX + otherW)) < 1) {
        lines.push({ type: 'v', coord: otherX + otherW, text: 'Edge Align (R)' })
      }
      // Match center X (vertical line)
      else if (Math.abs(activeCX - otherCX) < 1) {
        lines.push({ type: 'v', coord: otherCX, text: 'Center Align' })
      }

      // Match top edges (horizontal line)
      if (Math.abs(activeY - otherY) < 1) {
        lines.push({ type: 'h', coord: otherY, text: 'Edge Align (T)' })
      }
      // Match bottom edges (horizontal line)
      else if (Math.abs((activeY + activeH) - (otherY + otherH)) < 1) {
        lines.push({ type: 'h', coord: otherY + otherH, text: 'Edge Align (B)' })
      }
      // Match center Y (horizontal line)
      else if (Math.abs(activeCY - otherCY) < 1) {
        lines.push({ type: 'h', coord: otherCY, text: 'Center Align' })
      }
    })

    return lines
  }, [activeDragId, dragDelta, placements, zoom])

  // Double click on canvas to add note at that exact coordinate
  const handleCanvasDoubleClick = async (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== canvasRef.current && !(e.target as HTMLElement).classList.contains('canvas-grid')) return
    if (!window.electronAPI) return

    // Calculate canvas-relative coordinates taking zoom and pan into account
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    let x = (e.clientX - rect.left - pan.x) / zoom
    let y = (e.clientY - rect.top - pan.y) / zoom

    // Snap to nearest 8px grid
    x = Math.round(x / 8) * 8
    y = Math.round(y / 8) * 8

    const title = 'New Idea'
    const newNote = await window.electronAPI.createNote({
      parent_type: 'standalone',
      title,
      body_md: 'Double click to edit card body.'
    })

    await window.electronAPI.saveViewPlacement({
      note_id: newNote.id,
      view_id: viewId,
      position_x: x,
      position_y: y,
      z_index: placements.length + 1
    })

    onRefresh()
  }

  // Handle canvas panning with middle click or space key drag
  const handleCanvasMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true)
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
      e.preventDefault()
    } else if (e.button === 0) {
      // Left click empty canvas triggers rubber-band selection
      if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-grid')) {
        setSelectedCardId(null)
        setSelectedCardIds([])
        setIsSelecting(true)

        const rect = canvasRef.current?.getBoundingClientRect()
        if (rect) {
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          selectionStart.current = { x, y }
          setSelectionBox({ x1: x, y1: y, x2: x, y2: y })
        }
      }
    }
  }

  const handleCanvasMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y
      })
    } else if (isSelecting && selectionBox) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const newBox = {
          x1: selectionStart.current.x,
          y1: selectionStart.current.y,
          x2: x,
          y2: y
        }
        setSelectionBox(newBox)

        // Calculate partial intersection with cards:
        const selLeft = Math.min(newBox.x1, newBox.x2)
        const selRight = Math.max(newBox.x1, newBox.x2)
        const selTop = Math.min(newBox.y1, newBox.y2)
        const selBottom = Math.max(newBox.y1, newBox.y2)

        const newlySelected: string[] = []
        placements.forEach(p => {
          const cardX1 = p.position_x * zoom + pan.x
          const cardY1 = p.position_y * zoom + pan.y
          const cardX2 = (p.position_x + 256) * zoom + pan.x // w-64 = 256px
          const cardY2 = (p.position_y + 160) * zoom + pan.y // h-40 = 160px

          const intersectX = Math.max(selLeft, cardX1) < Math.min(selRight, cardX2)
          const intersectY = Math.max(selTop, cardY1) < Math.min(selBottom, cardY2)

          if (intersectX && intersectY) {
            newlySelected.push(p.note_id)
          }
        })
        setSelectedCardIds(newlySelected)
      }
    }
  }

  const handleCanvasMouseUp = () => {
    if (isPanning) {
      setIsPanning(false)
    }
    if (isSelecting) {
      setIsSelecting(false)
      setSelectionBox(null)
      if (selectedCardIds.length === 1) {
        setSelectedCardId(selectedCardIds[0])
      }
    }
  }

  // Scroll to zoom & pan listener
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheelRaw = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        const zoomFactor = 1.05
        const direction = e.deltaY < 0 ? 1 : -1
        const factor = direction > 0 ? zoomFactor : 1 / zoomFactor
        
        const newZoom = Math.max(0.3, Math.min(2.5, zoom * factor))
        
        const rect = canvas.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        
        const canvasX = (mouseX - pan.x) / zoom
        const canvasY = (mouseY - pan.y) / zoom
        
        const newPanX = mouseX - canvasX * newZoom
        const newPanY = mouseY - canvasY * newZoom
        
        setZoom(newZoom)
        setPan({ x: newPanX, y: newPanY })
      } else {
        // Scroll wheel panning
        setPan(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }))
      }
    }

    canvas.addEventListener('wheel', handleWheelRaw, { passive: false })
    return () => {
      canvas.removeEventListener('wheel', handleWheelRaw)
    }
  }, [zoom, pan])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id.toString())
    setDragDelta({ x: 0, y: 0 })
  }

  const handleDragMove = (event: DragMoveEvent) => {
    setDragDelta(event.delta)
  }

  // Handle dnd-kit drag end with hybrid snap logic
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event
    const activeNoteId = active.id.toString()
    const placement = placements.find(p => p.note_id === activeNoteId)
    if (placement && window.electronAPI) {
      const { x, y } = getSnappedPosition(activeNoteId, placement.position_x, placement.position_y, delta.x, delta.y)
      await window.electronAPI.saveViewPlacement({
        note_id: placement.note_id,
        view_id: viewId,
        position_x: x,
        position_y: y,
        z_index: placement.z_index
      })
      onRefresh()
    }
    setActiveDragId(null)
    setDragDelta({ x: 0, y: 0 })
  }

  const handleOpenEditor = (note: Note) => {
    setEditingCardId(note.id)
    setEditTitle(note.title)
    setEditBody(note.body_md)
  }

  const handleSaveNote = async () => {
    if (!editingCardId || !window.electronAPI) return
    await window.electronAPI.updateNote({
      id: editingCardId,
      title: editTitle,
      body_md: editBody
    })
    setEditingCardId(null)
    onRefresh()
  }

  const handleDeleteCard = async (noteId: string) => {
    if (!window.electronAPI) return
    await window.electronAPI.deleteViewPlacement(noteId, viewId)
    onRefresh()
  }

  // Generate missing placements automatically if some elements are unplaced
  const unplacedNotes = notes.filter(n => !placements.some(p => p.note_id === n.id))

  const handlePlaceUnplaced = async (noteId: string) => {
    if (!window.electronAPI) return
    await window.electronAPI.saveViewPlacement({
      note_id: noteId,
      view_id: viewId,
      position_x: Math.round((50 + Math.random() * 200) / 8) * 8,
      position_y: Math.round((50 + Math.random() * 200) / 8) * 8,
      z_index: placements.length + 1
    })
    onRefresh()
  }

  const handleCreateFirstNote = async () => {
    if (!window.electronAPI) return
    const title = 'First Idea'
    const newNote = await window.electronAPI.createNote({
      parent_type: 'standalone',
      title,
      body_md: 'Click on card controls, or edit this card body in spatial sidebar.'
    })

    await window.electronAPI.saveViewPlacement({
      note_id: newNote.id,
      view_id: viewId,
      position_x: 184, // Snapped to nearest 8px
      position_y: 120, // Snapped to nearest 8px
      z_index: 1
    })

    onRefresh()
  }

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveDragId(null)
        setDragDelta({ x: 0, y: 0 })
      }}
    >
      <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 text-zinc-100 overflow-hidden relative">
        {/* Tool panel toolbar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-xl p-1.5 shadow-xl backdrop-blur-md">
          <button
            onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-all"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-all"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
            className="px-2 py-1 text-[10px] uppercase font-bold text-zinc-400 hover:text-white hover:bg-zinc-850 rounded-md transition-all"
          >
            Reset View
          </button>

          <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

          <span className="text-[10px] text-zinc-500 font-mono tracking-wider">
            Double-click canvas to spawn card
          </span>
        </div>

        {unplacedNotes.length > 0 && (
          <div className="absolute top-4 right-4 z-20 w-64 bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 shadow-xl backdrop-blur-md flex flex-col max-h-60 overflow-hidden">
            <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
              <Magnet size={12} className="text-purple-400" />
              <span>Unplaced Note Cards ({unplacedNotes.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {unplacedNotes.map(n => (
                <button
                  key={n.id}
                  onClick={() => handlePlaceUnplaced(n.id)}
                  className="w-full text-left p-1.5 rounded-lg bg-zinc-950 border border-zinc-850 hover:border-purple-500/50 text-xs transition-all flex items-center justify-between group"
                >
                  <span className="truncate pr-2">{n.title || 'Untitled Note'}</span>
                  <Plus size={12} className="text-zinc-500 group-hover:text-purple-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Canvas Area */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onDoubleClick={handleCanvasDoubleClick}
          className={cn(
            "flex-1 relative overflow-hidden select-none",
            isPanning ? "cursor-grabbing" : "cursor-grab"
          )}
        >
          {/* Snapped 8x8px visual dot grid */}
          <div
            className="absolute inset-0 canvas-grid pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(161, 161, 170, 0.08) 1px, transparent 1px)',
              backgroundSize: `${8 * zoom}px ${8 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`
            }}
          />

          {/* Real-time 1px Indigo Edge and Center Alignment Guides */}
          {alignmentLines.map((line, idx) => (
            <div
              key={idx}
              className="absolute pointer-events-none z-10 transition-all duration-75"
              style={{
                left: line.type === 'v' ? line.coord * zoom + pan.x : 0,
                top: line.type === 'h' ? line.coord * zoom + pan.y : 0,
                width: line.type === 'v' ? '1px' : '100%',
                height: line.type === 'h' ? '1px' : '100%',
                borderStyle: 'dashed',
                borderColor: 'rgba(129, 140, 248, 0.8)',
                borderWidth: line.type === 'v' ? '0 0 0 1px' : '1px 0 0 0',
              }}
            >
              {line.text && (
                <span className="absolute text-[8px] font-bold font-mono text-indigo-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 -translate-y-3.5 whitespace-nowrap shadow-sm">
                  {line.text}
                </span>
              )}
            </div>
          ))}

          {/* Rubber-band Marquee Selection Box */}
          {selectionBox && (
            <div
              className="absolute border border-indigo-400 bg-indigo-500/10 pointer-events-none z-30"
              style={{
                left: Math.min(selectionBox.x1, selectionBox.x2),
                top: Math.min(selectionBox.y1, selectionBox.y2),
                width: Math.abs(selectionBox.x1 - selectionBox.x2),
                height: Math.abs(selectionBox.y1 - selectionBox.y2),
              }}
            />
          )}

          {/* Placing Note Cards */}
          <AnimatePresence>
            {placements.map(placement => {
              const note = notes.find(n => n.id === placement.note_id)
              if (!note) return null
              const isSelected = selectedCardId === note.id || selectedCardIds.includes(note.id)
              return (
                <DraggableCard
                  key={note.id}
                  note={note}
                  placement={placement}
                  zoom={zoom}
                  pan={pan}
                  isSelected={isSelected}
                  onSelect={(id) => {
                    setSelectedCardId(id)
                    setSelectedCardIds([id])
                  }}
                  onOpenEditor={handleOpenEditor}
                  onDeleteCard={handleDeleteCard}
                  getSnappedPosition={getSnappedPosition}
                  dragDelta={activeDragId === note.id ? dragDelta : null}
                />
              )
            })}
          </AnimatePresence>

          {/* Real-time Dynamic Drag Overlay */}
          <DragOverlay adjustScale={false}>
            {activeDragId ? (() => {
              const note = notes.find(n => n.id === activeDragId)
              const placement = placements.find(p => p.note_id === activeDragId)
              if (!note || !placement) return null
              const isSelected = selectedCardId === note.id || selectedCardIds.includes(note.id)
              return (
                <DraggableCard
                  note={note}
                  placement={placement}
                  zoom={zoom}
                  pan={pan}
                  isSelected={isSelected}
                  onSelect={() => {}}
                  onOpenEditor={handleOpenEditor}
                  onDeleteCard={handleDeleteCard}
                  isDraggingOverlay={true}
                  getSnappedPosition={getSnappedPosition}
                />
              )
            })() : null}
          </DragOverlay>

          {placements.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="p-8 text-center bg-zinc-900/90 border border-zinc-800 rounded-xl shadow-2xl max-w-sm select-none flex flex-col items-center gap-4 pointer-events-auto backdrop-blur-md"
              >
                <div className="p-3 bg-purple-600/10 text-purple-400 rounded-2xl border border-purple-500/20">
                  <FileText size={20} className="animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-widest">A Blank Canvas</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">
                    A blank canvas. Drop your first idea here.
                  </p>
                </div>
                <button
                  onClick={handleCreateFirstNote}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  <Plus size={12} />
                  <span>Add Note</span>
                </button>
              </motion.div>
            </div>
          )}
        </div>

        {/* Elegant Sidebar Modal Editor */}
        <AnimatePresence>
          {editingCardId && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]" 
                onClick={() => setEditingCardId(null)}
              />
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={overlaySlide}
                ref={sidebarRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="Edit Spatial Card"
                className="fixed inset-y-0 right-0 w-[360px] bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 flex flex-col p-6 outline-none"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-purple-400">Edit Spatial Card</h3>
                  <button
                    onClick={() => setEditingCardId(null)}
                    className="w-10 h-10 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
                    aria-label="Close editor"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-semibold text-zinc-500">Card Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-purple-500 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all"
                      placeholder="Title"
                    />
                  </div>

                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-semibold text-zinc-500">Card Body (Markdown Support)</label>
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="w-full flex-1 bg-zinc-950 border border-zinc-850 focus:border-purple-500 rounded-xl p-3.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all resize-none custom-scrollbar"
                      placeholder="Write your beautiful notes or checklists..."
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3.5">
                  <button
                    onClick={() => setEditingCardId(null)}
                    className="px-4 py-2 bg-zinc-950 text-zinc-400 hover:bg-zinc-855 rounded-xl text-xs font-semibold border border-zinc-850"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-500"
                  >
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </DndContext>
  )
}

interface DraggableCardProps {
  note: Note
  placement: CardPlacement
  zoom: number
  pan: { x: number; y: number }
  isSelected: boolean
  onSelect: (noteId: string) => void
  onOpenEditor: (note: Note) => void
  onDeleteCard: (noteId: string) => void
  isDraggingOverlay?: boolean
  getSnappedPosition: (noteId: string, posX: number, posY: number, dx: number, dy: number) => { x: number; y: number }
  dragDelta?: { x: number; y: number } | null
}

function DraggableCard({ 
  note, 
  placement, 
  zoom, 
  pan, 
  isSelected,
  onSelect,
  onOpenEditor, 
  onDeleteCard,
  isDraggingOverlay = false,
  getSnappedPosition,
  dragDelta = null
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: note.id
  })

  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: note.id
  })

  const combinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node)
    setDropNodeRef(node)
  }

  // Calculate coordinates with zoom and pan
  const styleX = placement.position_x * zoom + pan.x
  const styleY = placement.position_y * zoom + pan.y

  const style: React.CSSProperties = {
    position: isDraggingOverlay ? 'relative' : 'absolute',
    left: isDraggingOverlay ? undefined : styleX,
    top: isDraggingOverlay ? undefined : styleY,
    zIndex: isDraggingOverlay ? 9999 : isDragging ? 999 : placement.z_index,
    transform: isDraggingOverlay
      ? `scale(${zoom * 1.02})`
      : transform && !isDragging
        ? `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${zoom})`
        : `scale(${zoom})`,
    transformOrigin: 'top left',
    cursor: isDraggingOverlay ? 'grabbing' : 'grab'
  }

  // Render static drop-zone indicator within 16ms using snapped projected positions
  if (isDragging && !isDraggingOverlay) {
    const { x: activeX, y: activeY } = getSnappedPosition(
      note.id, 
      placement.position_x, 
      placement.position_y, 
      dragDelta ? dragDelta.x : 0, 
      dragDelta ? dragDelta.y : 0
    )

    const projectionStyle = {
      ...style,
      left: activeX * zoom + pan.x,
      top: activeY * zoom + pan.y,
    }

    return (
      <div
        ref={combinedRef}
        style={projectionStyle}
        className={cn(
          "w-64 h-40 bg-zinc-950/25 border-2 border-dashed border-indigo-500/30 rounded-lg flex flex-col items-center justify-center text-[10px] text-zinc-500 font-mono select-none pointer-events-none z-10"
        )}
      >
        <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-450">Projected Drop Region</span>
        <span className="text-[8px] mt-1 text-zinc-600">X: {activeX} | Y: {activeY}</span>
      </div>
    )
  }

  return (
    <motion.div
      ref={combinedRef}
      style={style}
      layout="position"
      onMouseDown={(e) => {
        // Only set selection if not middle click or panning
        if (e.button === 0) {
          onSelect(note.id)
        }
      }}
      className={cn(
        "w-64 bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-xl transition-shadow flex flex-col group/card pointer-events-auto relative",
        isDraggingOverlay ? "shadow-2xl border-purple-500 ring-2 ring-purple-600/35 backdrop-blur-sm" : isSelected ? "border-indigo-500 ring-2 ring-indigo-400/50 shadow-black/80" : "hover:border-zinc-600 hover:shadow-black/60",
        note.pinned ? "border-amber-500/40" : ""
      )}
    >
      {/* Target Alignment Border-b Guide overlay */}
      {isOver && (
        <div 
          className="absolute inset-x-0 -bottom-2 border-b-2 border-indigo-400/80 pointer-events-none z-50 animate-pulse" 
          aria-hidden="true" 
        />
      )}

      {/* Header handle grab */}
      <div
        {...attributes}
        {...listeners}
        className="pb-2 border-b border-zinc-700/60 flex items-center justify-between cursor-move"
      >
        <div className="flex items-center gap-1.5">
          <GripHorizontal size={14} className="text-zinc-500 group-hover/card:text-zinc-300 transition-colors" />
          {note.pinned === 1 && <Star size={11} className="text-amber-500 fill-amber-500" />}
          <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">ID: {note.id.substring(0, 5)}</span>
        </div>

        <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
          <button
            onClick={() => onOpenEditor(note)}
            className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-all cursor-pointer"
            title="Edit Note Content"
          >
            <Edit3 size={11} />
          </button>
          <button
            onClick={() => onDeleteCard(note.id)}
            className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-zinc-700 rounded transition-all cursor-pointer ml-1"
            title="Unplace Card"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Card Content display conforming to Constitution type scale */}
      <div className="pt-2 flex-1 flex flex-col">
        <h4 className="text-xs font-bold tracking-tight text-white line-clamp-1 mb-1">
          {note.title || 'Untitled Note'}
        </h4>
        <div className="text-[11px] text-zinc-300 leading-relaxed line-clamp-3 pr-1">
          {note.body_md || <em className="text-zinc-550 font-normal">No body text. Double-click here or tap top-right to edit.</em>}
        </div>
      </div>

      <div className="pt-2 mt-2 border-t border-zinc-700/40 flex items-center justify-between" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 text-[9px] text-zinc-400">
          <FileText size={10} />
          <span>{note.parent_type} note</span>
        </div>
        <button
          onClick={() => onOpenEditor(note)}
          className="text-[9px] text-purple-400 hover:text-purple-300 font-semibold uppercase tracking-wider cursor-pointer"
        >
          Write Content
        </button>
      </div>
    </motion.div>
  )
}
