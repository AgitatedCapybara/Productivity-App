// tests/db/search.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getDb, closeDb } from '../../src/main/db/database'
import { createTask } from '../../src/main/db/tasks'
import { querySearch } from '../../src/main/db/search'

describe('FTS5 Full-Text Search Relevance & Indexing Triggers', () => {
  beforeEach(() => {
    const db = getDb()
    db.prepare("DELETE FROM tasks").run()
    db.prepare("DELETE FROM projects").run()
    db.prepare("DELETE FROM calendar_events").run()
    db.prepare("DELETE FROM search_index").run()
  })

  afterEach(() => {
    closeDb()
  })

  it('automatically indexes newly created records using SQLite triggers and responds to keyword searches', () => {
    createTask({
      title: 'Setup Kubernetes cluster configuration',
      notes: 'Ensure that Docker and Helm charts are properly aligned with microservices telemetry.',
      status: 'todo'
    })

    createTask({
      title: 'Fix minor CSS paddings',
      notes: 'Review margin tolerances of side navigation bars.',
      status: 'todo'
    })

    // Search query: "Kubernetes"
    const results = querySearch('Kubernetes')
    expect(results.length).toBe(1)
    expect(results[0].title).toBe('Setup Kubernetes cluster configuration')
    expect(results[0].type).toBe('task')

    // Search query with prefix/partial term matching: "teleme" (should expand to telemetry)
    const partialResults = querySearch('teleme')
    expect(partialResults.length).toBe(1)
    expect(partialResults[0].title).toBe('Setup Kubernetes cluster configuration')
  })

  it('returns empty list for no matching keywords or empty inputs', () => {
    const results = querySearch('nonexistent-keyword-phrase-pattern')
    expect(results).toEqual([])

    const emptyResults = querySearch('   ')
    expect(emptyResults).toEqual([])
  })
})
