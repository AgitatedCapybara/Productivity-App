import type { Database } from 'better-sqlite3'

export function runMigrations(db: Database): void {
  const userVersionStmt = db.prepare('PRAGMA user_version')
  let { user_version } = userVersionStmt.get() as { user_version: number }

  if (user_version < 1) {
    db.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#6366f1',
        icon TEXT DEFAULT 'folder',
        sort_order REAL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        notes TEXT DEFAULT '',
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        priority INTEGER DEFAULT 0,
        status TEXT DEFAULT 'todo',
        due_date TEXT,
        due_time TEXT,
        recurrence TEXT,
        sort_order REAL DEFAULT 0,
        time_estimate_mins INTEGER DEFAULT 0,
        time_logged_mins INTEGER DEFAULT 0,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_mins INTEGER DEFAULT 0,
        distraction_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active'
      );

      CREATE TABLE distractions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        app_name TEXT NOT NULL,
        window_title TEXT DEFAULT '',
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_ms INTEGER DEFAULT 0
      );
    `)

    db.exec('PRAGMA user_version = 1')
    user_version = 1
  }

  if (user_version < 2) {
    const insertDefaultProject = db.prepare(`
      INSERT INTO projects (id, name, color, icon, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `)
    insertDefaultProject.run('inbox-default', 'Inbox', '#6366f1', 'inbox', 0)

    db.exec('PRAGMA user_version = 2')
    user_version = 2
  }

  if (user_version < 3) {
    db.exec(`
      CREATE TABLE habits (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        frequency TEXT NOT NULL DEFAULT 'daily',
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)

    db.exec('PRAGMA user_version = 3')
    user_version = 3
  }

  if (user_version < 4) {
    const checkStmt = db.prepare('SELECT id FROM projects WHERE id = ?')
    const insertProject = db.prepare(`
      INSERT INTO projects (id, name, color, icon, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `)

    // Safely add Work and Personal without duplicates if user already created them
    if (!checkStmt.get('default-work')) {
      insertProject.run('default-work', 'Work', '#3b82f6', 'briefcase', 1)
    }
    if (!checkStmt.get('default-personal')) {
      insertProject.run('default-personal', 'Personal', '#10b981', 'user', 2)
    }

    db.exec('PRAGMA user_version = 4')
    user_version = 4
  }

  if (user_version < 5) {
    db.exec(`
      ALTER TABLE sessions ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
      ALTER TABLE sessions ADD COLUMN target_duration_mins INTEGER DEFAULT 25;
    `)
    db.exec('PRAGMA user_version = 5')
    user_version = 5
  }

  if (user_version < 6) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `)
    db.exec('PRAGMA user_version = 6')
    user_version = 6
  }

  if (user_version < 7) {
    db.exec(`
      ALTER TABLE sessions ADD COLUMN reflection TEXT DEFAULT '';
      ALTER TABLE sessions ADD COLUMN clarity_rating INTEGER DEFAULT NULL;
      ALTER TABLE sessions ADD COLUMN energy_rating INTEGER DEFAULT NULL;
    `)
    db.exec('PRAGMA user_version = 7')
    user_version = 7
  }

  if (user_version < 8) {
    db.exec(`
      ALTER TABLE sessions ADD COLUMN custom_name TEXT DEFAULT NULL;
    `)
    db.exec('PRAGMA user_version = 8')
    user_version = 8
  }

  if (user_version < 9) {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_sessions_task_id ON sessions(task_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
      CREATE INDEX IF NOT EXISTS idx_distractions_session_id ON distractions(session_id);
    `)
    db.exec('PRAGMA user_version = 9')
    user_version = 9
  }

  if (user_version < 10) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS habit_logs (
        id TEXT PRIMARY KEY,
        habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(habit_id, date)
      );
    `)
    try {
      db.exec("ALTER TABLE habits ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;")
    } catch (e) {
      // Ignored if column already exists
    }
    try {
      db.exec("ALTER TABLE habits ADD COLUMN is_paused INTEGER NOT NULL DEFAULT 0;")
    } catch (e) {
      // Ignored if column already exists
    }
    try {
      db.exec("ALTER TABLE habits ADD COLUMN session_link INTEGER NOT NULL DEFAULT 0;")
    } catch (e) {
      // Ignored if column already exists
    }
    db.exec('PRAGMA user_version = 10')
    user_version = 10
  }

  if (user_version < 11) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        start_at TEXT NOT NULL,
        end_at TEXT NOT NULL,
        project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
        recurrence TEXT NOT NULL DEFAULT 'none',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
    db.exec('PRAGMA user_version = 11')
    user_version = 11
  }

  if (user_version < 12) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        circle_sharing_enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profile_username ON user_profile(username);

      CREATE TABLE IF NOT EXISTS friends (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        friend_username TEXT NOT NULL,
        status TEXT NOT NULL, -- 'pending', 'accepted', 'declined'
        requested_by TEXT NOT NULL, -- 'user', 'friend'
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(user_id, friend_username)
      );

      CREATE INDEX IF NOT EXISTS idx_friends_user_id_friend_username ON friends(user_id, friend_username);
      CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

      CREATE TABLE IF NOT EXISTS friend_stats_cache (
        friend_username TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        focus_minutes_today INTEGER NOT NULL,
        tasks_completed_today INTEGER NOT NULL,
        current_streak INTEGER NOT NULL,
        is_focusing INTEGER NOT NULL,
        last_synced_at INTEGER NOT NULL
      );
    `)
    db.exec('PRAGMA user_version = 12')
    user_version = 12
  }

  if (user_version < 13) {
    // Add columns to user_profile table
    try {
      db.exec("ALTER TABLE user_profile ADD COLUMN description TEXT DEFAULT 'Focusing on building and shipping projects! 🚀';")
    } catch (_) {}
    try {
      db.exec("ALTER TABLE user_profile ADD COLUMN custom_show_focus INTEGER DEFAULT 1;")
    } catch (_) {}
    try {
      db.exec("ALTER TABLE user_profile ADD COLUMN custom_show_tasks INTEGER DEFAULT 1;")
    } catch (_) {}
    try {
      db.exec("ALTER TABLE user_profile ADD COLUMN custom_show_streak INTEGER DEFAULT 1;")
    } catch (_) {}
    try {
      db.exec("ALTER TABLE user_profile ADD COLUMN custom_show_timeline INTEGER DEFAULT 1;")
    } catch (_) {}
    try {
      db.exec("ALTER TABLE user_profile ADD COLUMN custom_theme TEXT DEFAULT 'indigo';")
    } catch (_) {}

    // Add columns to friend_stats_cache table
    try {
      db.exec("ALTER TABLE friend_stats_cache ADD COLUMN description TEXT DEFAULT 'Solo developer grinding in deep focus sessions.';")
    } catch (_) {}
    try {
      db.exec("ALTER TABLE friend_stats_cache ADD COLUMN custom_show_focus INTEGER DEFAULT 1;")
    } catch (_) {}
    try {
      db.exec("ALTER TABLE friend_stats_cache ADD COLUMN custom_show_tasks INTEGER DEFAULT 1;")
    } catch (_) {}
    try {
      db.exec("ALTER TABLE friend_stats_cache ADD COLUMN custom_show_streak INTEGER DEFAULT 1;")
    } catch (_) {}
    try {
      db.exec("ALTER TABLE friend_stats_cache ADD COLUMN custom_show_timeline INTEGER DEFAULT 1;")
    } catch (_) {}
    try {
      db.exec("ALTER TABLE friend_stats_cache ADD COLUMN custom_theme TEXT DEFAULT 'indigo';")
    } catch (_) {}
    try {
      db.exec("ALTER TABLE friend_stats_cache ADD COLUMN focus_history_json TEXT DEFAULT '[]';")
    } catch (_) {}

    db.exec('PRAGMA user_version = 13')
    user_version = 13
  }
}
