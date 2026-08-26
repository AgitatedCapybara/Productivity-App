// tests/db/tasks.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getDb, closeDb } from '../../src/main/db/database'
import {
  createTask,
  updateTask,
  deleteTask,
  getAllTasks,
  reorderTasks,
  completeTask
} from '../../src/main/db/tasks'

describe('Tasks Database CRUD Operations & Transaction Safeguards', () => {
  beforeEach(() => {
    // Obtain active migrated instance
    const db = getDb()
    db.prepare("DELETE FROM tasks").run()
    db.prepare("DELETE FROM projects").run()
  })

  afterEach(() => {
    closeDb()
  })

  it('performs clean CRUD operations with transaction state safety', () => {
    // Create
    const task = createTask({
      title: 'Audit critical ledger systems',
      notes: 'Evaluate encryption layers',
      status: 'todo',
      priority: 2,
      time_estimate_mins: 90
    })

    expect(task.id).toBeDefined()
    expect(task.title).toBe('Audit critical ledger systems')
    expect(task.notes).toBe('Evaluate encryption layers')
    expect(task.time_estimate_mins).toBe(90)
    expect(task.priority).toBe(2)

    // Update
    const updated = updateTask({
      id: task.id,
      title: 'Audit critical ledger systems v2',
      time_estimate_mins: 120
    })
    expect(updated.title).toBe('Audit critical ledger systems v2')
    expect(updated.time_estimate_mins).toBe(120)

    // Re-verify fetch
    const list = getAllTasks()
    expect(list.length).toBe(1)
    expect(list[0].id).toBe(task.id)

    // Delete (sets status to 'deleted' first time)
    deleteTask(task.id)
    const afterSoftDelete = getAllTasks().find(t => t.id === task.id)
    expect(afterSoftDelete?.status).toBe('deleted')

    // Hard delete (when state is already deleted)
    deleteTask(task.id)
    const afterHardDelete = getAllTasks().find(t => t.id === task.id)
    expect(afterHardDelete).toBeUndefined()
  })

  it('restores state or transitions completion statuses securely', () => {
    const task = createTask({
      title: 'Perform compliance checkpoint',
      status: 'todo'
    })

    const completed = completeTask(task.id)
    expect(completed.status).toBe('done')
    expect(completed.completed_at).not.toBeNull()
  })

  it('correctly persists and updates cognitive implementation intention fields (plan_when, plan_where, plan_how)', () => {
    // Create with implementation intention fields
    const task = createTask({
      title: 'Write production-grade code',
      status: 'todo',
      plan_when: 'tomorrow afternoon',
      plan_where: 'desk 2 in the quiet zone',
      plan_how: 'by reading the system spec first'
    })

    expect(task.id).toBeDefined()
    expect(task.plan_when).toBe('tomorrow afternoon')
    expect(task.plan_where).toBe('desk 2 in the quiet zone')
    expect(task.plan_how).toBe('by reading the system spec first')

    // Update implementation intention fields
    const updated = updateTask({
      id: task.id,
      plan_when: 'Friday morning',
      plan_where: null, // clear field
      plan_how: 'by opening vscode and starting unit test'
    })

    expect(updated.plan_when).toBe('Friday morning')
    expect(updated.plan_where).toBeNull()
    expect(updated.plan_how).toBe('by opening vscode and starting unit test')

    // Verify after fetching
    const fetched = getAllTasks().find(t => t.id === task.id)
    expect(fetched).toBeDefined()
    expect(fetched?.plan_when).toBe('Friday morning')
    expect(fetched?.plan_where).toBeNull()
    expect(fetched?.plan_how).toBe('by opening vscode and starting unit test')
  })

  it('reorders task lists atomically in a transaction block', () => {
    const t1 = createTask({ title: 'Task Alpha', sort_order: 100 })
    const t2 = createTask({ title: 'Task Beta', sort_order: 200 })
    const t3 = createTask({ title: 'Task Gamma', sort_order: 300 })

    // Swap Beta and Alpha
    reorderTasks([t2.id, t1.id, t3.id])

    const list = getAllTasks()
    // Verify sequence matches reorder array structure
    expect(list[0].id).toBe(t2.id)
    expect(list[1].id).toBe(t1.id)
    expect(list[2].id).toBe(t3.id)
  })
})
