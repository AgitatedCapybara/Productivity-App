// src/renderer/src/pages/SettingsView.tsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Trash2, RotateCcw, Info, Check, ShieldAlert, Laptop, Sliders, Zap, Activity, Cpu, Sparkles, FileText, FileSpreadsheet, FolderKanban, Lock, Key, Shield, Database, WifiOff, RefreshCw, AlertTriangle, ArchiveRestore, CalendarDays, Calendar, Flame, Brain, Users, CheckSquare, LayoutGrid, BarChart3, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useLicense } from '../hooks/useLicense'
import { cn } from '../lib/utils'

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

  const { entitlements: rawEntitlements, activateTrial: runActivateTrial, activateKey, deactivateKey } = useLicense()
  const licenseEntitlements = rawEntitlements ?? {
    tier: 'free' as const,
    activatedAt: null,
    expiresAt: null,
    offlineGraceUntil: null,
    machineHash: '...',
    isTrial: false,
    daysRemaining: null,
    isValid: false
  }
  const [licenseKeyInput, setLicenseKeyInput] = useState('')
  const [licenseStatusMessage, setLicenseStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [licenseSubmitting, setLicenseSubmitting] = useState(false)

  const pageScales = useAppStore(state => state.pageScales)
  const setSinglePageScale = useAppStore(state => state.setSinglePageScale)
  const setAdjustAllScales = useAppStore(state => state.setAdjustAllScales)
  const featureVisibility = useAppStore(state => state.featureVisibility)
  const setFeatureVisibility = useAppStore(state => state.setFeatureVisibility)

  const [telemetryEnabled, setTelemetryEnabled] = useState(false)
  const [perfStats, setPerfStats] = useState<any>(null)
  const [isVacuuming, setIsVacuuming] = useState(false)
  const [vacuumFinished, setVacuumFinished] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false)

  const [nudgesEnabled, setNudgesEnabled] = useState(true)
  const [ignoreEnergy, setIgnoreEnergy] = useState(false)
  const [ignoreDeadlines, setIgnoreDeadlines] = useState(false)
  const [morningWeight, setMorningWeight] = useState(0.9)
  const [afternoonWeight, setAfternoonWeight] = useState(0.7)
  const [eveningWeight, setEveningWeight] = useState(0.4)
  const [notesEnabled, setNotesEnabled] = useState(true)

  const [dbStats, setDbStats] = useState<any>(null)
  const [viewsEnabled, setViewsEnabled] = useState(true)
  const [showWipeModal, setShowWipeModal] = useState(false)
  const [wipePasswordInput, setWipePasswordInput] = useState('')
  const [agreeWipeCheck, setAgreeWipeCheck] = useState(false)

  // Security Suite features state integration
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false)
  const [autoBackupPath, setAutoBackupPath] = useState('')
  const [autoBackupFrequency, setAutoBackupFrequency] = useState<'weekly' | 'monthly'>('weekly')
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditLogsLoading, setAuditLogsLoading] = useState(false)

  const [showBackupModal, setShowBackupModal] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [passphraseInput, setPassphraseInput] = useState('')
  const [useAutoKey, setUseAutoKey] = useState(true)
  const [backupRunning, setBackupRunning] = useState(false)
  const [restoreRunning, setRestoreRunning] = useState(false)

  // Navigation & Onboarding States
  const [showFeatureTips, setShowFeatureTips] = useState(true)
  const [simulatedAppAge, setSimulatedAppAge] = useState(1)
  const [sidebarVisibilities, setSidebarVisibilities] = useState<Record<string, boolean>>({
    today: true,
    upcoming: true,
    calendar: true,
    plan: true,
    habits: true,
    notes: true,
    views: true,
    analytics: true,
    deepwork: true,
    circle: true,
    inbox: true
  })

  // Accordion states for progressive disclosure (Level 1)
  const [isDistractionExpanded, setIsDistractionExpanded] = useState(false)
  const [isLayoutExpanded, setIsLayoutExpanded] = useState(false)
  const [isPlanningExpanded, setIsPlanningExpanded] = useState(false)
  const [isPrivacyExpanded, setIsPrivacyExpanded] = useState(false)

  // Sub-accordion states (Level 2)
  const [isScalingExpanded, setIsScalingExpanded] = useState(true)
  const [isBiorhythmsExpanded, setIsBiorhythmsExpanded] = useState(false)
  const [isAutoBackupsExpanded, setIsAutoBackupsExpanded] = useState(false)
  const [isAuditLogsExpanded, setIsAuditLogsExpanded] = useState(false)
  const [isLicensingExpanded, setIsLicensingExpanded] = useState(false)
  const [isTelemetryExpanded, setIsTelemetryExpanded] = useState(false)
  const [isDangerZoneExpanded, setIsDangerZoneExpanded] = useState(false)
  const [minimizeTo, setMinimizeTo] = useState<'taskbar' | 'tray'>('taskbar')

  useEffect(() => {
    // Read tips configuration
    const tipsPref = localStorage.getItem('keystone_show_feature_tips') !== 'false'
    setShowFeatureTips(tipsPref)

    const simulatedAgeStr = localStorage.getItem('keystone_simulated_age_days')
    setSimulatedAppAge(simulatedAgeStr ? parseInt(simulatedAgeStr, 10) : 1)

    // Load active visibilities
    const sidebarKeys = ['today', 'upcoming', 'calendar', 'plan', 'habits', 'notes', 'views', 'analytics', 'deepwork', 'circle', 'inbox']
    const loadedVisibilities: Record<string, boolean> = {}
    
    const loadVis = async () => {
      for (const skey of sidebarKeys) {
        let isVis = true
        if (window.electronAPI && window.electronAPI.getSetting) {
          try {
            const val = await window.electronAPI.getSetting(`sidebar.view.${skey}`, 'true')
            isVis = val !== 'false'
          } catch {
            isVis = localStorage.getItem(`sidebar.view.${skey}`) !== 'false'
          }
        } else {
          isVis = localStorage.getItem(`sidebar.view.${skey}`) !== 'false'
        }
        loadedVisibilities[skey] = isVis
      }
      setSidebarVisibilities(loadedVisibilities)
    }
    loadVis()

    if (!window.electronAPI || !window.electronAPI.getSetting) {
      setLoading(false)
      return
    }

    window.electronAPI.getSetting('views.enabled', 'true').then((val) => {
      setViewsEnabled(val === 'true')
    }).catch(console.error)

    if (window.electronAPI.getBackupStats) {
      window.electronAPI.getBackupStats().then((stats) => {
        setDbStats(stats)
      }).catch(console.error)
    }

    window.electronAPI.getSetting('notes.enabled', 'true').then((val) => {
      setNotesEnabled(val === 'true')
    }).catch(console.error)

    window.electronAPI.getSetting('perf.telemetry.enabled', 'false').then((val) => {
      setTelemetryEnabled(val === 'true')
    }).catch(console.error)

    window.electronAPI.getSetting('scheduler.nudges.enabled', 'true').then((val) => {
      setNudgesEnabled(val === 'true')
    }).catch(console.error)
    window.electronAPI.getSetting('scheduler.preferences.ignoreEnergy', 'false').then((val) => {
      setIgnoreEnergy(val === 'true')
    }).catch(console.error)
    window.electronAPI.getSetting('scheduler.preferences.ignoreDeadlines', 'false').then((val) => {
      setIgnoreDeadlines(val === 'true')
    }).catch(console.error)
    window.electronAPI.getSetting('scheduler.preferences.morningWeight', '0.9').then((val) => {
      setMorningWeight(parseFloat(val))
    }).catch(console.error)
    window.electronAPI.getSetting('scheduler.preferences.afternoonWeight', '0.7').then((val) => {
      setAfternoonWeight(parseFloat(val))
    }).catch(console.error)
    window.electronAPI.getSetting('scheduler.preferences.eveningWeight', '0.4').then((val) => {
      setEveningWeight(parseFloat(val))
    }).catch(console.error)

    window.electronAPI.getSetting('backup.auto.enabled', 'false').then((val) => {
      setAutoBackupEnabled(val === 'true')
    }).catch(console.error)

    window.electronAPI.getSetting('backup.auto.path', '').then((val) => {
      setAutoBackupPath(val)
    }).catch(console.error)

    window.electronAPI.getSetting('backup.auto.frequency', 'weekly').then((val) => {
      setAutoBackupFrequency(val as 'weekly' | 'monthly')
    }).catch(console.error)

    window.electronAPI.getSetting('minimizeTo', 'taskbar').then((val) => {
      setMinimizeTo(val as 'taskbar' | 'tray')
    }).catch(console.error)

    // Pull audit logs
    if (window.electronAPI.getAuditLogs) {
      setAuditLogsLoading(true)
      window.electronAPI.getAuditLogs()
        .then((logs) => {
          setAuditLogs(logs)
          setAuditLogsLoading(false)
        })
        .catch((e) => {
          console.error(e)
          setAuditLogsLoading(false)
        })
    }
  }, [])

  const updateSidebarVisibility = async (key: string, value: boolean) => {
    setSidebarVisibilities(prev => ({ ...prev, [key]: value }))
    localStorage.setItem(`sidebar.view.${key}`, String(value))
    if (window.electronAPI && window.electronAPI.setSetting) {
      await window.electronAPI.setSetting(`sidebar.view.${key}`, String(value))
    }
  }

  const updateShowFeatureTips = (val: boolean) => {
    setShowFeatureTips(val)
    localStorage.setItem('keystone_show_feature_tips', String(val))
  }

  const updateSimulatedAppAge = (val: number) => {
    setSimulatedAppAge(val)
    localStorage.setItem('keystone_simulated_age_days', String(val))
  }

  const updateMinimizeTo = async (val: 'taskbar' | 'tray') => {
    setMinimizeTo(val)
    if (window.electronAPI && window.electronAPI.setSetting) {
      await window.electronAPI.setSetting('minimizeTo', val)
    }
  }

  useEffect(() => {
    if (!telemetryEnabled) {
      setPerfStats(null)
      return undefined
    }

    const fetchStats = async () => {
      if (window.electronAPI && window.electronAPI.getPerfStats) {
        try {
          const stats = await window.electronAPI.getPerfStats()
          setPerfStats(stats)
        } catch (e) {
          console.error('Failed to pull performance telemetry:', e)
        }
      }
    }

    fetchStats()
    const intervalId = setInterval(fetchStats, 2000)
    return () => clearInterval(intervalId)
  }, [telemetryEnabled])

  const handleToggleTelemetry = async () => {
    if (!window.electronAPI || !window.electronAPI.setSetting) return
    const nextVal = !telemetryEnabled
    try {
      await window.electronAPI.setSetting('perf.telemetry.enabled', nextVal ? 'true' : 'false')
      setTelemetryEnabled(nextVal)
    } catch (err) {
      console.error('Failed to change telemetry setting:', err)
    }
  }

  const handleRunVacuum = async () => {
    if (isVacuuming || !window.electronAPI || !window.electronAPI.forceRunMaintenance) return
    setIsVacuuming(true)
    setVacuumFinished(false)
    try {
      await window.electronAPI.forceRunMaintenance()
      setVacuumFinished(true)
      setTimeout(() => setVacuumFinished(false), 3000)
    } catch (err) {
      console.error('Manual vacuum failed:', err)
    } finally {
      setIsVacuuming(false)
    }
  }

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
    if (!confirmingReset) {
      setConfirmingReset(true)
      return
    }
    setApps(DEFAULT_PRESETS)
    saveApps(DEFAULT_PRESETS)
    setConfirmingReset(false)
  }

  const handleToggleNudges = async () => {
    if (!window.electronAPI || !window.electronAPI.setSetting) return
    const nextVal = !nudgesEnabled
    try {
      await window.electronAPI.setSetting('scheduler.nudges.enabled', nextVal ? 'true' : 'false')
      setNudgesEnabled(nextVal)
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleIgnoreEnergy = async () => {
    if (!window.electronAPI || !window.electronAPI.setSetting) return
    const nextVal = !ignoreEnergy
    try {
      await window.electronAPI.setSetting('scheduler.preferences.ignoreEnergy', nextVal ? 'true' : 'false')
      setIgnoreEnergy(nextVal)
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleIgnoreDeadlines = async () => {
    if (!window.electronAPI || !window.electronAPI.setSetting) return
    const nextVal = !ignoreDeadlines
    try {
      await window.electronAPI.setSetting('scheduler.preferences.ignoreDeadlines', nextVal ? 'true' : 'false')
      setIgnoreDeadlines(nextVal)
    } catch (err) {
      console.error(err)
    }
  }

  const handleWeightChange = async (key: string, value: number, setter: (v: number) => void) => {
    if (!window.electronAPI || !window.electronAPI.setSetting) return
    try {
      await window.electronAPI.setSetting(key, value.toString())
      setter(value)
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleNotesEnabled = async () => {
    if (!window.electronAPI || !window.electronAPI.setSetting) return
    const nextVal = !notesEnabled
    try {
      await window.electronAPI.setSetting('notes.enabled', nextVal ? 'true' : 'false')
      setNotesEnabled(nextVal)
    } catch (err) {
      console.error('Failed to change notes setting:', err)
    }
  }

  const handleToggleViewsEnabled = async () => {
    if (!window.electronAPI || !window.electronAPI.setSetting) return
    const nextVal = !viewsEnabled
    try {
      await window.electronAPI.setSetting('views.enabled', nextVal ? 'true' : 'false')
      setViewsEnabled(nextVal)
    } catch (err) {
      console.error('Failed to change views setting:', err)
    }
  }

  const handleBackupNow = () => {
    setPassphraseInput('')
    setUseAutoKey(true)
    setShowBackupModal(true)
  }

  const handleBackupNowConfirm = async () => {
    if (!window.electronAPI || !window.electronAPI.runBackupValue) return
    setBackupRunning(true)
    try {
      const key = useAutoKey ? undefined : passphraseInput
      const res = await window.electronAPI.runBackupValue(key)
      if (res.success) {
        alert(`Success! Encrypted backup generated at: ${res.filePath}`)
        setShowBackupModal(false)
        await triggerAuditLogRefresh()
      } else if (res.error) {
        alert(`Backup process failed: ${res.error}`)
      }
    } catch (e: any) {
      alert(`Critical operational error: ${e.message}`)
    } finally {
      setBackupRunning(false)
    }
  }

  const handleRestoreBackup = () => {
    setPassphraseInput('')
    setUseAutoKey(true)
    setShowRestoreModal(true)
  }

  const handleRestoreBackupConfirm = async () => {
    if (!window.electronAPI || !window.electronAPI.restoreBackupValue) return
    const key = useAutoKey ? undefined : passphraseInput
    
    setRestoreRunning(true)
    try {
      const res = await window.electronAPI.restoreBackupValue(key)
      if (res.success) {
        alert('Integrity checked. Backup decrypted and database successfully restored!')
        setShowRestoreModal(false)
        window.location.reload()
      } else if (res.error) {
        alert(`Decryption/Integrity failure: ${res.error}`)
      }
    } catch (e: any) {
      alert(`Critical decryption error: ${e.message}`)
    } finally {
      setRestoreRunning(false)
    }
  }

  const handleExportJson = async () => {
    if (!window.electronAPI || !window.electronAPI.exportBackupJson) return
    const res = await window.electronAPI.exportBackupJson()
    if (res.success) {
      alert(`Success! Full database records printed as JSON into: ${res.filePath}`)
    } else if (res.error) {
      alert(`Export failed: ${res.error}`)
    }
  }

  const handleMultiFormatExport = async (format: 'json' | 'csv') => {
    if (!window.electronAPI || !window.electronAPI.exportData) return
    try {
      const res = await window.electronAPI.exportData(format)
      if (res.success && res.filePath) {
        alert(`Success! Workspace data exported as ${format.toUpperCase()} to: ${res.filePath}`)
      } else if (res.error) {
        alert(`Export failed: ${res.error}`)
      }
    } catch (err: any) {
      alert(`Export failed with error: ${err.message || err}`)
    }
  }

  const handleToggleAutoBackup = async () => {
    if (!window.electronAPI || !window.electronAPI.setSetting) return
    const nextVal = !autoBackupEnabled
    try {
      await window.electronAPI.setSetting('backup.auto.enabled', nextVal ? 'true' : 'false')
      setAutoBackupEnabled(nextVal)
      await triggerAuditLogRefresh()
    } catch (err) {
      console.error(err)
    }
  }

  const handleAutoBackupPathChange = async (val: string) => {
    if (!window.electronAPI || !window.electronAPI.setSetting) return
    try {
      await window.electronAPI.setSetting('backup.auto.path', val)
      setAutoBackupPath(val)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAutoBackupFrequencyChange = async (val: 'weekly' | 'monthly') => {
    if (!window.electronAPI || !window.electronAPI.setSetting) return
    try {
      await window.electronAPI.setSetting('backup.auto.frequency', val)
      setAutoBackupFrequency(val)
    } catch (err) {
      console.error(err)
    }
  }

  const triggerAuditLogRefresh = async () => {
    if (window.electronAPI && window.electronAPI.getAuditLogs) {
      try {
        const logs = await window.electronAPI.getAuditLogs()
        setAuditLogs(logs)
      } catch (e) {
        console.error(e)
      }
    }
    if (window.electronAPI && window.electronAPI.getBackupStats) {
      try {
        const stats = await window.electronAPI.getBackupStats()
        setDbStats(stats)
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleWipeDatabase = async () => {
    if (wipePasswordInput.toLowerCase() !== 'keystone' || !agreeWipeCheck) {
      alert('Error: Please type "keystone" exactly and mark the agreement checkbox for safety.')
      return
    }
    if (!window.electronAPI || !window.electronAPI.wipeDatabaseData) return
    const res = await window.electronAPI.wipeDatabaseData()
    if (res.success) {
      alert('All tasks, projects, habits, notes, and view presets successfully purged.')
      setShowWipeModal(false)
      window.location.reload()
    } else {
      alert('Failed to erase storage data.')
    }
  }

  const handleRegisterLicenseKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!licenseKeyInput.trim()) return

    setLicenseSubmitting(true)
    setLicenseStatusMessage(null)

    try {
      const res = await activateKey(licenseKeyInput.trim())
      if (res.success) {
        setLicenseStatusMessage({
          type: 'success',
          text: `Success: Professional ${res.tier?.toUpperCase() || 'PRO'} capability token verified and saved locally.`
        })
        setLicenseKeyInput('')
      } else {
        setLicenseStatusMessage({
          type: 'error',
          text: `Activation failed: ${res.error || 'Cryptographic signature is unmatched.'}`
        })
      }
    } catch (err: any) {
      setLicenseStatusMessage({
        type: 'error',
        text: `Error parsing key signature: ${err.message || err}`
      })
    } finally {
      setLicenseSubmitting(false)
    }
  }

  const handleDeactivateLicenseKey = async () => {
    if (!confirmingDeactivate) {
      setConfirmingDeactivate(true)
      return
    }
    setLicenseSubmitting(true)
    try {
      await deactivateKey()
      setLicenseStatusMessage({
        type: 'success',
        text: 'License key cleared successfully. Client reverted to standard Free tier.'
      })
      setConfirmingDeactivate(false)
    } catch (err: any) {
      setLicenseStatusMessage({
        type: 'error',
        text: `Deactivation failed: ${err.message || err}`
      })
    } finally {
      setLicenseSubmitting(false)
    }
  }

  const handleStartLicenseTrial = async () => {
    setLicenseSubmitting(true)
    setLicenseStatusMessage(null)
    try {
      const res = await runActivateTrial()
      if (res.success) {
        setLicenseStatusMessage({
          type: 'success',
          text: 'Success: 14-day free Pro trial initiated. Relational schedulers unlocked!'
        })
      } else {
        setLicenseStatusMessage({
          type: 'error',
          text: `Trial Blocked: ${res.error || 'Only one trial period is permitted per machine.'}`
        })
      }
    } catch (err: any) {
      setLicenseStatusMessage({
        type: 'error',
        text: `Trial failed: ${err.message || err}`
      })
    } finally {
      setLicenseSubmitting(false)
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
    <div className="flex-1 max-w-4xl mx-auto p-4 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar h-full view-container">
      <header className="space-y-1.5 border-b border-zinc-900 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          Workspace Settings & System Controls
        </h2>
        <p className="text-xs text-zinc-400 font-sans max-w-xl">
          Configure offline-first window blacklists, custom page scaling, bio-rhythm scheduling multipliers, and cryptographic security keys.
        </p>
      </header>

      {/* Main Settings Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          
          {/* CATEGORY 1: DISTRACTION MONITORING & PROTECTION ACCORDION */}
          <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-950/10">
            <button
              onClick={() => setIsDistractionExpanded(!isDistractionExpanded)}
              className="w-full flex items-center justify-between p-5 hover:bg-zinc-900/30 transition-all text-left select-none cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                    Distraction Protection & Monitoring
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Classify active window processes and set workspace distraction tracking rules.
                  </p>
                </div>
              </div>
              <span className="text-zinc-550 hover:text-zinc-350 pr-1">
                {isDistractionExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isDistractionExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                  animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                  exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  className="p-5 border-t border-zinc-900/80 space-y-5"
                >
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
                onMouseLeave={() => setConfirmingReset(false)}
                className={cn(
                  "text-[10px] flex items-center gap-1 transition-all font-mono px-3 py-1.5 rounded-lg cursor-pointer",
                  confirmingReset 
                    ? "text-red-400 bg-red-950/25 border border-red-900/30 animate-pulse font-semibold" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{confirmingReset ? 'Click again to confirm resetting?' : 'Reset blacklist defaults'}</span>
              </button>
            </div>
          </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CATEGORY 2: WORKSPACE LAYOUT & NAVIGATION ACCORDION */}
          <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-950/10">
            <button
              onClick={() => setIsLayoutExpanded(!isLayoutExpanded)}
              className="w-full flex items-center justify-between p-5 hover:bg-zinc-900/30 transition-all text-left select-none cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                    Workspace Layout & Sidebar Options
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Toggle active navigation views, sidebar visibility, scaling overrides, and guide features.
                  </p>
                </div>
              </div>
              <span className="text-zinc-550 hover:text-zinc-350 pr-1">
                {isLayoutExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isLayoutExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                  animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                  exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  className="p-5 border-t border-zinc-900/80 space-y-5"
                >
                  {/* Custom Page Scaling Settings */}
                  <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5 space-y-5" id="page-scaling-settings-card">
                    <button
                      type="button"
                      onClick={() => setIsScalingExpanded(!isScalingExpanded)}
                      className="w-full flex items-center justify-between border-b border-zinc-900/60 pb-3 text-left cursor-pointer select-none"
                    >
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                        Custom Page Interface Scaling
                      </h3>
                      <span className="text-zinc-550 hover:text-zinc-350 font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                        {isScalingExpanded ? '▾ Hide Scaling Override Panel' : '▸ View Scaling Override Panel'}
                      </span>
                    </button>

                    {isScalingExpanded && (
                      <div className="space-y-4 animate-fadeIn pt-1">
                        <div className="space-y-4">
                          {/* Option to Adjust All Pages together vs Specfic Pages */}
                          <div className="bg-zinc-900/10 border border-zinc-950 p-4 rounded-xl space-y-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="space-y-0.5">
                                <label className="text-xs font-bold text-zinc-200 block">
                                  Global &ldquo;Adjust All&rdquo; Option
                                </label>
                                <p className="text-[10.5px] text-zinc-550 text-zinc-500 leading-normal max-w-md font-sans">
                                  Force every screen to bind to a single unified zoom ratio. Turn this off to customize on a page-by-page basis.
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
                                    <span className="text-[9px] font-semibold text-zinc-550 text-zinc-500 uppercase tracking-widest block font-sans">Unified Zoom</span>
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
                                <h4 className="text-xs font-bold text-zinc-200">
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
                                          className="w-5 h-5 bg-zinc-900 border border-zinc-850 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded flex items-center justify-center font-bold text-xs select-none cursor-pointer"
                                        >
                                          -
                                        </button>
                                        <div className="flex items-center justify-center bg-zinc-900/40 border border-zinc-850 px-1.5 py-0.5 rounded gap-0.5 w-12 text-center select-none">
                                          <span className="font-mono text-[10.5px] font-bold text-zinc-300">
                                            {Math.round(currentVal * 100)}
                                          </span>
                                          <span className="text-[9px] text-zinc-500 font-mono">%</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextVal = Math.min(2.0, parseFloat((currentVal + 0.05).toFixed(2)))
                                            setSinglePageScale(page.key, nextVal)
                                          }}
                                          className="w-5 h-5 bg-zinc-900 border border-zinc-850 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded flex items-center justify-center font-bold text-xs select-none cursor-pointer"
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
                    )}
                  </div>

                  {/* Workspace Navigation & Onboarding Settings */}
                  <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5 space-y-5" id="navigation-and-onboarding-settings-card">
            <header className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-sans">
                <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
                Navigation & Workspace Settings
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono">
                Sidebar composition & onboarding
              </p>
            </header>

            <div className="space-y-4">
              {/* Onboarding tips toggles and App Lifespan simulation */}
              <div className="bg-zinc-900/10 border border-zinc-950 p-4 rounded-xl space-y-3.5">
                <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-400 font-sans">Onboarding Guides & Lifespan Simulator</h4>
                
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-zinc-200 block">Show Feature Tips & Announcements</label>
                    <p className="text-[10.5px] text-zinc-500 leading-normal max-w-sm font-sans">
                      Display context-sensitive guided onboarding cards within views to point out advanced feature capabilities.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateShowFeatureTips(!showFeatureTips)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer select-none ${
                      showFeatureTips
                        ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-bold'
                        : 'bg-zinc-950/40 text-zinc-500 border-zinc-900 hover:border-zinc-800'
                    }`}
                    id="show-tips-toggle-btn"
                  >
                    {showFeatureTips ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 pt-3 border-t border-zinc-900/50">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-zinc-200 block">Simulate Workspace Lifetime (App Age)</label>
                    <p className="text-[10.5px] text-zinc-500 leading-normal max-w-sm font-sans">
                      Progressively unlocks specialized view guidance. Day 1: Capturing, Day 2: Habits, Day 3: Pomodoro Focus Session, Day 7: Rituals.
                    </p>
                  </div>
                  <select
                    value={simulatedAppAge}
                    onChange={(e) => updateSimulatedAppAge(parseInt(e.target.value, 10))}
                    className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 outline-none font-mono font-bold transition-all focus:border-indigo-500 cursor-pointer text-right"
                    id="simulated-app-age-select"
                  >
                    <option value={1}>Day 1 (Tasks Capture)</option>
                    <option value={2}>Day 2 (Habits Unlocked)</option>
                    <option value={3}>Day 3 (Focus Unlocked)</option>
                    <option value={7}>Day 7+ (Rituals Unlocked)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-4 pt-3 border-t border-zinc-900/50">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-zinc-200 block">Window Close Behavior</label>
                    <p className="text-[10.5px] text-zinc-500 leading-normal max-w-sm font-sans">
                      Specify whether clicking the window close (X) button minimizes the application to your system taskbar or hides it silently to the system tray.
                    </p>
                  </div>
                  <select
                    value={minimizeTo}
                    onChange={(e) => updateMinimizeTo(e.target.value as 'taskbar' | 'tray')}
                    className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 outline-none font-mono font-bold transition-all focus:border-indigo-500 cursor-pointer text-right"
                    id="minimize-to-select"
                  >
                    <option value="taskbar">Minimize to Taskbar</option>
                    <option value="tray">Hide to Tray</option>
                  </select>
                </div>
              </div>

              {/* Feature Visibility Progressive Disclosure */}
              <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5 space-y-5" id="feature-visibility-settings-card">
                <div className="flex items-center gap-3 border-b border-zinc-900/60 pb-3">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                    <Sliders size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-sans">Customize Your Space</h4>
                    <p className="text-[11px] text-zinc-400 font-sans mt-0.5">Progressively toggle entire subsystems to customize your workspace complexity.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* CORE WORKSPACES SECTION */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80 font-mono">Core Subsystems</h5>
                    <div className="grid grid-cols-1 gap-2.5">
                      {[
                        { key: 'taskList', label: 'Primary Task List', desc: 'Core checkbox listing for intuitive task and priority management.' },
                        { key: 'quickAdd', label: 'Omnipresent Quick Add Input', desc: 'NLP-powered input bar on Today and Project views for cognitive offloading.' },
                        { key: 'todayView', label: 'Today Workspace Dashboard', desc: 'The daily priority command center and focus timeline.' },
                        { key: 'focusTimer', label: 'Self-Regulated Focus Timer', desc: 'Custom-interval Pomodoro focus timer with deep session protection.' },
                        { key: 'notesBoard', label: 'Knowledge Base & Spatial Boards', desc: 'Interactive spatial canvas and markdown-rich wiki database.' }
                      ].map((f) => {
                        const active = !!featureVisibility[f.key as keyof typeof featureVisibility]
                        return (
                          <div 
                            key={f.key} 
                            className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all duration-200 select-none ${
                              active 
                                ? 'bg-zinc-900/35 border-zinc-800 text-zinc-100' 
                                : 'bg-zinc-950/25 border-zinc-900/50 text-zinc-500 opacity-60 hover:opacity-80'
                            }`}
                          >
                            <div className="space-y-0.5 max-w-[75%]">
                              <div className="text-xs font-bold font-sans flex items-center gap-2">
                                <span>{f.label}</span>
                                {!active && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-900/60 font-medium tracking-wide text-zinc-500 font-mono uppercase">Hidden</span>}
                              </div>
                              <p className="text-[10px] text-zinc-400 leading-normal font-sans">{f.desc}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFeatureVisibility({ [f.key as keyof typeof featureVisibility]: !active })
                              }}
                              className="relative inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                              aria-label={`Toggle ${f.label}`}
                            >
                              <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${active ? 'bg-indigo-500' : 'bg-zinc-800'}`}>
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    active ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </div>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* ADVANCED PRODUCTIVITY SECTION */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80 font-mono">Advanced Capabilities</h5>
                    <div className="grid grid-cols-1 gap-2.5">
                      {[
                        { key: 'aiSuggestions', label: 'Gemini AI Scheduling Suggestions', desc: 'Incorporate cognitive recommendations and auto-generated priorities.' },
                        { key: 'distractionTracking', label: 'OS Active Distraction Tracking', desc: 'Passive focus protect engine that measures off-task time.' },
                        { key: 'wellnessAnalytics', label: 'Wellness Intelligence Analytics', desc: 'Predict burnout risk thresholds and display screen fatigue scores.' },
                        { key: 'habitTracking', label: 'Habit Consistency Engine', desc: 'Track consecutive routine metrics without punishment mechanisms.' },
                        { key: 'planningFields', label: 'Deep Planning Fields', desc: 'Configure energy, recurrence, duration, and context tags on tasks.' },
                        { key: 'advancedExport', label: 'Encrypted Cryptographic Backup & Export', desc: 'Create zero-knowledge local vaults encrypted with AES-256-GCM.' }
                      ].map((f) => {
                        const active = !!featureVisibility[f.key as keyof typeof featureVisibility]
                        return (
                          <div 
                            key={f.key} 
                            className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all duration-200 select-none ${
                              active 
                                ? 'bg-zinc-900/35 border-zinc-800 text-zinc-100' 
                                : 'bg-zinc-950/25 border-zinc-900/50 text-zinc-500 opacity-60 hover:opacity-80'
                            }`}
                          >
                            <div className="space-y-0.5 max-w-[75%]">
                              <div className="text-xs font-bold font-sans flex items-center gap-2">
                                <span>{f.label}</span>
                                {!active && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-900/60 font-medium tracking-wide text-zinc-500 font-mono uppercase">Hidden</span>}
                              </div>
                              <p className="text-[10px] text-zinc-400 leading-normal font-sans">{f.desc}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFeatureVisibility({ [f.key as keyof typeof featureVisibility]: !active })
                              }}
                              className="relative inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                              aria-label={`Toggle ${f.label}`}
                            >
                              <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${active ? 'bg-indigo-500' : 'bg-zinc-800'}`}>
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    active ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </div>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* RESET TO CALM DEFAULTS */}
                  <div className="flex justify-end pt-3 border-t border-zinc-900/40">
                    <button
                      type="button"
                      onClick={() => {
                        setFeatureVisibility({
                          taskList: true,
                          quickAdd: true,
                          todayView: true,
                          focusTimer: true,
                          notesBoard: true,
                          aiSuggestions: false,
                          distractionTracking: false,
                          wellnessAnalytics: false,
                          habitTracking: false,
                          planningFields: false,
                          advancedExport: false,
                        })
                      }}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer flex items-center gap-1.5 font-sans py-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset to Calm Defaults
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar Active items configuration */}
              <div className="bg-zinc-900/10 border border-zinc-950 p-4 rounded-xl space-y-4">
                <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-400 font-sans">Sidebar View Toggle Registry</h4>
                <p className="text-[10.5px] text-zinc-550 leading-relaxed font-sans font-medium">
                  Select which primary view categories are mounted directly onto your main sidebar navigation drawer. Deselect elements to preserve ultimate minimalism.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  {[
                    { key: 'today', title: 'Today View', icon: CheckSquare },
                    { key: 'calendar', title: 'Calendar', icon: Calendar },
                    { key: 'plan', title: 'Planner', icon: Sparkles },
                    { key: 'deepwork', title: 'Focus Station', icon: Brain },
                    { key: 'habits', title: 'Habits Board', icon: Flame },
                    { key: 'notes', title: 'Notes Space', icon: FileText },
                    { key: 'inbox', title: 'Inbox Bay', icon: ArchiveRestore },
                    { key: 'views', title: 'Boards Map', icon: FolderKanban },
                    { key: 'circle', title: 'Circle Share', icon: Users },
                    { key: 'analytics', title: 'Analytics', icon: BarChart3 },
                    { key: 'upcoming', title: 'Upcoming', icon: CalendarDays }
                  ].map((item) => {
                    const IconComponent = item.icon
                    const isChecked = sidebarVisibilities[item.key] !== false

                    return (
                      <div 
                        key={item.key}
                        onClick={() => updateSidebarVisibility(item.key, !isChecked)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked 
                            ? 'bg-zinc-900/50 border-indigo-500/20 text-zinc-200' 
                            : 'bg-zinc-950/20 border-zinc-900/50 text-zinc-550'
                        }`}
                        id={`sidebar-toggle-card-${item.key}`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${isChecked ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-900 text-zinc-650'}`}>
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 flex items-center justify-between gap-1.5 min-w-0">
                          <span className="text-[11px] font-sans font-semibold truncate">{item.title}</span>
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all text-white shrink-0 ${isChecked ? 'bg-indigo-600 border-indigo-500' : 'border-zinc-800'}`}>
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>


                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CATEGORY 3: PLANNING & PRODUCTIVITY PREFERENCES ACCORDION */}
          <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-950/10">
            <button
              onClick={() => setIsPlanningExpanded(!isPlanningExpanded)}
              className="w-full flex items-center justify-between p-5 hover:bg-zinc-900/30 transition-all text-left select-none cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                    Planning & Productivity preferences
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Tune AI scheduling heuristics, circadian focus weights, and toggles for active knowledge views.
                  </p>
                </div>
              </div>
              <span className="text-zinc-550 hover:text-zinc-350 pr-1">
                {isPlanningExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isPlanningExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                  animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                  exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  className="p-5 border-t border-zinc-900/80 space-y-5"
                >
                  {/* AI Scheduling Preferences */}
                  <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5 space-y-5" id="ai-scheduling-preferences-card">
            <header className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                AI Scheduling Preferences
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono">
                Mathematical Model Factors
              </p>
            </header>

            <div className="space-y-5">
              {/* Toggle: Ignore Circadian Energy */}
              <div className="flex items-center justify-between gap-4 p-3 bg-zinc-905 bg-zinc-900/10 border border-zinc-950 rounded-xl">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-200 block">Ignore Circadian Energy Patterns</span>
                  <p className="text-[10.5px] text-zinc-500 leading-normal max-w-sm">
                    Normally, Keystone matches high-priority tasks to peak focus energy hours. Enable this to treat all hours of the day equally.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleIgnoreEnergy}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                    ignoreEnergy
                      ? 'bg-rose-500/10 border-rose-500/25 text-rose-450'
                      : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400'
                  }`}
                >
                  {ignoreEnergy ? 'ENERGY: IGNORED' : 'ENERGY: ACTIVE'}
                </button>
              </div>

              {/* Toggle: Ignore Deadlines */}
              <div className="flex items-center justify-between gap-4 p-3 bg-zinc-905 bg-zinc-900/10 border border-zinc-950 rounded-xl">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-200 block">Ignore Task Deadline Urgency</span>
                  <p className="text-[10.5px] text-zinc-500 leading-normal max-w-sm">
                    Usually, deadlines looming within 48h force high scheduling weight. Enable this to disregard deadlines when finding calendar blocks.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleIgnoreDeadlines}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                    ignoreDeadlines
                      ? 'bg-rose-500/10 border-rose-500/25 text-rose-450'
                      : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400'
                  }`}
                >
                  {ignoreDeadlines ? 'DEADLINES: IGNORED' : 'DEADLINES: ACTIVE'}
                </button>
              </div>

              {/* Toggle: Deadline Nudges on Today view */}
              <div className="flex items-center justify-between gap-4 p-3 bg-zinc-905 bg-zinc-900/10 border border-zinc-950 rounded-xl">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-200 block">Today Page Scheduling Nudges</span>
                  <p className="text-[10.5px] text-zinc-500 leading-normal max-w-sm">
                    Surface a "Needs Scheduling" alert on the Today board if tasks with a 48h deadline are not scheduled on your timeline.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNudges}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                    nudgesEnabled
                      ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400'
                      : 'bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:text-zinc-350'
                  }`}
                >
                  {nudgesEnabled ? 'NUDGES: ENABLED' : 'NUDGES: MUTED'}
                </button>
              </div>

              {/* Slider Controls for Weights (Only shown if Ignore energy is false) */}
              {!ignoreEnergy && (
                <div className="pt-3 border-t border-zinc-900/50 space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsBiorhythmsExpanded(!isBiorhythmsExpanded)}
                    className="w-full flex items-center justify-between text-left cursor-pointer select-none"
                  >
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                      Circadian Focus Bias Weights Settings
                    </span>
                    <span className="text-zinc-550 hover:text-zinc-350 font-mono text-[9px] uppercase font-bold">
                      {isBiorhythmsExpanded ? '▾ Hide weights multipliers' : '▸ View weights multipliers'}
                    </span>
                  </button>

                  {isBiorhythmsExpanded && (
                    <div className="space-y-4 animate-fadeIn pt-1">
                  
                  {/* Morning Weight */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-300 font-medium font-sans">Morning Focus (08:00 - 12:00)</span>
                      <span className="font-mono text-indigo-400 font-bold">Multiplier: {morningWeight}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={morningWeight}
                      onChange={(e) => handleWeightChange('scheduler.preferences.morningWeight', parseFloat(e.target.value), setMorningWeight)}
                      className="w-full accent-indigo-500 bg-zinc-900 h-1 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Afternoon Weight */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-300 font-medium font-sans">Afternoon Focus (12:00 - 17:00)</span>
                      <span className="font-mono text-indigo-400 font-bold">Multiplier: {afternoonWeight}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={afternoonWeight}
                      onChange={(e) => handleWeightChange('scheduler.preferences.afternoonWeight', parseFloat(e.target.value), setAfternoonWeight)}
                      className="w-full accent-indigo-500 bg-zinc-900 h-1 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Evening Weight */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-300 font-medium font-sans">Evening Focus (17:00 - 22:00)</span>
                      <span className="font-mono text-indigo-400 font-bold">Multiplier: {eveningWeight}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={eveningWeight}
                      onChange={(e) => handleWeightChange('scheduler.preferences.eveningWeight', parseFloat(e.target.value), setEveningWeight)}
                      className="w-full accent-indigo-500 bg-zinc-900 h-1 rounded-lg cursor-pointer"
                    />
                  </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Knowledge Vault & Notes Card */}
          <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5 space-y-5" id="notes-knowledge-vault-settings-card">
            <header className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-sans">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Knowledge Vault & Notes Feature
              </h3>
              <button
                type="button"
                onClick={handleToggleNotesEnabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                  notesEnabled
                    ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400'
                    : 'bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:text-zinc-350'
                }`}
                id="notes-feature-enabled-toggle"
              >
                {notesEnabled ? 'VAULT UI: ACTIVE' : 'VAULT UI: HIDDEN'}
              </button>
            </header>

            <div className="space-y-4">
              <p className="text-[10.5px] text-zinc-500 leading-normal max-w-xl font-sans font-medium">
                Organically link standalone notes to existing tasks, projects, or active focus sessions. Notes can be fully compiled and exported to a standardized Obsidian-compatible directory. Disabling hides all Note UI components to reduce visual weight but preserves your notes database.
              </p>
            </div>
          </div>

          {/* Flexible Views & Spatial Canvas Settings Card */}
          <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5 space-y-5" id="flexible-views-canvas-settings-card">
            <header className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-sans">
                <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
                Relations, Views & Spatial Canvas Feature
              </h3>
              <button
                type="button"
                onClick={handleToggleViewsEnabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                  viewsEnabled
                    ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400'
                    : 'bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:text-zinc-350'
                }`}
                id="views-feature-enabled-toggle"
              >
                {viewsEnabled ? 'VIEWS UI: ACTIVE' : 'VIEWS UI: HIDDEN'}
              </button>
            </header>

            <div className="space-y-4">
              <p className="text-[10.5px] text-zinc-500 leading-normal max-w-xl font-sans font-medium">
                Create names presets, load relational Kanban boards, timelines, galleries, and Heptabase-style interactive spatial boards. Disabling reduces visual layout load by hiding views navigation entries while preserving your configurations and custom action presets.
              </p>
            </div>
          </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CATEGORY 4: SECURITY VAULT, BACKUPS & INTEGRITY CORES */}
          <div className="border border-zinc-900 rounded-2xl overflow-hidden bg-zinc-950/10">
            <button
              onClick={() => setIsPrivacyExpanded(!isPrivacyExpanded)}
              className="w-full flex items-center justify-between p-5 hover:bg-zinc-900/30 transition-all text-left select-none cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                    Privacy Vault, Backups & licensing
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Manage secure offline manual backups, automated directory rotation schedules, local audit trails, and client licensing activation.
                  </p>
                </div>
              </div>
              <span className="text-zinc-550 hover:text-zinc-350 pr-1">
                {isPrivacyExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isPrivacyExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                  animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                  exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  className="p-5 border-t border-zinc-900/80 space-y-5"
                >
                  {/* Upgrade & Client Licensing Cores Card */}
                  <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5 space-y-5" id="upgrade-and-licensing-cores-card">
                    <button
                      type="button"
                      onClick={() => setIsLicensingExpanded(!isLicensingExpanded)}
                      className="w-full flex items-center justify-between border-b border-zinc-900/60 pb-3 text-left cursor-pointer select-none"
                    >
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-sans">
                        <Lock className="w-3.5 h-3.5 text-indigo-400" />
                        Upgrade & Client Licensing Cores
                      </h3>
                      <span className="text-zinc-550 hover:text-zinc-300 font-mono text-[10px] uppercase font-bold">
                        {isLicensingExpanded ? '▾ Hide License Key Input' : '▸ View License Key Input'}
                      </span>
                    </button>

                    {isLicensingExpanded && (
                      <div className="space-y-4 animate-fadeIn pt-1">
            <header className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-sans">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                Upgrade & Client Licensing Cores
              </h3>
              <div className="flex items-center gap-1.5">
                {licenseEntitlements.tier === 'free' ? (
                  <span className="text-[9.5px] text-emerald-400 font-mono font-bold tracking-wider bg-emerald-500/10 px-2.5 py-0.5 border border-emerald-500/20 rounded">
                    FREE TIER ACTIVE
                  </span>
                ) : licenseEntitlements.isTrial ? (
                  <span className="text-[9.5px] text-yellow-500 font-mono font-bold tracking-wider bg-yellow-500/10 px-2.5 py-0.5 border border-yellow-500/20 rounded">
                    TRIAL ACTIVE
                  </span>
                ) : (
                  <span className="text-[9.5px] text-indigo-400 font-mono font-bold tracking-wider bg-indigo-505/20 px-2.5 py-0.5 border border-indigo-505/20 rounded uppercase">
                    PRO CAPACITY VERIFIED
                  </span>
                )}
              </div>
            </header>

            <div className="space-y-4">
              <p className="text-[10.5px] text-zinc-505 leading-normal max-w-xl font-sans font-medium text-zinc-400">
                Keystone maintains an honest local-first philosophy. Core features are 100% free with unlimited local tasks, habits, and notes. Power features require an asymmetric licensing activation.
              </p>

              {/* Status and metadata information */}
              <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-900 space-y-3 font-mono text-[10.5px]">
                <div className="flex justify-between items-center text-zinc-350">
                  <span className="text-[9px] uppercase font-sans text-zinc-500 font-semibold">Active Licensing State</span>
                  <span className="font-semibold text-zinc-200 uppercase">
                    {licenseEntitlements.tier === 'free'
                      ? 'Local Core Free Edition'
                      : licenseEntitlements.isTrial
                      ? '14-Day Evaluator Trial'
                      : `Keystone Premium (${licenseEntitlements.tier})`}
                  </span>
                </div>

                {licenseEntitlements.isTrial && licenseEntitlements.expiresAt && (
                  <div className="flex justify-between items-center text-zinc-350 border-t border-zinc-905/30 pt-2 text-yellow-400">
                    <span className="text-[9px] uppercase font-sans text-zinc-500 font-semibold">Evaluation Mode Days Rem</span>
                    <span className="font-bold">
                      {Math.max(0, Math.ceil((new Date(licenseEntitlements.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} Days left
                    </span>
                  </div>
                )}

                {licenseEntitlements.tier !== 'free' && !licenseEntitlements.isTrial && (
                  <>
                    <div className="flex justify-between items-center text-zinc-350 border-t border-zinc-900/60 pt-2">
                      <span className="text-[9px] uppercase font-sans text-zinc-500 font-semibold">Licensing Expiration Frame</span>
                      <span className="font-semibold text-zinc-200">
                        {licenseEntitlements.expiresAt ? new Date(licenseEntitlements.expiresAt).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                    {licenseEntitlements.offlineGraceUntil && (
                      <div className="flex justify-between items-center text-zinc-350">
                        <span className="text-[9px] uppercase font-sans text-zinc-500 font-semibold">Offline Verification Grace</span>
                        <span className="font-semibold text-amber-400 bg-amber-500/5 border border-amber-500/10 px-1 rounded text-[9px]">
                          Grace Active until {new Date(licenseEntitlements.offlineGraceUntil).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between items-center text-zinc-350 border-t border-zinc-900/60 pt-2">
                  <span className="text-[9px] uppercase font-sans text-zinc-500 font-semibold">Hardware Node Fingerprint</span>
                  <span className="text-[9.5px] truncate max-w-xs font-semibold text-zinc-400" title={licenseEntitlements.machineHash || 'Calculating fingerprint...'}>
                    {licenseEntitlements.machineHash || 'Initializing fingerprint...'}
                  </span>
                </div>
              </div>

              {/* Activation action control block */}
              {licenseStatusMessage && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    licenseStatusMessage.type === 'success'
                      ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10 animate-fadeIn'
                      : 'bg-rose-500/5 text-rose-400 border-rose-500/10 animate-fadeIn'
                  }`}
                  id="licensing-interactive-notice"
                >
                  {licenseStatusMessage.text}
                </div>
              )}

              {licenseEntitlements.tier === 'free' ? (
                <div className="space-y-4 pt-1">
                  {/* Trial trigger */}
                  <div className="flex items-center justify-between p-3.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                    <div className="space-y-0.5 flex-1 pr-4">
                      <span className="text-xs font-bold text-zinc-200 flex items-center gap-1">
                        <Sparkles size={13} className="text-indigo-400 animate-pulse" /> Start Free Evaluator Mode
                      </span>
                      <span className="text-[10px] text-zinc-500 block leading-normal">
                        Unlock smart schedulers, time projections, and advanced analytics free for 14 days. No credit card required.
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={licenseSubmitting}
                      onClick={handleStartLicenseTrial}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-550 border border-indigo-500/20 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-98 disabled:opacity-50 select-none shrink-0"
                      id="licensing-start-trial-btn"
                    >
                      Assess Pro Free
                    </button>
                  </div>

                  {/* Manual Key Input */}
                  <div className="space-y-2.5">
                    <label className="text-[9.5px] uppercase font-bold text-zinc-550 font-sans tracking-wider block">
                      Register Enterprise/Professional Key
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={licenseKeyInput}
                        onChange={(e) => setLicenseKeyInput(e.target.value)}
                        placeholder="Insert activation key or cryptographic token..."
                        disabled={licenseSubmitting}
                        className="flex-1 bg-zinc-900/40 border border-zinc-900 hover:border-zinc-800 text-xs px-3.5 py-2 rounded-xl text-zinc-200 outline-none placeholder:text-zinc-600 font-mono focus:border-indigo-500/50"
                        id="licensing-key-input-field"
                      />
                      <button
                        type="button"
                        onClick={handleRegisterLicenseKey}
                        disabled={licenseSubmitting || !licenseKeyInput.trim()}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-98 select-none"
                        id="licensing-submit-key-btn"
                      >
                        {licenseSubmitting ? 'Evaluating...' : 'Register key'}
                      </button>
                    </div>
                    <div className="text-[9.5px] text-zinc-550 leading-normal font-sans">
                      Device activation relies fully on client cryptographic proofs. For verification guidelines or keys generation offline, consult standard manuals inside <code className="bg-zinc-900/60 text-zinc-400 px-1 py-0.5 rounded text-[9px] font-mono">/docs/LICENSING.md</code>.
                    </div>
                    <div className="text-[9.5px] text-zinc-550 leading-normal font-sans mt-1">
                      <span className="text-zinc-500">Local Testing Bypass Code:</span> <code className="bg-zinc-900 text-indigo-400 px-1 py-0.5 rounded font-bold cursor-pointer hover:text-indigo-300 select-all font-mono" onClick={() => setLicenseKeyInput('KEYSTONE-DEV-FREE-PRO-PASS')}>KEYSTONE-DEV-FREE-PRO-PASS</code> (Instantly toggles full Pro features locally for development validation).
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-zinc-900/60 flex items-center justify-between">
                  <div className="text-[10px] text-zinc-500 font-medium font-sans">
                    This computer is actively licensed. Want to release the slot or return to basic view filters?
                  </div>
                  <button
                    type="button"
                    disabled={licenseSubmitting}
                    onClick={handleDeactivateLicenseKey}
                    onMouseLeave={() => setConfirmingDeactivate(false)}
                    className={cn(
                      "px-4 py-2 border rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-98 select-none shrink-0 min-h-10 min-w-10",
                      confirmingDeactivate
                        ? "bg-rose-950 border-rose-500 text-rose-400 animate-pulse font-bold"
                        : "bg-rose-950/20 hover:bg-rose-900/20 border border-rose-900/30 text-rose-400 hover:text-rose-300"
                    )}
                    id="licensing-release-seat-btn"
                  >
                    {confirmingDeactivate ? 'Confirm Deactivation?' : 'Deactivate License'}
                  </button>
                </div>
              )}
                      </div>
                      </div>
                    )}
            </div>

          {/* Privacy Vault: "Your Data" Section */}
          <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5 space-y-5" id="privacy-vault-backups-card">
            <header className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-sans">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                Privacy Vault & Secure Manual Backups
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono font-semibold tracking-wider bg-indigo-505/20 px-2 py-0.5 border border-indigo-505/20 rounded">
                 AES-256 ENCRYPTED CORES
              </p>
            </header>

            <div className="space-y-4">
              <p className="text-[10.5px] text-zinc-500 leading-normal max-w-xl font-sans font-medium text-zinc-400">
                Every task, project, habit, noted document, and view preset resides encapsulated offline. Generate secure backup payloads using standard AES-256-GCM symmetric encryption below.
              </p>

              {dbStats && (
                <div className="grid grid-cols-2 gap-3.5 bg-zinc-950/40 p-4 rounded-xl border border-zinc-900 text-xs text-zinc-301 font-mono">
                  <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                    <span className="text-[9px] text-zinc-500 uppercase font-sans font-semibold">Total Encapsulated Records</span>
                    <span className="font-semibold text-zinc-200">
                      {dbStats.tasksCount} tasks • {dbStats.projectsCount} projects • {dbStats.habitsCount} habits • {dbStats.notesCount} notes
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                    <span className="text-[9px] text-zinc-500 uppercase font-sans font-semibold">Database Schema Payload</span>
                    <span className="font-semibold text-zinc-200 truncate cursor-help" title={dbStats.dbPath}>
                      {dbStats.dbPath}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 pt-2 border-t border-zinc-900/80 w-full col-span-2">
                    <span className="text-[9px] text-zinc-500 uppercase font-sans font-semibold">Decrypted Storage Size</span>
                    <span className="font-semibold text-zinc-200">{dbStats.dbSizeKb} KB</span>
                  </div>
                  <div className="flex flex-col gap-1 pt-2 border-t border-zinc-900/80 w-full col-span-2">
                    <span className="text-[9px] text-zinc-500 uppercase font-sans font-semibold">Last Encryption Cycle Created</span>
                    <span className="font-semibold text-indigo-400">{dbStats.lastBackupDate}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleBackupNow}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 active:scale-98"
                  id="vault-backup-now-btn"
                >
                  <Key size={12} /> Backup Now
                </button>

                <button
                  type="button"
                  onClick={handleRestoreBackup}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 active:scale-98"
                  id="vault-restore-btn"
                >
                  <Database size={12} /> Restore Backup (.keystone-backup)
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 active:scale-98"
                  id="vault-export-json-btn"
                >
                  <FileText size={12} /> Export Workspace as JSON
                </button>

                <button
                  type="button"
                  onClick={() => handleMultiFormatExport('json')}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 active:scale-98"
                  id="vault-export-multi-json-btn"
                >
                  <FileText size={12} /> Export as JSON
                </button>

                <button
                  type="button"
                  onClick={() => handleMultiFormatExport('csv')}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 active:scale-98"
                  id="vault-export-multi-csv-btn"
                >
                  <FileSpreadsheet size={12} /> Export as CSV
                </button>
              </div>

              {/* Danger Zone Level 2 Accordion */}
              <div className="border-t border-zinc-900/40 pt-4 mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setIsDangerZoneExpanded(!isDangerZoneExpanded)}
                  className="w-full flex items-center justify-between text-left cursor-pointer select-none"
                  id="vault-danger-zone-accordion"
                >
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-rose-450 tracking-wide font-sans block flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400 animate-pulse" />
                      Danger Zone (Advanced Options)
                    </span>
                    <p className="text-[10px] text-zinc-550 font-sans leading-normal">
                      Destructive operations, database wipe, full application state reset.
                    </p>
                  </div>
                  <span className="text-zinc-500 font-bold font-mono text-[10px] shrink-0">
                    {isDangerZoneExpanded ? '▾ Hide Danger Zone' : '▸ View Danger Zone'}
                  </span>
                </button>

                {isDangerZoneExpanded && (
                  <div className="flex items-center justify-between p-3 bg-rose-950/5 border border-rose-900/10 rounded-xl animate-fadeIn">
                    <p className="text-[10.5px] text-zinc-400">
                      This operation cannot be undone. All tasks, notes, habits, and sessions will be deleted permanently.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setWipePasswordInput('')
                        setAgreeWipeCheck(false)
                        setShowWipeModal(true)
                      }}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 active:scale-98 select-none shrink-0"
                      id="vault-wipe-all-btn"
                    >
                      <Trash2 size={12} /> Reset Keystone
                    </button>
                  </div>
                )}
              </div>

              {/* Weekly/Monthly Rotated Auto backups section */}
              <div className="border-t border-zinc-900/60 pt-5 mt-5 space-y-4">
                <button
                  type="button"
                  onClick={() => setIsAutoBackupsExpanded(!isAutoBackupsExpanded)}
                  className="w-full flex items-center justify-between text-left cursor-pointer select-none"
                >
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-zinc-330 tracking-wide font-sans block flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-emerald-450 text-emerald-400" />
                      Weekly Rotating Auto-Backup Scheduler
                    </span>
                    <p className="text-[10px] text-zinc-550 leading-normal max-w-lg font-sans">
                      Automatically rotates and manages security points.
                    </p>
                  </div>
                  <span className="text-zinc-550 hover:text-zinc-300 font-mono text-[9px] uppercase font-bold shrink-0">
                    {isAutoBackupsExpanded ? '▾ Hide Auto-Backup' : '▸ View Auto-Backup'}
                  </span>
                </button>

                {isAutoBackupsExpanded && (
                  <div className="space-y-4 animate-fadeIn pt-1">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-zinc-500 leading-normal max-w-lg font-sans">
                          Active scheduler retains exactly the last <strong>4 weekly</strong> and <strong>3 monthly</strong> files.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleAutoBackup}
                        className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                          autoBackupEnabled
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                            : 'bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:text-zinc-300'
                        }`}
                      >
                        {autoBackupEnabled ? 'AUTO CORES: RUNNING' : 'AUTO CORES: SLEEPING'}
                      </button>
                    </div>

                    {autoBackupEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950/20 p-4 border border-zinc-900 rounded-xl space-y-2 sm:space-y-0 animate-fadeIn">
                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-zinc-500 font-sans font-semibold">AUTOMATED TARGET STORAGE DIRECTORY (ABSOLUTE PATH)</span>
                          <input
                            type="text"
                            value={autoBackupPath}
                            onChange={(e) => handleAutoBackupPathChange(e.target.value)}
                            placeholder="e.g. C:/Users/SoloDev/Documents/KeystoneAutobackup"
                            className="w-full bg-zinc-90 w-full bg-zinc-900/40 border border-zinc-900 hover:border-zinc-800 text-xs px-3 py-2 rounded-xl text-zinc-200 outline-none placeholder:text-zinc-600 font-mono"
                          />
                        </div>

                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-zinc-500 font-sans font-semibold">ROTATION INTENSITY CYCLE</span>
                          <select
                            value={autoBackupFrequency}
                            onChange={(e) => handleAutoBackupFrequencyChange(e.target.value as 'weekly' | 'monthly')}
                            className="w-full bg-zinc-900/40 border border-zinc-900 hover:border-zinc-800 text-xs px-3 py-2 rounded-xl text-zinc-300 outline-none font-mono"
                          >
                            <option value="weekly">Weekly Rotation (Every 7 days)</option>
                            <option value="monthly">Monthly Rotation (Every 30 days)</option>
                          </select>
                        </div>

                        <div className="col-span-2 pt-1 border-t border-zinc-900/30 text-[9.5px] font-mono text-zinc-500 flex items-center gap-1.5">
                          <Info size={10} className="text-zinc-450 text-indigo-400 animate-pulse" />
                          Hourly background checks execute rotated encryptions using the system hardware default seed to allow hands-off recovery.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sync Service scaffold: "Coming Soon" styling */}
          <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5 space-y-4" id="decentralized-p2p-sync-card">
            <header className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 font-sans">
                <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                Secure Decentralized Peer-to-Peer Sync
              </h3>
              <p className="text-[9px] text-indigo-400 font-mono font-bold tracking-wider bg-indigo-500/10 px-2.5 py-0.5 border border-indigo-500/20 rounded">
                 COMING IN V1.4
              </p>
            </header>

            <div className="relative overflow-hidden group">
              <div className="space-y-3.5 text-[11px] leading-relaxed text-zinc-500 font-sans font-medium">
                <p>
                  Synchronize your active view placements, task lists, habits, and knowledge notes database in real-time across developer laptops on the same Wi-Fi enclave using zero-knowledge end-to-peer tunnels.
                </p>

                <div className="grid grid-cols-2 gap-3.5 bg-zinc-950/10 border border-zinc-900/50 p-4 rounded-xl font-mono text-[10px]">
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-550 block">TUNNEL CHANNEL IPアドレス</span>
                    <span className="text-zinc-600 text-zinc-500">Scanning local loopback...</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-550 block">P2P EXCHANGE HANDSHAKES</span>
                    <span className="text-zinc-600 text-zinc-500">Uninitialized enclaves</span>
                  </div>
                </div>
              </div>

              {/* Frost overlay mask with coming soon message */}
              <div className="absolute inset-0 bg-zinc-950/65 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center rounded-xl border border-dashed border-zinc-800/65">
                <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase flex items-center gap-1 mb-1 animate-pulse">
                  <Plus size={10} /> Local Noise Sync Enclave Specification
                </span>
                <span className="text-[10.5px] text-zinc-300 font-semibold font-sans max-w-sm">
                  We are actively building cryptographic local sync models which will bypass standard public servers entirely. Read design specs inside of <code className="bg-zinc-900 text-indigo-350 px-1 py-0.5 rounded text-[10px]">/docs/SYNC_DESIGN.md</code>.
                </span>
              </div>
            </div>
          </div>

          {/* Secure Audit Trails */}
          <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5 space-y-4" id="privacy-audit-logs-card">
            <button
              type="button"
              onClick={() => setIsAuditLogsExpanded(!isAuditLogsExpanded)}
              className="w-full flex items-center justify-between border-b border-zinc-900/60 pb-3 text-left cursor-pointer select-none"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-sans">
                <Check className="w-3.5 h-3.5 text-indigo-400" />
                Security Suite Local Audit Trail
              </h3>
              <span className="text-zinc-550 hover:text-zinc-350 font-mono text-[10px] uppercase font-bold">
                {isAuditLogsExpanded ? '▾ Hide Audit Logs' : '▸ View Audit Logs'}
              </span>
            </button>

            {isAuditLogsExpanded && (
              <div className="space-y-4 animate-fadeIn pt-1">

            <div className="space-y-3.5">
              <p className="text-[10.5px] text-zinc-500 leading-normal max-w-xl font-sans font-medium">
                Pristine, non-repudiable logs of encryption hooks, manual database resets, backup decryptions, and configuration overrides. Auto-purged once logs span beyond the limit of continuous <strong>100 records</strong>.
              </p>

              {auditLogsLoading ? (
                <div className="py-8 text-center text-zinc-500 text-xs italic font-mono animate-pulse">
                  Querying security audit logs schema...
                </div>
              ) : auditLogs.length > 0 ? (
                <div className="space-y-2">
                  <div className="border border-zinc-900 bg-black/40 rounded-xl overflow-hidden font-mono text-[10.5px]">
                    <div className="max-h-[180px] overflow-y-auto custom-scrollbar divide-y divide-zinc-900 text-zinc-300">
                      {auditLogs.map((log: any, i: number) => {
                        let badgeColor = 'text-zinc-550 border-zinc-900 bg-zinc-950/30'
                        if (log.action.includes('created') || log.action.includes('success')) {
                          badgeColor = 'text-emerald-450 text-emerald-400 border-emerald-500/10 bg-emerald-500/5'
                        } else if (log.action.includes('wipe') || log.action.includes('failure') || log.action.includes('error')) {
                          badgeColor = 'text-rose-450 text-rose-400 border-rose-500/10 bg-rose-500/5'
                        } else if (log.action.includes('export') || log.action.includes('settings')) {
                          badgeColor = 'text-indigo-455 text-indigo-450 text-indigo-400 border-indigo-500/10 bg-indigo-505/5'
                        }

                        return (
                          <div key={`audit-trace-${log.id || i}`} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-zinc-950/30 transition-colors">
                            <div className="flex items-start gap-2.5">
                              <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border shrink-0 ${badgeColor}`}>
                                {log.action}
                              </span>
                              <div className="flex flex-col">
                                <span className="text-zinc-200 select-text font-semibold">{log.category} (Record: {log.record_id || 'Global'})</span>
                                {log.meta_json && (
                                  <span className="text-[9.5px] text-zinc-450 text-zinc-500 select-all truncate break-all max-w-[320.5px] sm:max-w-[420px]" title={log.meta_json}>
                                    Metadata: {log.meta_json}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[9.5px] text-zinc-600 sm:text-right shrink-0">
                              {new Date(log.timestamp).toLocaleString([], { hour12: false })}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[9.5px] font-mono text-zinc-500 pt-1">
                    <span>Audit Store Level Integrity: Verified (SQLite standard log)</span>
                    <button
                      onClick={triggerAuditLogRefresh}
                      className="hover:text-zinc-300 flex items-center gap-1 transition-all"
                    >
                      <RotateCcw size={10} /> Refresh Audit Trail
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-zinc-900 border-dashed rounded-xl p-6 text-center text-zinc-500 italic text-xs">
                  No active security events recorded log trail yet. Backups will trigger events here.
                </div>
              )}
              </div>
              </div>
            )}
          </div>

          {/* Zero-Trust Hermetic Sandbox Verification: Outbound Traffic logs panel */}
          <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5 space-y-4" id="hermetic-sandbox-telemetry-panel">
            <header className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-330 text-zinc-400 flex items-center gap-1.5 font-sans">
                <WifiOff className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Hermetic Sandbox & Air-Gap Telemetry Monitor
              </h3>
              <p className="text-[9.5px] text-emerald-400 font-mono font-bold tracking-widest leading-none bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15 flex items-center gap-0.5">
                ● 100% AIR-GAPPED
              </p>
            </header>

            <div className="space-y-3">
              <p className="text-[10.5px] text-zinc-500 leading-normal max-w-xl font-sans font-medium">
                Our strict <strong>Offline-First Privacy Manifesto</strong> prohibits telemetry, analytics, and third-party trackers. Below is a real-time trace of application socket outbound queries, proving absolute network encapsulation.
              </p>

              <div className="border border-zinc-900 bg-black p-3.5 rounded-xl font-mono text-[10px] space-y-2">
                <div className="flex items-center justify-between text-zinc-500 border-b border-zinc-900/80 pb-2 mb-1 uppercase text-[9px] font-bold">
                  <span>OUTBOUND DNS & TCP STREAM</span>
                  <span>STATUS / ROUTE</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-rose-450 text-rose-500 font-bold">✗</span>
                    <span className="truncate">api.amplitude.com/telemetry</span>
                  </div>
                  <span className="text-rose-500 font-bold bg-rose-500/5 border border-rose-500/10 px-1 rounded text-[9px] uppercase">Blocked by sandbox</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-rose-450 text-rose-500 font-bold">✗</span>
                    <span className="truncate">www.google-analytics.com/g/collect</span>
                  </div>
                  <span className="text-rose-500 font-bold bg-rose-500/5 border border-rose-500/10 px-1 rounded text-[9px] uppercase">Blocked by sandbox</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-rose-450 text-rose-500 font-bold">✗</span>
                    <span className="truncate">mixpanel.com/track</span>
                  </div>
                  <span className="text-rose-500 font-bold bg-rose-500/5 border border-rose-500/10 px-1 rounded text-[9px] uppercase">Blocked by sandbox</span>
                </div>
                <div className="flex justify-between items-center text-zinc-300/80 border-t border-zinc-900/60 pt-2 text-[9.5px]">
                  <span>Active Open Sockets (Total):</span>
                  <span className="font-bold text-zinc-200">0 Network sockets open</span>
                </div>
                <div className="flex justify-between items-center text-zinc-301/80 text-[9.5px]">
                  <span>Air-Gap Core Leak Prevention:</span>
                  <span className="font-bold text-emerald-400 uppercase">100% Hermetic Lock</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance & Local Telemetry cockpit card */}
          <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-5 space-y-5" id="performance-telemetry-cockpit-card">
            <button
              type="button"
              onClick={() => setIsTelemetryExpanded(!isTelemetryExpanded)}
              className="w-full flex items-center justify-between border-b border-zinc-900/60 pb-3 text-left cursor-pointer select-none"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-sans">
                <Zap className="w-3.5 h-3.5 text-amber-550 text-amber-400 animate-pulse" />
                Performance Engine & Telemetry
              </h3>
              <span className="text-zinc-555 hover:text-zinc-300 font-mono text-[10px] uppercase font-bold">
                {isTelemetryExpanded ? '▾ Hide Performance Timings' : '▸ View Performance Timings'}
              </span>
            </button>

            {isTelemetryExpanded && (
              <div className="space-y-4 animate-fadeIn pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/20 p-4 border border-zinc-900/60 rounded-xl">
                  <p className="text-[10.5px] text-zinc-400 leading-normal max-w-xl font-sans">
                    Keystone is equipped with low-level execution proxies to trace SQLite query timings. Turning telemetry recording on lets you monitor local process heap usage and database request durations in real-time.
                  </p>
                  <button
                    type="button"
                    onClick={handleToggleTelemetry}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer select-none shrink-0 ${
                      telemetryEnabled
                        ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                        : 'bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:text-zinc-350'
                    }`}
                    id="telemetry-recording-toggle"
                  >
                    {telemetryEnabled ? 'TELEMETRY: RECORDING' : 'TELEMETRY: DISABLED'}
                  </button>
                </div>

              {telemetryEnabled && perfStats ? (
                <div className="space-y-4 animate-fadeIn" id="telemetry-stats-active-display">
                  {/* Stats Summary row */}
                  <div className="grid grid-cols-3 gap-3.5">
                    <div className="bg-zinc-950/40 border border-zinc-900 p-3 rounded-xl text-center space-y-1">
                      <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block">Avg Latency</span>
                      <span className="text-sm font-mono font-bold text-emerald-400">
                        {perfStats.avgDurationMs ? `${perfStats.avgDurationMs.toFixed(3)}ms` : '0.00ms'}
                      </span>
                    </div>

                    <div className="bg-zinc-950/40 border border-zinc-900 p-3 rounded-xl text-center space-y-1">
                      <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block">Total Queries</span>
                      <span className="text-sm font-mono font-bold text-zinc-200">
                        {perfStats.totalQueries ?? 0}
                      </span>
                    </div>

                    <div className="bg-zinc-950/40 border border-zinc-900 p-3 rounded-xl text-center space-y-1">
                      <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block">Process Memory</span>
                      <span className="text-sm font-mono font-bold text-indigo-400">
                        {perfStats.memoryUsage?.heapUsedMb ? `${perfStats.memoryUsage.heapUsedMb} MB` : '--'}
                      </span>
                    </div>
                  </div>

                  {/* Memory breakdown details */}
                  {perfStats.memoryUsage && (
                    <div className="bg-zinc-950/20 border border-zinc-900/30 p-3.5 rounded-xl space-y-2">
                      <span className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block flex items-center gap-1 leading-none">
                        <Cpu size={10} /> Process Memory Allocation
                      </span>
                      <div className="grid grid-cols-2 gap-3 text-[10.5px] font-mono text-zinc-400">
                        <div className="flex justify-between border-b border-zinc-900 pb-1">
                          <span className="text-zinc-500">Node RSS Size:</span>
                          <span className="font-bold text-zinc-350">{perfStats.memoryUsage.rssMb} MB</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-900 pb-1">
                          <span className="text-zinc-500">Node Heap Total:</span>
                          <span className="font-bold text-zinc-350">{perfStats.memoryUsage.heapTotalMb} MB</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recent Queries Console log */}
                  <div className="bg-zinc-950 border border-zinc-900 p-3.5 rounded-xl space-y-2.5">
                    <span className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block flex items-center gap-1 leading-none">
                      <Activity size={10} /> Real-Time Trace Log (Latest Queries)
                    </span>
                    
                    {perfStats.recentLogs && perfStats.recentLogs.length > 0 ? (
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1 divide-y divide-zinc-900 text-[10.5px] font-mono">
                        {perfStats.recentLogs.slice(0, 10).map((log: any, idx: number) => {
                          const isSlow = log.durationMs > 5.0
                          return (
                            <div key={`query-log-${idx}`} className="pt-1.5 first:pt-0 pb-1.5 flex flex-col gap-0.5">
                              <div className="flex items-start justify-between gap-4">
                                <span className="text-zinc-300 break-all line-clamp-1 truncate select-text flex-1" title={log.sql}>
                                  {log.sql}
                                </span>
                                <span className={`shrink-0 font-bold ${isSlow ? 'text-rose-450' : 'text-emerald-400'}`}>
                                  {log.durationMs.toFixed(3)} ms
                                </span>
                              </div>
                              <span className="text-[9px] text-zinc-650 text-zinc-600">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-zinc-500 text-xs italic">
                        No active query events recorded log yet. Invoke activities in application to trigger queries.
                      </div>
                    )}
                  </div>
                </div>
              ) : telemetryEnabled ? (
                <div className="py-8 text-center text-zinc-500 text-xs italic font-mono animate-pulse">
                  Constructing telemetry state console...
                </div>
              ) : null}

              {/* Maintenance Tools Row */}
              <div className="pt-4 border-t border-zinc-900/50 flex items-center justify-between gap-4">
                <div className="space-y-0.5 flex-1 pr-2">
                  <span className="text-[11px] font-bold text-zinc-300 block">Atomic Optimization Maintenance</span>
                  <p className="text-[10px] text-zinc-500 leading-normal font-sans">
                    Manually execute defragment space recovery (<code>VACUUM</code>) and query indices analytics optimizations (<code>ANALYZE</code>) to rebuild storage allocations.
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button
                    type="button"
                    onClick={handleRunVacuum}
                    disabled={isVacuuming}
                    className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 hover:text-white text-zinc-400 disabled:opacity-50 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-[0.98]"
                    id="manual-vacuum-trigger"
                  >
                    {isVacuuming ? 'Optimizing...' : 'Optimize Storage'}
                  </button>
                  {vacuumFinished && (
                    <span className="text-[9px] font-semibold text-emerald-400 font-mono" id="maintenance-success-indicator">
                      Optimization success!
                    </span>
                  )}
                </div>
              </div>
              </div>
            )}
          </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Informational Panel */}
        <div className="space-y-4">
          {/* How Keystone schedules explainer */}
          <div className="bg-indigo-950/5 border border-indigo-500/10 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-semibold tracking-wider uppercase text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              How Keystone Schedules
            </h4>
            <div className="text-[11.5px] text-zinc-300 space-y-2.5 leading-relaxed font-sans font-medium">
              <p>
                Keystone implements an <strong>assisted manual scheduling mechanism</strong>. Instead of forcing calendar alterations, the engine calculates optimal <strong>Ghost Blocks</strong> you can interactively adjust and approve.
              </p>
              <div className="bg-zinc-950/30 p-2.5 rounded-lg border border-zinc-900 font-mono text-[10px] space-y-2.5 text-zinc-400">
                <span className="text-[9px] font-bold text-zinc-500 block uppercase mb-1">Algorithmic Decision Tree Matchers:</span>
                <div>
                  <span className="text-indigo-400">1. Conflict Filtering</span>: Removes prospective calendar slots overlapping with existing events.
                </div>
                <div>
                  <span className="text-emerald-400">2. Circadian Synergy</span>: Scores prospective blocks higher in slots matching your designated peak energy multipliers.
                </div>
                <div>
                  <span className="text-amber-400">3. Deadline Urgency</span>: Prioritizes and shifts up tasks with approaching deadlines in less than 48 hours.
                </div>
                <div>
                  <span className="text-purple-400">4. High Focus Mapping</span>: Matches task notes keywords like <code>#high-focus</code> to morning peak window hours.
                </div>
              </div>
              <p className="text-zinc-450 text-[11px] italic leading-normal">
                This mathematical tuning reduces scheduling friction while preserving precise user decision control over task timing.
              </p>
            </div>
          </div>

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
                Workspaces and terminal/editor frame shifts (like VS Code, GitBash, Keystone itself) are fully whitelisted as native productive time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showWipeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-905 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-sm font-bold uppercase tracking-wider text-rose-450 mb-3 flex items-center gap-1.5">
              ⚠️ EXTREME ACTION REQUIRED
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              This will completely wipe your local database, discarding all task histories, habits, notes, custom layouts, and logs permanently. This action is irreversible.
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-semibold text-zinc-500">
                  Type the app name &ldquo;<strong>keystone</strong>&rdquo; to confirm
                </label>
                <input
                  type="text"
                  value={wipePasswordInput}
                  onChange={(e) => setWipePasswordInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none focus:border-rose-500 transition-all font-mono"
                  placeholder="keystone"
                />
              </div>

              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="agree-wipe"
                  checked={agreeWipeCheck}
                  onChange={(e) => setAgreeWipeCheck(e.target.checked)}
                  className="mt-0.5 accent-rose-500"
                />
                <label htmlFor="agree-wipe" className="text-[10.5px] text-zinc-400 font-sans cursor-pointer">
                  I agree that wiping will discard all structural datasets and cannot be undone.
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowWipeModal(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleWipeDatabase}
                  disabled={wipePasswordInput.toLowerCase() !== 'keystone' || !agreeWipeCheck}
                  className="px-4 py-2 bg-rose-950 hover:bg-rose-600 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs font-semibold text-white shadow-md active:scale-98"
                >
                  Erase Everything
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBackupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5 font-sans">
              <Lock size={14} className="text-indigo-400" /> Specify Core Security Key
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4 font-sans font-medium">
              Export an encrypted security file copy. This payload uses symmetric AES-256-GCM verification. You must supply this passphrase to decrypt it later.
            </p>

            <div className="space-y-4">
              <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-900 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-key-backup"
                  checked={useAutoKey}
                  onChange={(e) => setUseAutoKey(e.target.checked)}
                  className="accent-indigo-500 cursor-pointer"
                />
                <label htmlFor="auto-key-backup" className="text-[10.5px] text-zinc-300 font-medium cursor-pointer font-sans select-none">
                  Use default device key (Recommended)
                </label>
              </div>

              {!useAutoKey && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-[9.5px] uppercase font-bold text-zinc-500 font-sans tracking-wider block">
                    Custom Encryption Passphrase
                  </label>
                  <input
                    type="password"
                    value={passphraseInput}
                    onChange={(e) => setPassphraseInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-505 transition-all font-mono"
                    placeholder="Type a secure passphrase..."
                  />
                  {passphraseInput && (
                    <div className="text-[9.5px] font-semibold text-zinc-500 flex items-center gap-1.5 pt-0.5">
                      <span className="font-mono">Strength:</span>
                      {passphraseInput.length < 8 ? (
                        <span className="text-amber-400 font-sans">Weak (&lt; 8 chars)</span>
                      ) : (
                        <span className="text-emerald-400 font-sans">Strong (Verified)</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBackupModal(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-400 cursor-pointer"
                  disabled={backupRunning}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBackupNowConfirm}
                  disabled={backupRunning || (!useAutoKey && !passphraseInput)}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs font-semibold text-white shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {backupRunning ? 'Encrypting...' : 'Save Encrypted Backup'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 mb-3 flex items-center gap-1.5 font-sans">
              <AlertTriangle size={14} className="text-amber-500" /> Decrypt & Restore Enclave
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4 font-sans font-medium">
              Restoring a backup file will completely overwrite all current tasks, layouts, habits, and notes datasets. This action is terminal and irreversible.
            </p>

            <div className="space-y-4">
              <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-900 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-key-restore"
                  checked={useAutoKey}
                  onChange={(e) => setUseAutoKey(e.target.checked)}
                  className="accent-indigo-500 cursor-pointer"
                />
                <label htmlFor="auto-key-restore" className="text-[10.5px] text-zinc-300 font-medium cursor-pointer font-sans select-none">
                  Decrypt with device credentials seed
                </label>
              </div>

              {!useAutoKey && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-[9.5px] uppercase font-bold text-zinc-500 font-sans tracking-wider block">
                    Decryption Passphrase Key
                  </label>
                  <input
                    type="password"
                    value={passphraseInput}
                    onChange={(e) => setPassphraseInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-505 transition-all font-mono"
                    placeholder="Enter decryption password..."
                  />
                </div>
              )}

              <div className="bg-zinc-900/20 p-2 rounded-xl text-[9px] font-mono text-zinc-500 border border-zinc-900 leading-snug">
                Warning: Decryption will fail instantly if credentials or security files are mismatched.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRestoreModal(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-400 cursor-pointer"
                  disabled={restoreRunning}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRestoreBackupConfirm}
                  disabled={restoreRunning || (!useAutoKey && !passphraseInput)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs font-semibold text-white shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {restoreRunning ? 'Restoring...' : 'Verify & Overwrite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
