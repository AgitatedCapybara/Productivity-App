// KEEP IN SYNC WITH: src/types.ts (renderer mirror)

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
  project_id: string | null
  target_duration_mins: number
  started_at: string
  ended_at: string | null
  duration_mins: number
  distraction_count: number
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  reflection?: string
  clarity_rating?: number | null
  energy_rating?: number | null
  custom_name?: string | null
  target_break_duration_mins?: number
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

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  start_at: string // ISO Timestamp
  end_at: string // ISO Timestamp
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

export interface CreateNoteInput {
  parent_type: 'task' | 'project' | 'session' | 'standalone'
  parent_id?: string | null
  title: string
  body_md?: string
  pinned?: number
  archived?: number
}

export type UpdateNoteInput = Partial<CreateNoteInput> & { id: string }

export interface AuditLog {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  timestamp: string
  metadata_json: string
}

export interface Setting {
  key: string
  value: string
}



