// src/renderer/src/pages/Circle/ProfileSetup.tsx
import React, { useState } from 'react'
import { motion } from 'motion/react'
import { CircleProfile } from '../../types'
import { CircularCropper } from '../../components/CircularCropper'

interface ProfileSetupProps {
  onProfileCreated: (profile: CircleProfile) => void
}

const PRESET_EMOJIS = ['👩‍💻', '👨‍💻', '🥷', '🧘', '🧙‍♀️', '🕵️‍♂️', '🚀', '💻', '💡', '🔥', '🧠']

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ onProfileCreated }) => {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('👩‍💻')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Cropping states
  const [rawImage, setRawImage] = useState<string | null>(null)
  const [isCropping, setIsCropping] = useState(false)

  const handleCustomImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === 'string') {
        setRawImage(event.target.result)
        setIsCropping(true)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cleanUsername = username.trim().toLowerCase()
    if (!cleanUsername) {
      setError('Username is required.')
      return
    }

    const usernameRegex = /^[a-z0-9_]{3,20}$/
    if (!usernameRegex.test(cleanUsername)) {
      setError('Username must be 3-20 characters, containing only letters, numbers, and underscores.')
      return
    }

    setIsLoading(true)
    try {
      const profile = await window.electronAPI.createCircleProfile({
        username: cleanUsername,
        displayName: displayName.trim() || cleanUsername,
        avatar: selectedAvatar
      })
      onProfileCreated(profile)
    } catch (err: any) {
      setError(err?.message || 'Failed to create profile. The username might already be in use.')
    } finally {
      setIsLoading(false)
    }
  }

  const isCustomSelected = selectedAvatar.startsWith('data:image/') || selectedAvatar.startsWith('http')

  return (
    <div className="flex-1 flex items-center justify-center min-h-[500px] w-full p-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900/60 backdrop-blur-md rounded-2xl p-8 border border-zinc-800/80 shadow-2xl"
      >
        {isCropping && rawImage ? (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-2 font-sans text-center">
              Crop Profile Picture
            </h3>
            <CircularCropper
              imageSrc={rawImage}
              onSave={(cropped) => {
                setSelectedAvatar(cropped)
                setIsCropping(false)
              }}
              onCancel={() => {
                setIsCropping(false)
              }}
            />
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg animate-pulse">
                ✨
              </div>
              <h2 className="text-2xl font-bold font-sans text-zinc-100 tracking-tight">Join the Circle</h2>
              <p className="text-xs text-zinc-400 mt-2 max-w-xs mx-auto leading-relaxed">
                Create your social productivity identity. Boost focus, share streaks, and stay accountable with friends.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-305 mb-2 font-sans">Select Avatar</label>
                <div className="grid grid-cols-6 gap-2">
                  {/* First 11 emoji options */}
                  {PRESET_EMOJIS.map((emoji) => {
                    const isSelected = selectedAvatar === emoji
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedAvatar(emoji)}
                        className={`w-10 h-10 text-xl flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 border-2 border-indigo-400 shadow-md transform scale-110'
                            : 'bg-zinc-850 hover:bg-zinc-750 border border-zinc-800/80'
                        }`}
                      >
                        {emoji}
                      </button>
                    )
                  })}

                  {/* 12th Slot: Custom Option */}
                  <label
                    title="Upload custom profile picture"
                    className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all cursor-pointer overflow-hidden ${
                      isCustomSelected
                        ? 'bg-indigo-600 border-2 border-indigo-400 shadow-md transform scale-110'
                        : 'bg-zinc-850 hover:bg-zinc-750 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {isCustomSelected ? (
                      <img
                        src={selectedAvatar}
                        alt="Custom Avatar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-xl font-light text-zinc-400 font-sans leading-none flex items-center justify-center">
                        +
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCustomImageChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Crop/Replace Helpers Underneath if Custom Selected (same layout as project custom-add) */}
                {isCustomSelected && (
                  <div className="flex items-center gap-4 mt-4 p-3 bg-zinc-950/45 border border-zinc-900 rounded-xl">
                    <img
                      src={selectedAvatar}
                      alt="Avatar Preview"
                      className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500 shadow-md shadow-indigo-500/10"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-zinc-300 font-semibold font-sans">Cropped image loaded</span>
                      <div className="flex gap-2">
                        <label className="text-[9px] uppercase tracking-wider font-bold cursor-pointer text-indigo-400 hover:text-indigo-300 border border-zinc-900 bg-zinc-950 hover:bg-zinc-900 px-2 py-1 rounded-md transition-all flex items-center gap-1 font-sans">
                          Replace
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCustomImageChange}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setRawImage(selectedAvatar)
                            setIsCropping(true)
                          }}
                          className="text-[9px] uppercase tracking-wider font-bold bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800 px-2 py-1 rounded-md text-zinc-300 hover:text-zinc-100 font-sans transition-all cursor-pointer"
                        >
                          Recrop Image
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="username" className="text-[13px] text-white/60">
                  Username (must be unique)
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  disabled={isLoading}
                  placeholder="e.g. coder_kaylee"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="text-[17px] p-2 min-h-10 bg-zinc-800 rounded-lg border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-purple-400 placeholder:text-white/30 text-zinc-100 outline-none w-full transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="displayName" className="text-[13px] text-white/60">
                  Display Name (optional)
                </label>
                <input
                  id="displayName"
                  type="text"
                  disabled={isLoading}
                  placeholder="e.g. Kaylee Chen"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="text-[17px] p-2 min-h-10 bg-zinc-800 rounded-lg border border-zinc-700/50 focus-visible:ring-2 focus-visible:ring-purple-400 placeholder:text-white/30 text-zinc-100 outline-none w-full transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-all shadow-md focus:outline-none cursor-pointer"
              >
                {isLoading ? 'Creating setup...' : 'Create Profile'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}
