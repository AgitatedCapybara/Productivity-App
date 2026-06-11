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
}
