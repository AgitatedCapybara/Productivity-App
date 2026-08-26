import { useEffect } from 'react'
import { MainLayout } from './layout/MainLayout'
import { useGlobalShortcut } from './hooks/useGlobalShortcut'
import { useProjects } from './hooks/useProjects'
import { useTaskSelection } from './hooks/useTaskSelection'
import { useLicense } from './hooks/useLicense'
import { useAppStore } from './store/useAppStore'
import { FirstRunFlow } from './components/onboarding/FirstRunFlow'
import './types'

export default function App() {
  useGlobalShortcut() // Register global shortcuts
  useProjects() // Initialize projects store
  useTaskSelection() // Handle multi-selection shortcuts
  useLicense() // Initialize license status & checks

  const firstRunComplete = useAppStore((state) => state.firstRunComplete)
  const setFirstRunComplete = useAppStore((state) => state.setFirstRunComplete)
  const loadFeatureVisibility = useAppStore((state) => state.loadFeatureVisibility)

  useEffect(() => {
    // Load feature visibility settings on boot
    loadFeatureVisibility()

    if (window.electronAPI && window.electronAPI.getFirstRunComplete) {
      window.electronAPI.getFirstRunComplete()
        .then((complete) => {
          setFirstRunComplete(complete)
        })
        .catch((err) => {
          console.error('Failed to get first run status:', err)
          setFirstRunComplete(true) // Graceful degradation
        })
    } else {
      setFirstRunComplete(true) // Safe fallback
    }
  }, [setFirstRunComplete, loadFeatureVisibility])

  if (firstRunComplete === null) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center font-sans">
        <div className="space-y-4 text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">Keystone // Preparing Space</p>
        </div>
      </div>
    )
  }

  if (firstRunComplete === false) {
    return <FirstRunFlow />
  }

  return <MainLayout />
}
