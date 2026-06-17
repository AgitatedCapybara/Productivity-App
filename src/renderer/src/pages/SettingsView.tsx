// src/renderer/src/pages/SettingsView.tsx
import { useState, useEffect } from 'react'
import { Plus, Trash2, RotateCcw, Info, Check, ShieldAlert, Laptop, Sliders } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

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

  const pageScales = useAppStore(state => state.pageScales)
  const setSinglePageScale = useAppStore(state => state.setSinglePageScale)
  const setAdjustAllScales = useAppStore(state => state.setAdjustAllScales)

  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.getSetting) return

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
                className="flex-1 bg-zinc-900/40 border border-zinc-900 hover:border-zinc-800 focus:border-indigo-500 text-xs px-3 py-2 rounded-xl text-zinc-200 placeholder:text-zinc-600 font-sans outline-none transition-colors"
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

          {/* Custom Page Scaling Settings */}
          <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5 space-y-5" id="page-scaling-settings-card">
            <header className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Custom Page Interface Scaling
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono">
                Real-time layout zoom adjustment
              </p>
            </header>

            <div className="space-y-4">
              {/* Option to Adjust All Pages together vs Specfic Pages */}
              <div className="bg-zinc-900/10 border border-zinc-950 p-4 rounded-xl space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-zinc-200 block">
                      Global &ldquo;Adjust All&rdquo; Option
                    </label>
                    <p className="text-[10.5px] text-zinc-500 leading-normal max-w-md font-sans">
                      Force every screen a singular zoom ratio. Turn this off to customize scaling page-by-page.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextAdjustAll = !pageScales.adjustAll
                      setAdjustAllScales(nextAdjustAll, pageScales.globalScale)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer select-none ${
                      pageScales.adjustAll
                        ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400'
                        : 'bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:text-zinc-350'
                    }`}
                    id="adjust-all-toggle-btn"
                  >
                    {pageScales.adjustAll ? 'ADJUST ALL: ON' : 'INDIVIDUAL MODE'}
                  </button>
                </div>

                {/* Adjust All Active scale parameters */}
                {pageScales.adjustAll && (
                  <div className="pt-3.5 border-t border-zinc-900/55 space-y-4" id="adjust-all-controls">
                    {/* Preset Scale values row */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-semibold uppercase text-zinc-550 block font-sans">Preset Scale Amounts</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[0.8, 0.9, 1.0, 1.1, 1.15, 1.25, 1.35, 1.5].map((preset) => (
                          <button
                            key={`preset-global-${preset}`}
                            type="button"
                            onClick={() => setAdjustAllScales(true, preset)}
                            className={`text-[10px] px-2.5 py-1 rounded-lg font-mono transition-all border cursor-pointer select-none ${
                              pageScales.globalScale === preset
                                ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-bold'
                                : 'bg-zinc-950/40 text-zinc-400 border-zinc-900 hover:border-zinc-800'
                            }`}
                          >
                            {Math.round(preset * 100)}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Scale slider & input box */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center pt-1">
                      <div className="sm:col-span-2 space-y-1.5">
                        <div className="flex justify-between text-[10px] font-mono text-zinc-500 select-none">
                          <span>50% (Small)</span>
                          <span>100% (Native)</span>
                          <span>200% (Large)</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.05"
                          value={pageScales.globalScale}
                          onChange={(e) => setAdjustAllScales(true, parseFloat(e.target.value))}
                          className="w-full accent-indigo-500 bg-zinc-900 h-1 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-900 text-center space-y-1">
                        <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest block font-sans">Unified Zoom</span>
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="50"
                            max="200"
                            value={Math.round(pageScales.globalScale * 100)}
                            onChange={(e) => {
                              const pct = parseInt(e.target.value) || 100
                              const val = Math.min(Math.max(pct, 50), 200) / 100
                              setAdjustAllScales(true, val)
                            }}
                            className="bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded text-xs font-mono font-bold text-center w-14 text-zinc-200 outline-none focus:border-indigo-500"
                          />
                          <span className="text-xs font-mono text-zinc-400">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Individual Page Customization */}
              {!pageScales.adjustAll && (
                <div className="space-y-3.5" id="individual-scaling-controls">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-zinc-205 text-zinc-200">
                      Configure Specific Screens
                    </h4>
                    <p className="text-[10.5px] text-zinc-550 text-zinc-500 leading-normal font-sans">
                      Adjust independent zoom overrides depending on layout complexity. Set lower values (e.g. 85%) for statistics/charts grids, or higher for reading ease.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'today', name: '📋 Today View' },
                      { key: 'upcoming', name: '📅 Upcoming View' },
                      { key: 'calendar', name: '📆 Calendar View' },
                      { key: 'project', name: '📁 Project View' },
                      { key: 'habits', name: '🌱 Habits View' },
                      { key: 'analytics', name: '📈 Analytics View' },
                      { key: 'circle', name: '🌐 Circle Hub' },
                      { key: 'settings', name: '⚙️ Settings View' }
                    ].map((page) => {
                      const currentVal = pageScales.scales?.[page.key] ?? 1.0
                      return (
                        <div key={page.key} className="bg-zinc-950/40 border border-zinc-900/60 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-1.5 truncate flex-1 pr-1">
                            <span className="font-semibold text-zinc-350 block truncate font-sans">{page.name}</span>
                            <div className="flex flex-wrap gap-1">
                              {[0.8, 1.0, 1.2].map((pVal) => (
                                <button
                                  key={`${page.key}-preset-${pVal}`}
                                  type="button"
                                  onClick={() => setSinglePageScale(page.key, pVal)}
                                  className={`text-[8.5px] font-semibold px-1 py-0.5 rounded font-mono border cursor-pointer select-none ${
                                    currentVal === pVal
                                      ? 'bg-zinc-800 text-indigo-400 border-indigo-500/20'
                                      : 'bg-zinc-900/50 text-zinc-550 border-zinc-900 hover:text-zinc-400'
                                  }`}
                                >
                                  {Math.round(pVal * 100)}%
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* Scale input controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = Math.max(0.5, parseFloat((currentVal - 0.05).toFixed(2)))
                                setSinglePageScale(page.key, nextVal)
                              }}
                              className="w-5 h-5 bg-zinc-900 border border-zinc-850 text-zinc-405 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded flex items-center justify-center font-bold text-xs select-none cursor-pointer"
                            >
                              -
                            </button>
                            <div className="flex items-center justify-center bg-zinc-900/40 border border-zinc-850 px-1.5 py-0.5 rounded gap-0.5 w-12 text-center select-none">
                              <span className="font-mono text-[10.5px] font-bold text-zinc-300">
                                {Math.round(currentVal * 100)}
                              </span>
                              <span className="text-[9px] text-zinc-550 text-zinc-500 font-mono">%</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = Math.min(2.0, parseFloat((currentVal + 0.05).toFixed(2)))
                                setSinglePageScale(page.key, nextVal)
                              }}
                              className="w-5 h-5 bg-zinc-900 border border-zinc-850 text-zinc-405 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded flex items-center justify-center font-bold text-xs select-none cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
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
        </div>
      </div>
    </div>
  )
}
