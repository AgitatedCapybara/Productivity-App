// src/main/ipc/export.ipc.ts
import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as fs from 'fs'
import { getDb } from '../db/database'

function convertToCSV(tableName: string, data: any[]): string {
  if (!data || data.length === 0) {
    return `=== ${tableName} ===\n(No records)\n`
  }
  const headers = Object.keys(data[0])
  const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')
  const rows = data.map(row => {
    return headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) {
        return '""'
      }
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  })
  return `=== ${tableName} ===\n${headerRow}\n${rows.join('\n')}\n`
}

export function registerExportHandlers(): void {
  ipcMain.handle('data:export', async (_event, format: 'json' | 'csv') => {
    try {
      const db = getDb()
      
      // Read data synchronously from primary tables (AI-2)
      const tasks = db.prepare('SELECT id, title, notes, project_id, priority, status, due_date, due_time, recurrence, sort_order, time_estimate_mins, time_logged_mins, completed_at, created_at, updated_at, plan_when, plan_where, plan_how FROM tasks').all()
      const projects = db.prepare('SELECT id, name, color, icon, sort_order, created_at FROM projects').all()
      const sessions = db.prepare('SELECT id, task_id, project_id, target_duration_mins, started_at, ended_at, duration_mins, distraction_count, status, reflection, clarity_rating, energy_rating, custom_name FROM sessions').all()
      
      let notes: any[] = []
      try {
        notes = db.prepare('SELECT id, parent_type, parent_id, title, body_md, created_at, updated_at, pinned, archived FROM notes').all()
      } catch (err) {
        console.warn('Could not read notes table:', err)
      }

      let note_links: any[] = []
      try {
        note_links = db.prepare('SELECT id, source_note_id, target_note_id, created_at FROM note_links').all()
      } catch (err) {
        console.warn('Could not read note_links table:', err)
      }

      let fileContent = ''
      if (format === 'json') {
        const payload = {
          tasks,
          projects,
          sessions,
          notes,
          note_links
        }
        fileContent = JSON.stringify(payload, null, 2)
      } else {
        fileContent = [
          convertToCSV('Tasks', tasks),
          convertToCSV('Projects', projects),
          convertToCSV('Sessions', sessions),
          convertToCSV('Notes', notes),
          convertToCSV('Note Links', note_links)
        ].join('\n')
      }

      const focusedWindow = BrowserWindow.getFocusedWindow()
      if (!focusedWindow) {
        return { success: false, error: 'No focused window found' }
      }

      const defaultFilename = format === 'json' ? 'keystone-export.json' : 'keystone-export.csv'
      const { filePath, canceled } = await dialog.showSaveDialog(focusedWindow, {
        title: format === 'json' ? 'Export Local Workspace Data (JSON)' : 'Export Local Workspace Data (CSV)',
        defaultPath: defaultFilename,
        filters: format === 'json'
          ? [{ name: 'JSON files', extensions: ['json'] }]
          : [{ name: 'CSV files', extensions: ['csv'] }]
      })

      if (canceled || !filePath) {
        return { success: false, canceled: true }
      }

      fs.writeFileSync(filePath, fileContent, 'utf-8')
      return { success: true, filePath }
    } catch (err: any) {
      console.error('Data export error:', err)
      return { success: false, error: err.message || 'Failed to export workspace data' }
    }
  })
}
