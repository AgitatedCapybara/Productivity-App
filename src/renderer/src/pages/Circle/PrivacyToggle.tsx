// src/renderer/src/pages/Circle/PrivacyToggle.tsx
import React from 'react'

interface PrivacyToggleProps {
  sharingEnabled: boolean
  onToggle: (enabled: boolean) => void
  isLoading?: boolean
}

export const PrivacyToggle: React.FC<PrivacyToggleProps> = ({
  sharingEnabled,
  onToggle,
  isLoading = false
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-900/20 rounded-xl border border-zinc-850/60 max-w-xl">
      <div className="flex-1 pr-4">
        <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1 font-sans">
          Circle Sharing Privacy
        </h4>
        <p className="text-[11px] text-zinc-500 leading-normal">
          Toggle sharing of focus minutes, task completion counts, and streaks with friends. When disabled, your stats show as <span className="text-zinc-400 font-semibold">"Stats Hidden"</span>.
        </p>
      </div>

      <button
        onClick={() => onToggle(!sharingEnabled)}
        disabled={isLoading}
        type="button"
        className={`w-11 h-6 rounded-full p-1 transition-all flex items-center select-none cursor-pointer duration-200 outline-none ${
          sharingEnabled ? 'bg-indigo-600' : 'bg-zinc-800'
        }`}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all duration-200 ${
            sharingEnabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
