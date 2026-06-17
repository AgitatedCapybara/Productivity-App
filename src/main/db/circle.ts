// src/main/db/circle.ts
import { getDb } from './database'
import { nanoid } from 'nanoid'
import { getActiveSession } from './sessions'

export interface UserProfile {
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
  custom_theme: string // 'indigo', 'emerald', 'rose', etc.
  created_at: number
  updated_at: number
}

export interface Friendship {
  id: string
  user_id: string
  friend_username: string
  status: 'pending' | 'accepted' | 'declined'
  requested_by: 'user' | 'friend'
  created_at: number
  updated_at: number
}

export interface FriendStatsCache {
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

// Pre-defined mockup directory representing prospective global users
export const SIMULATED_USERS = [
  {
    username: 'alice_coder',
    display_name: 'Alice Chen',
    avatar: '👩‍💻',
    description: 'Senior Frontend Tech Lead & OSS contributor. Passionate about responsive UI, Vite, and tailwind integrations.',
    custom_show_focus: 1,
    custom_show_tasks: 1,
    custom_show_streak: 1,
    custom_show_timeline: 1,
    custom_theme: 'emerald',
    focus_history: [45, 90, 120, 30, 150, 180, 210]
  },
  {
    username: 'bob_builder',
    display_name: 'Bob Smith',
    avatar: '👨‍💻',
    description: 'Backend wizard building database microservices in Go & Rust. Enjoys multi-threading and compiler optimizations.',
    custom_show_focus: 1,
    custom_show_tasks: 1,
    custom_show_streak: 0,
    custom_show_timeline: 1,
    custom_theme: 'amber',
    focus_history: [120, 60, 45, 180, 95, 110, 140]
  },
  {
    username: 'design_ninja',
    display_name: 'Yuki Tanaka',
    avatar: '🥷',
    description: 'Lead Designer specializing in motion systems and elegant micro-interactions. Clean layouts are my religion.',
    custom_show_focus: 0,
    custom_show_tasks: 1,
    custom_show_streak: 1,
    custom_show_timeline: 1,
    custom_theme: 'rose',
    focus_history: [60, 80, 45, 120, 0, 90, 75]
  },
  {
    username: 'data_wizard',
    display_name: 'Sarah Jenkins',
    avatar: '🧙‍♀️',
    description: 'Data Scientist researching LLM retrieval-augmented generation and vector indexing. Coding in Python/C++.',
    custom_show_focus: 1,
    custom_show_tasks: 1,
    custom_show_streak: 1,
    custom_show_timeline: 1,
    custom_theme: 'sky',
    focus_history: [180, 240, 150, 90, 210, 120, 300]
  },
  {
    username: 'bug_hunter',
    display_name: 'Jack Thompson',
    avatar: '🕵️‍♂️',
    description: 'DevOps & security engineer auditing app boundaries. Obsessed with Docker security and container isolation.',
    custom_show_focus: 1,
    custom_show_tasks: 0,
    custom_show_streak: 1,
    custom_show_timeline: 1,
    custom_theme: 'violet',
    focus_history: [90, 120, 60, 45, 180, 110, 95]
  },
  {
    username: 'focus_master',
    display_name: 'Emma Johnson',
    avatar: '🧘',
    description: 'Full stack indie hacker shipping micro-SaaS products. Deep-work Pomodoro practitioner 5 days a week.',
    custom_show_focus: 1,
    custom_show_tasks: 1,
    custom_show_streak: 1,
    custom_show_timeline: 0,
    custom_theme: 'indigo',
    focus_history: [120, 150, 180, 90, 120, 140, 160]
  }
]

export function getProfile(): UserProfile | null {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM user_profile LIMIT 1')
  const profile = stmt.get() as UserProfile | undefined
  return profile || null
}

export function createProfile(username: string, displayName: string, avatar: string): UserProfile {
  const db = getDb()
  const id = nanoid(8)
  const now = Date.now()
  
  const stmt = db.prepare(`
    INSERT INTO user_profile (
      id, username, display_name, avatar, circle_sharing_enabled, 
      description, custom_show_focus, custom_show_tasks, custom_show_streak, custom_show_timeline, custom_theme,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, 1, 'Focusing on building solar and full-stack software! 🚀', 1, 1, 1, 1, 'indigo', ?, ?)
  `)
  stmt.run(id, username.trim().toLowerCase(), displayName.trim() || username, avatar, now, now)

  // Seed some realistic incoming and pending friend requests to make the onboarding fun and functional
  try {
    const friendId1 = nanoid(8)
    const friendId2 = nanoid(8)
    
    // Incoming request from Alice Coder
    db.prepare(`
      INSERT OR IGNORE INTO friends (id, user_id, friend_username, status, requested_by, created_at, updated_at)
      VALUES (?, ?, 'alice_coder', 'pending', 'friend', ?, ?)
    `).run(friendId1, id, now, now)

    // Incoming request from Data Wizard
    db.prepare(`
      INSERT OR IGNORE INTO friends (id, user_id, friend_username, status, requested_by, created_at, updated_at)
      VALUES (?, ?, 'data_wizard', 'pending', 'friend', ?, ?)
    `).run(friendId2, id, now, now)
  } catch (err) {
    console.error('Failed to seed mock friend requests', err)
  }

  return getProfile()!
}

export function updateProfile(
  displayName: string,
  avatar: string,
  description?: string,
  customShowFocus?: number,
  customShowTasks?: number,
  customShowStreak?: number,
  customShowTimeline?: number,
  customTheme?: string
): UserProfile {
  const db = getDb()
  const now = Date.now()
  db.prepare(`
    UPDATE user_profile
    SET display_name = ?, 
        avatar = ?, 
        description = COALESCE(?, description),
        custom_show_focus = COALESCE(?, custom_show_focus),
        custom_show_tasks = COALESCE(?, custom_show_tasks),
        custom_show_streak = COALESCE(?, custom_show_streak),
        custom_show_timeline = COALESCE(?, custom_show_timeline),
        custom_theme = COALESCE(?, custom_theme),
        updated_at = ?
    WHERE id = (SELECT id FROM user_profile LIMIT 1)
  `).run(
    displayName.trim(),
    avatar,
    description !== undefined ? description : null,
    customShowFocus !== undefined ? customShowFocus : null,
    customShowTasks !== undefined ? customShowTasks : null,
    customShowStreak !== undefined ? customShowStreak : null,
    customShowTimeline !== undefined ? customShowTimeline : null,
    customTheme !== undefined ? customTheme : null,
    now
  )
  
  return getProfile()!
}

export function deleteProfile(): void {
  const db = getDb()
  db.prepare('DELETE FROM user_profile').run()
  db.prepare('DELETE FROM friends').run()
  db.prepare('DELETE FROM friend_stats_cache').run()
}

export function toggleSharing(enabled: boolean): UserProfile {
  const db = getDb()
  const now = Date.now()
  db.prepare(`
    UPDATE user_profile
    SET circle_sharing_enabled = ?, updated_at = ?
    WHERE id = (SELECT id FROM user_profile LIMIT 1)
  `).run(enabled ? 1 : 0, now)

  return getProfile()!
}

export function searchUser(searchQuery: string): any | null {
  const qClean = searchQuery.trim().toLowerCase()
  if (!qClean) return null

  // Username search should be exact match
  const matched = SIMULATED_USERS.find(user => user.username.toLowerCase() === qClean)
  if (!matched) return null

  // Ensure we don't return our own profile
  const ourProfile = getProfile()
  if (ourProfile && ourProfile.username.toLowerCase() === qClean) {
    return null
  }

  return matched
}

export function sendFriendRequest(friendUsername: string): Friendship {
  const db = getDb()
  const ourProfile = getProfile()
  if (!ourProfile) {
    throw new Error('Create a profile first before sending friend requests.')
  }

  const fUsernameClean = friendUsername.trim().toLowerCase()
  if (ourProfile.username === fUsernameClean) {
    throw new Error('You cannot add yourself as a friend.')
  }

  const now = Date.now()
  const id = nanoid(8)

  db.prepare(`
    INSERT INTO friends (id, user_id, friend_username, status, requested_by, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', 'user', ?, ?)
  `).run(id, ourProfile.id, fUsernameClean, now, now)

  return db.prepare('SELECT * FROM friends WHERE id = ?').get(id) as Friendship
}

export function getFriendRequests(): Friendship[] {
  const db = getDb()
  const ourProfile = getProfile()
  if (!ourProfile) return []

  const stmt = db.prepare(`
    SELECT * FROM friends 
    WHERE user_id = ? AND status = 'pending'
  `)
  return stmt.all(ourProfile.id) as Friendship[]
}

export function acceptFriendRequest(friendUsername: string): void {
  const db = getDb()
  const ourProfile = getProfile()
  if (!ourProfile) return

  const fUsername = friendUsername.trim().toLowerCase()
  
  db.prepare(`
    UPDATE friends
    SET status = 'accepted', updated_at = ?
    WHERE user_id = ? AND friend_username = ?
  `).run(Date.now(), ourProfile.id, fUsername)

  // Immediately initialize their cache record with random initial stats for a high-fidelity experience
  try {
    const mockUser = SIMULATED_USERS.find(u => u.username === fUsername)
    if (mockUser) {
      db.prepare(`
        INSERT OR REPLACE INTO friend_stats_cache 
        (friend_username, display_name, avatar, focus_minutes_today, tasks_completed_today, current_streak, is_focusing, last_synced_at,
         description, custom_show_focus, custom_show_tasks, custom_show_streak, custom_show_timeline, custom_theme, focus_history_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        fUsername,
        mockUser.display_name,
        mockUser.avatar,
        Math.floor(Math.random() * 90) + 15,
        Math.floor(Math.random() * 4) + 1,
        Math.floor(Math.random() * 8) + 2,
        Math.random() > 0.5 ? 1 : 0,
        Date.now(),
        mockUser.description,
        mockUser.custom_show_focus,
        mockUser.custom_show_tasks,
        mockUser.custom_show_streak,
        mockUser.custom_show_timeline,
        mockUser.custom_theme,
        JSON.stringify(mockUser.focus_history)
      )
    }
  } catch (err) {
    console.error('Failed to initialize stats cache upon acceptance:', err)
  }
}

export function declineFriendRequest(friendUsername: string): void {
  const db = getDb()
  const ourProfile = getProfile()
  if (!ourProfile) return

  const fUsername = friendUsername.trim().toLowerCase()

  db.prepare(`
    DELETE FROM friends
    WHERE user_id = ? AND friend_username = ?
  `).run(ourProfile.id, fUsername)

  // Clean up cache as well
  db.prepare(`
    DELETE FROM friend_stats_cache
    WHERE friend_username = ?
  `).run(fUsername)
}

export function getFriendsList(): Friendship[] {
  const db = getDb()
  const ourProfile = getProfile()
  if (!ourProfile) return []

  const stmt = db.prepare(`
    SELECT * FROM friends 
    WHERE user_id = ? AND status = 'accepted'
  `)
  return stmt.all(ourProfile.id) as Friendship[]
}

export function getMyAggregateStats(): FriendStatsCache {
  const db = getDb()
  const ourProfile = getProfile()
  
  const todayFocus = db.prepare(`
    SELECT SUM(duration_mins) as total FROM sessions 
    WHERE status = 'completed' AND date(started_at, 'localtime') = date('now', 'localtime')
  `).get() as { total: number | null }

  const todayTasks = db.prepare(`
    SELECT COUNT(*) as total FROM tasks 
    WHERE status = 'done' AND date(completed_at, 'localtime') = date('now', 'localtime')
  `).get() as { total: number }

  // Streak Tracker
  // Find all distinct completed focus session days or habit check-ins
  const sessionDays = db.prepare(`
    SELECT DISTINCT date(started_at, 'localtime') as day FROM sessions WHERE status = 'completed'
  `).all() as { day: string }[]

  const logDays = db.prepare(`
    SELECT DISTINCT date FROM habit_logs
  `).all() as { date: string }[]

  const uniqueDays = new Set<string>()
  sessionDays.forEach(s => uniqueDays.add(s.day))
  logDays.forEach(l => uniqueDays.add(l.date))

  const sortedDays = Array.from(uniqueDays).sort((a, b) => b.localeCompare(a)) // desc

  // Calculate local today and yesterday
  const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const date = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${date}`
  }

  const todayStr = getLocalDateStr(new Date())
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = getLocalDateStr(yesterday)

  let streak = 0
  if (sortedDays.includes(todayStr)) {
    streak = 1
    let checkDateStr = todayStr
    while (true) {
      const checkDateObj = new Date(checkDateStr)
      checkDateObj.setDate(checkDateObj.getDate() - 1)
      const prevStr = getLocalDateStr(checkDateObj)
      if (sortedDays.includes(prevStr)) {
        streak++
        checkDateStr = prevStr
      } else {
        break
      }
    }
  } else if (sortedDays.includes(yesterdayStr)) {
    streak = 1
    let checkDateStr = yesterdayStr
    while (true) {
      const checkDateObj = new Date(checkDateStr)
      checkDateObj.setDate(checkDateObj.getDate() - 1)
      const prevStr = getLocalDateStr(checkDateObj)
      if (sortedDays.includes(prevStr)) {
        streak++
        checkDateStr = prevStr
      } else {
        break
      }
    }
  }

  const activeSessionObj = getActiveSession()
  const isCurrentlyFocusing = activeSessionObj !== null && activeSessionObj.status === 'active'

  // Query actual weekly focus sessions (last 7 days of focus history)
  const focusHistory: number[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dStr = getLocalDateStr(d)
    const dailyMinsRow = db.prepare(`
      SELECT SUM(duration_mins) as total FROM sessions
      WHERE status = 'completed' AND date(started_at, 'localtime') = date(?, 'localtime')
    `).get(dStr) as { total: number | null }
    focusHistory.push(dailyMinsRow?.total || 0)
  }

  return {
    friend_username: ourProfile?.username || 'me',
    display_name: ourProfile?.display_name || 'Me',
    avatar: ourProfile?.avatar || '👤',
    focus_minutes_today: todayFocus?.total || 0,
    tasks_completed_today: todayTasks?.total || 0,
    current_streak: streak,
    is_focusing: isCurrentlyFocusing ? 1 : 0,
    last_synced_at: Date.now(),
    description: ourProfile?.description || 'Focusing on building solar and full-stack software! 🚀',
    custom_show_focus: ourProfile ? ourProfile.custom_show_focus : 1,
    custom_show_tasks: ourProfile ? ourProfile.custom_show_tasks : 1,
    custom_show_streak: ourProfile ? ourProfile.custom_show_streak : 1,
    custom_show_timeline: ourProfile ? ourProfile.custom_show_timeline : 1,
    custom_theme: ourProfile?.custom_theme || 'indigo',
    focus_history_json: JSON.stringify(focusHistory)
  }
}

// Fetch cached friend stats
export function getCachedFriendStats(): FriendStatsCache[] {
  const db = getDb()
  const stmt = db.prepare('SELECT * FROM friend_stats_cache ORDER BY focus_minutes_today DESC')
  return stmt.all() as FriendStatsCache[]
}

// Simulated Sync Friends operation
export function syncFriendsStats(): FriendStatsCache[] {
  const db = getDb()
  const friends = getFriendsList()
  const now = Date.now()

  // For each friend, update the caching table with updated simulated stats
  for (const friend of friends) {
    const mockUser = SIMULATED_USERS.find(u => u.username === friend.friend_username)
    if (!mockUser) continue

    // Simulate their stats dynamically
    const isFocusing = Math.random() > 0.6 ? 1 : 0
    const focusMinutes = Math.floor(Math.random() * 150) + 20
    const tasksCompleted = Math.floor(focusMinutes / 30) + Math.floor(Math.random() * 2)
    const streak = Math.floor(Math.random() * 10) + 3

    db.prepare(`
      INSERT OR REPLACE INTO friend_stats_cache 
      (friend_username, display_name, avatar, focus_minutes_today, tasks_completed_today, current_streak, is_focusing, last_synced_at,
       description, custom_show_focus, custom_show_tasks, custom_show_streak, custom_show_timeline, custom_theme, focus_history_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      friend.friend_username,
      mockUser.display_name,
      mockUser.avatar,
      focusMinutes,
      tasksCompleted,
      streak,
      isFocusing,
      now,
      mockUser.description,
      mockUser.custom_show_focus,
      mockUser.custom_show_tasks,
      mockUser.custom_show_streak,
      mockUser.custom_show_timeline,
      mockUser.custom_theme,
      JSON.stringify(mockUser.focus_history)
    )
  }

  return getCachedFriendStats()
}
