import { IElectronAPI as BaseIElectronAPI } from '../renderer/src/types';

export interface Session { 
  id: string;
  taskId: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMins: number;
  distractionCount: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}

export type SessionWithDistractions = Session & { 
  taskTitle: string | null;
};

export interface IElectronAPI extends BaseIElectronAPI {
  startSession: (taskId: string) => Promise<Session>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  stopSession: () => Promise<{ sessionId: string; taskId: string; durationMins: number; distractionCount: number }>;
  getActiveSession: () => Promise<Session | null>;
  getTodaySessions: () => Promise<SessionWithDistractions[]>;
  onSessionDistractionUpdate: (callback: (count: number) => void) => () => void;
}

export interface IWidgetAPI {
  getActiveSession: () => Promise<Session | null>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  stopSession: () => Promise<{ sessionId: string; taskId: string; durationMins: number; distractionCount: number }>;
  onSessionTick: (callback: (elapsed: { seconds: number; distractionCount: number }) => void) => () => void;
  onSessionStopped: (callback: (summary: { durationMins: number; distractionCount: number }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
    widgetAPI: IWidgetAPI;
  }
}
