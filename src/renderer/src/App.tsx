import { MainLayout } from './layout/MainLayout'
import { useGlobalShortcut } from './hooks/useGlobalShortcut'
import { useProjects } from './hooks/useProjects'
import { useTaskSelection } from './hooks/useTaskSelection'
import './types'

export default function App() {
  useGlobalShortcut() // Register global shortcuts
  useProjects() // Initialize projects store
  useTaskSelection() // Handle multi-selection shortcuts

  return <MainLayout />
}
