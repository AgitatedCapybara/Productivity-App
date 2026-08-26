// tests/unit/license.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getDb, closeDb } from '../../src/main/db/database'
import { 
  getLicenseStatus, 
  activateLicenseKey, 
  activateTrialPeriod, 
  isFeatureEnabled 
} from '../../src/main/services/license'

describe('License and Entitlement Logic', () => {
  beforeEach(() => {
    const db = getDb()
    db.prepare("DELETE FROM license").run()
    db.prepare("DELETE FROM settings").run()
  })

  afterEach(() => {
    closeDb()
  })

  it('defaults to free tier and limits features appropriately', () => {
    const status = getLicenseStatus()
    expect(status.tier).toBe('free')
    expect(status.isValid).toBe(false)
    
    // Check features: Free features are enabled, high-tier features require licence
    expect(isFeatureEnabled('task_management')).toBe(true) // any free feature
  })

  it('activates 14-day trial period successfully', () => {
    const res = activateTrialPeriod()
    expect(res.success).toBe(true)
    expect(res.expiresAt).toBeDefined()

    const status = getLicenseStatus()
    expect(status.isTrial).toBe(true)
    expect(status.isValid).toBe(true)
    expect(status.daysRemaining).toBe(14)
  })

  it('rejects activating a trial twice', () => {
    const first = activateTrialPeriod()
    expect(first.success).toBe(true)
    
    const second = activateTrialPeriod()
    expect(second.success).toBe(false)
    expect(second.error).toContain('already been activated')
  })

  it('unwraps and validates developer bypass key properly', () => {
    const activation = activateLicenseKey('KEYSTONE-DEV-FREE-PRO-PASS')
    expect(activation.success).toBe(true)
    expect(activation.tier).toBe('pro')

    const status = getLicenseStatus()
    expect(status.tier).toBe('pro')
    expect(status.isValid).toBe(true)
    expect(status.daysRemaining).toBeGreaterThan(1000)
  })
})
