import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerExportHandlers } from '../../src/main/ipc/export.ipc'
import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import { dbState, resetDbState } from '../setup'

// Mock writeFileSync to prevent writing real files during test run
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return {
    ...actual,
    writeFileSync: vi.fn()
  }
})

describe('Multi-Format Data Exporter Integration', () => {
  beforeEach(() => {
    // Clear mocks
    vi.mocked(fs.writeFileSync).mockClear()
    vi.mocked(dialog.showSaveDialog).mockClear()

    resetDbState()

    // Insert some test data directly into dbState
    dbState.projects.push({ id: 'p1', name: 'Work', color: 'blue', icon: 'briefcase', sort_order: 1, created_at: '2026-06-25T00:00:00Z' })
    dbState.tasks.push({ id: 't1', title: 'Build API exporter', notes: 'Exclude sensitive data keys', status: 'todo', priority: 3, time_estimate_mins: 45, sort_order: 1 })
    dbState.sessions.push({ id: 's1', task_id: 't1', project_id: 'p1', target_duration_mins: 25, started_at: '2026-06-25T12:00:00Z', ended_at: '2026-06-25T12:25:00Z', duration_mins: 25, distraction_count: 0, status: 'completed' })
    dbState.notes.push({ id: 'n1', parent_type: 'standalone', parent_id: null, title: 'My Note', body_md: 'Note Content', created_at: '2026-06-25T12:00:00Z', updated_at: '2026-06-25T12:00:00Z', pinned: 0, archived: 0 })
    dbState.note_links.push({ id: 'nl1', source_note_id: 'n1', target_note_id: 'n2', created_at: '2026-06-25T12:00:00Z' })
  })

  it('exports user metrics and records as JSON correctly', async () => {
    // Trigger handler registration
    const handleMock = ipcMain.handle as any
    handleMock.mockClear()

    registerExportHandlers()

    // Find the 'data:export' handler callback
    const exportCall = handleMock.mock.calls.find((call: any) => call[0] === 'data:export')
    expect(exportCall).toBeDefined()
    const handlerCallback = exportCall[1]

    // Set save dialog path to return a test file
    vi.mocked(dialog.showSaveDialog).mockResolvedValueOnce({ filePath: '/tmp/test-export.json', canceled: false })

    const result = await handlerCallback({}, 'json')

    expect(result.success).toBe(true)
    expect(result.filePath).toBe('/tmp/test-export.json')
    expect(fs.writeFileSync).toHaveBeenCalled()

    // Verify written payload
    const writtenArgs = vi.mocked(fs.writeFileSync).mock.calls[0]
    expect(writtenArgs[0]).toBe('/tmp/test-export.json')
    const parsedData = JSON.parse(writtenArgs[1] as string)

    expect(parsedData.tasks).toBeDefined()
    expect(parsedData.projects).toBeDefined()
    expect(parsedData.sessions).toBeDefined()

    // Verify correct test items are present
    expect(parsedData.projects[0].name).toBe('Work')
    expect(parsedData.tasks[0].title).toBe('Build API exporter')
    expect(parsedData.sessions[0].id).toBe('s1')

    // Confirm absolutely NO sensitive fields are present
    const strPayload = JSON.stringify(parsedData)
    expect(strPayload).not.toContain('license_key')
    expect(strPayload).not.toContain('machine_hash')
    expect(strPayload).not.toContain('passphrase')
  })

  it('exports user metrics and records as CSV correctly', async () => {
    const handleMock = ipcMain.handle as any
    handleMock.mockClear()

    registerExportHandlers()

    const exportCall = handleMock.mock.calls.find((call: any) => call[0] === 'data:export')
    const handlerCallback = exportCall[1]

    vi.mocked(dialog.showSaveDialog).mockResolvedValueOnce({ filePath: '/tmp/test-export.csv', canceled: false })

    const result = await handlerCallback({}, 'csv')

    expect(result.success).toBe(true)
    expect(result.filePath).toBe('/tmp/test-export.csv')
    expect(fs.writeFileSync).toHaveBeenCalled()

    const writtenArgs = vi.mocked(fs.writeFileSync).mock.calls[0]
    expect(writtenArgs[0]).toBe('/tmp/test-export.csv')
    const csvContent = writtenArgs[1] as string

    // Verify table dividers are formatted as expected
    expect(csvContent).toContain('=== Tasks ===')
    expect(csvContent).toContain('=== Projects ===')
    expect(csvContent).toContain('=== Sessions ===')

    // Check header lines and value lines are populated correctly
    expect(csvContent).toContain('"Build API exporter"')
    expect(csvContent).toContain('"Work"')
    expect(csvContent).toContain('"s1"')

    // Confirm absolutely NO sensitive fields are present
    expect(csvContent).not.toContain('license_key')
    expect(csvContent).not.toContain('machine_hash')
    expect(csvContent).not.toContain('passphrase')
  })
})
