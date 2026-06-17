// src/renderer/src/pages/Circle/FriendSearch.tsx
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CircleFriendship } from '../../types'

interface FriendSearchProps {
  existingFriends: CircleFriendship[]
  pendingRequests: CircleFriendship[]
  onSentRequest: () => void
}

const SOME_RECOMMENDED_USERS = [
  { username: 'alice_coder', name: 'Alice Chen', desc: 'React Developer & Pomodoro Lover 👩‍💻' },
  { username: 'design_ninja', name: 'Yuki Tanaka', desc: 'Web UI Architect & Figma Slinger 🥷' },
  { username: 'bob_builder', name: 'Bob Smith', desc: 'Hardware Hacker & SQLite Fanatic 👨‍💻' }
]

export const FriendSearch: React.FC<FriendSearchProps> = ({
  existingFriends,
  pendingRequests,
  onSentRequest
}) => {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    const qClean = query.trim().toLowerCase()

    if (!qClean) {
      setError('Please enter a username to search.')
      setResult(null)
      return
    }

    setIsSearching(true)
    try {
      const match = await window.electronAPI.searchCircleUser(qClean)
      if (match) {
        setResult(match)
      } else {
        setResult(null)
        setError('No user found with that exact username. Double-check the spelling.')
      }
    } catch (err: any) {
      setError(err?.message || 'Error occurred while searching.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSendRequest = async (usernameToAdd: string) => {
    setError('')
    setSuccessMsg('')
    setIsSending(true)

    try {
      await window.electronAPI.sendCircleFriendRequest(usernameToAdd)
      setSuccessMsg(`Friend request sent to @${usernameToAdd}!`)
      setResult(null)
      setQuery('')
      onSentRequest()
    } catch (err: any) {
      setError(err?.message || 'Failed to send friend request. You may have already added them.')
    } finally {
      setIsSending(false)
    }
  }

  const checkRelationshipStatus = (usernameToCheck: string) => {
    const isFriend = existingFriends.some(
      f => f.friend_username.toLowerCase() === usernameToCheck.toLowerCase()
    )
    if (isFriend) return 'friend'

    const pending = pendingRequests.find(
      r => r.friend_username.toLowerCase() === usernameToCheck.toLowerCase()
    )
    if (pending) {
      if (pending.requested_by === 'user') return 'pending_sent'
      return 'pending_received'
    }

    return 'none'
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-md">
        <h3 className="text-sm font-semibold text-zinc-200 mb-3 font-sans">Find Users</h3>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Type exact username (e.g. alice_coder)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-3.5 py-1.5 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors shadow-sm focus:outline-none"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 text-xs text-red-400 bg-red-400/5 px-3 py-2 rounded-lg border border-red-500/10"
            >
              {error}
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 text-xs text-emerald-400 bg-emerald-400/5 px-3 py-2 rounded-lg border border-emerald-500/10"
            >
              {successMsg}
            </motion.div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-4 rounded-xl bg-zinc-950/60 border border-zinc-900 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center text-xl shadow-inner select-none overflow-hidden shrink-0">
                  {result.avatar && (result.avatar.startsWith('data:image/') || result.avatar.startsWith('http')) ? (
                    <img src={result.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    result.avatar
                  )}
                </div>
                <div>
                  <h4 className="text-zinc-100 text-sm font-medium leading-none">{result.display_name}</h4>
                  <p className="text-zinc-500 text-xs mt-1">@{result.username}</p>
                </div>
              </div>

              <div>
                {(() => {
                  const status = checkRelationshipStatus(result.username)
                  if (status === 'friend') {
                    return (
                      <span className="text-xs text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-850 font-medium">
                        Friends
                      </span>
                    )
                  }
                  if (status === 'pending_sent') {
                    return (
                      <span className="text-xs text-indigo-400 bg-indigo-500/5 px-2.5 py-1 rounded-full border border-indigo-500/15 font-medium">
                        Request Sent
                      </span>
                    )
                  }
                  if (status === 'pending_received') {
                    return (
                      <span className="text-xs text-amber-400 bg-amber-500/5 px-2.5 py-1 rounded-full border border-amber-500/15 font-medium">
                        Wants to be Friends
                      </span>
                    )
                  }
                  return (
                    <button
                      onClick={() => handleSendRequest(result.username)}
                      disabled={isSending}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
                    >
                      {isSending ? 'Adding...' : 'Add Friend'}
                    </button>
                  )
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-zinc-900/20 border border-zinc-800/40 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Recommended Coders</h3>
        <div className="space-y-3.5">
          {SOME_RECOMMENDED_USERS.map((recUser) => {
            const status = checkRelationshipStatus(recUser.username)
            return (
              <div
                key={recUser.username}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/40 border border-zinc-850/60 hover:border-zinc-800 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="text-lg w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 shadow-sm select-none">
                    {recUser.desc.split(' ').reverse()[0] || '👤'}
                  </div>
                  <div>
                    <h4 className="text-zinc-200 text-xs font-semibold">{recUser.name}</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">@{recUser.username}</p>
                    <p className="text-[10px] text-zinc-400 mt-1">{recUser.desc}</p>
                  </div>
                </div>

                <div>
                  {status === 'friend' && (
                    <span className="text-[10px] text-zinc-400 font-medium">Friends</span>
                  )}
                  {status === 'pending_sent' && (
                    <span className="text-[10px] text-indigo-400 font-medium bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">Sent</span>
                  )}
                  {status === 'pending_received' && (
                    <span className="text-[10px] text-amber-400 font-medium bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">Pending</span>
                  )}
                  {status === 'none' && (
                    <button
                      onClick={() => handleSendRequest(recUser.username)}
                      className="px-2.5 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-medium rounded-md transition-colors cursor-pointer"
                    >
                      Quick Add
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
