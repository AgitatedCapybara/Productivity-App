import { exec } from 'child_process'

export function toggleSystemDND(enable: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      const val = enable ? 0 : 1
      const cmd = `powershell -Command "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings' -Name 'NOC_GLOBAL_SETTING_TOASTS_ENABLED' -Value ${val}"`
      exec(cmd, (err) => {
        if (err) {
          console.error('[DND] Failed to toggle Windows Focus Assist registry:', err)
          resolve(false)
        } else {
          console.info(`[DND] Successfully ${enable ? 'enabled' : 'disabled'} Windows Focus Assist (Toasts disabled).`)
          resolve(true)
        }
      })
    } else if (process.platform === 'darwin') {
      const script = `tell application "System Events"
        try
          set focus of focus center to ${enable ? '"Do Not Disturb"' : 'missing value'}
        end try
      end tell`
      const cmd = `osascript -e '${script.replace(/'/g, "'\\\\''")}'`
      exec(cmd, (err) => {
        if (err) {
          console.error('[DND] Failed to toggle macOS focus center:', err)
          resolve(false)
        } else {
          console.info(`[DND] Successfully ${enable ? 'enabled' : 'disabled'} macOS Do Not Disturb focus mode.`)
          resolve(true)
        }
      })
    } else {
      console.info(`[DND] DND toggling not supported on platform: ${process.platform}`)
      resolve(false)
    }
  })
}
