// src/main/services/privacy.ts
export const WELLNESS_DATA_NEVER_LEAVES_DEVICE = true
export const DISTRACTION_DATA_TREATED_AS_SENSITIVE = true

export interface PrivacyInfo {
  wellnessDataNeverLeavesDevice: boolean
  distractionDataTreatedAsSensitive: boolean
  localDbPath: string
  sharingExplanation: string
}

export function getPrivacyStatus(): PrivacyInfo {
  return {
    wellnessDataNeverLeavesDevice: WELLNESS_DATA_NEVER_LEAVES_DEVICE,
    distractionDataTreatedAsSensitive: DISTRACTION_DATA_TREATED_AS_SENSITIVE,
    localDbPath: process.env.NODE_ENV === 'development' ? 'dev.sqlite' : 'app.db (sandboxedUserDataDirectory)',
    sharingExplanation: 'Keystone is built with offline-first architectural principles. All keyboard, window distraction records, habits compliance trackers, and energy ratings are completely contained on your local SQLite file. No external analytics, remote API endpoints, or user behavioral mapping SDKs are instantiated in this application.'
  }
}
