import { contextBridge, ipcRenderer, webFrame } from "electron";
const api = {
  setZoomRatio: (ratio) => webFrame.setZoomFactor(ratio),
  getTasks: () => ipcRenderer.invoke("tasks:getAll"),
  getDeletedTasks: () => ipcRenderer.invoke("tasks:getDeleted"),
  getTasksDueToday: () => ipcRenderer.invoke("tasks:getDueToday"),
  getTasksUpcoming: () => ipcRenderer.invoke("tasks:getUpcoming"),
  getTasksForToday: () => ipcRenderer.invoke("tasks:getForToday"),
  getTodayCompletedTasks: () => ipcRenderer.invoke("tasks:getTodayCompleted"),
  getTasksByProject: (id) => ipcRenderer.invoke("tasks:getByProject", id),
  createTask: (input) => ipcRenderer.invoke("tasks:create", input),
  updateTask: (input) => ipcRenderer.invoke("tasks:update", input),
  deleteTask: (id) => ipcRenderer.invoke("tasks:delete", id),
  reorderTasks: (ids) => ipcRenderer.invoke("tasks:reorder", ids),
  completeTask: (id) => ipcRenderer.invoke("tasks:complete", id),
  getProjects: () => ipcRenderer.invoke("projects:getAll"),
  createProject: (input) => ipcRenderer.invoke("projects:create", input),
  updateProject: (id, updates) => ipcRenderer.invoke("projects:update", id, updates),
  deleteProject: (id) => ipcRenderer.invoke("projects:delete", id),
  getHabits: () => ipcRenderer.invoke("habits:getAll"),
  createHabit: (input) => ipcRenderer.invoke("habits:create", input),
  updateHabit: (input) => ipcRenderer.invoke("habits:update", input),
  deleteHabit: (id) => ipcRenderer.invoke("habits:delete", id),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  maximizeWindow: () => ipcRenderer.invoke("window:maximize"),
  toggleFullscreen: () => ipcRenderer.invoke("window:toggleFullscreen"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  onGlobalShortcutTriggered: (cb) => {
    const handler = () => cb();
    ipcRenderer.on("global-shortcut:quick-add", handler);
    return () => ipcRenderer.removeListener("global-shortcut:quick-add", handler);
  },
  onFocusSessionStarted: (cb) => {
    const handler = (_, sessionId) => cb(sessionId);
    ipcRenderer.on("focus-session:started", handler);
    return () => ipcRenderer.removeListener("focus-session:started", handler);
  },
  startSession: (payload) => {
    if (typeof payload === "string") {
      return ipcRenderer.invoke("focus-session:start", { taskId: payload });
    }
    return ipcRenderer.invoke("focus-session:start", payload);
  },
  pauseSession: () => ipcRenderer.invoke("focus-session:pause"),
  resumeSession: () => ipcRenderer.invoke("focus-session:resume"),
  stopSession: () => ipcRenderer.invoke("focus-session:stop"),
  getActiveSession: () => ipcRenderer.invoke("focus-session:getActive"),
  getTodaySessions: () => ipcRenderer.invoke("focus-session:getToday"),
  getSessionDistractions: (sessionId) => ipcRenderer.invoke("focus-session:getDistractions", sessionId),
  getSessionHistory: () => ipcRenderer.invoke("focus-session:getHistory"),
  deleteSession: (id) => ipcRenderer.invoke("focus-session:delete", id),
  clearSessionHistory: () => ipcRenderer.invoke("focus-session:clearHistory"),
  onSessionDistractionUpdate: (callback) => {
    const handler = (_, count) => callback(count);
    ipcRenderer.on("session:distraction-update", handler);
    return () => ipcRenderer.removeListener("session:distraction-update", handler);
  },
  onSessionDebugCheckTick: (callback) => {
    const handler = (_, data) => {
      if (typeof data === "object" && data !== null) {
        callback(data.count, !!data.isSimulated);
      } else {
        callback(Number(data) || 0, true);
      }
    };
    ipcRenderer.on("session:debug-check-tick", handler);
    return () => ipcRenderer.removeListener("session:debug-check-tick", handler);
  },
  onSessionStateChanged: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("session:state-changed", handler);
    return () => ipcRenderer.removeListener("session:state-changed", handler);
  },
  getSetting: (key, defaultValue) => ipcRenderer.invoke("settings:get", key, defaultValue),
  setSetting: (key, value) => ipcRenderer.invoke("settings:set", key, value)
};
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electronAPI", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electronAPI = api;
}
