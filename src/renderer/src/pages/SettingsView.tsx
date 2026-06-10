// src/renderer/src/pages/SettingsView.tsx
import { useState, useEffect } from 'react'
import { Plus, Trash2, RotateCcw, Info, Check, ShieldAlert, Laptop, Eye } from 'lucide-react'

const DEFAULT_PRESETS = [
  'chrome',
  'spotify',
  'discord',
  'slack',
  'steam',
  'netflix',
  'youtube',
  'twitter',
  'facebook',
  'instagram',
  'reddit'
]

export function SettingsView() {
  const [apps, setApps] = useState<string[]>([])
  const [newApp, setNewApp] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [simulateActivity, setSimulateActivity] = useState(false)

  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.getSetting) return

    window.electronAPI.getSetting('simulate-activity', 'false').then((val) => {
      setSimulateActivity(val === 'true')
    })

    window.electronAPI.getSetting(
      'distraction-apps',
      JSON.stringify(DEFAULT_PRESETS)
    ).then((val) => {
      try {
        setApps(JSON.parse(val))
      } catch (err) {
        console.error('Failed to parse distraction apps setting:', err)
        setApps(DEFAULT_PRESETS)
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const saveApps = async (list: string[]) => {
    if (!window.electronAPI || !window.electronAPI.setSetting) return
    try {
      await window.electronAPI.setSetting('distraction-apps', JSON.stringify(list))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }

  const handleToggleSimulateActivity = async () => {
    if (!window.electronAPI || !window.electronAPI.setSetting) return
    const nextVal = !simulateActivity
    setSimulateActivity(nextVal)
    try {
      await window.electronAPI.setSetting('simulate-activity', nextVal ? 'true' : 'false')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save simulation setting:', err)
    }
  }

  const handleAddApp = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newApp.trim().toLowerCase()
    if (!trimmed) return
    if (apps.includes(trimmed)) {
      setNewApp('')
      return
    }
    const updated = [...apps, trimmed]
    setApps(updated)
    setNewApp('')
    saveApps(updated)
  }

  const handleRemoveApp = (appToRemove: string) => {
    const updated = apps.filter((a) => a !== appToRemove)
    setApps(updated)
    saveApps(updated)
  }

  const handleTogglePreset = (preset: string) => {
    let updated: string[]
    if (apps.includes(preset)) {
      updated = apps.filter((a) => a !== preset)
    } else {
      updated = [...apps, preset]
    }
    setApps(updated)
    saveApps(updated)
  }

  const handleResetToDefaults = () => {
    if (window.confirm('Are you sure you want to restore the default distraction apps list?')) {
      setApps(DEFAULT_PRESETS)
      saveApps(DEFAULT_PRESETS)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] p-8">
        <span className="font-mono text-xs animate-pulse">Loading distraction configuration...</span>
      </div>
    )
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto p-4 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar h-full">
      <header className="space-y-1.5 border-b border-zinc-900 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <Laptop className="w-5 h-5 text-indigo-400" />
          Distraction Monitor Settings
        </h2>
        <p className="text-xs text-zinc-400 font-sans max-w-xl">
          Customize active window classifications. When workspace tracking runs, any active application keyword matching the items listed below is counted as a work distraction.
        </p>
      </header>

      {/* Main Settings Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-5">
          {/* Active Distraction App Keywords */}
          <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-450" />
                Tracked Distraction Keywords
              </h3>
              {saved && (
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                  <Check className="w-3 h-3" /> Auto-saved to SQLite
                </span>
              )}
            </div>

            {/* Quick App Presets Grid */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase text-zinc-500 block">Presets Quick Toggle</span>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_PRESETS.map((preset) => {
                  const isActive = apps.includes(preset)
                  return (
                    <button
                      key={preset}
                      onClick={() => handleTogglePreset(preset)}
                      className={`text-[10.5px] px-2.5 py-1 rounded-lg font-mono transition-all border ${
                        isActive
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/15'
                          : 'bg-zinc-900/30 text-zinc-400 border-zinc-900 hover:text-zinc-300 hover:border-zinc-800'
                      }`}
                    >
                      {preset}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom App Input */}
            <form onSubmit={handleAddApp} className="flex gap-2">
              <input
                type="text"
                value={newApp}
                onChange={(e) => setNewApp(e.target.value)}
                placeholder="Add custom app executable (e.g. chrome, steam, xbox)"
                className="flex-1 bg-zinc-900/40 border border-zinc-900 hover:border-zinc-800 focus:border-indigo-500 text-xs px-3 py-2 rounded-xl text-zinc-200 placeholder-zinc-500 font-sans outline-none transition-colors"
              />
              <button
                type="submit"
                className="bg-zinc-900 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-900 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add App
              </button>
            </form>

            <div className="mt-4 border-t border-zinc-900/50 pt-3">
              <span className="text-[10px] font-semibold uppercase text-zinc-500 block mb-2">Active Blacklist ({apps.length})</span>
              {apps.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {apps.map((app) => (
                    <div
                      key={app}
                      className="group flex items-center justify-between text-xs px-2.5 py-1.5 bg-zinc-900/25 border border-zinc-900/40 hover:border-zinc-900 rounded-xl transition-all"
                    >
                      <span className="font-mono text-zinc-300 truncate pr-2 select-all">{app}</span>
                      <button
                        onClick={() => handleRemoveApp(app)}
                        className="text-zinc-550 hover:text-rose-450 p-0.5 rounded transition-colors"
                        title={`Remove ${app}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-zinc-500 text-xs italic">
                  No distraction classification rules defined. No apps are blacklisted as distractions currently.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleResetToDefaults}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors font-mono"
              >
                <RotateCcw className="w-3 h-3" />
                Reset blacklist defaults
              </button>
            </div>
          </div>
        </div>

        {/* Informational Panel */}
        <div className="space-y-4">
          <div className="bg-indigo-950/5 border border-indigo-500/10 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-semibold tracking-wider uppercase text-indigo-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              How classification works
            </h4>
            <div className="text-[11.5px] text-zinc-300 space-y-2.5 leading-relaxed font-sans">
              <p>
                Our window tracker monitors active desktop focus switches at a granular level. Any foreground application or window title that partially matches one of your active configuration parameters triggers a distraction logged incident.
              </p>
              <div className="bg-zinc-950/30 p-2.5 rounded-lg border border-zinc-900 font-mono text-[10px] space-y-1.5 text-zinc-400">
                <span className="text-[9px] font-bold text-zinc-500 block uppercase">Matching Rules:</span>
                <div>
                  <span className="text-amber-400">Owner Process</span> matching is case-insensitive, looking at app executable or framework names (e.g., <code>slack.exe</code> or <code>Chrome</code>).
                </div>
                <div>
                  <span className="text-indigo-400">Window Title</span> matching parses open tab headers (e.g., filtering <code>reddit</code> or <code>youtube</code> tabs on any web browser window).
                </div>
              </div>
              <p className="text-zinc-400 text-[11px] italic">
                Workspaces and terminal/editor frame shifts (like VS Code, GitBash, Echoes itself) are fully whitelisted as native productive time.
              </p>
            </div>
          </div>

          <div className="bg-amber-500/[0.02] border border-amber-500/15 rounded-2xl p-4 space-y-3 text-xs">
            <h4 className="font-semibold text-amber-400 flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-500" />
                Web Preview Simulation
              </span>
              <span className="text-[10px] font-mono bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                ACTIVE
              </span>
            </h4>
            <p className="text-zinc-350 leading-relaxed text-[11px] font-sans">
              Since this app is currently previewed inside a <strong>remotely sandboxed cloud container</strong>, native OS APIs cannot view your personal physical screen or monitor your open apps like <strong>Brave</strong> or <strong>VS Code</strong>. 
            </p>
            <p className="text-zinc-400 leading-normal text-[11px] font-sans">
              To fully demonstrate how tracking works, the sandbox runs simulated ticks mirroring active workspaces and common distractions. You can pause these simulated swaps to test clean focused states:
            </p>

            <button
              onClick={handleToggleSimulateActivity}
              className={`w-full py-2 px-3 rounded-xl border font-mono text-[11px] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                simulateActivity
                  ? 'bg-amber-500/10 hover:bg-amber-500/15 text-amber-400 border-amber-500/25'
                  : 'bg-zinc-900/40 hover:bg-zinc-800 text-zinc-400 border-zinc-850'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${simulateActivity ? 'bg-amber-500 animate-pulse' : 'bg-zinc-500'}`} />
              {simulateActivity ? 'PAUSE BACKGROUND MOCK SWAPS' : 'RESUME BACKGROUND MOCK SWAPS'}
            </button>

            <span className="text-[10.5px] text-zinc-500 block leading-normal italic font-sans pt-1 border-t border-zinc-900/50">
              *Your local Electron desktop build will ignore this simulation entirely and run real hardware polls natively!
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
