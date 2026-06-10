// src/renderer/src/pages/AnalyticsView.tsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { 
  BarChart3, 
  Clock, 
  AlertTriangle, 
  RotateCcw,
  Calendar,
  X,
  FolderDot
} from 'lucide-react'
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip
} from 'recharts'
import { useAppStore } from '../store/useAppStore'
import { cn } from '../lib/utils'

export function AnalyticsView() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const projects = useAppStore(state => state.projects)

  const loadHistory = async () => {
    if (!window.electronAPI || !window.electronAPI.getSessionHistory) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      const list = await window.electronAPI.getSessionHistory()
      setHistory(list || [])
    } catch (err) {
      console.error('Failed to load session history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleClearHistory = async () => {
    if (!window.electronAPI || !window.electronAPI.clearSessionHistory) return
    try {
      await window.electronAPI.clearSessionHistory()
      setHistory([])
      setConfirmClear(false)
      setSelectedSession(null)
    } catch (err) {
      console.error('Failed to clear session history:', err)
    }
  }

  // Format helper
  const formatSecs = (totalSecs: number) => {
    if (totalSecs < 60) return `${totalSecs}s`
    const m = Math.floor(totalSecs / 60)
    const s = totalSecs % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }

  const formatSecsToShort = (totalSecs: number) => {
    const mins = Math.round(totalSecs / 60)
    return `${mins}m`
  }

  const formatFullDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr)
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch (e) {
      return isoStr
    }
  }

  const formatOnlyDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr)
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch (e) {
      return isoStr
    }
  }

  // Stats Calculations
  const completedSessions = history.filter(s => s.status === 'completed' || s.durationSeconds > 10)
  const totalSessionsCount = completedSessions.length

  const totalDurationSeconds = completedSessions.reduce((acc, s) => acc + (s.durationSeconds ?? 0), 0)
  const totalProductiveSeconds = completedSessions.reduce((acc, s) => acc + (s.productiveSeconds ?? 0), 0)
  const totalDistractionCount = completedSessions.reduce((acc, s) => acc + (s.distractionCount ?? 0), 0)

  // Overall productive percentage
  const globalProductivePercent = totalDurationSeconds > 0 
    ? Math.round((totalProductiveSeconds / totalDurationSeconds) * 100) 
    : 100

  // Average focus streak before distraction
  const globalAverageFocusStreak = totalSessionsCount > 0
    ? Math.round(totalProductiveSeconds / (totalDistractionCount + totalSessionsCount))
    : 0

  // Group distractions across ALL sessions
  const appDistractionsMap: Record<string, { appName: string; durationMs: number; count: number }> = {}
  completedSessions.forEach(s => {
    if (s.distractions && Array.isArray(s.distractions)) {
      s.distractions.forEach((d: any) => {
        const app = d.appName || d.app_name || 'Unknown app'
        if (!appDistractionsMap[app]) {
          appDistractionsMap[app] = { appName: app, durationMs: 0, count: 0 }
        }
        appDistractionsMap[app].durationMs += (d.durationMs || d.duration_ms || 0)
        appDistractionsMap[app].count += 1
      })
    }
  })

  const globalTopDistractions = Object.values(appDistractionsMap)
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 5)

  // Prepare chart data (chronological sessions)
  const reversedHistory = [...completedSessions].reverse()
  const chartData = reversedHistory.slice(-15).map(s => ({
    name: formatOnlyDate(s.startedAt),
    ProductivePct: s.productivePercent ?? 100,
    ProductiveMins: Math.round((s.productiveSeconds ?? 0) / 60),
    TotalMins: Math.round((s.durationSeconds ?? 0) / 60),
    distractions: s.distractionCount ?? 0
  }))

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] text-white overflow-hidden p-6 relative">
      {/* Soft background glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/[0.02] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-500/[0.02] blur-[120px] rounded-full pointer-events-none" />

      {/* Header section with Reset */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/40 no-drag">
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
            <BarChart3 className="text-indigo-400 shrink-0" size={20} />
            Focus Intelligence
          </h1>
          <p className="text-zinc-500 text-xs">
            Review your historical cognitive depth, productive timelines, and distraction points.
          </p>
        </div>

        {history.length > 0 && (
          <div className="relative">
            {!confirmClear ? (
              <button 
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800/60 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-medium cursor-pointer transition-colors"
              >
                <RotateCcw size={13} />
                Reset Data
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-zinc-900 border border-red-500/30 p-1 rounded-xl shadow-xl">
                <span className="text-[10px] text-zinc-400 px-1 font-semibold">Clear permanently?</span>
                <button 
                  onClick={handleClearHistory}
                  className="px-2 py-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                >
                  Yes
                </button>
                <button 
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                >
                  No
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-400">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Analyzing workspace database...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-center text-indigo-400 mb-4 shadow-xl">
            <Clock size={24} className="stroke-indigo-400/80" />
          </div>
          <h3 className="text-sm font-bold text-zinc-200">No Focus Session Records</h3>
          <p className="text-zinc-500 text-xs mt-2 leading-relaxed">
            Start a focus session from a task to monitor active windows, track streaks, and analyze your development deep-work analytics.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
          {/* LEFT COLUMN: Main Stats and Charts */}
          <div className="lg:col-span-8 flex flex-col gap-5 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            
            {/* KPI Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-zinc-900/30 border border-zinc-800/40 p-3.5 rounded-2xl relative overflow-hidden">
                <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase block mb-1">TOTAL SESSIONS</span>
                <span className="text-xl font-bold font-mono text-zinc-100">{totalSessionsCount}</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Completed blocks</span>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800/40 p-3.5 rounded-2xl relative overflow-hidden">
                <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase block mb-1">PRODUCTIVE TIME</span>
                <span className="text-xl font-bold font-mono text-emerald-400">{formatSecsToShort(totalProductiveSeconds)}</span>
                <span className="text-[10px] text-emerald-500/70 block mt-0.5">{globalProductivePercent}% of total</span>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800/40 p-3.5 rounded-2xl relative overflow-hidden">
                <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase block mb-1">AVG FOCUS STREAK</span>
                <span className="text-xl font-bold font-mono text-indigo-400">{formatSecs(globalAverageFocusStreak)}</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Before interruption</span>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800/40 p-3.5 rounded-2xl relative overflow-hidden">
                <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase block mb-1">SWAP OVERHEAD</span>
                <span className={cn(
                  "text-xl font-bold font-mono",
                  totalDistractionCount > 0 ? "text-rose-400" : "text-emerald-400"
                )}>
                  {totalDistractionCount}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Focus switch logs</span>
              </div>
            </div>

            {/* Interactive Area Chart */}
            <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">Productive Depth Timeline</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Chronological focus minutes & productive trends (last 15 blocks)</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                    <span>Productive Mins</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-zinc-800" />
                    <span>Total Mins</span>
                  </div>
                </div>
              </div>

              <div className="h-56 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      stroke="#4b5563" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false} 
                      dy={8}
                    />
                    <YAxis 
                      stroke="#4b5563" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#18181b', 
                        borderColor: '#27272a',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '11px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                      }}
                      labelStyle={{ fontWeight: 'bold', color: '#a1a1aa', marginBottom: '4px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="TotalMins" 
                      stroke="#27272a" 
                      strokeWidth={1.5}
                      fill="transparent" 
                      strokeDasharray="4 4"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="ProductiveMins" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorProd)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Row / Global Distractions Visualizer */}
            <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-2xl p-4 flex-1 min-h-[220px] flex flex-col justify-start">
              <div className="mb-4">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">Global Wasted Streams</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Wasted time across all active sessions, grouped by detected foreground window apps.</p>
              </div>

              {globalTopDistractions.length > 0 ? (
                <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar max-h-56 pr-1">
                  {globalTopDistractions.map((ta: any, idx: number) => {
                    const distractSecs = Math.floor(ta.durationMs / 1000)
                    const totalWastedMs = globalTopDistractions.reduce((acc: number, app: any) => acc + (app.durationMs || 0), 0)
                    const weightPct = totalWastedMs > 0 ? Math.round((ta.durationMs / totalWastedMs) * 100) : 100

                    return (
                      <div key={idx} className="bg-zinc-950/20 border border-zinc-850 p-2.5 rounded-xl">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            <span className="font-bold text-zinc-200">{ta.appName}</span>
                            <span className="text-[10px] text-zinc-500">
                              ({ta.count} focus {ta.count === 1 ? 'incident' : 'incidents'})
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-zinc-400">
                            {formatSecs(distractSecs)}
                          </span>
                        </div>
                        
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${weightPct}%` }}
                            transition={{ duration: 0.8, delay: 0.1 * idx }}
                            className="h-full bg-rose-500/80 rounded-full"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-zinc-800 rounded-xl text-center bg-zinc-950/10">
                  <span className="text-xl mb-1">🛡️</span>
                  <span className="text-[11px] font-bold text-emerald-400">Pristine Safety Record</span>
                  <p className="text-[10px] text-zinc-500 max-w-[240px] mt-1">No off-task switches logged yet. Blacklisted windows have not disrupted focus.</p>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Chronological Session Log */}
          <div className="lg:col-span-4 flex flex-col bg-zinc-900/20 border border-zinc-800/40 rounded-2.5xl p-4 min-h-0 overflow-hidden">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono mb-1">Focus Log History</h3>
            <p className="text-[10px] text-zinc-500 mb-4">Click a session block to evaluate its timeline details.</p>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
              {completedSessions.map((s, idx) => {
                const sessionProject = projects.find(p => p.id === s.projectId)
                return (
                  <button
                    key={s.sessionId || idx}
                    onClick={() => setSelectedSession(s)}
                    className={cn(
                      "w-full text-left bg-zinc-900/30 border p-3 rounded-xl hover:bg-zinc-800/40 hover:border-zinc-700/60 transition-all flex flex-col gap-2 relative group focus:outline-none",
                      selectedSession?.sessionId === s.sessionId ? "border-indigo-500/60 bg-indigo-500/[0.02]" : "border-zinc-800/50"
                    )}
                  >
                    <div className="flex items-center justify-between pointer-events-none">
                      <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-tight">
                        {formatOnlyDate(s.startedAt)} · {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-bold font-mono",
                        s.productivePercent >= 90 ? "bg-emerald-500/10 text-emerald-400" :
                        s.productivePercent >= 70 ? "bg-indigo-500/10 text-indigo-400" :
                        s.productivePercent >= 50 ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"
                      )}>
                        {s.productivePercent}% FOCUS
                      </span>
                    </div>

                    <div className="flex items-center justify-between items-center pointer-events-none">
                      <div className="flex items-center gap-1.5 max-w-[70%]">
                        {sessionProject ? (
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sessionProject.color }} />
                        ) : (
                          <FolderDot size={12} className="text-zinc-500 shrink-0" />
                        )}
                        <span className="text-xs text-zinc-200 font-bold font-sans truncate">{sessionProject ? sessionProject.name : 'Independent Block'}</span>
                      </div>
                      <span className="text-xs font-bold text-zinc-300 font-mono">
                        {s.durationMins || Math.round(s.durationSeconds / 60)}m
                      </span>
                    </div>

                    {/* Simple dist count */}
                    {s.distractionCount > 0 && (
                      <div className="text-[10px] text-rose-400/80 font-mono flex items-center gap-1 pointer-events-none">
                        <AlertTriangle size={10} />
                        <span>{s.distractionCount} distractions ({formatSecs(Math.floor(s.totalDistractedSeconds))})</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Session Timeline Details */}
      <AnimatePresence>
        {selectedSession && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="max-w-md w-full bg-zinc-950 border border-zinc-805/80 rounded-2.5xl p-6 shadow-2xl relative flex flex-col max-h-[90vh]"
            >
              <button
                onClick={() => setSelectedSession(null)}
                className="absolute top-4 right-4 p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>

              <div className="flex items-center gap-3 mb-5 border-b border-zinc-800/40 pb-4">
                <div className="w-9 h-9 bg-zinc-900 border border-zinc-850 rounded-xl flex items-center justify-center">
                  <Calendar size={16} className="text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-200 uppercase font-mono">Session Evaluation Details</h4>
                  <p className="text-[10px] text-zinc-500 font-sans mt-0.5">{formatFullDate(selectedSession.startedAt)}</p>
                </div>
              </div>

              {/* Grid of stats */}
              <div className="grid grid-cols-2 gap-3.5 mb-5">
                <div className="bg-zinc-900/40 border border-zinc-800/40 p-3 rounded-xl text-center">
                  <span className="text-[9px] font-semibold text-zinc-500 tracking-wider uppercase block mb-1">Productive Time</span>
                  <span className="text-base font-extrabold font-mono text-emerald-400">{formatSecs(selectedSession.productiveSeconds)}</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5 block">({selectedSession.productivePercent}% focused)</span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/40 p-3 rounded-xl text-center">
                  <span className="text-[9px] font-semibold text-zinc-500 tracking-wider uppercase block mb-1">Distraction Time</span>
                  <span className="text-base font-extrabold font-mono text-rose-400">{formatSecs(selectedSession.totalDistractedSeconds)}</span>
                  <span className="text-[9px] text-zinc-500 mt-0.5 block">({selectedSession.distractionCount} events)</span>
                </div>
              </div>

              {/* Streak */}
              <div className="bg-zinc-900/40 border border-zinc-800/40 p-3 rounded-xl mb-5 flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans font-semibold">Average Focus Streak</span>
                <span className="text-zinc-200 font-extrabold text-sm">{formatSecs(selectedSession.averageFocusStreakSeconds)}</span>
              </div>

              {/* List of exact distractions */}
              <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono mb-2.5 flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-rose-400" />
                Logged switches
              </h5>

              <div className="flex-1 overflow-y-auto custom-scrollbar border border-zinc-850 rounded-xl bg-zinc-950 p-2 text-xs space-y-1.5 max-h-52 mb-5">
                {selectedSession.distractions && selectedSession.distractions.length > 0 ? (
                  selectedSession.distractions.map((d: any, index: number) => {
                    const durationSeconds = d.durationMs ? Math.round(d.durationMs / 1000) : 0
                    return (
                      <div key={d.id || index} className="flex flex-col gap-0.5 p-2 bg-zinc-900/30 border border-zinc-900/50 rounded-lg hover:border-zinc-800 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-rose-400 font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 bg-rose-500/5 rounded shrink-0">
                            {d.appName || 'Unknown App'}
                          </span>
                          <span className="text-zinc-400 font-mono text-[10px]">
                            {durationSeconds > 0 ? formatSecs(durationSeconds) : 'Active Interruption'}
                          </span>
                        </div>
                        <p className="text-zinc-300 truncate font-sans text-[11px] mt-1">{d.windowTitle || 'Unidentified window title'}</p>
                        <span className="text-[9px] text-zinc-600 font-mono mt-0.5 uppercase">
                          At: {new Date(d.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <span className="text-xl">🌟</span>
                    <span className="text-[11px] font-bold text-emerald-400 mt-1">Perfect Focus Block</span>
                    <p className="text-[10px] text-zinc-600">No distraction window-switches occurred.</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedSession(null)}
                className="w-full py-2.5 bg-zinc-100 hover:bg-white text-[#09090b] text-xs font-bold rounded-xl transition-all"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
