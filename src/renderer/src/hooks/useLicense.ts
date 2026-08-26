// src/renderer/src/hooks/useLicense.ts
import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { FeatureKey, FEATURES } from '../../../shared/features'

export function useLicense() {
  const { licenseEntitlements, fetchLicenseEntitlements } = useAppStore()

  useEffect(() => {
    fetchLicenseEntitlements()
  }, [])

  /**
   * Evaluates if a specified feature gate is active.
   * Free-tier features are permitted. Pro / Team features check license status.
   */
  const isFeatureEnabled = (feature: FeatureKey): boolean => {
    const def = FEATURES[feature]
    if (!def) return false
    if (def.tier === 'free') return true

    // If entitlements are not loaded yet, default to free tier (wait for query)
    if (!licenseEntitlements) return false

    const { tier, isTrial } = licenseEntitlements

    if (def.tier === 'pro') {
      return tier === 'pro' || tier === 'team_creator' || tier === 'team_member' || isTrial
    }

    if (def.tier === 'team') {
      return tier === 'team_creator' || tier === 'team_member'
    }

    return false
  }

  const activateTrial = async (): Promise<{ success: boolean; expiresAt?: string; error?: string }> => {
    if (!window.electronAPI || !window.electronAPI.activateTrial) {
      return { success: false, error: 'IPC interface unavailable' }
    }
    const res = await window.electronAPI.activateTrial()
    if (res.success) {
      await fetchLicenseEntitlements()
    }
    return res
  }

  const activateKey = async (key: string): Promise<{ success: boolean; tier?: string; error?: string }> => {
    if (!window.electronAPI || !window.electronAPI.activateLicense) {
      return { success: false, error: 'IPC interface unavailable' }
    }
    const res = await window.electronAPI.activateLicense(key)
    if (res.success) {
      await fetchLicenseEntitlements()
    }
    return res
  }

  const deactivateKey = async (): Promise<{ success: boolean }> => {
    if (!window.electronAPI || !window.electronAPI.deactivateLicense) {
      return { success: false }
    }
    const res = await window.electronAPI.deactivateLicense()
    if (res.success) {
      await fetchLicenseEntitlements()
    }
    return res
  }

  return {
    entitlements: licenseEntitlements,
    isFeatureEnabled,
    activateTrial,
    activateKey,
    deactivateKey,
    refreshEntitlements: fetchLicenseEntitlements
  }
}
