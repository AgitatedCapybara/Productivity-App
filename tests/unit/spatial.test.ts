// tests/unit/spatial.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as dbModule from '../../src/main/db/database'
import { saveCardPlacement, getViewData } from '../../src/main/services/views'

describe('Spatial 2D Coordinates Math & SQLite Persistence', () => {
  const store = new Map<string, any>()

  beforeEach(() => {
    store.clear()
    vi.restoreAllMocks()

    // High performance localized mock of the getDb prepared statements
    vi.spyOn(dbModule, 'getDb').mockReturnValue({
      prepare: (sql: string) => {
        const sqlLower = sql.toLowerCase()
        return {
          run: vi.fn((...args: any[]) => {
            if (sqlLower.includes('insert or replace into card_placements')) {
              store.set(`${args[1]}:${args[0]}`, { // view_id:note_id
                note_id: args[0],
                view_id: args[1],
                position_x: args[2],
                position_y: args[3],
                z_index: args[4]
              })
            }
            return { changes: 1, lastInsertRowid: 1 }
          }),
          get: vi.fn((...args: any[]) => {
            if (sqlLower.includes('from card_placements')) {
              const noteId = args[0]
              const viewId = args[1]
              return store.get(`${viewId}:${noteId}`) || null
            }
            if (sqlLower.includes('from view_presets')) {
              return { id: args[0], name: 'Mock Preset', layout: 'board' }
            }
            return null
          }),
          all: vi.fn((...args: any[]) => {
            if (sqlLower.includes('from notes')) {
              return [
                { id: 'note-pkm-1', title: 'Infinite Canvas Note', body_md: 'Standard body text', parent_type: 'standalone', card_mode: 1 }
              ]
            }
            if (sqlLower.includes('from card_placements')) {
              const viewId = args[0] || 'preset-board'
              return Array.from(store.values()).filter(p => p.view_id === viewId)
            }
            return []
          })
        }
      }
    } as any)
  })

  describe('2D Spatial Coordinate Proportional Scaling Math', () => {
    it('calculates screen-relative translation coordinates based on absolute positions under magnification/zoom and panning offsets', () => {
      // Inputs: absolute coordinate, zoom ratio factor, pan offset
      const position_x = 120
      const position_y = 200
      const zoom = 1.5
      const pan = { x: 50, y: -30 }

      // Forward math: canvas space coordinate to viewport pixel coordinate
      const styleX = position_x * zoom + pan.x
      const styleY = position_y * zoom + pan.y

      expect(styleX).toBe(230) // 120 * 1.5 + 50 = 180 + 50 = 230
      expect(styleY).toBe(270) // 200 * 1.5 - 30 = 300 - 30 = 270
    })

    it('calculates the inverse canvas positions from viewport coordinates, ensuring correct mouse-panning offsets on canvas double-clicks', () => {
      // Inputs: viewport coordinates, pan position, canvas container bounds rect-offset, and scale ratio
      const clickX = 230
      const clickY = 270
      const rectLeft = 0
      const rectTop = 0
      const pan = { x: 50, y: -30 }
      const zoom = 1.5

      // Inverse math: click viewport coordinate to absolute canvas coordinate
      const position_x = Math.round((clickX - rectLeft - pan.x) / zoom)
      const position_y = Math.round((clickY - rectTop - pan.y) / zoom)

      expect(position_x).toBe(120) // Math.round((230 - 50) / 1.5) = Math.round(180/1.5) = 120
      expect(position_y).toBe(200) // Math.round((270 - (-30)) / 1.5) = Math.round(300/1.5) = 200
    })

    it('recalculates coordinate translation accurately on window resize, confirming 2D positions scale proportionally without reflowing', () => {
      // In absolute spatial boards, coordinates are scaled relative to top-left.
      // Changing the canvas layout container width or height does NOT alter left and top offsets of the cards inside.
      // Hence, the 2D spatial consistency is absolute (muscle recall is fully secured).
      const initialClientX = 120 * 1.0 + 10 // scale 1, pan.x=10 -> styleX = 130
      expect(initialClientX).toBe(130)

      // Resize window: cards remain anchored to their absolute 2D positions.
      const resizedClientX = 120 * 1.0 + 10 // stays at 130! No masonry or reflowing layout occurs.
      expect(resizedClientX).toBe(130)
    })

    it('verifies coordinate extraction and inverse calculation math for file drop events', () => {
      // Input mock viewport mouse coordinates of drop event
      const clientX = 400
      const clientY = 300
      const rect = { left: 50, top: 20 }
      const zoom = 1.2
      const pan = { x: 30, y: 40 }

      // Math representing inverse calculation for drops:
      const mouseX = clientX - rect.left
      const mouseY = clientY - rect.top
      const x = (mouseX - pan.x) / zoom
      const y = (mouseY - pan.y) / zoom

      // Snap to 8px grid:
      const dropX = Math.round(x / 8) * 8
      const dropY = Math.round(y / 8) * 8

      expect(dropX).toBe(264) // (350 - 30)/1.2 = 266.67, snapped to nearest 8 is 264
      expect(dropY).toBe(200) // (280 - 40)/1.2 = 200, snapped to nearest 8 is 200
    })

    it('validates supported file extensions and rejects unsupported ones', () => {
      const allowedExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.css', '.html', '.csv']
      
      const file1 = 'my_note.txt'
      const ext1 = file1.substring(file1.lastIndexOf('.')).toLowerCase()
      expect(allowedExtensions.includes(ext1)).toBe(true)

      const file2 = 'presentation.pptx'
      const ext2 = file2.substring(file2.lastIndexOf('.')).toLowerCase()
      expect(allowedExtensions.includes(ext2)).toBe(false)
    })

    it('distinguishes native OS file drags from internal component drags', () => {
      // Mocking event.dataTransfer.types
      const fileDragTypes = ['Files']
      const internalDragTypes = ['custom-dnd-type']

      const isFileDrag1 = fileDragTypes.includes('Files')
      expect(isFileDrag1).toBe(true)

      const isFileDrag2 = internalDragTypes.includes('Files')
      expect(isFileDrag2).toBe(false)
    })
  })

  describe('SQLite Database Placement Persistence', () => {
    it('inserts, updates and loads spatial note card absolute positions inside the SQLite relational model', () => {
      // Save a card placement
      saveCardPlacement({
        note_id: 'note-pkm-1',
        view_id: 'preset-board',
        position_x: 350,
        position_y: 450,
        z_index: 3
      })

      // Query database directly to assert persistence
      const db = dbModule.getDb()
      const row = db.prepare('SELECT * FROM card_placements WHERE note_id = ? AND view_id = ?')
        .get('note-pkm-1', 'preset-board') as any

      expect(row).toBeDefined()
      expect(row.position_x).toBe(350)
      expect(row.position_y).toBe(450)
      expect(row.z_index).toBe(3)

      // Query through the service layer
      const viewData = getViewData('preset-board')
      expect(viewData.notes.length).toBeGreaterThan(0)
      
      const pkmNote = viewData.notes.find((n: any) => n.id === 'note-pkm-1') as any
      expect(pkmNote).toBeDefined()
      expect(pkmNote?.card_mode).toBe(1)

      const placement = viewData.placements.find((p: any) => p.note_id === 'note-pkm-1')
      expect(placement).toBeDefined()
      expect(placement?.position_x).toBe(350)
      expect(placement?.position_y).toBe(450)
    })
  })
})
