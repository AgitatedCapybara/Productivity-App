// KEEP IN SYNC WITH: electron/db/schema.ts

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'deleted'
export type TaskPriority = 0 | 1 | 2 | 3

export interface Task {
  id: string
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
  project_id: string | null
  target_duration_mins: number
  started_at: string
  ended_at: string | null
  duration_mins: number
  distraction_count: number
  status: 'active' | 'paused' | 'completed' | 'cancelled'
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
  created_at: string
}

export interface CreateHabitInput {
  name: string
  frequency: HabitFrequency
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

export type View = 'today' | 'upcoming' | 'project' | 'habits' | 'analytics' | 'circle' | 'settings'

export interface IElectronAPI {
  setZoomRatio: (ratio: number) => void
  getTasks: () => Promise<Task[]>
  getDeletedTasks: () => Promise<Task[]>
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
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  toggleFullscreen: () => Promise<void>
  closeWindow: () => Promise<void>
  startSession?: (payload: string | { taskId?: string | null; projectId?: string | null; targetDurationMins?: number }) => Promise<Session>
  pauseSession?: () => Promise<void>
  resumeSession?: () => Promise<void>
  stopSession?: () => Promise<any>
  getActiveSession?: () => Promise<Session | null>
  getTodaySessions?: () => Promise<any[]>
  getSessionDistractions?: (sessionId: string) => Promise<any[]>
  getSessionHistory?: () => Promise<any[]>
  deleteSession?: (id: string) => Promise<void>
  clearSessionHistory?: () => Promise<void>
  onGlobalShortcutTriggered: (cb: () => void) => () => void
  onFocusSessionStarted: (cb: (sessionId: string) => void) => () => void
  onSessionDistractionUpdate: (callback: (count: number) => void) => () => void
  onSessionDebugCheckTick?: (callback: (count: number, isSimulated: boolean) => void) => () => void
  onSessionStateChanged: (callback: () => void) => () => void
  getSetting?: (key: string, defaultValue: string) => Promise<string>
  setSetting?: (key: string, value: string) => Promise<boolean>
}

