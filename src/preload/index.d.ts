import { IElectronAPI as BaseIElectronAPI } from '../renderer/src/types';

export interface Session { 
  id: string;
  taskId: string | null;
  projectId?: string | null;
  targetDurationMins?: number;
  startedAt: string;
  endedAt: string | null;
  durationMins: number;
  distractionCount: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  customName?: string | null;
  custom_name?: string | null;
}

export type SessionWithDistractions = Session & { 
  taskTitle: string | null;
};

export interface IElectronAPI extends BaseIElectronAPI {
  startSession: (payload: string | { taskId?: string | null; projectId?: string | null; targetDurationMins?: number }) => Promise<Session>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  stopSession: () => Promise<any>;
  getActiveSession: () => Promise<Session | null>;
  getTodaySessions: () => Promise<SessionWithDistractions[]>;
  getSessionDistractions: (sessionId: string) => Promise<any[]>;
  getSessionHistory: () => Promise<any[]>;
  deleteSession: (id: string) => Promise<void>;
  clearSessionHistory: () => Promise<void>;
  renameSession: (sessionId: string, customName: string) => Promise<void>;
  updateSessionTask: (sessionId: string, taskId: string | null) => Promise<void>;
  toggleDND: (enable: boolean) => Promise<{ success: boolean; error?: string }>;
  onSessionDistractionUpdate: (callback: (count: number) => void) => () => void;
  onSessionDebugCheckTick: (callback: (count: number, isSimulated: boolean) => void) => () => void;
  onSessionStateChanged: (callback: () => void) => () => void;
  onSessionEnded: (callback: (summary: any) => void) => () => void;
  onSessionTick: (callback: (elapsed: { seconds: number; distractionCount: number; targetDurationMins?: number }) => void) => () => void;
  onSessionStopped: (callback: (summary: { durationMins: number; distractionCount: number }) => void) => () => void;
  onSessionSystemResumed: (callback: (sessionId: string) => void) => () => void;
  onTrackerDegraded: (callback: (msg: string) => void) => () => void;
  getSetting: (key: string, defaultValue: string) => Promise<string>;
  setSetting: (key: string, value: string) => Promise<boolean>;
  getFirstRunComplete: () => Promise<boolean>;
  setFirstRunComplete: (complete: boolean) => Promise<boolean>;
  getOverlayDiagnostics: () => Promise<any>;
  forceShowWidget: () => Promise<{ success: boolean; message: string }>;
  forceHideWidget: () => Promise<{ success: boolean; message: string }>;
  confirmExit: () => Promise<void>;
  onCloseRequested: (callback: () => void) => () => void;
  searchQuery: (searchText: string) => Promise<any[]>;
  getPerfStats: () => Promise<any>;
  forceRunMaintenance: () => Promise<boolean>;
  createTemplate: (name: string, payloadJson: string) => Promise<any>;
  listTemplates: () => Promise<any[]>;
  deleteTemplate: (id: string) => Promise<boolean>;
  applyTemplate: (id: string) => Promise<boolean>;
  generateSuggestions: () => Promise<any[]>;
  acceptSuggestion: (id: string) => Promise<boolean>;
  declineSuggestion: (id: string) => Promise<boolean>;
  declineAllSuggestions: () => Promise<boolean>;
  snoozeSuggestion: (id: string, until: string) => Promise<boolean>;
  adjustSuggestion: (id: string, newStart: string, newEnd: string) => Promise<boolean>;
  getSchedulingPreferences: () => Promise<Record<string, string>>;
  updateSchedulingPreferences: (prefs: Record<string, string>) => Promise<boolean>;
  saveRitualEntry: (type: 'morning' | 'evening', date: string, payloadJson: string) => Promise<boolean>;
  getRitualEntriesByDate: (date: string) => Promise<any[]>;
  getRitualStreak: () => Promise<{ currentStreak: number; longestStreak: number; completionRate: number }>;
  getCapacityToday: () => Promise<{ available: number; committed: number; ratio: number; status: 'light' | 'balanced' | 'tight' | 'overloaded' }>;
  getWeeklyRitualSummary: () => Promise<{ completionRate: number; avgTasksCommitted: number; avgTasksCompleted: number; capacityAccuracy: number }>;
  getWellnessSignals: () => Promise<any[]>;
  dismissWellnessSignal: (id: string) => Promise<{ success: boolean }>;
  resetDismissedWellnessSignals: () => Promise<{ success: boolean }>;
  exportWellnessData: () => Promise<{ success: boolean; canceled?: boolean; filePath?: string; error?: string }>;
  getWellnessAnalytics: () => Promise<any>;

