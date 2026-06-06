import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export function useGlobalShortcut() {
  useEffect(() => {
    if (!window.electronAPI) return

    const cleanup = window.electronAPI.onGlobalShortcutTriggered(() => {
      useAppStore.getState().setQuickAddOpen(true)
    })

    return () => {
      cleanup()
    }
  }, [])
}
