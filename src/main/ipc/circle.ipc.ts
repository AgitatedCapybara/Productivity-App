// src/main/ipc/circle.ipc.ts
import { ipcMain } from 'electron'
import {
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  toggleSharing,
  searchUser,
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  getFriendsList,
  getMyAggregateStats,
  getCachedFriendStats,
  syncFriendsStats
} from '../db/circle'

export function registerCircleHandlers(): void {
  ipcMain.handle('circle:profile:get', async () => {
    return getProfile()
  })

  ipcMain.handle('circle:profile:create', async (_, { username, displayName, avatar }: { username: string; displayName: string; avatar: string }) => {
    return createProfile(username, displayName, avatar)
  })

  ipcMain.handle('circle:profile:update', async (_, input: {
    displayName: string
    avatar: string
    description?: string
    customShowFocus?: number
    customShowTasks?: number
    customShowStreak?: number
    customShowTimeline?: number
    customTheme?: string
  }) => {
    return updateProfile(
      input.displayName,
      input.avatar,
      input.description,
      input.customShowFocus,
      input.customShowTasks,
      input.customShowStreak,
      input.customShowTimeline,
      input.customTheme
    )
  })

  ipcMain.handle('circle:profile:delete', async () => {
    return deleteProfile()
  })

  ipcMain.handle('circle:profile:toggle-sharing', async (_, enabled: boolean) => {
    return toggleSharing(enabled)
  })

  ipcMain.handle('circle:friends:search', async (_, searchQuery: string) => {
    return searchUser(searchQuery)
  })

  ipcMain.handle('circle:friends:send-request', async (_, friendUsername: string) => {
    return sendFriendRequest(friendUsername)
  })

  ipcMain.handle('circle:friends:get-requests', async () => {
    return getFriendRequests()
  })

  ipcMain.handle('circle:friends:accept-request', async (_, friendUsername: string) => {
    acceptFriendRequest(friendUsername)
    return true
  })

  ipcMain.handle('circle:friends:decline-request', async (_, friendUsername: string) => {
    declineFriendRequest(friendUsername)
    return true
  })

  ipcMain.handle('circle:friends:list', async () => {
    return getFriendsList()
  })

  ipcMain.handle('circle:stats:get-my-aggregate', async () => {
    return getMyAggregateStats()
  })

  ipcMain.handle('circle:stats:sync-friends', async () => {
    return syncFriendsStats()
  })

  ipcMain.handle('circle:stats:get-cached', async () => {
    return getCachedFriendStats()
  })
}
