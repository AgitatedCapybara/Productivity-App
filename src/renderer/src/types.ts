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
}

export type UpdateTaskInput = Partial<CreateTaskInput> & { id: string }

export type View = 'today' | 'upcoming' | 'calendar' | 'project' | 'habits' | 'analytics' | 'circle' | 'settings'

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
  startSession: (payload: string | { taskId?: string | null; projectId?: string | null; targetDurationMins?: number }) => Promise<Session>
  pauseSession: () => Promise<void>
  resumeSession: () => Promise<void>
  stopSession: () => Promise<any>
  getActiveSession: () => Promise<Session | null>
  getTodaySessions: () => Promise<any[]>
  getSessionDistractions: (sessionId: string) => Promise<any[]>
  getSessionHistory: () => Promise<any[]>
  deleteSession: (id: string) => Promise<void>
  clearSessionHistory: () => Promise<void>
  updateSessionReflection: (sessionId: string, reflection: string, clarityRating: number, energyRating: number) => Promise<void>
  renameSession: (sessionId: string, customName: string) => Promise<void>
  updateSessionTask: (sessionId: string, taskId: string | null) => Promise<void>
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
  getSetting: (key: string, defaultValue: string) => Promise<string>
  setSetting: (key: string, value: string) => Promise<boolean>

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


