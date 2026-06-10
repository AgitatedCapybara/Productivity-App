import { contextBridge, ipcRenderer } from "electron";
const api = {
  getTasks: () => ipcRenderer.invoke("tasks:getAll"),
  getTasksDueToday: () => ipcRenderer.invoke("tasks:getDueToday"),
  completeTask: (id) => ipcRenderer.invoke("tasks:complete", id),
  createTask: (input) => ipcRenderer.invoke("tasks:create", input),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  closeWindow: () => ipcRenderer.invoke("window:close")
};
const widgetAPI = {
  getActiveSession: () => ipcRenderer.invoke("focus-session:getActive"),
  pauseSession: () => ipcRenderer.invoke("focus-session:pause"),
  resumeSession: () => ipcRenderer.invoke("focus-session:resume"),
  stopSession: () => ipcRenderer.invoke("focus-session:stop"),
  onSessionTick: (callback) => {
    const handler = (_, elapsed) => callback(elapsed);
    ipcRenderer.on("session:tick", handler);
    return () => ipcRenderer.removeListener("session:tick", handler);
  },
  onSessionStopped: (callback) => {
    const handler = (_, summary) => callback(summary);
    ipcRenderer.on("session:stopped", handler);
    return () => ipcRenderer.removeListener("session:stopped", handler);
  }
};
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electronAPI", api);
    contextBridge.exposeInMainWorld("widgetAPI", widgetAPI);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electronAPI = api;
  window.widgetAPI = widgetAPI;
}
