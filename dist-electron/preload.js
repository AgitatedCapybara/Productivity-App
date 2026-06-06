import { contextBridge as n, ipcRenderer as o } from "electron";
const s = {
  getTasks: () => o.invoke("tasks:getAll"),
  getTasksDueToday: () => o.invoke("tasks:getDueToday"),
  getTasksUpcoming: () => o.invoke("tasks:getUpcoming"),
  getTasksByProject: (e) => o.invoke("tasks:getByProject", e),
  createTask: (e) => o.invoke("tasks:create", e),
  updateTask: (e) => o.invoke("tasks:update", e),
  deleteTask: (e) => o.invoke("tasks:delete", e),
  reorderTasks: (e) => o.invoke("tasks:reorder", e),
  completeTask: (e) => o.invoke("tasks:complete", e),
  getProjects: () => o.invoke("projects:getAll"),
  createProject: (e) => o.invoke("projects:create", e),
  updateProject: (e, t) => o.invoke("projects:update", e, t),
  deleteProject: (e) => o.invoke("projects:delete", e),
  minimizeWindow: () => o.invoke("window:minimize"),
  closeWindow: () => o.invoke("window:close"),
  onGlobalShortcutTriggered: (e) => {
    const t = () => e();
    return o.on("global-shortcut:quick-add", t), () => o.removeListener("global-shortcut:quick-add", t);
  },
  onFocusSessionStarted: (e) => {
    const t = (a, r) => e(r);
    return o.on("focus-session:started", t), () => o.removeListener("focus-session:started", t);
  }
};
if (process.contextIsolated)
  try {
    n.exposeInMainWorld("electronAPI", s);
  } catch (e) {
    console.error(e);
  }
else
  window.electronAPI = s;
