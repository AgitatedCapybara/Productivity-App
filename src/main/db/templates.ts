// src/main/db/templates.ts
import { getDb } from './database'
import { nanoid } from 'nanoid'
import { createTask } from './tasks'

export interface TaskTemplate {
  id: string
  name: string
  payload_json: string
  created_at: string
  last_used_at: string | null
  use_count: number
}

export function createTemplate(name: string, payloadJson: string): TaskTemplate {
  const db = getDb()
  const id = nanoid(8)
  const createdAt = new Date().toISOString()
  
  const stmt = db.prepare(`
    INSERT INTO task_templates (id, name, payload_json, created_at, last_used_at, use_count)
    VALUES (?, ?, ?, ?, NULL, 0)
  `)
  stmt.run(id, name, payloadJson, createdAt)
  
  return {
    id,
    name,
    payload_json: payloadJson,
    created_at: createdAt,
    last_used_at: null,
    use_count: 0
  }
}

export function listTemplates(): TaskTemplate[] {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM task_templates ORDER BY use_count DESC, name ASC')
  let results = stmt.all() as TaskTemplate[]
  if (results.length === 0) {
    const seeds = [
      {
        name: '🚀 Feature Ship Sprint (Full-Stack)',
        payload: [
          { title: 'Define API contracts & schema specs', notes: 'Complete TypeScript interface files and mock DB routers.', priority: 3, time_estimate_mins: 60 },
          { title: 'Build backend routers & SQLite queries', notes: 'Implement CRUD helpers with validation logic.', priority: 3, time_estimate_mins: 120 },
          { title: 'Create interactive UI views with motion', notes: 'Style screens using Tailwind constraints and motion entries.', priority: 2, time_estimate_mins: 90 },
          { title: 'Deploy build & verify telemetry metrics', notes: 'Check memory allocations, queries latency and WAL modes.', priority: 1, time_estimate_mins: 30 }
        ]
      },
      {
        name: '🧘 Deep Focus Block (Meticulous Ritual)',
        payload: [
          { title: 'Triage Inbox & match daily P1 targets', notes: 'Empty inbox workspace and set explicit task vectors.', priority: 3, time_estimate_mins: 15 },
          { title: 'Focus deep session: Pure code craftsmanship', notes: 'Block external platforms & enter continuous execution sprint.', priority: 3, time_estimate_mins: 90 },
          { title: 'Clean and refactor code modules', notes: 'Defragment file size, resolve compiler flags, trace memory.', priority: 2, time_estimate_mins: 45 }
        ]
      },
      {
        name: '🛠️ Repository Kickoff Protocols',
        payload: [
          { title: 'Initialize repository layout & .env files', notes: 'Prepare absolute gitignore protection bounds.', priority: 3, time_estimate_mins: 10 },
          { title: 'Scaffold React typescript setup', notes: 'Mount bundlers, packages and index.css styles.', priority: 2, time_estimate_mins: 30 },
          { title: 'Build migrations & test databases connection', notes: 'Define WAL mode structures and first-phase tables.', priority: 3, time_estimate_mins: 45 }
        ]
      }
    ]

    for (const seed of seeds) {
      try {
        const id = nanoid(8)
        const insertStmt = db.prepare(`
          INSERT OR IGNORE INTO task_templates (id, name, payload_json, created_at, last_used_at, use_count)
          VALUES (?, ?, ?, datetime('now'), NULL, 0)
        `)
        insertStmt.run(id, seed.name, JSON.stringify(seed.payload))
      } catch (e) {
        console.error('Failed to seed template:', e)
      }
    }
    results = stmt.all() as TaskTemplate[]
  }
  return results
}

export function deleteTemplate(id: string): void {
  const stmt = getDb().prepare('DELETE FROM task_templates WHERE id = ?')
  stmt.run(id)
}

export function applyTemplate(id: string): boolean {
  const db = getDb()
  const templateStmt = db.prepare('SELECT * FROM task_templates WHERE id = ?')
  const template = templateStmt.get(id) as TaskTemplate | undefined
  if (!template) {
    throw new Error('Template not found')
  }

  let tasksToCreate: any[] = []
  try {
    const parsed = JSON.parse(template.payload_json)
    if (Array.isArray(parsed)) {
      tasksToCreate = parsed
    } else if (parsed && Array.isArray(parsed.tasks)) {
      tasksToCreate = parsed.tasks
    } else if (parsed) {
      tasksToCreate = [parsed]
    }
  } catch (err) {
    throw new Error('Invalid template payload format')
  }

  // Atomically create tasks in a transaction
  const runTransaction = db.transaction(() => {
    for (const taskInput of tasksToCreate) {
      createTask({
        title: taskInput.title || 'Untitled Task',
        notes: taskInput.notes || '',
        project_id: taskInput.project_id || null,
        priority: taskInput.priority || 0,
        due_date: taskInput.due_date || null,
        due_time: taskInput.due_time || null,
        recurrence: taskInput.recurrence || null,
        time_estimate_mins: taskInput.time_estimate_mins || 0,
        status: 'todo'
      })
    }
    
    const updateStmt = db.prepare(`
      UPDATE task_templates 
      SET use_count = use_count + 1, last_used_at = ? 
      WHERE id = ?
    `)
    updateStmt.run(new Date().toISOString(), id)
  })

  runTransaction()
  return true
}
