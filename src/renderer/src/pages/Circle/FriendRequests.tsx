// src/renderer/src/pages/Circle/FriendRequests.tsx
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CircleFriendship } from '../../types'

interface FriendRequestsProps {
  requests: CircleFriendship[]
  onUpdateRequest: () => void
}

export const FriendRequests: React.FC<FriendRequestsProps> = ({ requests, onUpdateRequest }) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const incoming = requests.filter((r) => r.requested_by === 'friend')
  const outgoing = requests.filter((r) => r.requested_by === 'user')

  const handleAccept = async (username: string) => {
    setActionLoading(`${username}-accept`)
    try {
      await window.electronAPI.acceptCircleFriendRequest(username)
      onUpdateRequest()
    } catch (err) {
      console.error('Failed to accept request:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDecline = async (username: string) => {
    setActionLoading(`${username}-decline`)
    try {
      await window.electronAPI.declineCircleFriendRequest(username)
      onUpdateRequest()
    } catch (err) {
      console.error('Failed to decline/cancel request:', err)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Incoming Requests */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3 font-sans flex items-center gap-2">
          🔴 Received Requests
          {incoming.length > 0 && (
            <span className="text-[10px] bg-red-550 text-white px-1.5 py-0.5 rounded-full font-bold">
              {incoming.length}
            </span>
          )}
        </h3>

        <div className="space-y-3.5">
          <AnimatePresence mode="popLayout">
            {incoming.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 text-center text-xs text-zinc-550 border border-zinc-850/40 bg-zinc-900/10 rounded-xl select-none italic"
              >
                No pending incoming requests.
              </motion.div>
            ) : (
              incoming.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-between p-3.5 bg-zinc-900/40 border border-zinc-850 rounded-xl backdrop-blur-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-950 flex items-center justify-center text-lg border border-zinc-900 select-none shadow-inner">
                      👤
                    </div>
                    <div>
                      <h4 className="text-zinc-200 text-xs font-semibold">@{req.friend_username}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Wants to join your Circle</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAccept(req.friend_username)}
                      disabled={actionLoading !== null}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === `${req.friend_username}-accept` ? '...' : 'Accept'}
                    </button>
                    <button
                      onClick={() => handleDecline(req.friend_username)}
                      disabled={actionLoading !== null}
                      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 hover:text-red-400 text-zinc-400 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === `${req.friend_username}-decline` ? '...' : 'Ignore'}
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Outgoing Requests */}
      <div className="pt-2">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3 font-sans">Sent Requests</h3>
        <div className="space-y-3.5">
          <AnimatePresence mode="popLayout">
            {outgoing.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 text-center text-xs text-zinc-550 border border-zinc-850/40 bg-zinc-900/10 rounded-xl select-none italic"
              >
                No active sent requests.
              </motion.div>
            ) : (
              outgoing.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-between p-3.5 bg-zinc-900/40 border border-zinc-850 rounded-xl backdrop-blur-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-950 flex items-center justify-center text-lg border border-zinc-900 select-none shadow-inner">
                      👤
                    </div>
                    <div>
                      <h4 className="text-zinc-200 text-xs font-semibold">@{req.friend_username}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Pending approval</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDecline(req.friend_username)}
                    disabled={actionLoading !== null}
                    className="px-3 py-1 bg-zinc-850 hover:bg-zinc-800 hover:text-red-400 border border-zinc-800 text-zinc-400 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading === `${req.friend_username}-decline` ? '...' : 'Cancel Request'}
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
