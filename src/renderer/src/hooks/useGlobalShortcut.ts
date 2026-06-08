import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export function useGlobalShortcut() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault()
        const electronAPI = (window as any).electronAPI
        if (electronAPI && typeof electronAPI.toggleFullscreen === 'function') {
          electronAPI.toggleFullscreen()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    if (!window.electronAPI) {
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }

    const cleanup = window.electronAPI.onGlobalShortcutTriggered(() => {
      useAppStore.getState().setQuickAddOpen(true)
    })

    return () => {
      cleanup()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
}
