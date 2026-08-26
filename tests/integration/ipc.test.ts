// tests/integration/ipc.test.ts
import { describe, it, expect } from 'vitest'
import { registerAllHandlers } from '../../src/main/ipc/index'
import { ipcMain } from 'electron'

describe('IPC Command Channel Registries', () => {
  it('correctly mounts all mandatory inter-process communications channels', () => {
    // Clear mock calls to starts clean
    const handleMock = ipcMain.handle as any
    handleMock.mockClear()

    // Execute mounting process
    registerAllHandlers()

    // Assert that the ipcMain.handle registry matches our core channel design specifications
    const registeredChannels = handleMock.mock.calls.map((call: any) => call[0])

    expect(registeredChannels).toContain('tasks:getAll')
    expect(registeredChannels).toContain('tasks:getDeleted')
    expect(registeredChannels).toContain('tasks:create')
    expect(registeredChannels).toContain('tasks:update')
    expect(registeredChannels).toContain('tasks:delete')
    expect(registeredChannels).toContain('settings:get')
    expect(registeredChannels).toContain('settings:set')
    expect(registeredChannels).toContain('license:getEntitlements')
    expect(registeredChannels).toContain('license:activate')
  })
})
