// src/main/ipc/notes.ipc.ts
import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { 
  listAllNotes, 
  getNoteById, 
  getNotesByParent, 
  pinNote, 
  archiveNote, 
  deleteNote, 
  createNote, 
  updateNote,
  getBacklinks
} from '../db/notes'
import { getDb } from '../db/database'

function sanitizeFilename(name: string): string {
  return name.replace(/[\\\/:\*\?"<>\|]/g, '-').trim()
}

export function registerNotesHandlers(): void {
  ipcMain.handle('notes:listAll', async () => {
    return listAllNotes()
  })

  ipcMain.handle('notes:get', async (_, id: string) => {
    return getNoteById(id)
  })

  ipcMain.handle('notes:getByParent', async (_, parentType: string, parentId: string) => {
    return getNotesByParent(parentType, parentId)
  })

  ipcMain.handle('notes:create', async (_, input: any) => {
    return createNote(input)
  })

  ipcMain.handle('notes:update', async (_, input: any) => {
    return updateNote(input)
  })

  ipcMain.handle('notes:delete', async (_, id: string) => {
    deleteNote(id)
    return { success: true }
  })

  ipcMain.handle('notes:pin', async (_, id: string, pinned: boolean) => {
    pinNote(id, pinned)
    return { success: true }
  })

  ipcMain.handle('notes:archive', async (_, id: string, archived: boolean) => {
    archiveNote(id, archived)
    return { success: true }
  })

  ipcMain.handle('notes:getBacklinks', async (_, noteId: string) => {
    return getBacklinks(noteId)
  })

  ipcMain.handle('notes:exportAll', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (!focusedWindow) {
      return { success: false, error: 'No focused window' }
    }

    const { filePaths, canceled } = await dialog.showOpenDialog(focusedWindow, {
      title: 'Select Destination Folder for Vault Export',
      properties: ['openDirectory', 'createDirectory']
    })

    if (canceled || filePaths.length === 0) {
      return { success: false, canceled: true }
    }

    const baseDir = filePaths[0]
    const db = getDb()

    try {
      const notes = db.prepare('SELECT * FROM notes').all() as any[]
      let exportedCount = 0

      for (const note of notes) {
        let relativeFolder = 'Standalone'

        if (note.parent_type === 'project' && note.parent_id) {
          const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(note.parent_id) as { name: string } | undefined
          const projName = project ? sanitizeFilename(project.name) : 'Unknown Project'
          relativeFolder = path.join('Projects', projName)
        } else if (note.parent_type === 'task' && note.parent_id) {
          const task = db.prepare('SELECT title, project_id FROM tasks WHERE id = ?').get(note.parent_id) as { title: string; project_id: string | null } | undefined
          if (task) {
            const taskTitle = sanitizeFilename(task.title)
            if (task.project_id) {
              const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(task.project_id) as { name: string } | undefined
              const projName = project ? sanitizeFilename(project.name) : 'Unknown Project'
              relativeFolder = path.join('Projects', projName, 'Tasks', taskTitle)
            } else {
              relativeFolder = path.join('Inbox', 'Tasks', taskTitle)
            }
          } else {
            relativeFolder = path.join('Inbox', 'Tasks', 'Unknown Task')
          }
        } else if (note.parent_type === 'session' && note.parent_id) {
          const session = db.prepare('SELECT custom_name, started_at FROM sessions WHERE id = ?').get(note.parent_id) as { custom_name: string | null; started_at: string } | undefined
          const sessTitle = session ? (session.custom_name || `Session-${session.started_at.substring(0, 10)}`) : 'Unknown Session'
          relativeFolder = path.join('Sessions', sanitizeFilename(sessTitle))
        }

        const targetFolder = path.join(baseDir, relativeFolder)
        fs.mkdirSync(targetFolder, { recursive: true })

        const filename = `${sanitizeFilename(note.title)}.md`
        const fullPath = path.join(targetFolder, filename)

        // YAML frontmatter for Obsidian portability
        const fileContent = `---
title: ${JSON.stringify(note.title)}
id: ${note.id}
parent_type: ${note.parent_type}
parent_id: ${note.parent_id || ''}
pinned: ${note.pinned ? 'true' : 'false'}
archived: ${note.archived ? 'true' : 'false'}
created_at: ${note.created_at}
updated_at: ${note.updated_at}
---

${note.body_md}
`
        fs.writeFileSync(fullPath, fileContent, 'utf-8')
        exportedCount++
      }

      return { success: true, count: exportedCount, folderPath: baseDir }
    } catch (err: any) {
      console.error('Failed to export markdown notes:', err)
      return { success: false, error: err.message }
    }
  })
}
