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

  setTasks: (tasks) => set((state) => {
    // 1. Find all active temp tasks in current state
    const tempTasks = state.tasks.filter(t => t.id.startsWith('temp-'))
    
    // 2. Map existing database IDs to their client_ids
    const existingMap = new Map(state.tasks.map(t => [t.id, t.client_id]))
    
    // 3. Map the incoming tasks from DB
    const loadedMapped = tasks.map((t) => {
      let clientId = existingMap.get(t.id)
      
      if (!clientId) {
        // Try to match by properties to reconcile a newly created server task with its original temp task
        const matchingTemp = tempTasks.find(pt => 
          pt.title === t.title &&
          pt.project_id === t.project_id &&
          pt.due_date === t.due_date &&
          pt.priority === t.priority
        )
        if (matchingTemp) {
          clientId = matchingTemp.id
          // Remove from local list so we don't double-match
          const idx = tempTasks.indexOf(matchingTemp)
          if (idx !== -1) tempTasks.splice(idx, 1)
        }
      }
      
      return {
        ...t,
        client_id: clientId || t.id
      }
    })

    // 4. Any outstanding temp tasks that were not matched (still in-progress on backend)
    const loadedClientIds = new Set(loadedMapped.map(l => l.client_id))
    const outstandingTemp = tempTasks.filter(pt => !loadedClientIds.has(pt.id))

    state.tasks = [...loadedMapped, ...outstandingTemp]
  }),
  
  setCompletedTasks: (tasks) => set((state) => {
    const existingMap = new Map(state.completedTasks.map(t => [t.id, t.client_id]))
    state.completedTasks = tasks.map((t) => ({
      ...t,
      client_id: existingMap.get(t.id) || t.id
    }))
  }),

  setDeletedTasks: (tasks) => set((state) => {
    const existingMap = new Map(state.deletedTasks.map(t => [t.id, t.client_id]))
    state.deletedTasks = tasks.map((t) => ({
      ...t,
      client_id: existingMap.get(t.id) || t.id
    }))
  }),
  
  addCompletedTask: (task) => set((state) => { state.completedTasks.unshift(task) }),
  
  addTask: (task) => set((state) => { state.tasks.push(task) }),
  
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
