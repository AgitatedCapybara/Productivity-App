import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useTasks } from './useTasks'

export function useTaskSelection() {
  const { deleteTask } = useTasks()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return

      if (e.key === 'Backspace' || e.key === 'Delete') {
        const { selectedTaskIds, setSelectedTaskIds } = useAppStore.getState()
        if (selectedTaskIds.length > 0) {
          selectedTaskIds.forEach(id => deleteTask(id))
          setSelectedTaskIds([])
        }
      }
      
      if (e.key === 'Escape') {
        useAppStore.getState().setSelectedTaskIds([])
        useAppStore.getState().setLastSelectedTaskId(null)
      }
    }
    
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-task-id]') && !target.closest('[role="menu"]') && !target.closest('button')) {
         useAppStore.getState().setSelectedTaskIds([])
         useAppStore.getState().setLastSelectedTaskId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('click', handleClick)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('click', handleClick)
    }
  }, [deleteTask])
}
