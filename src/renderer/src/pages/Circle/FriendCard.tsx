// src/renderer/src/pages/Circle/FriendCard.tsx
import React, { useState } from 'react'
import { motion } from 'motion/react'
import { CircleStatsCache } from '../../types'

interface FriendCardProps {
  friend: CircleStatsCache
  isMyCard?: boolean
  statsHidden?: boolean
  onRemoveFriend?: (username: string) => void
  onViewProfile?: (friend: CircleStatsCache) => void
}

export const FriendCard: React.FC<FriendCardProps> = ({
  friend,
  isMyCard = false,
  statsHidden = false,
  onRemoveFriend,
  onViewProfile
}) => {
  const [showConfirm, setShowConfirm] = useState(false)

  const formatMins = (mins: number) => {
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    const remaining = mins % 60
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
  }

  // Determine border and theme color schemas based on custom themes
  const getThemeClass = (theme: string, active: boolean) => {
    if (active) {
      switch (theme) {
        case 'emerald': return 'bg-emerald-950/15 border-emerald-500/20 shadow-emerald-950/5 hover:border-emerald-500/40 text-emerald-400'
        case 'rose': return 'bg-rose-950/15 border-rose-500/20 shadow-rose-950/5 hover:border-rose-500/40 text-rose-400'
        case 'amber': return 'bg-amber-950/15 border-amber-500/20 shadow-amber-950/5 hover:border-amber-500/40 text-amber-400'
        case 'sky': return 'bg-sky-950/15 border-sky-500/20 shadow-sky-950/5 hover:border-sky-500/40 text-sky-450'
        case 'violet': return 'bg-violet-950/15 border-violet-500/20 shadow-violet-950/5 hover:border-violet-500/40 text-violet-400'
        default: return 'bg-indigo-950/15 border-indigo-500/20 shadow-indigo-950/5 hover:border-indigo-500/40 text-indigo-400'
      }
    } else {
      switch (theme) {
        case 'emerald': return 'bg-zinc-900/30 border-zinc-850 hover:border-emerald-500/30 text-emerald-400'
        case 'rose': return 'bg-zinc-900/30 border-zinc-850 hover:border-rose-500/30 text-rose-400'
        case 'amber': return 'bg-zinc-900/30 border-zinc-850 hover:border-amber-500/30 text-amber-450'
        case 'sky': return 'bg-zinc-900/30 border-zinc-850 hover:border-sky-500/30 text-sky-400'
        case 'violet': return 'bg-zinc-900/30 border-zinc-850 hover:border-violet-500/30 text-violet-450'
        default: return 'bg-zinc-900/30 border-zinc-850 hover:border-indigo-500/30 text-indigo-400'
      }
    }
  }

  const themeClass = getThemeClass(friend.custom_theme || 'indigo', isMyCard)

  const themeTextCol = (theme: string) => {
    switch (theme) {
      case 'emerald': return 'text-emerald-400'
      case 'rose': return 'text-rose-400'
      case 'amber': return 'text-amber-400'
      case 'sky': return 'text-sky-400'
      case 'violet': return 'text-violet-400'
      default: return 'text-indigo-400'
    }
  }

  return (
    <motion.div
      layout="position"
      whileHover={{ y: -3, scale: 1.01 }}
      onClick={() => onViewProfile && onViewProfile(friend)}
      className={`relative p-5 rounded-xl border transition-colors duration-200 backdrop-blur-md flex flex-col justify-between cursor-pointer ${themeClass}`}
    >
      {/* Absolute Header with Status/Remove */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-zinc-950 border border-zinc-850 flex items-center justify-center text-2xl select-none shadow-sm overflow-hidden shrink-0">
            {friend.avatar && (friend.avatar.startsWith('data:image/') || friend.avatar.startsWith('http')) ? (
              <img src={friend.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              friend.avatar
            )}
          </div>
          <div>
            <h4 className="text-zinc-100 font-semibold text-sm tracking-tight flex items-center gap-1.5 leading-none">
              {friend.display_name}
              {isMyCard && (
                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-1.5 py-0.5 rounded font-black select-none uppercase tracking-wide">
                  You
                </span>
              )}
            </h4>
            <p className="text-[10px] text-zinc-500 mt-1 leading-none">@{friend.friend_username}</p>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Status Indicator */}
          {statsHidden ? (
            <span className="text-[9px] text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900 select-none uppercase tracking-wider font-semibold">
              Hidden
            </span>
          ) : friend.is_focusing === 1 ? (
             <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 font-black uppercase tracking-wider animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Focusing
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] bg-zinc-950 text-zinc-500 border border-zinc-900 font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
              Idle
            </span>
          )}

          {/* Unfriend Button */}
          {!isMyCard && onRemoveFriend && (
            <div className="relative">
              {showConfirm ? (
                <div className="absolute right-0 top-0 flex items-center gap-1 bg-zinc-950 border border-red-500/20 p-1.5 rounded-lg shadow-xl z-10 whitespace-nowrap">
                  <span className="text-[9px] text-red-400 mr-1 font-semibold">Remove?</span>
                  <button
                    onClick={() => onRemoveFriend(friend.friend_username)}
                    className="px-1.5 py-0.5 bg-red-650 hover:bg-red-550 text-white text-[9px] font-bold rounded cursor-pointer"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 text-[9px] font-medium rounded cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  title="Remove from Circle"
                  className="p-1 rounded text-zinc-550 hover:text-red-400 hover:bg-zinc-950 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {friend.description && (
        <p className="text-[11px] text-zinc-400 italic mt-3 line-clamp-2 leading-relaxed">
          "{friend.description}"
        </p>
      )}

      {/* Productivity Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mt-4 select-none bg-zinc-950/25 p-2 rounded-lg border border-zinc-900/40">
        <div className="text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-550 mb-1">Focus Today</p>
          <p className={`text-sm font-black font-mono ${themeTextCol(friend.custom_theme || 'indigo')}`}>
            {statsHidden || (friend.custom_show_focus === 0 && !isMyCard) ? '🔒' : formatMins(friend.focus_minutes_today)}
          </p>
        </div>
        <div className="text-center border-x border-zinc-900/60">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-550 mb-1">Tasks Done</p>
          <p className="text-sm font-black text-emerald-400 font-mono">
            {statsHidden || (friend.custom_show_tasks === 0 && !isMyCard) ? '🔒' : friend.tasks_completed_today}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-550 mb-1">Streak</p>
          <p className="text-sm font-black text-amber-400 font-mono flex items-center justify-center gap-0.5">
            {statsHidden || (friend.custom_show_streak === 0 && !isMyCard) ? '🔒' : (
              <>
                <span className="text-xs">🔥</span>
                {friend.current_streak}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Sync age footer */}
      {friend.last_synced_at && (
        <div className="mt-3 text-between items-center flex justify-between">
          <span className="text-[9.5px] text-indigo-100/40 font-mono bg-zinc-950/40 border border-zinc-900/50 px-1.5 py-0.5 rounded font-bold uppercase">
             Details ↗
          </span>
          {!isMyCard ? (
            <span className="text-[9px] text-zinc-600 font-sans">
              Synced {new Date(friend.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : (
            <span className="text-[9px] text-zinc-600 font-sans">Realtime Statistics</span>
          )}
        </div>
      )}
    </motion.div>
  )
}
