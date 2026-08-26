// src/main/services/distraction-monitor.ts
import { logDistraction, endDistraction } from '../db/sessions'
import { getDb } from '../db/database'
import { getSetting } from '../db/settings'
import { BrowserWindow, app, powerMonitor } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { toggleSystemDND } from './dnd'

let activeProcess: ChildProcess | null = null
let currentSessionId: string | null = null
export let systemPausedSessionId: string | null = null
let activeDistraction: { id: string; startedAt: number; appKey: string } | null = null
let switchChecksCount = 0
let isTrackingSimulated = false
export let isTrackerDegraded = false
let spawnOverride: any = null

export function setSpawnOverride(override: any): void {
  spawnOverride = override
}

// Simulation timer (if user manually chooses or falls back to simulation)
let simulationInterval: NodeJS.Timeout | null = null
let simulatedTick = 0
const simulatedApps = [
  { owner: { name: 'VS Code' }, title: 'database.ts — productivity-app' },
  { owner: { name: 'Echoes' }, title: 'Focus Workspace' },
  { owner: { name: 'Brave' }, title: 'GitHub - Pull Requests' },
  { owner: { name: 'Spotify' }, title: 'Chill lofi beats' },
  { owner: { name: 'VS Code' }, title: 'App.tsx — productivity-app' },
  { owner: { name: 'Slack' }, title: 'General workspace chat' },
]

const isEchoesApp = (ownerName: string) => {
  const lower = ownerName.toLowerCase()
  return lower.includes('echoes') || lower.includes('electron') || lower.includes('react-example')
}

// Write helper to broadcast to all open renderer windows
function broadcastToWindows(channel: string, ...args: any[]) {
  try {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, ...args)
      }
    }
  } catch (err) {
    console.error(`Error broadcasting to ${channel}:`, err)
  }
}

export function handleActiveWindowUpdate(windowInfo: { title: string; owner: { name: string } }) {
  if (!currentSessionId) return
  if (!windowInfo || !windowInfo.owner || !windowInfo.owner.name) return

  const { owner, title } = windowInfo

  // Send the current checksCount live over IPC with simulation metadata
  broadcastToWindows('session:debug-check-tick', {
    count: switchChecksCount,
    isSimulated: isTrackingSimulated
  })

  // If we switched to the Echoes app or electron window, end current distraction tracking
  if (isEchoesApp(owner.name)) {
    if (activeDistraction) {
      const endedAt = new Date()
      const durationMs = endedAt.getTime() - activeDistraction.startedAt
      endDistraction(activeDistraction.id, endedAt.toISOString(), durationMs)
      activeDistraction = null
    }
    return
  }

  // Read dynamic settings list of distraction apps
  const defaultDistractions = '["chrome", "spotify", "discord", "slack", "steam", "netflix", "youtube", "twitter", "facebook", "instagram", "reddit"]'
  const distractionAppsJson = getSetting('distraction-apps', defaultDistractions)
  let distractionApps: string[] = []
  try {
    distractionApps = JSON.parse(distractionAppsJson)
  } catch (e) {
    distractionApps = ['chrome', 'spotify', 'discord', 'slack', 'steam', 'netflix', 'youtube', 'twitter', 'facebook', 'instagram', 'reddit']
  }

  // Check if current active window matches any of the distraction apps/keywords
  const appNameLower = owner.name ? owner.name.toLowerCase() : ''
  const titleLower = title ? title.toLowerCase() : ''

  const isDistraction = distractionApps.some(app => {
    const keyword = app.toLowerCase().trim()
    if (!keyword) return false
    return appNameLower.includes(keyword) || titleLower.includes(keyword)
  })

  if (!isDistraction) {
    // App is not a distraction (e.g. VS Code, a whitelisted tools window), so end distraction if active
    if (activeDistraction) {
      const endedAt = new Date()
      const durationMs = endedAt.getTime() - activeDistraction.startedAt
      endDistraction(activeDistraction.id, endedAt.toISOString(), durationMs)
      activeDistraction = null
    }
    return
  }

  const appKey = `${owner.name}::${title}`

  // Still looking at same distraction
  if (activeDistraction && activeDistraction.appKey === appKey) {
    return
  }

  const now = new Date()

  // App switched, end previous distraction
  if (activeDistraction) {
    const durationMs = now.getTime() - activeDistraction.startedAt
    endDistraction(activeDistraction.id, now.toISOString(), durationMs)
  }

  // Start new distraction
  const id = logDistraction(currentSessionId, owner.name || 'Unknown app', title || 'Unknown window', now.toISOString())
  activeDistraction = {
    id,
    startedAt: now.getTime(),
    appKey
  }

  // Trigger throttled distraction warning notification
  try {
    import('../index').then(({ sendThrottledNotification }) => {
      sendThrottledNotification(
        'Distraction Warning',
        `You are currently distracted by "${owner.name || 'an app'}". Focus on your goals!`,
        false
      )
    }).catch(err => {
      console.error('Failed to send distraction notification:', err)
    })
  } catch (err) {
    console.error('Failed to load sendThrottledNotification:', err)
  }

  // Notify windows of the new live distraction count
  const db = getDb()
  const sessionRow = db.prepare('SELECT distraction_count FROM sessions WHERE id = ?').get(currentSessionId) as { distraction_count: number }
  if (sessionRow) {
    broadcastToWindows('session:distraction-update', sessionRow.distraction_count)
  }
}

