import { contextBridge as s, ipcRenderer as e } from "electron";
const i = {
  getTasks: () => e.invoke("tasks:getAll"),
  getTasksDueToday: () => e.invoke("tasks:getDueToday"),
  completeTask: (o) => e.invoke("tasks:complete", o),
  createTask: (o) => e.invoke("tasks:create", o),
  minimizeWindow: () => e.invoke("window:minimize"),
  closeWindow: () => e.invoke("window:close")
};
if (process.contextIsolated)
  try {
    s.exposeInMainWorld("electronAPI", i);
  } catch (o) {
    console.error(o);
  }
else
  window.electronAPI = i;