  // Note APIs
  listAllNotes: () => Promise<any[]>;
  getNoteById: (id: string) => Promise<any | null>;
  getNotesByParent: (parentType: string, parentId: string) => Promise<any[]>;
  createNote: (input: any) => Promise<any>;
  updateNote: (input: any) => Promise<any>;
  deleteNote: (id: string) => Promise<{ success: boolean }>;
  pinNote: (id: string, pinned: boolean) => Promise<{ success: boolean }>;
  archiveNote: (id: string, archived: boolean) => Promise<{ success: boolean }>;
  getNoteBacklinks: (noteId: string) => Promise<any[]>;
  exportAllNotes: () => Promise<{ success: boolean; count?: number; folderPath?: string; error?: string; canceled?: boolean }>;

  // Views & Spatial Board APIs
  listViews: () => Promise<any[]>;
  createView: (preset: any) => Promise<any>;
  updateView: (id: string, updates: any) => Promise<any>;
  deleteView: (id: string) => Promise<boolean>;
  getViewData: (viewId: string) => Promise<any>;
  saveViewPlacement: (placement: any) => Promise<{ success: boolean }>;
  deleteViewPlacement: (noteId: string, viewId: string) => Promise<{ success: boolean }>;

  // Actions APIs
  listActions: () => Promise<any[]>;
  createAction: (action: any) => Promise<any>;
  updateAction: (id: string, updates: any) => Promise<any>;
  deleteAction: (id: string) => Promise<{ success: boolean }>;

  // Backup & Privacy Vault APIs
  getBackupStats: () => Promise<any>;
  runBackupValue: (passphrase?: string, targetPath?: string) => Promise<any>;
  restoreBackupValue: (passphrase?: string, targetPath?: string) => Promise<any>;
  verifyBackupValue: (passphrase: string, targetPath: string) => Promise<any>;
  exportBackupJson: () => Promise<any>;
  wipeDatabaseData: () => Promise<any>;
  getAuditLogs: () => Promise<any>;

  // Licensing APIs
  getLicenseStatus: () => Promise<any>;
  activateLicense: (key: string) => Promise<any>;
  deactivateLicense: () => Promise<any>;
  validateLicenseKey: (key: string) => Promise<any>;
  activateTrial: () => Promise<any>;
  checkFeature: (feature: string) => Promise<boolean>;

  // Error Diagnostics APIs
  getErrorLog: () => Promise<string>;
  clearErrorLog: () => Promise<boolean>;
  generateDiagnostics: () => Promise<string>;

  // Multi-Format Data Exporter
  exportData: (format: 'json' | 'csv') => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
}

export interface IWidgetAPI {
  getActiveSession: () => Promise<Session | null>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  stopSession: () => Promise<{ sessionId: string; taskId: string; durationMins: number; distractionCount: number }>;
  getTasksForToday: () => Promise<any[]>;
  completeTask: (id: string) => Promise<any>;
  updateSessionTask: (sessionId: string, taskId: string | null) => Promise<void>;
  setWidgetHeight: (height: number) => Promise<void>;
  onSessionTick: (callback: (elapsed: { seconds: number; distractionCount: number; targetDurationMins?: number }) => void) => () => void;
  onSessionStopped: (callback: (summary: { durationMins: number; distractionCount: number }) => void) => () => void;
  onSessionStateChanged: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
    widgetAPI: IWidgetAPI;
  }
}
