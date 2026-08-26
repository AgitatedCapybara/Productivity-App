// KEEP IN SYNC WITH: electron/db/schema.ts

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'deleted'
export type TaskPriority = 0 | 1 | 2 | 3

export interface Task {
  id: string
  client_id?: string
  title: string
  notes: string
  project_id: string | null
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  due_time: string | null
  recurrence: string | null
  sort_order: number
  time_estimate_mins: number
  time_logged_mins: number
  completed_at: string | null
  created_at: string
  updated_at: string
  plan_when?: string | null
  plan_where?: string | null
  plan_how?: string | null
}

export interface Project {
  id: string
  name: string
  color: string
  icon: string
  sort_order: number
  created_at: string
}

export interface Session {
  id: string
  task_id: string | null
  taskId?: string | null
  project_id: string | null
  projectId?: string | null
  target_duration_mins: number
  targetDurationMins?: number
  started_at: string
  startedAt?: string
  ended_at: string | null
  endedAt?: string | null
  duration_mins: number
  durationMins?: number
  distraction_count: number
  distractionCount?: number
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  reflection?: string
  clarity_rating?: number | null
  energy_rating?: number | null
  custom_name?: string | null
  customName?: string | null
}

export interface Distraction {
  id: string
  session_id: string
  app_name: string
  window_title: string
  started_at: string
  ended_at: string | null
  duration_ms: number
}

export type HabitFrequency = 'daily' | 'weekly'

export interface Habit {
  id: string
  name: string
  frequency: HabitFrequency
  current_streak: number
  longest_streak: number
  project_id: string | null
  is_paused: number // 0 or 1
  session_link: number // 0 or 1
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  date: string // YYYY-MM-DD
  created_at: string
}

export interface CreateHabitInput {
  name: string
  frequency: HabitFrequency
  project_id?: string | null
  is_paused?: number
  session_link?: number
}

export type UpdateHabitInput = Partial<CreateHabitInput> & { id: string }

export interface CreateTaskInput {
  title: string
  notes?: string
  project_id?: string | null
  priority?: TaskPriority
  status?: TaskStatus
  due_date?: string | null
  due_time?: string | null
  recurrence?: string | null
  sort_order?: number
  time_estimate_mins?: number
  time_logged_mins?: number
  completed_at?: string | null
  plan_when?: string | null
  plan_where?: string | null
  plan_how?: string | null
}

export type UpdateTaskInput = Partial<CreateTaskInput> & { id: string }

export type View = 'today' | 'upcoming' | 'calendar' | 'plan' | 'project' | 'habits' | 'analytics' | 'circle' | 'settings' | 'deepwork' | 'notes' | 'views' | 'inbox'

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  start_at: string
  end_at: string
  project_id: string | null
  recurrence: string
  created_at: string
  updated_at: string
}

export interface CreateCalendarEventInput {
  title: string
  description?: string | null
  start_at: string
  end_at: string
  project_id?: string | null
  recurrence?: string
}

export type UpdateCalendarEventInput = Partial<CreateCalendarEventInput> & { id: string }