export function startMonitoring(sessionId: string) {
  if (activeProcess || simulationInterval) {
    stopMonitoring()
  }

  // Auto-toggle native system DND on focus session start/resume
  toggleSystemDND(true).catch((err) => {
    console.error('[MONITOR] Error activating system DND:', err)
  })

  currentSessionId = sessionId
  activeDistraction = null
  switchChecksCount = 0
  isTrackerDegraded = false

  const simulateActivity = getSetting('simulate-activity', 'false') === 'true'

  if (simulateActivity) {
    startSimulation()
  } else {
    startNativeMonitoring()
  }

  import('../windows/widget-window')
    .then(({ startWidgetTickerForActiveWindow }) => {
      startWidgetTickerForActiveWindow()
    })
    .catch((err) => {
      console.error('[MONITOR] Failed to dynamically import widget-window for startWidgetTicker:', err)
    })
}

function startSimulation() {
  isTrackingSimulated = true
  console.log('[MONITOR] Starting Focus Session, running inside Web Simulation sandbox.')
  
  // Simulated app ticker runs every 10 seconds (ticks every 1s for consistency)
  simulationInterval = setInterval(() => {
    try {
      switchChecksCount++
      simulatedTick++
      const appIndex = Math.floor(simulatedTick / 10 % simulatedApps.length)
      const windowInfo = simulatedApps[appIndex]
      handleActiveWindowUpdate(windowInfo)
    } catch (err) {
      console.error('Simulation check error:', err)
    }
  }, 1000)
}

