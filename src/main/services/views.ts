// src/main/services/views.ts
import { getDb } from '../db/database'
import { nanoid } from 'nanoid'

export interface ViewPreset {
  id: string
  name: string
  filters: string // JSON string
  sort: string // JSON string
  group_by: string
  layout: 'kanban' | 'calendar' | 'gallery' | 'timeline' | 'board'
}

export interface CardPlacement {
  note_id: string
  view_id: string
  position_x: number
  position_y: number
  z_index: number
}

export interface Action {
  id: string
  name: string
  command: string
  icon: string | null
  context: string | null
}

// Ensure database returns clean objects
export function listViews(): ViewPreset[] {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM view_presets')
  return stmt.all() as ViewPreset[]
}

export function createView(preset: Partial<ViewPreset>): ViewPreset {
  const db = getDb()
  const id = preset.id || `view-${nanoid(8)}`
  const name = preset.name || 'New View'
  const filters = preset.filters || '{}'
  const sort = preset.sort || '[]'
  const group_by = preset.group_by || ''
  const layout = preset.layout || 'kanban'

  const stmt = db.prepare(`
    INSERT INTO view_presets (id, name, filters, sort, group_by, layout)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  stmt.run(id, name, filters, sort, group_by, layout)

  return { id, name, filters, sort, group_by, layout }
}

export function updateView(id: string, updates: Partial<ViewPreset>): ViewPreset {
  const db = getDb()
  const current = db.prepare('SELECT * FROM view_presets WHERE id = ?').get(id) as ViewPreset | undefined
  if (!current) {
    throw new Error(`View Preset not found: ${id}`)
  }

  const name = updates.name !== undefined ? updates.name : current.name
  const filters = updates.filters !== undefined ? updates.filters : current.filters
  const sort = updates.sort !== undefined ? updates.sort : current.sort
  const group_by = updates.group_by !== undefined ? updates.group_by : current.group_by
  const layout = updates.layout !== undefined ? updates.layout : current.layout

  db.prepare(`
    UPDATE view_presets
    SET name = ?, filters = ?, sort = ?, group_by = ?, layout = ?
    WHERE id = ?
  `).run(name, filters, sort, group_by, layout, id)

  return { id, name, filters, sort, group_by, layout }
}

export function deleteView(id: string): boolean {
  const db = getDb()
  
  // Do not delete default seeded views to preserve experience
  if (['preset-kanban', 'preset-calendar', 'preset-gallery', 'preset-timeline', 'preset-board'].includes(id)) {
    return false
  }

  db.prepare('DELETE FROM view_presets WHERE id = ?').run(id)
  db.prepare('DELETE FROM card_placements WHERE view_id = ?').run(id)
  return true
}

export function getViewData(viewId: string) {
  const db = getDb()
  const start = process.hrtime.bigint()

  const preset = db.prepare('SELECT * FROM view_presets WHERE id = ?').get(viewId) as ViewPreset | undefined
  if (!preset) {
    throw new Error(`View Preset not found: ${viewId}`)
  }

  // Get all canonical tasks (silky-smooth sorting & rendering inside views)
  const tasks = db.prepare('SELECT * FROM tasks WHERE status != "deleted" ORDER BY sort_order').all()
  const projects = db.prepare('SELECT * FROM projects ORDER BY sort_order').all()

  // Get note cards (either marked as card_mode or standalone/project notes)
  const notes = db.prepare('SELECT * FROM notes WHERE card_mode = 1 OR parent_type = "standalone" OR parent_type = "project"').all()

  // Get placements for this view
  const placements = db.prepare('SELECT * FROM card_placements WHERE view_id = ?').all() as CardPlacement[]

  const end = process.hrtime.bigint()
  const elapsedMs = Number(end - start) / 1000000
  console.log(`[Views Service] getViewData for ${viewId} completed in ${elapsedMs.toFixed(2)}ms`)

  return {
    preset,
    tasks,
    projects,
    notes,
    placements
  }
}

export function saveCardPlacement(placement: CardPlacement): void {
  const db = getDb()
  // Ensure target note is marked as card mode
  db.prepare('UPDATE notes SET card_mode = 1 WHERE id = ?').run(placement.note_id)

  db.prepare(`
    INSERT OR REPLACE INTO card_placements (note_id, view_id, position_x, position_y, z_index)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    placement.note_id,
    placement.view_id,
    placement.position_x,
    placement.position_y,
    placement.z_index
  )
}

export function deleteCardPlacement(noteId: string, viewId: string): void {
  const db = getDb()
  db.prepare('DELETE FROM card_placements WHERE note_id = ? AND view_id = ?').run(noteId, viewId)
}

// Actions CRUD
export function listActions(): Action[] {
  const db = getDb()
  return db.prepare('SELECT * FROM actions').all() as Action[]
}

export function createAction(action: Partial<Action>): Action {
  const db = getDb()
  const id = action.id || `action-${nanoid(8)}`
  const name = action.name || 'Unnamed Action'
  const command = action.command || ''
  const icon = action.icon || 'Zap'
  const context = action.context || 'task'

  db.prepare(`
    INSERT INTO actions (id, name, command, icon, context)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, command, icon, context)

  return { id, name, command, icon, context }
}

export function updateAction(id: string, updates: Partial<Action>): Action {
  const db = getDb()
  const current = db.prepare('SELECT * FROM actions WHERE id = ?').get(id) as Action | undefined
  if (!current) {
    throw new Error(`Action not found: ${id}`)
  }

  const name = updates.name !== undefined ? updates.name : current.name
  const command = updates.command !== undefined ? updates.command : current.command
  const icon = updates.icon !== undefined ? updates.icon : current.icon
  const context = updates.context !== undefined ? updates.context : current.context

  db.prepare(`
    UPDATE actions
    SET name = ?, command = ?, icon = ?, context = ?
    WHERE id = ?
  `).run(name, command, icon, context, id)

  return { id, name, command, icon, context }
}

export function deleteAction(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM actions WHERE id = ?').run(id)
}