export interface IElectronAPI {
  setZoomRatio: (ratio: number) => void
  getTasks: () => Promise<Task[]>
  getDeletedTasks: () => Promise<Task[]>
  purgeDeletedTasks: () => Promise<void>
  getTasksDueToday: () => Promise<Task[]>
  getTasksUpcoming: () => Promise<Task[]>
  getTasksForToday: () => Promise<Task[]>
  getTodayCompletedTasks: () => Promise<Task[]>
  getTasksByProject: (id: string) => Promise<Task[]>
  createTask: (input: CreateTaskInput) => Promise<Task>
  updateTask: (input: UpdateTaskInput) => Promise<Task>
  deleteTask: (id: string) => Promise<void>
  reorderTasks: (ids: string[]) => Promise<void>
  completeTask: (id: string) => Promise<Task>
  getProjects: () => Promise<Project[]>
  createProject: (input: Omit<Project, 'id' | 'created_at'>) => Promise<Project>
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  getHabits: () => Promise<Habit[]>
  createHabit: (input: CreateHabitInput) => Promise<Habit>
  updateHabit: (input: UpdateHabitInput) => Promise<Habit>
  deleteHabit: (id: string) => Promise<void>
  checkInHabit: (habitId: string, date: string) => Promise<HabitLog>
  uncheckInHabit: (habitId: string, date: string) => Promise<void>
  getHabitLogs: (habitId?: string) => Promise<HabitLog[]>
  getEvents: () => Promise<CalendarEvent[]>
  createEvent: (input: CreateCalendarEventInput) => Promise<CalendarEvent>
  updateEvent: (input: UpdateCalendarEventInput) => Promise<CalendarEvent>
  deleteEvent: (id: string) => Promise<void>
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  toggleFullscreen: () => Promise<void>
  closeWindow: () => Promise<void>
  confirmExit: () => Promise<void>
  onCloseRequested: (cb: () => void) => () => void
  restoreMainWindow?: () => Promise<void>
  startSession: (payload: string | { taskId?: string | null; projectId?: string | null; targetDurationMins?: number; targetBreakDurationMins?: number }) => Promise<Session>
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
  stopSession: () => Promise<any>
  resetSessionStartTime?: () => Promise<void>
  getActiveSession: () => Promise<Session | null>
  getTodaySessions: () => Promise<any[]>
  getSessionDistractions: (sessionId: string) => Promise<any[]>
  getSessionHistory: () => Promise<any[]>
  deleteSession: (id: string) => Promise<void>
  clearSessionHistory: () => Promise<void>
  updateSessionReflection: (sessionId: string, reflection: string, clarityRating: number | null, energyRating: number | null) => Promise<void>
  renameSession: (sessionId: string, customName: string) => Promise<void>
  updateSessionTask: (sessionId: string, taskId: string | null) => Promise<void>
  toggleDND: (enable: boolean) => Promise<{ success: boolean; error?: string }>
  getOverlayDiagnostics: () => Promise<any>
  forceShowWidget: () => Promise<{ success: boolean; message: string }>
  forceHideWidget: () => Promise<{ success: boolean; message: string }>
  onGlobalShortcutTriggered: (cb: () => void) => () => void
  onFocusSessionStarted: (cb: (sessionId: string) => void) => () => void
  onSessionDistractionUpdate: (callback: (count: number) => void) => () => void
  onSessionDebugCheckTick: (callback: (count: number, isSimulated: boolean) => void) => () => void
  onSessionStateChanged: (callback: () => void) => () => void
  onTasksStateChanged?: (callback: () => void) => () => void
  onSessionEnded: (callback: (summary: any) => void) => () => void
  onSessionTick?: (callback: (elapsed: { seconds: number; distractionCount: number; targetDurationMins?: number }) => void) => () => void
  onSessionStopped?: (callback: (summary: { durationMins: number; distractionCount: number }) => void) => () => void
  onSessionSystemResumed?: (callback: (sessionId: string) => void) => () => void
  onTrackerDegraded?: (callback: (msg: string) => void) => () => void
  getSetting: (key: string, defaultValue: string) => Promise<string>
  setSetting: (key: string, value: string) => Promise<boolean>
  getFirstRunComplete: () => Promise<boolean>
  setFirstRunComplete: (complete: boolean) => Promise<boolean>

  // Circle Feature APIs
  getCircleProfile: () => Promise<CircleProfile | null>
  createCircleProfile: (input: { username: string; displayName: string; avatar: string }) => Promise<CircleProfile>
  updateCircleProfile: (input: {
    displayName: string
    avatar: string
    description?: string
    customShowFocus?: number
    customShowTasks?: number
    customShowStreak?: number
    customShowTimeline?: number
    customTheme?: string
  }) => Promise<CircleProfile>
  deleteCircleProfile: () => Promise<void>
  toggleCircleSharing: (enabled: boolean) => Promise<CircleProfile>
  searchCircleUser: (searchQuery: string) => Promise<{ username: string; display_name: string; avatar: string } | null>
  sendCircleFriendRequest: (friendUsername: string) => Promise<CircleFriendship>
  getCircleFriendRequests: () => Promise<CircleFriendship[]>
  acceptCircleFriendRequest: (friendUsername: string) => Promise<boolean>
  declineCircleFriendRequest: (friendUsername: string) => Promise<boolean>
  getCircleFriendsList: () => Promise<CircleFriendship[]>
  getMyCircleAggregateStats: () => Promise<CircleStatsCache>
  syncCircleFriendsStats: () => Promise<CircleStatsCache[]>
  getCachedCircleFriendStats: () => Promise<CircleStatsCache[]>
  searchQuery: (searchText: string) => Promise<any[]>
  getPerfStats: () => Promise<any>
  forceRunMaintenance: () => Promise<boolean>
  
