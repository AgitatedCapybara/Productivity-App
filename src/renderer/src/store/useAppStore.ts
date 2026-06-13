import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Task, Project, View } from '../types'

export interface AppState {
  tasks: Task[]
  completedTasks: Task[]
  deletedTasks: Task[]
  projects: Project[]
  activeView: View
  selectedProjectId: string | null
  quickAddOpen: boolean
  activeSessionId: string | null
  activeTaskId: string | null
  activeSessionDistractionCount: number
  activeSessionElapsedSeconds: number
  recentFocusSummary: any | null
  preselectedSessionId: string | null
  isLoading: boolean
  error: string | null
  setTasks: (tasks: Task[]) => void
  setCompletedTasks: (tasks: Task[]) => void
  setDeletedTasks: (tasks: Task[]) => void
  addCompletedTask: (task: Task) => void
  addTask: (task: Task) => void
  updateTask: (task: Task) => void
  removeTask: (id: string) => void
  reorderTasks: (orderedIds: string[]) => void
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (project: Project) => void
  removeProject: (id: string) => void
  setActiveView: (view: View) => void
  setSelectedProject: (id: string | null) => void
  setQuickAddOpen: (open: boolean) => void
  setActiveSession: (id: string | null) => void
  setActiveTaskId: (id: string | null) => void
  setRecentFocusSummary: (summary: any | null) => void
  setPreselectedSessionId: (id: string | null) => void
  setSessionDistractionCount: (n: number) => void
  setSessionElapsedSeconds: (n: number) => void
  selectedTaskIds: string[]
  lastSelectedTaskId: string | null
  setSelectedTaskIds: (ids: string[]) => void
  setLastSelectedTaskId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  tasksRevision: number
  incrementTasksRevision: () => void
}

export const useAppStore = create<AppState>()(immer((set) => ({
  tasks: [],
  completedTasks: [],
  deletedTasks: [],
  projects: [],
  activeView: 'today',
  selectedProjectId: null,
  quickAddOpen: false,
  activeSessionId: null,
  activeTaskId: null,
  activeSessionDistractionCount: 0,
  activeSessionElapsedSeconds: 0,
  recentFocusSummary: null,
  preselectedSessionId: null,
  selectedTaskIds: [],
  lastSelectedTaskId: null,
  isLoading: false,
  error: null,
  tasksRevision: 0,

  incrementTasksRevision: () => set((state) => { state.tasksRevision += 1 }),
  setSelectedTaskIds: (ids) => set((state) => { state.selectedTaskIds = ids }),
  setLastSelectedTaskId: (id) => set((state) => { state.lastSelectedTaskId = id }),

  setTasks: (tasks) => set((state) => { state.tasks = tasks }),
  
  setCompletedTasks: (tasks) => set((state) => { state.completedTasks = tasks }),

  setDeletedTasks: (tasks) => set((state) => { state.deletedTasks = tasks }),
  
  addCompletedTask: (task) => set((state) => { state.completedTasks.unshift(task) }),
  
  addTask: (task) => set((state) => { state.tasks.unshift(task) }),
  
  updateTask: (task) => set((state) => {
    const index = state.tasks.findIndex((t: Task) => t.id === task.id)
    if (index !== -1) {
      state.tasks[index] = task
    }
  }),
  
  removeTask: (id) => set((state) => {
    const index = state.tasks.findIndex((t: Task) => t.id === id)
    if (index !== -1) {
      state.tasks.splice(index, 1)
    }
  }),
  
  reorderTasks: (orderedIds) => set((state) => {
    orderedIds.forEach((id, index) => {
      const taskIndex = state.tasks.findIndex((t: Task) => t.id === id)
      if (taskIndex !== -1) {
        state.tasks[taskIndex].sort_order = index
      }
    })
  }),
  
  setProjects: (projects) => set((state) => { state.projects = projects }),
  
  addProject: (project) => set((state) => { state.projects.push(project) }),
  
  updateProject: (project) => set((state) => {
    const index = state.projects.findIndex((p: Project) => p.id === project.id)
    if (index !== -1) {
      state.projects[index] = project
    }
  }),
  
  removeProject: (id) => set((state) => {
    const index = state.projects.findIndex((p: Project) => p.id === id)
    if (index !== -1) {
      state.projects.splice(index, 1)
    }
    if (state.selectedProjectId === id) {
      state.selectedProjectId = null
      state.activeView = 'today'
    }
  }),
  
  setActiveView: (view) => set((state) => {
    state.activeView = view
    state.selectedProjectId = null
  }),
  
  setSelectedProject: (id) => set((state) => {
    state.selectedProjectId = id
    state.activeView = 'project'
  }),
  
  setQuickAddOpen: (open) => set((state) => { state.quickAddOpen = open }),
  
  setActiveSession: (id) => set((state) => { state.activeSessionId = id }),

  setActiveTaskId: (id) => set((state) => { state.activeTaskId = id }),

  setRecentFocusSummary: (summary) => set((state) => { state.recentFocusSummary = summary }),

  setPreselectedSessionId: (id) => set((state) => { state.preselectedSessionId = id }),

  setSessionDistractionCount: (n) => set((state) => { state.activeSessionDistractionCount = n }),

  setSessionElapsedSeconds: (n) => set((state) => { state.activeSessionElapsedSeconds = n }),
  
  setLoading: (loading) => set((state) => { state.isLoading = loading }),
  
  setError: (error) => set((state) => { state.error = error })
})))
