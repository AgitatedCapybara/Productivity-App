// src/renderer/src/pages/Circle/ProfileSettings.tsx
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CircleProfile } from '../../types'
import { CircularCropper } from '../../components/CircularCropper'

interface ProfileSettingsProps {
  profile: CircleProfile
  onProfileUpdated: (updatedProfile: CircleProfile) => void
  onProfileDeleted: () => void
}

const PRESET_EMOJIS = ['👩‍💻', '👨‍💻', '🥷', '🧘', '🧙‍♀️', '🕵️‍♂️', '🚀', '💻', '💡', '🔥', '🧠']

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  profile,
  onProfileUpdated,
  onProfileDeleted
}) => {
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatar)
  const [description, setDescription] = useState(profile.description || '')
  const [customShowFocus, setCustomShowFocus] = useState(profile.custom_show_focus !== 0)
  const [customShowTasks, setCustomShowTasks] = useState(profile.custom_show_tasks !== 0)
  const [customShowStreak, setCustomShowStreak] = useState(profile.custom_show_streak !== 0)
  const [customShowTimeline, setCustomShowTimeline] = useState(profile.custom_show_timeline !== 0)
  const [customTheme, setCustomTheme] = useState(profile.custom_theme || 'indigo')

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Cropper states
  const [rawImage, setRawImage] = useState<string | null>(null)
  const [isCropping, setIsCropping] = useState(false)

  // Account deletion states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [confirmUsername, setConfirmUsername] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setDisplayName(profile.display_name)
    setSelectedAvatar(profile.avatar)
    setDescription(profile.description || '')
    setCustomShowFocus(profile.custom_show_focus !== 0)
    setCustomShowTasks(profile.custom_show_tasks !== 0)
    setCustomShowStreak(profile.custom_show_streak !== 0)
    setCustomShowTimeline(profile.custom_show_timeline !== 0)
    setCustomTheme(profile.custom_theme || 'indigo')
  }, [profile])

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsSaving(true)

    try {
      const cleanName = displayName.trim()
      if (!cleanName) {
        setError('Display name is required.')
        setIsSaving(false)
        return
      }

      const res = await window.electronAPI.updateCircleProfile({
        displayName: cleanName,
        avatar: selectedAvatar,
        description: description.trim(),
        customShowFocus: customShowFocus ? 1 : 0,
        customShowTasks: customShowTasks ? 1 : 0,
        customShowStreak: customShowStreak ? 1 : 0,
        customShowTimeline: customShowTimeline ? 1 : 0,
        customTheme: customTheme
      })
      onProfileUpdated(res)
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteError('')
    if (confirmUsername.trim().toLowerCase() !== profile.username.toLowerCase()) {
      setDeleteError('The entered username does not match.')
      return
    }

    setIsDeleting(true)
    try {
      await window.electronAPI.deleteCircleProfile()
      setIsDeleteDialogOpen(false)
      onProfileDeleted()
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete account.')
    } finally {
      setIsDeleting(false)
    }
  }

  const isCustomSelected = selectedAvatar.startsWith('data:image/') || selectedAvatar.startsWith('http')

  const THEME_OPTIONS = [
    { id: 'indigo', name: 'Indigo Aura', color: 'bg-indigo-500' },
    { id: 'emerald', name: 'Emerald Forest', color: 'bg-emerald-500' },
    { id: 'rose', name: 'Crimson Rose', color: 'bg-rose-500' },
    { id: 'amber', name: 'Amber Glow', color: 'bg-amber-500' },
    { id: 'sky', name: 'Sky Clarity', color: 'bg-sky-500' },
    { id: 'violet', name: 'Violet Deep', color: 'bg-violet-500' }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Edit Profile Form */}
      <div className="p-5 rounded-2xl border border-zinc-850 bg-zinc-900/10 backdrop-blur-md space-y-4 shadow-xl">
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
            <div>
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-1 font-sans">
                Edit Profile & Customizations
              </h3>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Customize your biography, card style, and select which metrics to project to buddies on the leaderboard.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-sans">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-10 px-3.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-indigo-500 rounded-xl text-zinc-100 text-sm font-sans placeholder-zinc-650 transition-all outline-none"
                  placeholder="Display Name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-sans">
                  Biography / Status
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-16 py-2 px-3.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-indigo-500 rounded-xl text-zinc-100 text-xs font-sans placeholder-zinc-605 transition-all outline-none resize-none"
                  placeholder="Describe your current tech stack, goals, or deep work mantra..."
                  maxLength={160}
                />
              </div>

              {/* Character limit guide */}
              <div className="flex justify-end text-[10px] text-zinc-600 font-mono -mt-2">
                {description.length}/160 chars
              </div>

              {/* Theme Customization selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 font-sans">
                  Profile Accent Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_OPTIONS.map((t) => {
                    const isSelected = customTheme === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setCustomTheme(t.id)}
                        className={`py-2 px-2.5 rounded-lg border text-[10px] font-bold font-sans flex items-center gap-2 transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-zinc-850 text-zinc-100 border-zinc-700 shadow-sm'
                            : 'bg-zinc-950/40 text-zinc-500 border-zinc-900 hover:text-zinc-400 hover:border-zinc-850'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${t.color} shrink-0`} />
                        {t.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 font-sans">
                  Profile Avatar
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {/* First 11 emoji options */}
                  {PRESET_EMOJIS.map((emoji) => {
                    const isSelected = selectedAvatar === emoji
                    return (
                      <button
                        key={`${emoji}-settings`}
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

              {/* Stats Visibility Preference Checks */}
              <div className="bg-zinc-950/45 p-3 rounded-xl border border-zinc-900 space-y-2.5">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-sans">
                  Metrics Visibility
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-1.5 hover:bg-zinc-900/50 rounded-lg cursor-pointer transition-colors text-[11px] text-zinc-400 hover:text-zinc-200 select-none">
                    <input
                      type="checkbox"
                      checked={customShowFocus}
                      onChange={(e) => setCustomShowFocus(e.target.checked)}
                      className="rounded border-zinc-800 text-indigo-600 focus:ring-opacity-40"
                    />
                    Show focus time
                  </label>

                  <label className="flex items-center gap-2 p-1.5 hover:bg-zinc-900/50 rounded-lg cursor-pointer transition-colors text-[11px] text-zinc-400 hover:text-zinc-200 select-none">
                    <input
                      type="checkbox"
                      checked={customShowTasks}
                      onChange={(e) => setCustomShowTasks(e.target.checked)}
                      className="rounded border-zinc-800 text-indigo-600 focus:ring-opacity-40"
                    />
                    Show tasks completed
                  </label>

                  <label className="flex items-center gap-2 p-1.5 hover:bg-zinc-900/50 rounded-lg cursor-pointer transition-colors text-[11px] text-zinc-400 hover:text-zinc-200 select-none">
                    <input
                      type="checkbox"
                      checked={customShowStreak}
                      onChange={(e) => setCustomShowStreak(e.target.checked)}
                      className="rounded border-zinc-800 text-indigo-600 focus:ring-opacity-40"
                    />
                    Show daily streak
                  </label>

                  <label className="flex items-center gap-2 p-1.5 hover:bg-zinc-900/50 rounded-lg cursor-pointer transition-colors text-[11px] text-zinc-400 hover:text-zinc-200 select-none">
                    <input
                      type="checkbox"
                      checked={customShowTimeline}
                      onChange={(e) => setCustomShowTimeline(e.target.checked)}
                      className="rounded border-zinc-800 text-indigo-600 focus:ring-opacity-40"
                    />
                    Show weekly chart
                  </label>
                </div>
              </div>

              {error && <p className="text-xs text-rose-500 font-sans">{error}</p>}
              {success && <p className="text-xs text-emerald-500 font-sans">{success}</p>}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 text-white rounded-xl text-xs font-bold font-sans shadow-md hover:shadow-indigo-600/20 active:scale-98 transition-all duration-150 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* Danger Zone */}
      <div className="p-5 rounded-2xl border border-rose-950/30 bg-rose-950/5 hover:border-rose-950/50 backdrop-blur-md flex flex-col justify-between shadow-xl transition-all">
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-1 font-sans">
            Danger Zone
          </h3>
          <p className="text-xs font-semibold text-zinc-300">Delete Accountability Circle Account</p>
          <p className="text-[11px] text-zinc-500 leading-normal">
            Deleting your account will immediately erase your profile, remove all pending and accepted friendships, and clear cached records. This action is permanent and cannot be undone.
          </p>
        </div>

        <div className="pt-6">
          <button
            type="button"
            onClick={() => {
              setConfirmUsername('')
              setDeleteError('')
              setIsDeleteDialogOpen(true)
            }}
            className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 border border-rose-900/30 hover:border-rose-900/60 rounded-xl text-xs font-bold font-sans transition-all active:scale-98 cursor-pointer"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isDeleteDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteDialogOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-md bg-zinc-950 border border-zinc-850 rounded-2xl p-6 shadow-2xl relative z-10 space-y-4"
            >
              <div>
                <h3 className="text-sm font-bold text-zinc-100 font-sans">
                  Delete Account permanently?
                </h3>
                <p className="text-xs text-zinc-500 mt-1 leading-normal">
                  You are about to delete your Circle Hub account, username:{' '}
                  <span className="text-rose-400 font-semibold font-mono">@{profile.username}</span>.
                </p>
              </div>

              <div className="p-3 bg-rose-950/10 border border-rose-900/20 rounded-xl space-y-1">
                <p className="text-[11px] text-rose-400/80 font-bold uppercase tracking-wider font-sans">
                  Warning
                </p>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  This deletes all social streaks and unlinks you from all buddies. There is no way to recover this data.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-400">
                  Type your username <span className="text-zinc-200 font-semibold font-mono">{profile.username}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmUsername}
                  onChange={(e) => setConfirmUsername(e.target.value)}
                  className="w-full h-10 px-3.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-rose-500 rounded-xl text-zinc-100 text-sm font-sans placeholder-zinc-700 transition-all outline-none"
                  placeholder={profile.username}
                />
              </div>

              {deleteError && (
                <p className="text-xs text-rose-500 font-sans">{deleteError}</p>
              )}

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting || confirmUsername.trim().toLowerCase() !== profile.username.toLowerCase()}
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-950/50 disabled:text-rose-400/50 rounded-xl text-xs font-bold text-white transition-all active:scale-98 cursor-pointer"
                >
                  {isDeleting ? 'Deleting...' : 'Delete permanently'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