  // Template APIs
  createTemplate: (name: string, payloadJson: string) => Promise<any>
  listTemplates: () => Promise<any[]>
  deleteTemplate: (id: string) => Promise<boolean>
  applyTemplate: (id: string) => Promise<boolean>

  // Scheduler APIs
  generateSuggestions: () => Promise<SuggestedBlock[]>
  acceptSuggestion: (id: string) => Promise<boolean>
  declineSuggestion: (id: string) => Promise<boolean>
  declineAllSuggestions: () => Promise<boolean>
  snoozeSuggestion: (id: string, until: string) => Promise<boolean>
  adjustSuggestion: (id: string, newStart: string, newEnd: string) => Promise<boolean>
  getSchedulingPreferences: () => Promise<Record<string, string>>
  updateSchedulingPreferences: (prefs: Record<string, string>) => Promise<boolean>
  saveRitualEntry: (type: 'morning' | 'evening', date: string, payloadJson: string) => Promise<boolean>
  getRitualEntriesByDate: (date: string) => Promise<any[]>
  getRitualStreak: () => Promise<{ currentStreak: number; longestStreak: number; completionRate: number }>
  getCapacityToday: () => Promise<{ available: number; committed: number; ratio: number; status: 'light' | 'balanced' | 'tight' | 'overloaded' }>
  getWeeklyRitualSummary: () => Promise<{ completionRate: number; avgTasksCommitted: number; avgTasksCompleted: number; capacityAccuracy: number }>
  getWellnessSignals: () => Promise<any[]>
  dismissWellnessSignal: (id: string) => Promise<{ success: boolean }>
  resetDismissedWellnessSignals: () => Promise<{ success: boolean }>
  exportWellnessData: () => Promise<{ success: boolean; canceled?: boolean; filePath?: string; error?: string }>
  getWellnessAnalytics: () => Promise<any>

  // Note APIs
  listAllNotes: () => Promise<Note[]>
  getNoteById: (id: string) => Promise<Note | null>
  getNotesByParent: (parentType: string, parentId: string) => Promise<Note[]>
  createNote: (input: { parent_type: 'task' | 'project' | 'session' | 'standalone'; parent_id?: string | null; title: string; body_md?: string; pinned?: number; archived?: number }) => Promise<Note>
  updateNote: (input: { id: string; parent_type?: 'task' | 'project' | 'session' | 'standalone'; parent_id?: string | null; title?: string; body_md?: string; pinned?: number; archived?: number }) => Promise<Note>
  deleteNote: (id: string) => Promise<{ success: boolean }>
  pinNote: (id: string, pinned: boolean) => Promise<{ success: boolean }>
  archiveNote: (id: string, archived: boolean) => Promise<{ success: boolean }>
  getNoteBacklinks: (noteId: string) => Promise<Note[]>
  exportAllNotes: () => Promise<{ success: boolean; count?: number; folderPath?: string; error?: string; canceled?: boolean }>

  // Views & Spatial Board APIs
  listViews: () => Promise<ViewPreset[]>
  createView: (preset: Partial<ViewPreset>) => Promise<ViewPreset>
  updateView: (id: string, updates: Partial<ViewPreset>) => Promise<ViewPreset>
  deleteView: (id: string) => Promise<boolean>
  getViewData: (viewId: string) => Promise<{
    preset: ViewPreset
    tasks: Task[]
    projects: Project[]
    notes: Note[]
    placements: CardPlacement[]
  }>
  saveViewPlacement: (placement: CardPlacement) => Promise<{ success: boolean }>
  deleteViewPlacement: (noteId: string, viewId: string) => Promise<{ success: boolean }>

