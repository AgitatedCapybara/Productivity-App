import { getDb } from './database'
import { nanoid } from 'nanoid'
import type { Project } from './schema'

export function getAllProjects(): Project[] {
  const stmt = getDb().prepare('SELECT * FROM projects ORDER BY sort_order')
  return stmt.all() as Project[]
}

export function createProject(input: Omit<Project, 'id' | 'created_at'>): Project {
  const db = getDb()
  const id = nanoid(8)
  
  const stmt = db.prepare(`
    INSERT INTO projects (id, name, color, icon, sort_order)
    VALUES (@id, @name, @color, @icon, @sort_order)
  `)
  
  stmt.run({
    id,
    name: input.name,
    color: input.color ?? '#6366f1',
    icon: input.icon ?? 'folder',
    sort_order: input.sort_order ?? 0
  })
  
  const getStmt = db.prepare('SELECT * FROM projects WHERE id = ?')
  return getStmt.get(id) as Project
}

export function updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>): Project {
  const db = getDb()
  const keys = Object.keys(updates)
  
  if (keys.length === 0) {
    const getStmt = db.prepare('SELECT * FROM projects WHERE id = ?')
    return getStmt.get(id) as Project
  }

  const setClauses = keys.map((k) => `${k} = @${k}`).join(', ')
  const stmt = db.prepare(`
    UPDATE projects
    SET ${setClauses}
    WHERE id = @id
  `)

  stmt.run({ ...updates, id })

  const getStmt = db.prepare('SELECT * FROM projects WHERE id = ?')
  return getStmt.get(id) as Project
}

export function deleteProject(id: string): void {
  const stmt = getDb().prepare('DELETE FROM projects WHERE id = ?')
  stmt.run(id)
}
