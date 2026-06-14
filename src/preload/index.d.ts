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
  onSessionDistractionUpdate: (callback: (count: number) => void) => () => void;
  onSessionDebugCheckTick: (callback: (count: number, isSimulated: boolean) => void) => () => void;
  onSessionStateChanged: (callback: () => void) => () => void;
  onSessionEnded: (callback: (summary: any) => void) => () => void;
  getSetting: (key: string, defaultValue: string) => Promise<string>;
  setSetting: (key: string, value: string) => Promise<boolean>;
  getOverlayDiagnostics: () => Promise<any>;
  forceShowWidget: () => Promise<{ success: boolean; message: string }>;
  forceHideWidget: () => Promise<{ success: boolean; message: string }>;
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
