// src/main/ipc/license.ipc.ts
import { ipcMain } from 'electron'
import {
  getLicenseStatus,
  activateLicenseKey,
  deactivateLicenseKey,
  verifyActivationKeyOffline,
  activateTrialPeriod,
  isFeatureEnabled
} from '../services/license'
import { FeatureKey } from '../../shared/features'

export function registerLicenseHandlers(): void {
  // Returns state maps of features, trial states, and validity.
  ipcMain.handle('license:getEntitlements', async () => {
    const status = getLicenseStatus()
    return status
  })

  // Handles activation of license keys
  ipcMain.handle('license:activate', async (_event, key: string) => {
    return activateLicenseKey(key)
  })

  // Clears active license row
  ipcMain.handle('license:deactivate', async () => {
    return deactivateLicenseKey()
  })

  // Validates a specific key without registering it
  ipcMain.handle('license:validate', async (_event, key: string) => {
    return verifyActivationKeyOffline(key)
  })

  // Starts trial period limit
  ipcMain.handle('license:activateTrial', async () => {
    return activateTrialPeriod()
  })

  // Quick check endpoint for a specific feature
  ipcMain.handle('license:checkFeature', async (_event, feature: FeatureKey) => {
    return isFeatureEnabled(feature)
  })
}
