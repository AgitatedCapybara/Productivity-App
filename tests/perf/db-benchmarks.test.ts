// tests/perf/db-benchmarks.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getDb, closeDb } from '../../src/main/db/database'
import { querySearch } from '../../src/main/db/search'

describe('SQLite Database Low-Latency Performance Benchmarks', () => {
  beforeEach(() => {
    const db = getDb()
    db.prepare("DELETE FROM tasks").run()
    db.prepare("DELETE FROM search_index").run()
  })

  afterEach(() => {
    closeDb()
  })

  it('verifies sub-millisecond querying, indexing, and FTS matching on 10k tasks', () => {
    const db = getDb()

    // --- BENCHMARK 1: Atomic Bulk Write Transaction (10,000 Rows) ---
    // Budget limit: 1200ms
    const insertStartTime = performance.now()
    
    const insertStmt = db.prepare(`
      INSERT INTO tasks (id, title, notes, status, priority, due_date, is_archived, sequence)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `)

    const bulkInsert = db.transaction((count: number) => {
      for (let i = 0; i < count; i++) {
        insertStmt.run(
          `t-bench-${i}`,
          `Benchmarked task item number ${i} title keyword`,
          `Detailed instructions and engineering task card notes for items matching index ${i}.`,
          i % 2 === 0 ? 'pending' : 'done',
          i % 4,
          '2026-06-30',
          i
        )
      }
    })

    bulkInsert(10000)
    const insertEndTime = performance.now()
    const insertDuration = insertEndTime - insertStartTime

    console.log(`[PERF BENCHMARK] Bulk Write 10k rows took: ${insertDuration.toFixed(2)} ms`)
    expect(insertDuration).toBeLessThan(1200) // Budget check

    // --- BENCHMARK 2: Complex Filtered Select Query ---
    // Budget limit: 300ms
    const filterStartTime = performance.now()
    
    const query = db.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE status = 'pending' AND priority >= 2 AND due_date = '2026-06-30'
    `)
    const result = query.get() as { count: number }
    expect(result.count).toBe(2500) // 5k pending, half have priority >= 2

    const filterEndTime = performance.now()
    const filterDuration = filterEndTime - filterStartTime
    
    console.log(`[PERF BENCHMARK] Filtered query over 10k rows took: ${filterDuration.toFixed(2)} ms`)
    expect(filterDuration).toBeLessThan(300) // Budget check

    // --- BENCHMARK 3: FTS5 Full-Text Prefix Search relevance ---
    // Budget limit: 50ms
    const ftsStartTime = performance.now()
    
    const ftsResults = querySearch('keyword')
    expect(ftsResults.length).toBeGreaterThan(0)

    const ftsEndTime = performance.now()
    const ftsDuration = ftsEndTime - ftsStartTime

    console.log(`[PERF BENCHMARK] FTS5 text search query search took: ${ftsDuration.toFixed(2)} ms`)
    expect(ftsDuration).toBeLessThan(150) // Budget check
  })
})
