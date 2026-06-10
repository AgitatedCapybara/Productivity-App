import { BrowserWindow, app, ipcMain, nativeImage, Tray, Menu, globalShortcut } from "electron";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { nanoid } from "nanoid";
import { spawn } from "child_process";
import { writeFileSync } from "fs";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const _dirname$2 = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
let trayRef = null;
function setTrayRef(t) {
  trayRef = t;
}
function createMainWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 720,
    minHeight: 500,
    frame: true,
    // Keep standard Windows snap and edges, hidden titlebar still hides the frame visually on Win
    transparent: false,
    backgroundColor: "#00000000",
    backgroundMaterial: "mica",
    show: false,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#00000000",
      symbolColor: "#A0A0A5",
      height: 32
    },
    webPreferences: {
      preload: join(_dirname$2, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.once("ready-to-show", () => {
    win.show();
  });
  win.on("close", (e) => {
    if (trayRef) {
      e.preventDefault();
      win.hide();
    }
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(join(_dirname$2, "../renderer/index.html"));
  }
  return win;
}
function runMigrations(db) {
  const userVersionStmt = db.prepare("PRAGMA user_version");
  let { user_version } = userVersionStmt.get();
  if (user_version < 1) {
    db.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#6366f1',
        icon TEXT DEFAULT 'folder',
        sort_order REAL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        notes TEXT DEFAULT '',
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        priority INTEGER DEFAULT 0,
        status TEXT DEFAULT 'todo',
        due_date TEXT,
        due_time TEXT,
        recurrence TEXT,
        sort_order REAL DEFAULT 0,
        time_estimate_mins INTEGER DEFAULT 0,
        time_logged_mins INTEGER DEFAULT 0,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_mins INTEGER DEFAULT 0,
        distraction_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active'
      );

      CREATE TABLE distractions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        app_name TEXT NOT NULL,
        window_title TEXT DEFAULT '',
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_ms INTEGER DEFAULT 0
      );
    `);
    db.exec("PRAGMA user_version = 1");
    user_version = 1;
  }
  if (user_version < 2) {
    const insertDefaultProject = db.prepare(`
      INSERT INTO projects (id, name, color, icon, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertDefaultProject.run("inbox-default", "Inbox", "#6366f1", "inbox", 0);
    db.exec("PRAGMA user_version = 2");
    user_version = 2;
  }
  if (user_version < 3) {
    db.exec(`
      CREATE TABLE habits (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        frequency TEXT NOT NULL DEFAULT 'daily',
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    db.exec("PRAGMA user_version = 3");
    user_version = 3;
  }
  if (user_version < 4) {
    const checkStmt = db.prepare("SELECT id FROM projects WHERE id = ?");
    const insertProject = db.prepare(`
      INSERT INTO projects (id, name, color, icon, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    if (!checkStmt.get("default-work")) {
      insertProject.run("default-work", "Work", "#3b82f6", "briefcase", 1);
    }
    if (!checkStmt.get("default-personal")) {
      insertProject.run("default-personal", "Personal", "#10b981", "user", 2);
    }
    db.exec("PRAGMA user_version = 4");
    user_version = 4;
  }
  if (user_version < 5) {
    db.exec(`
      ALTER TABLE sessions ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
      ALTER TABLE sessions ADD COLUMN target_duration_mins INTEGER DEFAULT 25;
    `);
    db.exec("PRAGMA user_version = 5");
    user_version = 5;
  }
  if (user_version < 6) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    db.exec("PRAGMA user_version = 6");
    user_version = 6;
  }
}
let dbInstance = null;
function getDb() {
  if (dbInstance) {
    return dbInstance;
  }
  const dbPath = process.env.NODE_ENV === "development" ? "dev.sqlite" : join(app.getPath("userData"), "app.db");
  dbInstance = new Database(dbPath);
  dbInstance.pragma("journal_mode = WAL");
  dbInstance.pragma("busy_timeout = 5000");
  dbInstance.pragma("foreign_keys = ON");
  runMigrations(dbInstance);
  return dbInstance;
}
process.on("exit", () => {
  if (dbInstance) {
    dbInstance.close();
  }
});
const _dirname$1 = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
let tickInterval = null;
let lastTrackedSession = null;
function createWidgetWindow() {
  const win = new BrowserWindow({
    width: 380,
    height: 320,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: join(_dirname$1, "../preload/widget.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL + "/widget.html");
  } else {
    win.loadFile(join(_dirname$1, "../renderer/widget.html"));
  }
  if (!tickInterval) {
    tickInterval = setInterval(() => {
      if (win.isDestroyed()) {
        if (tickInterval) clearInterval(tickInterval);
        tickInterval = null;
        return;
      }
      try {
        const db = getDb();
        const session = db.prepare(`SELECT * FROM sessions ORDER BY started_at DESC LIMIT 1`).get();
        if (!session) return;
        if (session.status === "active" || session.status === "paused") {
          const elapsedMs = Date.now() - new Date(session.started_at).getTime();
          const seconds = Math.floor(elapsedMs / 1e3);
          if (session.status === "active") {
            win.webContents.send("session:tick", {
              seconds,
              distractionCount: session.distraction_count,
              targetDurationMins: session.target_duration_mins || 25
            });
          }
          lastTrackedSession = session;
        } else if (session.status === "completed" && lastTrackedSession?.id === session.id) {
          win.webContents.send("session:stopped", { durationMins: session.duration_mins, distractionCount: session.distraction_count });
          lastTrackedSession = null;
        }
      } catch (err) {
      }
    }, 1e3);
  }
  return win;
}
function getAllTasks() {
  const stmt = getDb().prepare("SELECT * FROM tasks ORDER BY sort_order");
  return stmt.all();
}
function getTasksByProject(projectId) {
  if (projectId === "inbox-default") {
    const stmt2 = getDb().prepare("SELECT * FROM tasks WHERE (project_id = 'inbox-default' OR project_id IS NULL) AND status != 'deleted' ORDER BY sort_order");
    return stmt2.all();
  }
  const stmt = getDb().prepare("SELECT * FROM tasks WHERE project_id = ? AND status != 'deleted' ORDER BY sort_order");
  return stmt.all(projectId);
}
function getTasksDueToday() {
  const stmt = getDb().prepare(`
    SELECT * FROM tasks 
    WHERE due_date <= date('now', 'localtime') AND status NOT IN ('done', 'deleted')
    ORDER BY sort_order
  `);
  return stmt.all();
}
function getTasksUpcoming() {
  const stmt = getDb().prepare(`
    SELECT * FROM tasks 
    WHERE due_date > date('now', 'localtime') AND due_date <= date('now', 'localtime', '+7 days') AND status NOT IN ('done', 'deleted')
    ORDER BY due_date, sort_order
  `);
  return stmt.all();
}
function getTasksForToday() {
  const stmt = getDb().prepare(`
    SELECT * FROM tasks 
    WHERE (
      (due_date <= date('now', 'localtime')) 
      OR 
      (due_date IS NULL AND (project_id IS NULL OR project_id = 'inbox-default'))
    ) AND status NOT IN ('done', 'deleted')
    ORDER BY sort_order
  `);
  return stmt.all();
}
function getTodayCompletedTasks() {
  const stmt = getDb().prepare(`
    SELECT * FROM tasks 
    WHERE status = 'done' AND date(completed_at, 'localtime') = date('now', 'localtime')
    ORDER BY completed_at DESC
  `);
  return stmt.all();
}
function getDeletedTasks() {
  const stmt = getDb().prepare(`
    SELECT * FROM tasks 
    WHERE status = 'deleted'
    ORDER BY updated_at DESC
  `);
  return stmt.all();
}
function createTask(input) {
  const db = getDb();
  const id = nanoid(8);
  const maxSortStmt = input.project_id ? db.prepare("SELECT MAX(sort_order) as max_sort FROM tasks WHERE project_id = ?") : db.prepare("SELECT MAX(sort_order) as max_sort FROM tasks WHERE project_id IS NULL");
  const result = input.project_id ? maxSortStmt.get(input.project_id) : maxSortStmt.get();
  const currentMax = result?.max_sort || 0;
  const sort_order = input.sort_order ?? currentMax + 1e3;
  const stmt = db.prepare(`
    INSERT INTO tasks (
      id, title, notes, project_id, priority, status, due_date, due_time, 
      recurrence, sort_order, time_estimate_mins, time_logged_mins, completed_at
    ) VALUES (
      @id, @title, @notes, @project_id, @priority, @status, @due_date, @due_time,
      @recurrence, @sort_order, @time_estimate_mins, @time_logged_mins, @completed_at
    )
  `);
  stmt.run({
    id,
    title: input.title,
    notes: input.notes ?? "",
    project_id: input.project_id ?? null,
    priority: input.priority ?? 0,
    status: input.status ?? "todo",
    due_date: input.due_date ?? null,
    due_time: input.due_time ?? null,
    recurrence: input.recurrence ?? null,
    sort_order,
    time_estimate_mins: input.time_estimate_mins ?? 0,
    time_logged_mins: input.time_logged_mins ?? 0,
    completed_at: input.completed_at ?? null
  });
  const getStmt = db.prepare("SELECT * FROM tasks WHERE id = ?");
  return getStmt.get(id);
}
function updateTask(input) {
  const db = getDb();
  const { id, ...updates } = input;
  const keys = Object.keys(updates);
  if (keys.length === 0) {
    const getStmt2 = db.prepare("SELECT * FROM tasks WHERE id = ?");
    return getStmt2.get(id);
  }
  const setClauses = keys.map((k) => `${k} = @${k}`).join(", ");
  const stmt = db.prepare(`
    UPDATE tasks 
    SET ${setClauses}, updated_at = datetime('now')
    WHERE id = @id
  `);
  stmt.run({ ...updates, id });
  const getStmt = db.prepare("SELECT * FROM tasks WHERE id = ?");
  return getStmt.get(id);
}
function deleteTask(id) {
  const db = getDb();
  const currentTask = db.prepare("SELECT status FROM tasks WHERE id = ?").get(id);
  if (currentTask && currentTask.status === "deleted") {
    const stmt = db.prepare("DELETE FROM tasks WHERE id = ?");
    stmt.run(id);
  } else {
    const stmt = db.prepare(`
      UPDATE tasks 
      SET status = 'deleted', updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(id);
  }
}
function reorderTasks(orderedIds) {
  const db = getDb();
  const reorder = db.transaction((ids) => {
    const stmt = db.prepare("UPDATE tasks SET sort_order = ? WHERE id = ?");
    ids.forEach((tempId, i) => stmt.run((i + 1) * 1e3, tempId));
  });
  reorder(orderedIds);
}
function completeTask(id) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE tasks 
    SET status = 'done', completed_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(id);
  const getStmt = db.prepare("SELECT * FROM tasks WHERE id = ?");
  return getStmt.get(id);
}
function createSession(input) {
  const db = getDb();
  const id = nanoid(8);
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const taskId = input.taskId || null;
  const projectId = input.projectId || null;
  const targetDurationMins = input.targetDurationMins || 25;
  const stmt = db.prepare(`
    INSERT INTO sessions (id, task_id, project_id, target_duration_mins, started_at, status)
    VALUES (@id, @task_id, @project_id, @target_duration_mins, @started_at, 'active')
  `);
  stmt.run({
    id,
    task_id: taskId,
    project_id: projectId,
    target_duration_mins: targetDurationMins,
    started_at: startedAt
  });
  const getStmt = db.prepare("SELECT * FROM sessions WHERE id = ?");
  return getStmt.get(id);
}
function endSession(sessionId) {
  const db = getDb();
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId);
  if (!session) return;
  const endedAt = (/* @__PURE__ */ new Date()).toISOString();
  const startDate = new Date(session.started_at);
  const endDate = new Date(endedAt);
  const durationMins = Math.floor((endDate.getTime() - startDate.getTime()) / 6e4);
  const stmt = db.prepare(`
    UPDATE sessions 
    SET ended_at = @ended_at, duration_mins = @duration_mins, status = 'completed'
    WHERE id = @id
  `);
  stmt.run({
    id: sessionId,
    ended_at: endedAt,
    duration_mins: durationMins
  });
}
function pauseSession(sessionId) {
  const db = getDb();
  const stmt = db.prepare(`UPDATE sessions SET status = 'paused' WHERE id = ?`);
  stmt.run(sessionId);
}
function resumeSession(sessionId) {
  const db = getDb();
  const stmt = db.prepare(`UPDATE sessions SET status = 'active' WHERE id = ?`);
  stmt.run(sessionId);
}
function getActiveSession() {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM sessions WHERE status IN ('active', 'paused') ORDER BY started_at DESC LIMIT 1`);
  return stmt.get() || null;
}
function getTodaySessions() {
  const db = getDb();
  const sessionsStmt = db.prepare(`
    SELECT * FROM sessions 
    WHERE date(started_at, 'localtime') = date('now', 'localtime') AND status = 'completed'
    ORDER BY started_at DESC
  `);
  const sessions = sessionsStmt.all();
  const distStmt = db.prepare(`SELECT * FROM distractions WHERE session_id = ? ORDER BY started_at ASC`);
  return sessions.map((session) => {
    return {
      ...session,
      distractions: distStmt.all(session.id)
    };
  });
}
function getSessionDistractions(sessionId) {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM distractions WHERE session_id = ? ORDER BY started_at DESC`);
  return stmt.all(sessionId);
}
function logDistraction(sessionId, appName, windowTitle, startedAt) {
  const db = getDb();
  const id = nanoid(8);
  const stmt = db.prepare(`
    INSERT INTO distractions (id, session_id, app_name, window_title, started_at)
    VALUES (@id, @session_id, @app_name, @window_title, @started_at)
  `);
  stmt.run({
    id,
    session_id: sessionId,
    app_name: appName,
    window_title: windowTitle,
    started_at: startedAt
  });
  const updateCountStmt = db.prepare(`UPDATE sessions SET distraction_count = distraction_count + 1 WHERE id = ?`);
  updateCountStmt.run(sessionId);
  return id;
}
function endDistraction(distractionId, endedAt, durationMs) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE distractions 
    SET ended_at = @ended_at, duration_ms = @duration_ms
    WHERE id = @id
  `);
  stmt.run({
    id: distractionId,
    ended_at: endedAt,
    duration_ms: durationMs
  });
}
function writeTimeToTask(taskId, additionalMins) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE tasks 
    SET time_logged_mins = time_logged_mins + @additional_mins,
        updated_at = datetime('now')
    WHERE id = @id
  `);
  stmt.run({ id: taskId, additional_mins: additionalMins });
}
function deleteSession(id) {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
}
function clearSessionHistory() {
  const db = getDb();
  db.prepare("DELETE FROM sessions").run();
}
function getSetting(key, defaultValue) {
  try {
    const db = getDb();
    const stmt = db.prepare("SELECT value FROM settings WHERE key = ?");
    const row = stmt.get(key);
    return row ? row.value : defaultValue;
  } catch (err) {
    console.error(`Error getting setting for ${key}:`, err);
    return defaultValue;
  }
}
function setSetting(key, value) {
  try {
    const db = getDb();
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    stmt.run(key, value);
  } catch (err) {
    console.error(`Error setting ${key}:`, err);
  }
}
let activeProcess = null;
let currentSessionId = null;
let activeDistraction = null;
let switchChecksCount = 0;
let isTrackingSimulated = false;
let simulationInterval = null;
let simulatedTick = 0;
const simulatedApps = [
  { owner: { name: "VS Code" }, title: "database.ts — productivity-app" },
  { owner: { name: "Echoes" }, title: "Focus Workspace" },
  { owner: { name: "Brave" }, title: "GitHub - Pull Requests" },
  { owner: { name: "Spotify" }, title: "Chill lofi beats" },
  { owner: { name: "VS Code" }, title: "App.tsx — productivity-app" },
  { owner: { name: "Slack" }, title: "General workspace chat" }
];
const isEchoesApp = (ownerName) => {
  const lower = ownerName.toLowerCase();
  return lower.includes("echoes") || lower.includes("electron") || lower.includes("react-example");
};
function broadcastToWindows(channel, ...args) {
  try {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, ...args);
      }
    }
  } catch (err) {
    console.error(`Error broadcasting to ${channel}:`, err);
  }
}
function handleActiveWindowUpdate(windowInfo) {
  if (!currentSessionId) return;
  if (!windowInfo || !windowInfo.owner || !windowInfo.owner.name) return;
  const { owner, title } = windowInfo;
  broadcastToWindows("session:debug-check-tick", {
    count: switchChecksCount,
    isSimulated: isTrackingSimulated
  });
  if (isEchoesApp(owner.name)) {
    if (activeDistraction) {
      const endedAt = /* @__PURE__ */ new Date();
      const durationMs = endedAt.getTime() - activeDistraction.startedAt;
      endDistraction(activeDistraction.id, endedAt.toISOString(), durationMs);
      activeDistraction = null;
    }
    return;
  }
  const defaultDistractions = '["chrome", "spotify", "discord", "slack", "steam", "netflix", "youtube", "twitter", "facebook", "instagram", "reddit"]';
  const distractionAppsJson = getSetting("distraction-apps", defaultDistractions);
  let distractionApps = [];
  try {
    distractionApps = JSON.parse(distractionAppsJson);
  } catch (e) {
    distractionApps = ["chrome", "spotify", "discord", "slack", "steam", "netflix", "youtube", "twitter", "facebook", "instagram", "reddit"];
  }
  const appNameLower = owner.name ? owner.name.toLowerCase() : "";
  const titleLower = title ? title.toLowerCase() : "";
  const isDistraction = distractionApps.some((app2) => {
    const keyword = app2.toLowerCase().trim();
    if (!keyword) return false;
    return appNameLower.includes(keyword) || titleLower.includes(keyword);
  });
  if (!isDistraction) {
    if (activeDistraction) {
      const endedAt = /* @__PURE__ */ new Date();
      const durationMs = endedAt.getTime() - activeDistraction.startedAt;
      endDistraction(activeDistraction.id, endedAt.toISOString(), durationMs);
      activeDistraction = null;
    }
    return;
  }
  const appKey = `${owner.name}::${title}`;
  if (activeDistraction && activeDistraction.appKey === appKey) {
    return;
  }
  const now = /* @__PURE__ */ new Date();
  if (activeDistraction) {
    const durationMs = now.getTime() - activeDistraction.startedAt;
    endDistraction(activeDistraction.id, now.toISOString(), durationMs);
  }
  const id = logDistraction(currentSessionId, owner.name || "Unknown app", title || "Unknown window", now.toISOString());
  activeDistraction = {
    id,
    startedAt: now.getTime(),
    appKey
  };
  const db = getDb();
  const sessionRow = db.prepare("SELECT distraction_count FROM sessions WHERE id = ?").get(currentSessionId);
  if (sessionRow) {
    broadcastToWindows("session:distraction-update", sessionRow.distraction_count);
  }
}
function startMonitoring(sessionId) {
  if (activeProcess || simulationInterval) {
    stopMonitoring();
  }
  currentSessionId = sessionId;
  activeDistraction = null;
  switchChecksCount = 0;
  const simulateActivity = getSetting("simulate-activity", "false") === "true";
  if (simulateActivity) {
    startSimulation();
  } else {
    startNativeMonitoring();
  }
}
function startSimulation() {
  isTrackingSimulated = true;
  console.log("[MONITOR] Starting Focus Session, running inside Web Simulation sandbox.");
  simulationInterval = setInterval(() => {
    try {
      switchChecksCount++;
      simulatedTick++;
      const appIndex = Math.floor(simulatedTick / 10 % simulatedApps.length);
      const windowInfo = simulatedApps[appIndex];
      handleActiveWindowUpdate(windowInfo);
    } catch (err) {
      console.error("Simulation check error:", err);
    }
  }, 1e3);
}
function startNativeMonitoring() {
  isTrackingSimulated = false;
  console.log("[MONITOR] Starting Native Focus Session tracking.");
  try {
    const tempDir = app.getPath("temp");
    let scriptPath = "";
    let cmd = "";
    let args = [];
    if (process.platform === "win32") {
      scriptPath = join(tempDir, "echoes_win_tracker.ps1");
      const psScript = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
'@

while ($true) {
    try {
        [IntPtr]$hwnd = [Win32]::GetForegroundWindow()
        if ($hwnd -ne [IntPtr]::Zero) {
            $title = New-Object -TypeName System.Text.StringBuilder -ArgumentList 256
            [Win32]::GetWindowText($hwnd, $title, 256) | Out-Null
            
            $processId = 0
            [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
            
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process) {
                @{title=$title.ToString(); owner=@{name=$process.ProcessName}} | ConvertTo-Json -Compress
            }
        }
    } catch {
        # Loop safe keep alive
    }
    Start-Sleep -Milliseconds 1000
}
`;
      writeFileSync(scriptPath, psScript, "utf-8");
      cmd = "powershell.exe";
      args = [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath
      ];
    } else if (process.platform === "darwin") {
      scriptPath = join(tempDir, "echoes_mac_tracker.sh");
      const macScript = `#!/bin/bash
while true; do
  osascript -e 'tell application "System Events"
    set activeApp to name of first application process whose fontmost is true
    try
        tell process activeApp
            set activeTitle to name of first window
        end tell
    on error
        set activeTitle to ""
    end try
    return "{\\"title\\":\\"" & activeTitle & "\\", \\"owner\\":{\\"name\\":\\"" & activeApp & "\\"}}"
  end tell' 2>/dev/null || echo ""
  sleep 1
done
`;
      writeFileSync(scriptPath, macScript, { encoding: "utf-8", mode: 493 });
      cmd = "bash";
      args = [scriptPath];
    } else {
      scriptPath = join(tempDir, "echoes_linux_tracker.sh");
      const linuxScript = `#!/bin/bash
while true; do
  focus_id=$(xdotool getwindowfocus 2>/dev/null)
  if [ ! -z "$focus_id" ]; then
    title=$(xdotool getwindowname "$focus_id" 2>/dev/null | sed 's/"/\\\\"/g' | sed 's/\\\\/\\\\\\\\/g')
    pid=$(xdotool getwindowpid "$focus_id" 2>/dev/null)
    if [ ! -z "$pid" ]; then
      name=$(ps -p "$pid" -o comm= 2>/dev/null)
      echo "{\\"title\\":\\"$title\\", \\"owner\\":{\\"name\\":\\"$name\\"}}"
    fi
  fi
  sleep 1
done
`;
      writeFileSync(scriptPath, linuxScript, { encoding: "utf-8", mode: 493 });
      cmd = "bash";
      args = [scriptPath];
    }
    console.log(`[MONITOR] Spawning persistent foreground monitor process "${cmd}" with script:`, scriptPath);
    activeProcess = spawn(cmd, args, { env: process.env, windowsHide: true });
    let stdoutBuffer = "";
    activeProcess.stdout?.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const windowInfo = JSON.parse(trimmed);
          switchChecksCount++;
          handleActiveWindowUpdate(windowInfo);
        } catch (e) {
        }
      }
    });
    activeProcess.stderr?.on("data", (err) => {
      console.warn("[MONITOR] Tracker native stderr feedback:", err.toString());
    });
    activeProcess.on("error", (err) => {
      console.warn("[MONITOR] Tracker launch or runtime exception:", err);
      fallbackToSimulation();
    });
    activeProcess.on("close", (code) => {
      console.log("[MONITOR] Tracker native process closed with exit code", code);
      if (currentSessionId && !isTrackingSimulated && code !== 0) {
        fallbackToSimulation();
      }
    });
  } catch (err) {
    console.warn("[MONITOR] Exception bootstrapping native tracker:", err);
    fallbackToSimulation();
  }
}
function fallbackToSimulation() {
  if (isTrackingSimulated || !currentSessionId) return;
  console.log("[MONITOR] Native foreground window capture is unavailable in this environment. Falling back to simulated tracker.");
  stopMonitoring();
  startSimulation();
}
function stopMonitoring() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  if (activeProcess) {
    try {
      activeProcess.kill();
    } catch (e) {
    }
    activeProcess = null;
  }
  if (activeDistraction) {
    const endedAt = /* @__PURE__ */ new Date();
    const durationMs = endedAt.getTime() - activeDistraction.startedAt;
    endDistraction(activeDistraction.id, endedAt.toISOString(), durationMs);
    activeDistraction = null;
  }
  currentSessionId = null;
  isTrackingSimulated = false;
}
function registerTaskHandlers() {
  ipcMain.handle("tasks:getAll", async () => getAllTasks());
  ipcMain.handle("tasks:getDeleted", async () => getDeletedTasks());
  ipcMain.handle("tasks:getDueToday", async () => getTasksDueToday());
  ipcMain.handle("tasks:getUpcoming", async () => getTasksUpcoming());
  ipcMain.handle("tasks:getForToday", async () => getTasksForToday());
  ipcMain.handle("tasks:getTodayCompleted", async () => getTodayCompletedTasks());
  ipcMain.handle("tasks:getByProject", async (_, projectId) => getTasksByProject(projectId));
  ipcMain.handle("tasks:create", async (_, input) => createTask(input));
  ipcMain.handle("tasks:update", async (_, input) => updateTask(input));
  ipcMain.handle("tasks:delete", async (_, id) => {
    try {
      const active = getActiveSession();
      if (active && active.task_id === id) {
        stopMonitoring();
        endSession(active.id);
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
          if (!win.isDestroyed()) {
            win.webContents.send("session:state-changed");
          }
        }
      }
    } catch (err) {
      console.error("Failed to auto-cleanup active session during task deletion:", err);
    }
    return deleteTask(id);
  });
  ipcMain.handle("tasks:reorder", async (_, ids) => reorderTasks(ids));
  ipcMain.handle("tasks:complete", async (_, id) => completeTask(id));
}
function getAllProjects() {
  const stmt = getDb().prepare("SELECT * FROM projects ORDER BY sort_order");
  return stmt.all();
}
function createProject(input) {
  const db = getDb();
  const id = nanoid(8);
  const stmt = db.prepare(`
    INSERT INTO projects (id, name, color, icon, sort_order)
    VALUES (@id, @name, @color, @icon, @sort_order)
  `);
  stmt.run({
    id,
    name: input.name,
    color: input.color ?? "#6366f1",
    icon: input.icon ?? "folder",
    sort_order: input.sort_order ?? 0
  });
  const getStmt = db.prepare("SELECT * FROM projects WHERE id = ?");
  return getStmt.get(id);
}
function updateProject(id, updates) {
  const db = getDb();
  const keys = Object.keys(updates);
  if (keys.length === 0) {
    const getStmt2 = db.prepare("SELECT * FROM projects WHERE id = ?");
    return getStmt2.get(id);
  }
  const setClauses = keys.map((k) => `${k} = @${k}`).join(", ");
  const stmt = db.prepare(`
    UPDATE projects
    SET ${setClauses}
    WHERE id = @id
  `);
  stmt.run({ ...updates, id });
  const getStmt = db.prepare("SELECT * FROM projects WHERE id = ?");
  return getStmt.get(id);
}
function deleteProject(id) {
  const stmt = getDb().prepare("DELETE FROM projects WHERE id = ?");
  stmt.run(id);
}
function registerProjectHandlers() {
  ipcMain.handle("projects:getAll", async () => getAllProjects());
  ipcMain.handle(
    "projects:create",
    async (_, input) => createProject(input)
  );
  ipcMain.handle(
    "projects:update",
    async (_, id, updates) => updateProject(id, updates)
  );
  ipcMain.handle(
    "projects:delete",
    async (_, id) => deleteProject(id)
  );
}
function getAllHabits() {
  const stmt = getDb().prepare("SELECT * FROM habits ORDER BY created_at ASC");
  return stmt.all();
}
function createHabit(input) {
  const db = getDb();
  const id = nanoid(8);
  const stmt = db.prepare(`
    INSERT INTO habits (id, name, frequency)
    VALUES (@id, @name, @frequency)
  `);
  stmt.run({
    id,
    name: input.name,
    frequency: input.frequency ?? "daily"
  });
  const getStmt = db.prepare("SELECT * FROM habits WHERE id = ?");
  return getStmt.get(id);
}
function updateHabit(input) {
  const db = getDb();
  const { id, ...updates } = input;
  const keys = Object.keys(updates);
  if (keys.length === 0) {
    const getStmt2 = db.prepare("SELECT * FROM habits WHERE id = ?");
    return getStmt2.get(id);
  }
  const setClauses = keys.map((k) => `${k} = @${k}`).join(", ");
  const stmt = db.prepare(`
    UPDATE habits
    SET ${setClauses}
    WHERE id = @id
  `);
  stmt.run({ ...updates, id });
  const getStmt = db.prepare("SELECT * FROM habits WHERE id = ?");
  return getStmt.get(id);
}
function deleteHabit(id) {
  const stmt = getDb().prepare("DELETE FROM habits WHERE id = ?");
  stmt.run(id);
}
function registerHabitHandlers() {
  ipcMain.handle("habits:getAll", async () => getAllHabits());
  ipcMain.handle(
    "habits:create",
    async (_, input) => createHabit(input)
  );
  ipcMain.handle(
    "habits:update",
    async (_, input) => updateHabit(input)
  );
  ipcMain.handle(
    "habits:delete",
    async (_, id) => deleteHabit(id)
  );
}
function registerWindowHandlers(mainWindow2) {
  ipcMain.handle("window:minimize", () => {
    mainWindow2.minimize();
  });
  ipcMain.handle("window:maximize", () => {
    if (mainWindow2.isMaximized()) {
      mainWindow2.unmaximize();
    } else {
      mainWindow2.maximize();
    }
  });
  ipcMain.handle("window:toggleFullscreen", () => {
    mainWindow2.setFullScreen(!mainWindow2.isFullScreen());
  });
  ipcMain.handle("window:close", () => {
    mainWindow2.close();
  });
}
function notifyWindowsOfStateChange() {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send("session:state-changed");
    }
  }
}
function mapSessionToDualCase(session) {
  if (!session) return null;
  return {
    ...session,
    taskId: session.task_id,
    projectId: session.project_id,
    targetDurationMins: session.target_duration_mins,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    durationMins: session.duration_mins,
    distractionCount: session.distraction_count,
    task_id: session.task_id,
    project_id: session.project_id,
    target_duration_mins: session.target_duration_mins,
    started_at: session.started_at,
    ended_at: session.ended_at,
    duration_mins: session.duration_mins,
    distraction_count: session.distraction_count
  };
}
function calculateSessionMetrics(session, distractionsList) {
  const startMs = new Date(session.started_at || session.startedAt).getTime();
  const endMs = session.ended_at || session.endedAt ? new Date(session.ended_at || session.endedAt).getTime() : Date.now();
  const durationSeconds = Math.max(0, Math.floor((endMs - startMs) / 1e3));
  let totalDistractedMs = 0;
  for (const d of distractionsList) {
    const dStart = new Date(d.started_at || d.startedAt).getTime();
    const dEnd = d.ended_at || d.endedAt ? new Date(d.ended_at || d.endedAt).getTime() : endMs;
    const dur = d.duration_ms || d.durationMs || Math.max(0, dEnd - dStart);
    totalDistractedMs += dur;
  }
  const totalDistractedSeconds = Math.min(durationSeconds, Math.floor(totalDistractedMs / 1e3));
  const productiveSeconds = Math.max(0, durationSeconds - totalDistractedSeconds);
  const productivePercent = durationSeconds > 0 ? Math.round(productiveSeconds / durationSeconds * 100) : 100;
  const distractionCount = distractionsList.length;
  const averageFocusStreakSeconds = distractionCount > 0 ? Math.round(productiveSeconds / (distractionCount + 1)) : productiveSeconds;
  const grouping = {};
  for (const d of distractionsList) {
    const app2 = d.app_name || d.appName || "Unknown App";
    if (!grouping[app2]) {
      grouping[app2] = { appName: app2, durationMs: 0, count: 0 };
    }
    const dStart = new Date(d.started_at || d.startedAt).getTime();
    const dEnd = d.ended_at || d.endedAt ? new Date(d.ended_at || d.endedAt).getTime() : endMs;
    const dur = d.duration_ms || d.durationMs || Math.max(0, dEnd - dStart);
    grouping[app2].durationMs += dur;
    grouping[app2].count += 1;
  }
  const topDistractions = Object.values(grouping).sort((a, b) => b.durationMs - a.durationMs).slice(0, 10);
  return {
    sessionId: session.id,
    taskId: session.task_id || session.taskId,
    projectId: session.project_id || session.projectId,
    status: session.status,
    startedAt: session.started_at || session.startedAt,
    endedAt: session.ended_at || session.endedAt,
    targetDurationMins: session.target_duration_mins || session.targetDurationMins || 25,
    durationMins: session.duration_mins || session.durationMins || Math.floor(durationSeconds / 60),
    durationSeconds,
    productiveSeconds,
    totalDistractedSeconds,
    productivePercent,
    averageFocusStreakSeconds,
    distractionCount,
    topDistractions,
    distractions: distractionsList.map((d) => ({
      id: d.id,
      sessionId: d.session_id || d.sessionId,
      appName: d.app_name || d.appName,
      windowTitle: d.window_title || d.windowTitle,
      startedAt: d.started_at || d.startedAt,
      endedAt: d.ended_at || d.endedAt,
      durationMs: d.duration_ms || d.durationMs || (d.ended_at ? new Date(d.ended_at).getTime() - new Date(d.started_at).getTime() : 0)
    }))
  };
}
function registerSessionHandlers() {
  ipcMain.handle("focus-session:start", async (_, payload) => {
    console.log("[SESSIONS IPC] focus-session:start called with payload:", JSON.stringify(payload));
    const session = createSession(payload);
    console.log("[SESSIONS IPC] focus-session:start created session successfully in DB:", JSON.stringify(session));
    startMonitoring(session.id);
    notifyWindowsOfStateChange();
    const mapped = mapSessionToDualCase(session);
    console.log("[SESSIONS IPC] focus-session:start returning mapped payload:", JSON.stringify(mapped));
    return mapped;
  });
  ipcMain.handle("focus-session:pause", async () => {
    const session = getActiveSession();
    if (session) {
      pauseSession(session.id);
      stopMonitoring();
      notifyWindowsOfStateChange();
    }
  });
  ipcMain.handle("focus-session:resume", async () => {
    const session = getActiveSession();
    if (session) {
      resumeSession(session.id);
      startMonitoring(session.id);
      notifyWindowsOfStateChange();
    }
  });
  ipcMain.handle("focus-session:stop", async () => {
    const session = getActiveSession();
    if (!session) return null;
    stopMonitoring();
    endSession(session.id);
    const updatedSession = getDb().prepare("SELECT * FROM sessions WHERE id = ?").get(session.id);
    if (updatedSession.task_id && updatedSession.duration_mins > 0) {
      writeTimeToTask(updatedSession.task_id, updatedSession.duration_mins);
    }
    notifyWindowsOfStateChange();
    const distractionsList = getSessionDistractions(updatedSession.id);
    return calculateSessionMetrics(updatedSession, distractionsList);
  });
  ipcMain.handle("focus-session:getActive", async () => {
    const active = getActiveSession();
    console.log("[SESSIONS IPC] focus-session:getActive retrieved raw from DB:", JSON.stringify(active));
    const mapped = mapSessionToDualCase(active);
    console.log("[SESSIONS IPC] focus-session:getActive mapped dual-case payload:", JSON.stringify(mapped));
    return mapped;
  });
  ipcMain.handle("focus-session:getDistractions", async (_, sessionId) => {
    const list = getSessionDistractions(sessionId);
    return list.map((d) => ({
      id: d.id,
      sessionId: d.session_id,
      appName: d.app_name,
      windowTitle: d.window_title,
      startedAt: d.started_at,
      endedAt: d.ended_at,
      durationMs: d.duration_ms
    }));
  });
  ipcMain.handle("focus-session:getHistory", async () => {
    const db = getDb();
    const sessions = db.prepare(`
      SELECT * FROM sessions 
      ORDER BY started_at DESC
    `).all();
    const distStmt = db.prepare(`SELECT * FROM distractions WHERE session_id = ? ORDER BY started_at ASC`);
    return sessions.map((s) => {
      const distractionsList = distStmt.all(s.id);
      return calculateSessionMetrics(s, distractionsList);
    });
  });
  ipcMain.handle("focus-session:getToday", async () => {
    const sessions = getTodaySessions();
    return sessions.map((s) => {
      const mapped = mapSessionToDualCase(s);
      if (s.distractions) {
        mapped.distractions = s.distractions.map((d) => ({
          ...d,
          sessionId: d.session_id,
          appName: d.app_name,
          windowTitle: d.window_title,
          startedAt: d.started_at,
          endedAt: d.ended_at,
          durationMs: d.duration_ms,
          session_id: d.session_id,
          app_name: d.app_name,
          window_title: d.window_title,
          started_at: d.started_at,
          ended_at: d.ended_at,
          duration_ms: d.duration_ms
        }));
      }
      return mapped;
    });
  });
  ipcMain.handle("focus-session:delete", async (_, id) => {
    deleteSession(id);
    notifyWindowsOfStateChange();
  });
  ipcMain.handle("focus-session:clearHistory", async () => {
    clearSessionHistory();
    notifyWindowsOfStateChange();
  });
}
function registerSettingsHandlers() {
  ipcMain.handle("settings:get", async (_, key, defaultValue) => {
    return getSetting(key, defaultValue);
  });
  ipcMain.handle("settings:set", async (_, key, value) => {
    setSetting(key, value);
    return true;
  });
}
function registerAllHandlers() {
  registerTaskHandlers();
  registerProjectHandlers();
  registerHabitHandlers();
  registerSessionHandlers();
  registerSettingsHandlers();
}
const _dirname = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
let mainWindow = null;
let widgetWindow = null;
let tray = null;
registerAllHandlers();
app.whenReady().then(() => {
  mainWindow = createMainWindow();
  registerWindowHandlers(mainWindow);
  widgetWindow = createWidgetWindow();
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(join(_dirname, "../../resources/icon.png"));
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createEmpty();
    }
  } catch (error) {
    trayIcon = nativeImage.createEmpty();
  }
  tray = new Tray(trayIcon);
  tray.setToolTip("Productivity App");
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open",
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: "Quick Add",
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send("global-shortcut:quick-add");
        }
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        setTrayRef(null);
        tray?.destroy();
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  setTrayRef(tray);
  globalShortcut.register("CommandOrControl+Shift+Space", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send("global-shortcut:quick-add");
    }
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
      registerWindowHandlers(mainWindow);
    } else if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  });
});
app.on("window-all-closed", () => {
});
app.on("before-quit", () => {
  try {
    stopMonitoring();
  } catch (err) {
  }
  globalShortcut.unregisterAll();
});
export {
  mainWindow,
  tray,
  widgetWindow
};
