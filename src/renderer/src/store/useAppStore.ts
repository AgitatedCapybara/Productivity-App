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
  activeSessionTargetDurationMins: number
  recentFocusSummary: any | null
  preselectedSessionId: string | null
  isLoading: boolean
  error: string | null
  setTasks: (tasks: Task[]) => void
  setCompletedTasks: (tasks: Task[]) => void
  setDeletedTasks: (tasks: Task[]) => void
  setTaskData: (data: { tasks: Task[]; completedTasks: Task[]; deletedTasks?: Task[] }) => void
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
  setSessionTargetDurationMins: (n: number) => void
  selectedTaskIds: string[]
  lastSelectedTaskId: string | null
  highlightedTaskId: string | null
  setSelectedTaskIds: (ids: string[]) => void
  setLastSelectedTaskId: (id: string | null) => void
  setHighlightedTaskId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  tasksRevision: number
  incrementTasksRevision: () => void
  pageScales: {
    adjustAll: boolean
    globalScale: number
    scales: Record<string, number>
  }
  setPageScales: (scales: { adjustAll: boolean; globalScale: number; scales: Record<string, number> }) => void
  setSinglePageScale: (pageKey: string, scale: number) => void
  setAdjustAllScales: (adjustAll: boolean, globalScale: number) => void
  showMorningPlan: boolean
  showEveningShutdown: boolean
  setShowMorningPlan: (open: boolean) => void
  setShowEveningShutdown: (open: boolean) => void
  licenseEntitlements: {
    tier: 'free' | 'pro' | 'team_creator' | 'team_member'
    activatedAt: string | null
    expiresAt: string | null
    offlineGraceUntil: string | null
    machineHash: string
    isTrial: boolean
    daysRemaining: number | null
    isValid: boolean
  } | null
  setLicenseEntitlements: (entitlements: any) => void
  fetchLicenseEntitlements: () => Promise<void>
  trackerDegraded: boolean
  setTrackerDegraded: (degraded: boolean) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  sidebarExpanded: boolean
  toggleSidebarExpanded: () => void
  inspectorVisible: boolean
  toggleInspector: () => void
  densitySetting: 'comfortable' | 'compact'
  setDensitySetting: (density: 'comfortable' | 'compact') => void
  keyboardSelectedTaskId: string | null
  setKeyboardSelectedTaskId: (id: string | null) => void
  isKeyboardDetailsPeekOpen: boolean
  setKeyboardDetailsPeekOpen: (open: boolean) => void
  editingTaskId: string | null
  setEditingTaskId: (id: string | null) => void
  editingTaskDetailsId: string | null
  setEditingTaskDetailsId: (id: string | null) => void
  firstRunComplete: boolean | null
  setFirstRunComplete: (complete: boolean) => void
  featureVisibility: {
    taskList: boolean
    quickAdd: boolean
    todayView: boolean
    focusTimer: boolean
    notesBoard: boolean
    aiSuggestions: boolean
    distractionTracking: boolean
    wellnessAnalytics: boolean
    habitTracking: boolean
    planningFields: boolean
    advancedExport: boolean
  }
  setFeatureVisibility: (visibility: Partial<AppState['featureVisibility']>) => void
  loadFeatureVisibility: () => Promise<void>
  usageMilestones: {
    tasksCreated: number
    sessionsCompleted: number
    notesCreated: number
  }
  dismissedTips: string[]
  incrementMilestone: (milestone: 'tasksCreated' | 'sessionsCompleted' | 'notesCreated') => void
  dismissTip: (tipId: string) => void
  targetStudyDurationMins: number
  targetBreakDurationMins: number
  currentPhase: 'study' | 'break'
  setTargetStudyDurationMins: (n: number) => void
  setTargetBreakDurationMins: (n: number) => void
  setCurrentPhase: (phase: 'study' | 'break') => void
  isShortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void
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
  activeSessionTargetDurationMins: 25,
  targetStudyDurationMins: Number(localStorage.getItem('keystone_target_study_duration') || '25'),
  targetBreakDurationMins: Number(localStorage.getItem('keystone_target_break_duration') || '5'),
  currentPhase: 'study',
  recentFocusSummary: null,
  preselectedSessionId: null,
  selectedTaskIds: [],
  lastSelectedTaskId: null,
  highlightedTaskId: null,
  isLoading: false,
  error: null,
  isShortcutsOpen: false,
  tasksRevision: 0,
  showMorningPlan: false,
  showEveningShutdown: false,
  sidebarCollapsed: localStorage.getItem('keystone_sidebar_collapsed') === 'true',
  toggleSidebar: () => set((state) => {
    state.sidebarCollapsed = !state.sidebarCollapsed
    localStorage.setItem('keystone_sidebar_collapsed', String(state.sidebarCollapsed))
  }),
  sidebarExpanded: localStorage.getItem('keystone_sidebar_expanded') === 'true',
  toggleSidebarExpanded: () => set((state) => {
    state.sidebarExpanded = !state.sidebarExpanded
    localStorage.setItem('keystone_sidebar_expanded', String(state.sidebarExpanded))
  }),
  inspectorVisible: false,
  toggleInspector: () => set((state) => {
    state.inspectorVisible = !state.inspectorVisible
  }),
  pageScales: {
    adjustAll: false,
    globalScale: 1.0,
    scales: {
      today: 1.0,
      upcoming: 1.0,
      calendar: 1.0,
      project: 1.0,
      habits: 1.0,
      analytics: 1.0,
      circle: 1.0,
      settings: 1.0
    }
  },

  setShowMorningPlan: (open) => set((state) => { state.showMorningPlan = open }),
  setShowEveningShutdown: (open) => set((state) => { state.showEveningShutdown = open }),

  incrementTasksRevision: () => set((state) => { state.tasksRevision += 1 }),
  setSelectedTaskIds: (ids) => set((state) => { state.selectedTaskIds = ids }),
  setLastSelectedTaskId: (id) => set((state) => { state.lastSelectedTaskId = id }),
  setHighlightedTaskId: (id) => set((state) => { state.highlightedTaskId = id }),

  setPageScales: (scales) => set((state) => {
    state.pageScales = {
      adjustAll: scales.adjustAll,
      globalScale: scales.globalScale,
      scales: {
        today: scales.scales?.today ?? 1.0,
        upcoming: scales.scales?.upcoming ?? 1.0,
        calendar: scales.scales?.calendar ?? 1.0,
        project: scales.scales?.project ?? 1.0,
        habits: scales.scales?.habits ?? 1.0,
        analytics: scales.scales?.analytics ?? 1.0,
        circle: scales.scales?.circle ?? 1.0,
        settings: scales.scales?.settings ?? 1.0
      }
    }
  }),
  setSinglePageScale: (pageKey, scale) => set((state) => {
    state.pageScales.scales[pageKey] = scale
    if (window.electronAPI && window.electronAPI.setSetting) {
      window.electronAPI.setSetting('page-scales', JSON.stringify(state.pageScales)).catch(console.error)
    }
  }),
  setAdjustAllScales: (adjustAll, globalScale) => set((state) => {
    state.pageScales.adjustAll = adjustAll
    state.pageScales.globalScale = globalScale
    if (window.electronAPI && window.electronAPI.setSetting) {
      window.electronAPI.setSetting('page-scales', JSON.stringify(state.pageScales)).catch(console.error)
    }
  }),

  setTasks: (tasks) => set((state) => {
    // 1. Find all active temp tasks in current state (or ones with temp client_ids)
    const tempTasks = state.tasks.filter(
      (t) => t.id.startsWith('temp-') || (t.client_id && t.client_id.startsWith('temp-'))
    )
    
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
          clientId = matchingTemp.client_id || matchingTemp.id
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
    const outstandingTemp = tempTasks.filter(
      (pt) => !loadedClientIds.has(pt.id) && !(pt.client_id && loadedClientIds.has(pt.client_id))
    )

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

  setTaskData: ({ tasks, completedTasks, deletedTasks }) => set((state) => {
    // 1. Tasks mapping & temp task reconciliation
    const tempTasks = state.tasks.filter(
      (t) => t.id.startsWith('temp-') || (t.client_id && t.client_id.startsWith('temp-'))
    )
    const existingMap = new Map(state.tasks.map(t => [t.id, t.client_id]))
    const loadedMapped = tasks.map((t) => {
      let clientId = existingMap.get(t.id)
      if (!clientId) {
        const matchingTemp = tempTasks.find(pt => 
          pt.title === t.title &&
          pt.project_id === t.project_id &&
          pt.due_date === t.due_date &&
          pt.priority === t.priority
        )
        if (matchingTemp) {
          clientId = matchingTemp.client_id || matchingTemp.id
          const idx = tempTasks.indexOf(matchingTemp)
          if (idx !== -1) tempTasks.splice(idx, 1)
        }
      }
      return {
        ...t,
        client_id: clientId || t.id
      }
    })
    const loadedClientIds = new Set(loadedMapped.map(l => l.client_id))
    const outstandingTemp = tempTasks.filter(
      (pt) => !loadedClientIds.has(pt.id) && !(pt.client_id && loadedClientIds.has(pt.client_id))
    )
    state.tasks = [...loadedMapped, ...outstandingTemp]

    // 2. Completed tasks
    const existingCompletedMap = new Map(state.completedTasks.map(t => [t.id, t.client_id]))
    state.completedTasks = completedTasks.map((t) => ({
      ...t,
      client_id: existingCompletedMap.get(t.id) || t.id
    }))

    // 3. Deleted tasks (if provided)
    if (deletedTasks) {
      const existingDeletedMap = new Map(state.deletedTasks.map(t => [t.id, t.client_id]))
      state.deletedTasks = deletedTasks.map((t) => ({
        ...t,
        client_id: existingDeletedMap.get(t.id) || t.id
      }))
    }
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
    if (id !== null) {
      state.activeView = 'project'
    }
  }),
  
  setQuickAddOpen: (open) => set((state) => { state.quickAddOpen = open }),
  
  setActiveSession: (id) => set((state) => {
    if (state.activeSessionId && !id) {
      state.usageMilestones.sessionsCompleted += 1
      if (window.electronAPI && window.electronAPI.setSetting) {
        window.electronAPI.setSetting('usage-milestones', JSON.stringify(state.usageMilestones)).catch(console.error)
      }
    }
    if (!state.activeSessionId && id) {
      state.activeView = 'deepwork'
    }
    state.activeSessionId = id
  }),

  setActiveTaskId: (id) => set((state) => { state.activeTaskId = id }),

  setRecentFocusSummary: (summary) => set((state) => { state.recentFocusSummary = summary }),

  setPreselectedSessionId: (id) => set((state) => { state.preselectedSessionId = id }),

  setSessionDistractionCount: (n) => {
    const now = Date.now()
    const limit = 300000 // 5 minutes limit per BC-8
    
    const applyUpdate = (val: number) => {
      set((state) => {
        state.activeSessionDistractionCount = val
      })
      // Use module-level variable to store timestamp
      ;(useAppStore as any)._lastDistractionUpdate = Date.now()
    }

    if ((useAppStore as any)._distractionTimeout) {
      clearTimeout((useAppStore as any)._distractionTimeout)
      ;(useAppStore as any)._distractionTimeout = null
    }

    const lastUpdate = (useAppStore as any)._lastDistractionUpdate || 0

    if (n === 0 || now - lastUpdate >= limit) {
      applyUpdate(n)
    } else {
      const delay = limit - (now - lastUpdate)
      ;(useAppStore as any)._distractionTimeout = setTimeout(() => {
        applyUpdate(n)
      }, delay)
    }
  },

  setSessionElapsedSeconds: (n) => set((state) => {
    state.activeSessionElapsedSeconds = n

    const targetSecs = state.currentPhase === 'study'
      ? state.targetStudyDurationMins * 60
      : state.targetBreakDurationMins * 60

    if (n >= targetSecs && state.activeSessionId) {
      const nextPhase = state.currentPhase === 'study' ? 'break' : 'study'
      state.currentPhase = nextPhase
      state.activeSessionElapsedSeconds = 0
      state.activeSessionTargetDurationMins = nextPhase === 'study'
        ? state.targetStudyDurationMins
        : state.targetBreakDurationMins

      if (window.electronAPI && window.electronAPI.resetSessionStartTime) {
        window.electronAPI.resetSessionStartTime()
      }
    }
  }),

  setSessionTargetDurationMins: (n) => set((state) => { state.activeSessionTargetDurationMins = n }),

  setTargetStudyDurationMins: (n) => set((state) => {
    state.targetStudyDurationMins = n
    localStorage.setItem('keystone_target_study_duration', String(n))
  }),

  setTargetBreakDurationMins: (n) => set((state) => {
    state.targetBreakDurationMins = n
    localStorage.setItem('keystone_target_break_duration', String(n))
  }),

  setCurrentPhase: (phase) => set((state) => {
    state.currentPhase = phase
  }),
  
  setLoading: (loading) => set((state) => { state.isLoading = loading }),
  
  setError: (error) => set((state) => { state.error = error }),

  setShortcutsOpen: (open) => set((state) => {
    state.isShortcutsOpen = open
  }),

  licenseEntitlements: null,
  setLicenseEntitlements: (entitlements) => set((state) => {
    state.licenseEntitlements = entitlements
  }),
  fetchLicenseEntitlements: async () => {
    if (window.electronAPI && window.electronAPI.getLicenseStatus) {
      try {
        const entitlements = await window.electronAPI.getLicenseStatus()
        set((state) => {
          state.licenseEntitlements = entitlements
        })
      } catch (err) {
        console.error('Failed to resolve offline entitlements:', err)
      }
    }
  },
  trackerDegraded: false,
  setTrackerDegraded: (degraded) => set((state) => {
    state.trackerDegraded = degraded
  }),
  densitySetting: (localStorage.getItem('keystone_density_setting') as 'comfortable' | 'compact') || 'comfortable',
  setDensitySetting: (density) => set((state) => {
    state.densitySetting = density
    localStorage.setItem('keystone_density_setting', density)
  }),
  keyboardSelectedTaskId: null,
  setKeyboardSelectedTaskId: (id) => set((state) => {
    state.keyboardSelectedTaskId = id
  }),
  isKeyboardDetailsPeekOpen: false,
  setKeyboardDetailsPeekOpen: (open) => set((state) => {
    state.isKeyboardDetailsPeekOpen = open
  }),
  editingTaskId: null,
  setEditingTaskId: (id) => set((state) => {
    state.editingTaskId = id
  }),
  editingTaskDetailsId: null,
  setEditingTaskDetailsId: (id) => set((state) => {
    state.editingTaskDetailsId = id
  }),
  firstRunComplete: null,
  setFirstRunComplete: (complete) => set((state) => {
    state.firstRunComplete = complete
  }),
  featureVisibility: {
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
  },
  usageMilestones: {
    tasksCreated: 0,
    sessionsCompleted: 0,
    notesCreated: 0,
  },
  dismissedTips: [],
  incrementMilestone: (milestone) => set((state) => {
    state.usageMilestones[milestone] += 1
    if (window.electronAPI && window.electronAPI.setSetting) {
      window.electronAPI.setSetting('usage-milestones', JSON.stringify(state.usageMilestones)).catch(console.error)
    }
  }),
  dismissTip: (tipId) => set((state) => {
    if (!state.dismissedTips.includes(tipId)) {
      state.dismissedTips.push(tipId)
      if (window.electronAPI && window.electronAPI.setSetting) {
        window.electronAPI.setSetting('dismissed-tips', JSON.stringify(state.dismissedTips)).catch(console.error)
      }
    }
  }),
  setFeatureVisibility: (visibility) => set((state) => {
    state.featureVisibility = { ...state.featureVisibility, ...visibility }
    if (window.electronAPI && window.electronAPI.setSetting) {
      window.electronAPI.setSetting('feature-visibility', JSON.stringify(state.featureVisibility)).catch(console.error)
    }
  }),
  loadFeatureVisibility: async () => {
    if (window.electronAPI && window.electronAPI.getSetting) {
      try {
        // Load milestones
        const storedMilestones = await window.electronAPI.getSetting('usage-milestones', '')
        if (storedMilestones) {
          try {
            const parsedMilestones = JSON.parse(storedMilestones)
            set((state) => {
              state.usageMilestones = { ...state.usageMilestones, ...parsedMilestones }
            })
          } catch (e) {
            console.error('Error parsing usage-milestones', e)
          }
        }

        // Load dismissed tips
        const storedTips = await window.electronAPI.getSetting('dismissed-tips', '')
        if (storedTips) {
          try {
            const parsedTips = JSON.parse(storedTips)
            set((state) => {
              state.dismissedTips = parsedTips
            })
          } catch (e) {
            console.error('Error parsing dismissed-tips', e)
          }
        }

        const stored = await window.electronAPI.getSetting('feature-visibility', '')
        if (stored) {
          const parsed = JSON.parse(stored)
          set((state) => {
            state.featureVisibility = { ...state.featureVisibility, ...parsed }
          })
        } else {
          const firstRun = await window.electronAPI.getSetting('app.first_run_complete', 'false')
          if (firstRun === 'true') {
            set((state) => {
              state.featureVisibility = {
                taskList: true,
                quickAdd: true,
                todayView: true,
                focusTimer: true,
                notesBoard: true,
                aiSuggestions: true,
                distractionTracking: true,
                wellnessAnalytics: true,
                habitTracking: true,
                planningFields: true,
                advancedExport: true,
              }
            })
          }
        }
      } catch (err) {
        console.error('Failed to load feature visibility settings:', err)
      }
    }
  }
})))

// Listen for CustomEvents dispatched by preload script to automatically track milestones
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('keystone:task-created', () => {
    try {
      useAppStore.getState().incrementMilestone('tasksCreated')
    } catch (e) {
      console.error('Failed to increment milestone:', e)
    }
  })

  window.addEventListener('keystone:note-created', () => {
    try {
      useAppStore.getState().incrementMilestone('notesCreated')
    } catch (e) {
      console.error('Failed to increment milestone:', e)
    }
  })
}

