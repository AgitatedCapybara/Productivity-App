import { MainLayout } from './layout/MainLayout'
import { useGlobalShortcut } from './hooks/useGlobalShortcut'
import { useTasks } from './hooks/useTasks'
import { useProjects } from './hooks/useProjects'
import './types'

export default function App() {
  useGlobalShortcut() // Register global shortcuts
  useTasks() // Initialize tasks store
  useProjects() // Initialize projects store

  return <MainLayout />
}

