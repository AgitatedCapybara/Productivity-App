// src/renderer/src/pages/Circle/CirclePage.tsx
import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap'
import { dialogTransition } from '../../lib/motion-tokens'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { CircleProfile, CircleFriendship, CircleStatsCache } from '../../types'
import { ProfileSetup } from './ProfileSetup'
import { FriendList } from './FriendList'
import { FriendSearch } from './FriendSearch'
import { FriendRequests } from './FriendRequests'
import { PrivacyToggle } from './PrivacyToggle'
import { ProfileSettings } from './ProfileSettings'

type ActiveTab = 'leaderboard' | 'find' | 'requests' | 'settings'

export const CirclePage: React.FC = () => {
  const [profile, setProfile] = useState<CircleProfile | null>(null)
  const [isProfileChecking, setIsProfileChecking] = useState(true)

  const [friendships, setFriendships] = useState<CircleFriendship[]>([])
  const [friendStats, setFriendStats] = useState<CircleStatsCache[]>([])
  const [myStats, setMyStats] = useState<CircleStatsCache | null>(null)
  const [selectedProfileFriend, setSelectedProfileFriend] = useState<CircleStatsCache | null>(null)

  const friendModalRef = useModalFocusTrap<HTMLDivElement>({
    isOpen: !!selectedProfileFriend,
    onClose: () => setSelectedProfileFriend(null)
  })

  const [activeTab, setActiveTab] = useState<ActiveTab>('leaderboard')
  const [settingsSubTab, setSettingsSubTab] = useState<'privacy' | 'profile'>('privacy')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isPrivacyLoading, setIsPrivacyLoading] = useState(false)

  // Load all user database relations
  const loadProfile = async () => {
    try {
      const res = await window.electronAPI.getCircleProfile()
      setProfile(res)
    } catch (err) {
      console.error('Failed to get user profile:', err)
    } finally {
      setIsProfileChecking(false)
    }
  }

  const loadAllStatsAndData = useCallback(async () => {
    if (!profile) return
    try {
      // 1. Fetch friend requests
      const requests = await window.electronAPI.getCircleFriendRequests()
      setFriendships(requests)

      // 2. Fetch my aggregate stats
      const meStats = await window.electronAPI.getMyCircleAggregateStats()
      // If sharing is disabled, we simulate hiding my stats on the card
      if (profile.circle_sharing_enabled === 0) {
        setMyStats({
          ...meStats,
          focus_minutes_today: 0,
          tasks_completed_today: 0,
          current_streak: 0,
          is_focusing: 0
        })
      } else {
        setMyStats(meStats)
      }

      // 3. Fetch friend stats list
      const friendsList = await window.electronAPI.getCachedCircleFriendStats()
      setFriendStats(friendsList)
    } catch (err) {
      console.error('Failed to load social relations & stats:', err)
    }
  }, [profile])

  // Sync latest statistics
  const handleSync = async () => {
    if (!profile) return
    setIsSyncing(true)
    try {
      const updatedFriends = await window.electronAPI.syncCircleFriendsStats()
      setFriendStats(updatedFriends)

      const meStats = await window.electronAPI.getMyCircleAggregateStats()
      if (profile.circle_sharing_enabled === 0) {
        setMyStats({
          ...meStats,
          focus_minutes_today: 0,
          tasks_completed_today: 0,
          current_streak: 0,
          is_focusing: 0
        })
      } else {
        setMyStats(meStats)
      }
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleToggleSharing = async (enabled: boolean) => {
    if (!profile) return
    setIsPrivacyLoading(true)
    try {
      const updatedProfile = await window.electronAPI.toggleCircleSharing(enabled)
      setProfile(updatedProfile)
    } catch (err) {
      console.error('Failed to toggle sharing options:', err)
    } finally {
      setIsPrivacyLoading(false)
    }
  }

  const handleRemoveFriend = async (friendUsername: string) => {
    try {
      await window.electronAPI.declineCircleFriendRequest(friendUsername)
      loadAllStatsAndData()
    } catch (err) {
      console.error('Failed to remove friend:', err)
    }
  }

  // Check profile on mount
  useEffect(() => {
    loadProfile()
  }, [])

  // Once profile exists, load all core data
  useEffect(() => {
    if (profile) {
      loadAllStatsAndData()
    }
  }, [profile, loadAllStatsAndData])

  // Polling mechanism every 60 seconds
  useEffect(() => {
    if (!profile) return
    const interval = setInterval(() => {
      handleSync()
    }, 60000)
    return () => clearInterval(interval)
  }, [profile])

  if (isProfileChecking) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 font-sans text-xs italic shrink-0">
        Authenticating social workspace...
      </div>
    )
  }

  // First time onboarding setup
  if (!profile) {
    return <ProfileSetup onProfileCreated={(newProfile) => setProfile(newProfile)} />
  }

  const incomingRequestsCount = friendships.filter((r) => r.requested_by === 'friend').length

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-850/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            {profile.avatar && (profile.avatar.startsWith('data:image/') || profile.avatar.startsWith('http')) ? (
              <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-800 shadow-inner flex items-center justify-center bg-zinc-950 shrink-0">
                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <span className="text-3xl select-none">{profile.avatar}</span>
            )}
            <div>
              <h1 className="text-xl font-bold font-sans text-zinc-100 flex items-center gap-2">
                Circle Hub
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                Welcome back, <span className="text-zinc-300 font-semibold">@{profile.username}</span>. Build accountability with friends.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-900 shadow-md items-center gap-1">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-zinc-900 text-zinc-100 shadow-sm border border-zinc-850'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            📊 My Circle
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 relative cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-zinc-900 text-zinc-100 shadow-sm border border-zinc-850'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            ✉️ Requests
            {incomingRequestsCount > 0 && (
              <span className="absolute -top-1.5 -right-1 font-sans bg-rose-600 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center ring-2 ring-zinc-950 animate-bounce">
                {incomingRequestsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('find')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'find'
                ? 'bg-zinc-900 text-zinc-100 shadow-sm border border-zinc-850'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            🔍 Find Coders
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-zinc-900 text-zinc-100 shadow-sm border border-zinc-850'
                : 'text-zinc-500 hover:text-zinc-350'
            }`}
            title="Circle Settings"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Primary Tab Content with AnimatePresence */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <FriendList
                friendStats={friendStats}
                myStats={myStats}
                isSyncing={isSyncing}
                onSyncNow={handleSync}
                onRemoveFriend={handleRemoveFriend}
                onViewProfile={setSelectedProfileFriend}
              />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6 max-w-4xl"
            >
              {/* Settings Sub-tabs */}
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-900 shadow-md w-full sm:w-fit gap-1">
                <button
                  type="button"
                  onClick={() => setSettingsSubTab('privacy')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                    settingsSubTab === 'privacy'
                      ? 'bg-zinc-900 text-zinc-100 border border-zinc-850 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-350'
                  }`}
                >
                  🔒 Privacy & Sharing
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsSubTab('profile')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                    settingsSubTab === 'profile'
                      ? 'bg-zinc-900 text-zinc-100 border border-zinc-850 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-350'
                  }`}
                >
                  👤 Profile & Account
                </button>
              </div>

              <AnimatePresence mode="wait">
                {settingsSubTab === 'privacy' && (
                  <motion.div
                    key="settings-privacy"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 5 }}
                    transition={{ duration: 0.15 }}
                    className="p-5 rounded-2xl border border-zinc-850 bg-zinc-900/10 backdrop-blur-md space-y-4 shadow-xl"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-1 font-sans">
                        Privacy Preferences
                      </h3>
                      <p className="text-[11px] text-zinc-500 leading-normal">
                        Control how your focus statistics and real-time activity status are shared with other coders in your circle.
                      </p>
                    </div>
                    <PrivacyToggle
                      sharingEnabled={profile.circle_sharing_enabled === 1}
                      onToggle={handleToggleSharing}
                      isLoading={isPrivacyLoading}
                    />
                  </motion.div>
                )}

                {settingsSubTab === 'profile' && (
                  <motion.div
                    key="settings-profile"
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ProfileSettings
                      profile={profile}
                      onProfileUpdated={(updatedProfile) => setProfile(updatedProfile)}
                      onProfileDeleted={() => setProfile(null)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'requests' && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="max-w-xl"
            >
              <FriendRequests requests={friendships} onUpdateRequest={loadAllStatsAndData} />
            </motion.div>
          )}

          {activeTab === 'find' && (
            <motion.div
              key="find"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="max-w-2xl"
            >
              <FriendSearch
                existingFriends={friendships.filter(f => f.status === 'accepted')}
                pendingRequests={friendships.filter(f => f.status === 'pending')}
                onSentRequest={loadAllStatsAndData}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Friend Detail Profile Modal */}
      <AnimatePresence>
        {selectedProfileFriend && (() => {
          const isMe = selectedProfileFriend.friend_username === myStats?.friend_username || selectedProfileFriend.friend_username === 'me'
          
          const getThemeColorProps = (theme: string) => {
            switch (theme) {
              case 'emerald': return { text: 'text-emerald-400', border: 'border-emerald-500/20 bg-emerald-500/5', bg: 'bg-emerald-500/10', bar: '#10b981' }
              case 'rose': return { text: 'text-rose-400', border: 'border-rose-500/20 bg-rose-500/5', bg: 'bg-rose-500/10', bar: '#f43f5e' }
              case 'amber': return { text: 'text-amber-400', border: 'border-amber-500/20 bg-amber-500/5', bg: 'bg-amber-500/10', bar: '#f59e0b' }
              case 'sky': return { text: 'text-sky-400', border: 'border-sky-500/20 bg-sky-500/5', bg: 'bg-sky-500/10', bar: '#0ea5e9' }
              case 'violet': return { text: 'text-violet-400', border: 'border-violet-500/20 bg-violet-500/5', bg: 'bg-violet-500/10', bar: '#8b5cf6' }
              default: return { text: 'text-indigo-400', border: 'border-indigo-500/20 bg-indigo-500/5', bg: 'bg-indigo-500/10', bar: '#6366f1' }
            }
          }

          const themeStyle = getThemeColorProps(selectedProfileFriend.custom_theme || 'indigo')
          
          let historyArray: number[] = []
          try {
            historyArray = JSON.parse(selectedProfileFriend.focus_history_json || '[]')
          } catch (_) {
            historyArray = [0, 0, 0, 0, 0, 0, 0]
          }
          if (historyArray.length === 0) {
            historyArray = [30, 45, 90, 0, 120, 45, 60] // default fallback
          }

          // Generate labels for the last 7 days
          const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          const labels: string[] = []
          for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            if (i === 0) {
              labels.push('Today')
            } else {
              labels.push(daysOfWeek[d.getDay()])
            }
          }

          const chartData = historyArray.map((mins, idx) => ({
            day: labels[idx],
            mins
          }))

          const formatMinsLabel = (mins: number) => {
            if (mins < 60) return `${mins}m`
            const h = Math.floor(mins / 60)
            const m = mins % 60
            return m > 0 ? `${h}h${m}` : `${h}h`
          }

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={dialogTransition}
                onClick={() => setSelectedProfileFriend(null)}
                className="fixed inset-0 bg-black/75 backdrop-blur-md"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={dialogTransition}
                ref={friendModalRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                className={`w-full max-w-lg bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col outline-none`}
              >
                {/* Header glow match theme */}
                <div className="h-1.5 w-full bg-gradient-to-r" style={{
                  backgroundImage: `linear-gradient(to right, ${themeStyle.bar}, #181c24)`
                }} />

                <div className="p-6 space-y-5">
                  {/* Top Coder Identity Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-3xl select-none overflow-hidden shrink-0 shadow-inner">
                        {selectedProfileFriend.avatar && (selectedProfileFriend.avatar.startsWith('data:image/') || selectedProfileFriend.avatar.startsWith('http')) ? (
                           <img src={selectedProfileFriend.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          selectedProfileFriend.avatar
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-black text-zinc-100 font-sans leading-none">
                            {selectedProfileFriend.display_name}
                          </h2>
                          <span className={`text-[9px] font-black uppercase tracking-wider border px-2 py-0.5 rounded-full select-none ${themeStyle.text} ${themeStyle.border}`}>
                            {selectedProfileFriend.custom_theme || 'indigo'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 font-mono">@{selectedProfileFriend.friend_username}</p>
                        
                        {/* Status detail */}
                        <div className="flex items-center gap-1.5 mt-2">
                          {selectedProfileFriend.is_focusing === 1 ? (
                            <span className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-black bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
                              <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                              Active Focus Session
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                              Taking a breather
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedProfileFriend(null)}
                      className="w-10 h-10 bg-zinc-900 hover:bg-zinc-850 rounded-lg text-zinc-400 hover:text-zinc-200 border border-zinc-850 text-sm font-black transition-all cursor-pointer flex items-center justify-center"
                      aria-label="Close friend details"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Description / Personal Mantra Section */}
                  <div className="p-4 rounded-xl bg-zinc-900/35 border border-zinc-900/40">
                    <h3 className="text-[9px] font-bold uppercase tracking-wider text-zinc-550 font-sans mb-1.5">
                      Bio / Mantra
                    </h3>
                    <p className="text-xs text-zinc-300 leading-normal italic">
                      {selectedProfileFriend.description ? `"${selectedProfileFriend.description}"` : '"Focusing on coding, learning, and self-improvement!"'}
                    </p>
                  </div>

                  {/* Core Metrics Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Focus Today */}
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 w-full text-center">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-550 mb-1.5 font-sans">
                        Focus Today
                      </p>
                      {(!isMe && selectedProfileFriend.custom_show_focus === 0) ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-zinc-650">🔒 Private</span>
                        </div>
                      ) : (
                        <p className={`text-base font-black font-mono ${themeStyle.text}`}>
                          {formatMinsLabel(selectedProfileFriend.focus_minutes_today)}
                        </p>
                      )}
                    </div>

                    {/* Completed Tasks */}
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 w-full text-center">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-550 mb-1.5 font-sans">
                        Tasks Done
                      </p>
                      {(!isMe && selectedProfileFriend.custom_show_tasks === 0) ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-zinc-650">🔒 Private</span>
                        </div>
                      ) : (
                        <p className="text-base font-black text-emerald-400 font-mono">
                          {selectedProfileFriend.tasks_completed_today}
                        </p>
                      )}
                    </div>

                    {/* Streak Log */}
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 w-full text-center">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-550 mb-1.5 font-sans">
                        Streak Day
                      </p>
                      {(!isMe && selectedProfileFriend.custom_show_streak === 0) ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-zinc-650">🔒 Private</span>
                        </div>
                      ) : (
                        <p className="text-base font-black text-amber-505 text-amber-500 font-mono flex items-center justify-center gap-1">
                          🔥 {selectedProfileFriend.current_streak}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 7-Day Depth Timeline block */}
                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900 relative">
                    <div className="flex flex-col gap-1 mb-3.5">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-550 font-sans flex items-center justify-between">
                        <span>Productivity Depth (Last 7 Days)</span>
                        {!isMe && (
                          <span className="text-[9px] text-zinc-600 bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded font-mono font-normal">
                            {selectedProfileFriend.custom_show_timeline === 0 ? 'Private' : 'Shared Log'}
                          </span>
                        )}
                      </h3>
                      <p className="text-[9.5px] text-zinc-500 font-sans leading-none">
                        Focus time is graphed in <span className="font-semibold text-zinc-400">minutes</span>
                      </p>
                    </div>

                    {(!isMe && selectedProfileFriend.custom_show_timeline === 0) ? (
                      <div className="p-6 rounded-lg border border-dashed border-zinc-900 flex flex-col items-center justify-center text-center space-y-1 select-none">
                        <span className="text-md">🔒</span>
                        <p className="text-xs font-semibold text-zinc-550 font-sans">
                          Aesthetic depth chart is restricted
                        </p>
                        <p className="text-[9.5px] text-zinc-600 max-w-xs leading-normal">
                          This coder prefers to keep their historic focus timeline log private.
                        </p>
                      </div>
                    ) : (
                      <div className="h-28 w-full text-xs overflow-hidden pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id={`colorMins-${selectedProfileFriend.friend_username}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={themeStyle.bar} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={themeStyle.bar} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#27272a" strokeOpacity={0.3} strokeDasharray="3 3" />
                            <XAxis
                              dataKey="day"
                              stroke="#71717a"
                              fontSize={9}
                              tickLine={false}
                              axisLine={false}
                              dy={6}
                            />
                            <YAxis
                              stroke="#71717a"
                              fontSize={9}
                              tickLine={false}
                              axisLine={false}
                              allowDecimals={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#09090b',
                                borderColor: '#27272a',
                                borderRadius: '12px',
                                color: '#f4f4f5',
                                fontSize: '10px'
                              }}
                              formatter={(value: any) => [`${value} mins`, 'Focus Time']}
                            />
                            <Area
                              type="monotone"
                              dataKey="mins"
                              stroke={themeStyle.bar}
                              strokeWidth={1.5}
                              fill={`url(#colorMins-${selectedProfileFriend.friend_username})`}
                              isAnimationActive={false}
                              dot={(props: any) => {
                                const { cx, cy, index } = props
                                if (cx === undefined || cy === undefined || index === undefined) return null
                                return (
                                  <circle
                                    key={`dot-circle-${index}`}
                                    cx={cx}
                                    cy={cy}
                                    r={3}
                                    fill={themeStyle.bar}
                                    stroke="none"
                                  />
                                )
                              }}
                              activeDot={{ r: 5, fill: themeStyle.bar }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer action */}
                <div className="bg-zinc-950 p-4 border-t border-zinc-900/80 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedProfileFriend(null)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-300 hover:text-zinc-100 text-xs font-bold font-sans rounded-xl transition-all cursor-pointer"
                  >
                    Close Profile
                  </button>
                </div>
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
