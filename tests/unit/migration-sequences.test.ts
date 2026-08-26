// tests/db/migration-sequences.test.ts
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

describe('Append-Only Migration Validation Suite', () => {

  const getNormalizedMigrationSlice = (): string => {
    const filePath = path.join(__dirname, '../../src/main/db/migrations.ts')
    const content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n')

    // Capture from the start of migrations up to the end of migrations 1-21
    const targetIndex = content.indexOf('if (user_version < 21)')
    if (targetIndex === -1) {
      throw new Error('Migration 21 block not found in migrations.ts')
    }

    const checkIndex = content.indexOf('user_version = 21', targetIndex)
    if (checkIndex === -1) {
      throw new Error('user_version = 21 assignment not found in migrations.ts')
    }

    const closingBraceIndex = content.indexOf('}', checkIndex)
    if (closingBraceIndex === -1) {
      throw new Error('Closing brace for migration 21 not found')
    }

    const slice = content.slice(0, closingBraceIndex + 1)
    
    // Normalize code by stripping indentation, empty lines, and standard single-line comments
    return slice
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('//'))
      .join('\n')
  }

  it('verifies immutability of migrations V1 through V21 via secure cryptographic checksum', () => {
    const normalized = getNormalizedMigrationSlice()
    const hash = crypto.createHash('sha256').update(normalized).digest('hex')
    
    // Hardcoded secure checksum of the normalized V1-V21 code blocks
    const EXPECTED_MIGRATIONS_HASH = 'a26c98265ab918d80e7b59ec9025a8ee5958b51d69d5b8b1e703691c811df776'
    expect(hash).toBe(EXPECTED_MIGRATIONS_HASH)
  })

  it('executes V0 to latest migration sequentially and verifies final schema.ts state advancement', () => {
    const db = new Database(':memory:')
    
    // Check initial user_version state in the mocked sandbox environment
    const initialVersion = db.pragma('user_version') as { user_version: number }
    expect(initialVersion.user_version).toBe(0)

    // Execute the full automated sequence
    runMigrations(db)

    // Verify user_version advanced successfully to version 24
    const finalVersion = db.pragma('user_version') as { user_version: number }
    expect(finalVersion.user_version).toBe(24)
  })

  it('validates upgrade transition logic by advancing from intermediary versions incrementally', () => {
    const db = new Database(':memory:')

    // Simulate starting from version 10 (intermediary migration point)
    db.pragma('user_version = 10')
    let currentVersion = db.pragma('user_version') as { user_version: number }
    expect(currentVersion.user_version).toBe(10)

    // Run remaining migrations from 10 to 24
    runMigrations(db)

    currentVersion = db.pragma('user_version') as { user_version: number }
    expect(currentVersion.user_version).toBe(24)
  })
})