function startNativeMonitoring() {
  isTrackingSimulated = false
  console.log('[MONITOR] Starting Native Focus Session tracking.')

  try {
    const tempDir = app.getPath('temp')
    mkdirSync(tempDir, { recursive: true })
    let scriptPath = ''
    let cmd = ''
    let args: string[] = []

    if (process.platform === 'win32') {
      scriptPath = join(tempDir, 'echoes_win_tracker.ps1')
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
`
      writeFileSync(scriptPath, psScript, 'utf-8')
      cmd = 'powershell.exe'
      args = [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-File', scriptPath
      ]
    } else if (process.platform === 'darwin') {
      scriptPath = join(tempDir, 'echoes_mac_tracker.sh')
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
`
      writeFileSync(scriptPath, macScript, { encoding: 'utf-8', mode: 0o755 })
      cmd = 'bash'
      args = [scriptPath]
    } else {
      // Default / Linux
      scriptPath = join(tempDir, 'echoes_linux_tracker.sh')
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
`
      writeFileSync(scriptPath, linuxScript, { encoding: 'utf-8', mode: 0o755 })
      cmd = 'bash'
      args = [scriptPath]
    }

    let proc: ChildProcess
    try {
      console.log(`[MONITOR] Spawning persistent foreground monitor process "${cmd}" with script:`, scriptPath)
      proc = (spawnOverride || spawn)(cmd, args, { env: process.env, windowsHide: true })
      activeProcess = proc
    } catch (spawnErr) {
      console.warn('[MONITOR] Spawning exception:', spawnErr)
      throw spawnErr
    } finally {
      // Spawning attempt finalized
    }

    let stdoutBuffer = ''
    proc.stdout?.on('data', (chunk) => {
      stdoutBuffer += chunk.toString()
      const lines = stdoutBuffer.split(/\r?\n/)
      stdoutBuffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const windowInfo = JSON.parse(trimmed)
          switchChecksCount++
          handleActiveWindowUpdate(windowInfo)
        } catch (e) {
          // Log quiet
        }
      }
    })

    proc.stderr?.on('data', (err) => {
      const errStr = err.toString()
      console.warn('[MONITOR] Tracker native stderr feedback:', errStr)
      if (
        errStr.includes('PermissionDenied') || 
        errStr.includes('SecurityError') ||
        errStr.toLowerCase().includes('permissiondenied') ||
        errStr.toLowerCase().includes('securityerror') ||
        errStr.toLowerCase().includes('permission denied')
      ) {
        fallbackToSimulation(true)
      }
    })

    proc.on('error', (err) => {
      console.warn('[MONITOR] Tracker launch or runtime exception:', err)
      fallbackToSimulation(true)
    })

    proc.on('close', (code) => {
      console.log('[MONITOR] Tracker native process closed with exit code', code)
      if (currentSessionId && !isTrackingSimulated && code !== 0) {
        // Fall back gracefully to simulation if active tracker closes abnormally
        fallbackToSimulation(true)
      }
    })

  } catch (err) {
    console.warn('[MONITOR] Exception bootstrapping native tracker:', err)
    fallbackToSimulation(true)
  }
}

function fallbackToSimulation(isDegraded: boolean = false) {
  if (isTrackingSimulated || !currentSessionId) return
  console.log('[MONITOR] Native foreground window capture is unavailable in this environment. Falling back to simulated tracker.')
  
  if (isDegraded) {
    isTrackerDegraded = true
    broadcastToWindows('session:tracker-degraded', "restricted metrics capture")
  }

  const savedSessionId = currentSessionId
  if (activeProcess) {
    try {
      activeProcess.kill()
    } catch (e) {
      // Quiet
    }
    activeProcess = null
  }
  if (simulationInterval) {
    clearInterval(simulationInterval)
    simulationInterval = null
  }
  startSimulation()
  currentSessionId = savedSessionId
}

export function stopMonitoring() {
  // Auto-toggle native system DND off on focus session pause/stop
  toggleSystemDND(false).catch((err) => {
    console.error('[MONITOR] Error deactivating system DND:', err)
  })

  import('../windows/widget-window')
    .then(({ clearWidgetTicker }) => {
      clearWidgetTicker()
    })
    .catch((err) => {
      console.error('[MONITOR] Failed to dynamically import widget-window for clearWidgetTicker:', err)
    })

  if (simulationInterval) {
    clearInterval(simulationInterval)
    simulationInterval = null
  }

  if (activeProcess) {
    try {
      activeProcess.kill()
    } catch (e) {
      // Quiet
    }
    activeProcess = null
  }

  if (activeDistraction) {
    const endedAt = new Date()
    const durationMs = endedAt.getTime() - activeDistraction.startedAt
    endDistraction(activeDistraction.id, endedAt.toISOString(), durationMs)
    activeDistraction = null
  }

  currentSessionId = null
  isTrackingSimulated = false
}

export function isMonitoring(): boolean {
  return activeProcess !== null || simulationInterval !== null
}

export function getTrackerDegradedStatus(): boolean {
  return isTrackerDegraded
}

export function handlePowerSuspendOrLock(): void {
  if (currentSessionId) {
    const sessionId = currentSessionId
    systemPausedSessionId = sessionId
    console.log(`[MONITOR] System suspend or screen lock detected for session ${sessionId}. Transitioning to cleanly paused state.`)
    
    // Write paused status in the database, with paused_at stored in ended_at
    const db = getDb()
    db.prepare(`
      UPDATE sessions 
      SET status = 'paused', ended_at = ? 
      WHERE id = ?
    `).run(new Date().toISOString(), sessionId)
    
    // Explicitly stop active process daemons (PowerShell/AppleScript/Bash) on lock
    stopMonitoring()
    
    // Emit state-changed event broadcast (session:state-changed) to alert renderer packages.
    broadcastToWindows('session:state-changed')
  }
}

export function handlePowerResumeOrUnlock(): void {
  if (systemPausedSessionId) {
    const sessionId = systemPausedSessionId
    console.log(`[MONITOR] System resume or screen unlock detected. Prompting user to resume session ${sessionId}.`)
    
    // Broadcast 'session:system-resumed' with the paused session ID so that the renderer can show a fluid sidebar toast prompt
    broadcastToWindows('session:system-resumed', sessionId)
    broadcastToWindows('session:state-changed')
    
    systemPausedSessionId = null
  }
}

// Connect listeners
powerMonitor.on('suspend', () => {
  handlePowerSuspendOrLock()
})

powerMonitor.on('lock-screen', () => {
  handlePowerSuspendOrLock()
})

powerMonitor.on('resume', () => {
  handlePowerResumeOrUnlock()
})

powerMonitor.on('unlock-screen', () => {
  handlePowerResumeOrUnlock()
})

