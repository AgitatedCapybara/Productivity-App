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

  if (user_version < 14) {
    db.exec(`
      -- New performance indexes
      CREATE INDEX IF NOT EXISTS idx_tasks_proj_status_date_sort ON tasks(project_id, status, due_date, sort_order);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date_active ON tasks(due_date) WHERE status NOT IN ('done', 'deleted');
      CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id_date ON habit_logs(habit_id, date);
      CREATE INDEX IF NOT EXISTS idx_sessions_started_ended ON sessions(started_at, ended_at);
      CREATE INDEX IF NOT EXISTS idx_events_start_end_at ON calendar_events(start_at, end_at);

      -- FTS5 Virtual Table for Search
      CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
        id UNINDEXED, 
        type UNINDEXED, 
        title, 
        content
      );

      -- Triggers for Projects
      CREATE TRIGGER IF NOT EXISTS trg_projects_insert AFTER INSERT ON projects BEGIN
        INSERT INTO search_index (id, type, title, content) VALUES (new.id, 'project', new.name, '');
      END;
      CREATE TRIGGER IF NOT EXISTS trg_projects_update AFTER UPDATE ON projects BEGIN
        UPDATE search_index SET title = new.name, content = '' WHERE id = new.id AND type = 'project';
      END;
      CREATE TRIGGER IF NOT EXISTS trg_projects_delete AFTER DELETE ON projects BEGIN
        DELETE FROM search_index WHERE id = old.id AND type = 'project';
      END;

      -- Triggers for Tasks
      CREATE TRIGGER IF NOT EXISTS trg_tasks_insert AFTER INSERT ON tasks BEGIN
        INSERT INTO search_index (id, type, title, content) VALUES (new.id, 'task', new.title, COALESCE(new.notes, ''));
      END;
      CREATE TRIGGER IF NOT EXISTS trg_tasks_update AFTER UPDATE ON tasks BEGIN
        UPDATE search_index SET title = new.title, content = COALESCE(new.notes, '') WHERE id = new.id AND type = 'task';
      END;
      CREATE TRIGGER IF NOT EXISTS trg_tasks_delete AFTER DELETE ON tasks BEGIN
        DELETE FROM search_index WHERE id = old.id AND type = 'task';
      END;

      -- Triggers for Calendar Events
      CREATE TRIGGER IF NOT EXISTS trg_events_insert AFTER INSERT ON calendar_events BEGIN
        INSERT INTO search_index (id, type, title, content) VALUES (new.id, 'event', new.title, COALESCE(new.description, ''));
      END;
      CREATE TRIGGER IF NOT EXISTS trg_events_update AFTER UPDATE ON calendar_events BEGIN
        UPDATE search_index SET title = new.title, content = COALESCE(new.description, '') WHERE id = new.id AND type = 'event';
      END;
      CREATE TRIGGER IF NOT EXISTS trg_events_delete AFTER DELETE ON calendar_events BEGIN
        DELETE FROM search_index WHERE id = old.id AND type = 'event';
      END;

      -- Populate FTS5 Index from existing rows
      DELETE FROM search_index;

      INSERT OR IGNORE INTO search_index (id, type, title, content)
      SELECT id, 'project', name, '' FROM projects;

      INSERT OR IGNORE INTO search_index (id, type, title, content)
      SELECT id, 'task', title, COALESCE(notes, '') FROM tasks;

      INSERT OR IGNORE INTO search_index (id, type, title, content)
      SELECT id, 'event', title, COALESCE(description, '') FROM calendar_events;
    `)
    db.exec('PRAGMA user_version = 14')
    user_version = 14
  }

  if (user_version < 15) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_used_at TEXT,
        use_count INTEGER DEFAULT 0
      );
    `)
    db.exec('PRAGMA user_version = 15')
    user_version = 15
  }

  if (user_version < 16) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS suggestions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        suggested_start TEXT NOT NULL,
        suggested_end TEXT NOT NULL,
        rationale TEXT NOT NULL,
        confidence REAL NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'declined', 'snoozed')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT
      );

      CREATE TABLE IF NOT EXISTS scheduling_preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_suggestions_task_id ON suggestions(task_id);
      CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
    `)

    // Seed default preferences
    const seedPref = db.prepare(`
      INSERT OR IGNORE INTO scheduling_preferences (key, value)
      VALUES (?, ?)
    `)
    seedPref.run('work_hours_start', '09:00')
    seedPref.run('work_hours_end', '17:00')
    seedPref.run('deep_work_window_start', '09:00')
    seedPref.run('deep_work_window_end', '12:00')
    seedPref.run('no_meeting_blocks', '[]')
    seedPref.run('ignore_energy_patterns', 'false')
    seedPref.run('scheduler.nudges.enabled', 'true')

    db.exec('PRAGMA user_version = 16')
    user_version = 16
  }

  if (user_version < 17) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ritual_entries (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('morning', 'evening')),
        date TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(type, date)
      );
    `)

    // Seed default settings/preferences for rituals
    const seedPref = db.prepare(`
      INSERT OR IGNORE INTO scheduling_preferences (key, value)
      VALUES (?, ?)
    `)
    seedPref.run('rituals.morning.enabled', 'true')
    seedPref.run('rituals.morning.autotrigger', 'true')
    seedPref.run('rituals.evening.enabled', 'true')
    seedPref.run('rituals.evening.autotrigger', 'true')
    seedPref.run('rituals.evening.time', '18:00')
    seedPref.run('rituals.capacity.working_hours', '8')
    seedPref.run('rituals.capacity.break_buffer', '1.5')
    seedPref.run('rituals.capacity.default_duration', '30')
    seedPref.run('rituals.quiet_mode_until', '')

    db.exec('PRAGMA user_version = 17')
    user_version = 17
  }

  if (user_version < 18) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        parent_type TEXT NOT NULL CHECK(parent_type IN ('task', 'project', 'session', 'standalone')),
        parent_id TEXT,
        title TEXT NOT NULL,
        body_md TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        pinned INTEGER DEFAULT 0,
        archived INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS note_links (
        id TEXT PRIMARY KEY,
        source_note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        target_note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(source_note_id, target_note_id)
      );

      CREATE INDEX IF NOT EXISTS idx_notes_parent ON notes(parent_type, parent_id);
      CREATE INDEX IF NOT EXISTS idx_note_links_source ON note_links(source_note_id);
      CREATE INDEX IF NOT EXISTS idx_note_links_target ON note_links(target_note_id);

      -- Triggers for Notes Search Index
      CREATE TRIGGER IF NOT EXISTS trg_notes_insert AFTER INSERT ON notes BEGIN
        INSERT INTO search_index (id, type, title, content) VALUES (new.id, 'note', new.title, COALESCE(new.body_md, ''));
      END;
      CREATE TRIGGER IF NOT EXISTS trg_notes_update AFTER UPDATE ON notes BEGIN
        UPDATE search_index SET title = new.title, content = COALESCE(new.body_md, '') WHERE id = new.id AND type = 'note';
      END;
      CREATE TRIGGER IF NOT EXISTS trg_notes_delete AFTER DELETE ON notes BEGIN
        DELETE FROM search_index WHERE id = old.id AND type = 'note';
      END;
    `)

    // Seed default settings for notes
    const seedPref = db.prepare(`
      INSERT OR IGNORE INTO scheduling_preferences (key, value)
      VALUES (?, ?)
    `)
    seedPref.run('notes.enabled', 'true')

    db.exec('PRAGMA user_version = 18')
    user_version = 18
  }

  if (user_version < 19) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS view_presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        filters TEXT, 
        sort TEXT, 
        group_by TEXT, 
        layout TEXT NOT NULL 
      );

      CREATE TABLE IF NOT EXISTS card_placements (
        note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        view_id TEXT NOT NULL REFERENCES view_presets(id) ON DELETE CASCADE,
        position_x REAL DEFAULT 0,
        position_y REAL DEFAULT 0,
        z_index INTEGER DEFAULT 0,
        PRIMARY KEY (note_id, view_id)
      );

      CREATE TABLE IF NOT EXISTS actions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        command TEXT NOT NULL,
        icon TEXT,
        context TEXT
      );
    `)

    // Check if column card_mode exists on notes
    try {
      const columns = db.pragma('table_info(notes)') as Array<{ name: string }> | null | undefined
      const hasCardMode = Array.isArray(columns) && columns.some(col => col && col.name === 'card_mode')
      if (!hasCardMode) {
        db.exec('ALTER TABLE notes ADD COLUMN card_mode INTEGER DEFAULT 0')
      }
    } catch (e) {
      console.warn('Could not add card_mode to notes table:', e)
    }

    // Check if column pomodoro_count exists on sessions
    try {
      const columns = db.pragma('table_info(sessions)') as Array<{ name: string }> | null | undefined
      const hasPomodoroCount = Array.isArray(columns) && columns.some(col => col && col.name === 'pomodoro_count')
      if (!hasPomodoroCount) {
        db.exec('ALTER TABLE sessions ADD COLUMN pomodoro_count INTEGER DEFAULT 0')
      }
    } catch (e) {
      console.warn('Could not add pomodoro_count to sessions table:', e)
    }

    // Seed default view presets
    try {
      const seedView = db.prepare(`
        INSERT OR IGNORE INTO view_presets (id, name, filters, sort, group_by, layout)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      seedView.run('preset-kanban', 'Kanban Board', '{}', '[]', 'status', 'kanban')
      seedView.run('preset-calendar', 'Calendar View', '{}', '[]', '', 'calendar')
      seedView.run('preset-gallery', 'Gallery View', '{}', '[]', '', 'gallery')
      seedView.run('preset-timeline', 'Timeline View', '{}', '[]', '', 'timeline')
      seedView.run('preset-board', 'Spatial Workspace', '{}', '[]', '', 'board')
    } catch (e) {
      console.error('Failed to seed default view presets:', e)
    }

    db.exec('PRAGMA user_version = 19')
    user_version = 19
  }

  if (user_version < 20) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        metadata_json TEXT DEFAULT '{}'
      );
    `)
    db.exec('PRAGMA user_version = 20')
    user_version = 20
  }

  if (user_version < 21) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS license (
        id TEXT PRIMARY KEY,
        tier TEXT NOT NULL CHECK(tier IN ('free', 'pro', 'team_creator', 'team_member')),
        activation_key TEXT NOT NULL,
        activated_at TEXT NOT NULL,
        expires_at TEXT,
        machine_hash TEXT NOT NULL,
        offline_grace_until TEXT
      );
    `)
    db.exec('PRAGMA user_version = 21')
    user_version = 21
  }

  if (user_version < 22) {
    db.exec(`
      ALTER TABLE tasks ADD COLUMN plan_when TEXT;
      ALTER TABLE tasks ADD COLUMN plan_where TEXT;
      ALTER TABLE tasks ADD COLUMN plan_how TEXT;
    `)
    db.exec('PRAGMA user_version = 22')
    user_version = 22
  }

  if (user_version < 23) {
    db.exec('PRAGMA user_version = 23')
    user_version = 23
  }

  if (user_version < 24) {
    try {
      db.exec(`
        ALTER TABLE sessions ADD COLUMN target_break_duration_mins INTEGER DEFAULT 5;
      `)
    } catch (e) {
      console.warn('Could not add target_break_duration_mins to sessions table:', e)
    }
    db.exec('PRAGMA user_version = 24')
    user_version = 24
  }
}
