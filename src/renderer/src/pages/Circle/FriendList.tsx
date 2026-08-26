// src/renderer/src/pages/Circle/FriendList.tsx
import React, { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { CircleStatsCache } from '../../types'
import { FriendCard } from './FriendCard'

interface FriendListProps {
  friendStats: CircleStatsCache[]
  myStats: CircleStatsCache | null
  isSyncing: boolean
  onSyncNow: () => void
  onRemoveFriend: (username: string) => void
  onViewProfile?: (friend: CircleStatsCache) => void
}

type SortOption = 'focus' | 'streak'

export const FriendList: React.FC<FriendListProps> = ({
  friendStats,
  myStats,
  isSyncing,
  onSyncNow,
  onRemoveFriend,
  onViewProfile
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('focus')

  // Combine my stats with friends stats to build a full leaderboard
  const allLeaderboardItems = [...friendStats]
  if (myStats) {
    // Only add if not already in friends
    if (!allLeaderboardItems.some((f) => f.friend_username === myStats.friend_username)) {
      allLeaderboardItems.push(myStats)
    }
  }

  // Sort function
  const sortedItems = [...allLeaderboardItems].sort((a, b) => {
    if (sortBy === 'focus') {
      return b.focus_minutes_today - a.focus_minutes_today
    } else {
      return b.current_streak - a.current_streak
    }
  })

  return (
    <div className="space-y-6">
      {/* List Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-zinc-900/10 border border-zinc-850 p-4 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Sort Leaderboard:</span>
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-900 shadow-inner">
            <button
              onClick={() => setSortBy('focus')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all select-none cursor-pointer ${
                sortBy === 'focus'
                  ? 'bg-zinc-850 text-indigo-400'
                  : 'text-zinc-550 hover:text-zinc-300'
              }`}
            >
              Focus Time
            </button>
            <button
              onClick={() => setSortBy('streak')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all select-none cursor-pointer ${
                sortBy === 'streak'
                  ? 'bg-zinc-850 text-amber-400'
                  : 'text-zinc-550 hover:text-zinc-300'
              }`}
            >
              Daily Streak
            </button>
          </div>
        </div>

        <button
          onClick={onSyncNow}
          disabled={isSyncing}
          className="flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 hover:text-indigo-400 text-zinc-300 rounded-lg border border-zinc-800 text-xs font-bold transition-all disabled:opacity-50 select-none cursor-pointer"
        >
          <svg
            className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3m0 0l3 3m-3-3v12"
            />
          </svg>
          {isSyncing ? 'Syncing...' : 'Sync Stats'}
        </button>
      </div>

      {allLeaderboardItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border-2 border-dashed border-zinc-850/60 bg-zinc-900/10 backdrop-blur-sm max-w-lg mx-auto">
          <div className="text-4xl mb-4 select-none">🤝</div>
          <h4 className="text-sm font-bold text-zinc-300 font-sans">No friends in your Circle yet</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-2 leading-relaxed">
            Invite colleagues or search for existing users. Compare your daily focus times, complete goals, and share progress.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {sortedItems.map((friend) => {
              const isMyCard = myStats ? friend.friend_username === myStats.friend_username : false
              return (
                <FriendCard
                  key={friend.friend_username}
                  friend={friend}
                  isMyCard={isMyCard}
                  onRemoveFriend={onRemoveFriend}
                  onViewProfile={onViewProfile}
                />
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