  // Actions APIs
  listActions: () => Promise<Action[]>
  createAction: (action: Partial<Action>) => Promise<Action>
  updateAction: (id: string, updates: Partial<Action>) => Promise<Action>
  deleteAction: (id: string) => Promise<{ success: boolean }>

  // Backup & Privacy Vault APIs
  getBackupStats: () => Promise<{
    tasksCount: number
    projectsCount: number
    habitsCount: number
    sessionsCount: number
    notesCount: number
    dbPath: string
    dbSizeKb: number
    lastBackupDate: string
  }>
  runBackupValue: (passphrase?: string, targetPath?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
  restoreBackupValue: (passphrase?: string, targetPath?: string) => Promise<{ success: boolean; error?: string }>
  verifyBackupValue: (passphrase: string, targetPath: string) => Promise<{ success: boolean; authenticated: boolean; error?: string }>
  exportBackupJson: () => Promise<{ success: boolean; filePath?: string; error?: string }>
  wipeDatabaseData: () => Promise<{ success: boolean }>
  getAuditLogs: () => Promise<any[]>
  exportData: (format: 'json' | 'csv') => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>

  getLicenseStatus: () => Promise<{
    tier: 'free' | 'pro' | 'team_creator' | 'team_member'
    activatedAt: string | null
    expiresAt: string | null
    offlineGraceUntil: string | null
    machineHash: string
    isTrial: boolean
    daysRemaining: number | null
    isValid: boolean
  }>
  activateLicense: (key: string) => Promise<{ success: boolean; tier?: string; error?: string }>
  deactivateLicense: () => Promise<{ success: boolean }>
  validateLicenseKey: (key: string) => Promise<{ isValid: boolean; payload?: any; error?: string }>
  activateTrial: () => Promise<{ success: boolean; expiresAt?: string; error?: string }>
  checkFeature: (feature: string) => Promise<boolean>
}

export interface ViewPreset {
  id: string
  name: string
  filters: string // JSON representation
  sort: string // JSON representation
  group_by: string
  layout: 'kanban' | 'calendar' | 'gallery' | 'timeline' | 'board'
}

export interface CardPlacement {
  note_id: string
  view_id: string
  position_x: number
  position_y: number
  z_index: number
}

export interface Action {
  id: string
  name: string
  command: string
  icon: string | null
  context: string | null
}

export interface Note {
  id: string
  parent_type: 'task' | 'project' | 'session' | 'standalone'
  parent_id: string | null
  title: string
  body_md: string
  created_at: string
  updated_at: string
  pinned: number // 0 or 1
  archived: number // 0 or 1
}

export interface NoteLink {
  id: string
  source_note_id: string
  target_note_id: string
  created_at: string
}

export interface SuggestedBlock {
  id: string
  task_id: string
  suggested_start: string
  suggested_end: string
  rationale: string
  confidence: number
  status: 'pending' | 'accepted' | 'declined' | 'snoozed'
  created_at: string
  resolved_at: string | null
  conflict_risks?: string[]
  // Joined fields
  task_title?: string
  task_priority?: number
  project_name?: string
  project_color?: string
  project_icon?: string
}

export interface CircleProfile {
  id: string
  username: string
  display_name: string
  avatar: string
  circle_sharing_enabled: number // 0 or 1
  description: string
  custom_show_focus: number
  custom_show_tasks: number
  custom_show_streak: number
  custom_show_timeline: number
  custom_theme: string // 'indigo', 'emerald', etc.
  created_at: number
  updated_at: number
}

export interface CircleFriendship {
  id: string
  user_id: string
  friend_username: string
  status: 'pending' | 'accepted' | 'declined'
  requested_by: 'user' | 'friend'
  created_at: number
  updated_at: number
}

export interface CircleStatsCache {
  friend_username: string
  display_name: string
  avatar: string
  focus_minutes_today: number
  tasks_completed_today: number
  current_streak: number
  is_focusing: number // 0 or 1
  last_synced_at: number
  description: string
  custom_show_focus: number
  custom_show_tasks: number
  custom_show_streak: number
  custom_show_timeline: number
  custom_theme: string
  focus_history_json: string
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}


