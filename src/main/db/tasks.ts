import { getDb } from './database'
import { nanoid } from 'nanoid'
import type { Task, CreateTaskInput, UpdateTaskInput } from './schema'

export function getAllTasks(): Task[] {
  const stmt = getDb().prepare('SELECT * FROM tasks ORDER BY sort_order')
  return stmt.all() as Task[]
}

export function getTasksByProject(projectId: string): Task[] {
  if (projectId === 'inbox-default') {
    const stmt = getDb().prepare("SELECT * FROM tasks WHERE project_id = 'inbox-default' OR project_id IS NULL ORDER BY sort_order")
    return stmt.all() as Task[]
  }
  const stmt = getDb().prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY sort_order')
  return stmt.all(projectId) as Task[]
}

export function getTasksDueToday(): Task[] {
  const stmt = getDb().prepare(`
    SELECT * FROM tasks 
    WHERE due_date <= date('now') AND status != 'done' 
    ORDER BY sort_order
  `)
  return stmt.all() as Task[]
}

export function getTasksUpcoming(): Task[] {
  const stmt = getDb().prepare(`
    SELECT * FROM tasks 
    WHERE due_date > date('now') AND due_date <= date('now', '+7 days') AND status != 'done' 
    ORDER BY due_date, sort_order
  `)
  return stmt.all() as Task[]
}

export function getTasksForToday(): Task[] {
  const stmt = getDb().prepare(`
    SELECT * FROM tasks 
    WHERE (due_date IS NULL OR due_date <= date('now')) AND status != 'done'
    ORDER BY sort_order
  `)
  return stmt.all() as Task[]
}

export function getTodayCompletedTasks(): Task[] {
  const stmt = getDb().prepare(`
    SELECT * FROM tasks 
    WHERE status = 'done' AND date(completed_at) = date('now')
    ORDER BY completed_at DESC
  `)
  return stmt.all() as Task[]
}

export function createTask(input: CreateTaskInput): Task {
  const db = getDb()
  const id = nanoid(8)
  
  // Calculate default sort_order
  const maxSortStmt = 
    input.project_id 
      ? db.prepare('SELECT MAX(sort_order) as max_sort FROM tasks WHERE project_id = ?')
      : db.prepare('SELECT MAX(sort_order) as max_sort FROM tasks WHERE project_id IS NULL')
  
  const result: any = input.project_id 
    ? maxSortStmt.get(input.project_id) 
    : maxSortStmt.get()
    
  const currentMax = result?.max_sort || 0
  const sort_order = input.sort_order ?? (currentMax + 1000)

  const stmt = db.prepare(`
    INSERT INTO tasks (
      id, title, notes, project_id, priority, status, due_date, due_time, 
      recurrence, sort_order, time_estimate_mins, time_logged_mins, completed_at
    ) VALUES (
      @id, @title, @notes, @project_id, @priority, @status, @due_date, @due_time,
      @recurrence, @sort_order, @time_estimate_mins, @time_logged_mins, @completed_at
    )
  `)

  stmt.run({
    id,
    title: input.title,
    notes: input.notes ?? '',
    project_id: input.project_id ?? null,
    priority: input.priority ?? 0,
    status: input.status ?? 'todo',
    due_date: input.due_date ?? null,
    due_time: input.due_time ?? null,
    recurrence: input.recurrence ?? null,
    sort_order,
    time_estimate_mins: input.time_estimate_mins ?? 0,
    time_logged_mins: input.time_logged_mins ?? 0,
    completed_at: input.completed_at ?? null
  })

  const getStmt = db.prepare('SELECT * FROM tasks WHERE id = ?')
  return getStmt.get(id) as Task
}

export function updateTask(input: UpdateTaskInput): Task {
  const db = getDb()
  const { id, ...updates } = input
  
  const keys = Object.keys(updates)
  if (keys.length === 0) {
     const getStmt = db.prepare('SELECT * FROM tasks WHERE id = ?')
     return getStmt.get(id) as Task
  }

  const setClauses = keys.map((k) => `${k} = @${k}`).join(', ')

  const stmt = db.prepare(`
    UPDATE tasks 
    SET ${setClauses}, updated_at = datetime('now')
    WHERE id = @id
  `)

  stmt.run({ ...updates, id })

  const getStmt = db.prepare('SELECT * FROM tasks WHERE id = ?')
  return getStmt.get(id) as Task
}

export function deleteTask(id: string): void {
  const stmt = getDb().prepare('DELETE FROM tasks WHERE id = ?')
  stmt.run(id)
}

export function reorderTasks(orderedIds: string[]): void {
  const db = getDb()
  const reorder = db.transaction((ids: string[]) => {
    const stmt = db.prepare('UPDATE tasks SET sort_order = ? WHERE id = ?')
    ids.forEach((tempId, i) => stmt.run((i + 1) * 1000, tempId))
  })
  reorder(orderedIds)
}

export function completeTask(id: string): Task {
  const db = getDb()
  const stmt = db.prepare(`
    UPDATE tasks 
    SET status = 'done', completed_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `)
  stmt.run(id)
  
  const getStmt = db.prepare('SELECT * FROM tasks WHERE id = ?')
  return getStmt.get(id) as Task
}
