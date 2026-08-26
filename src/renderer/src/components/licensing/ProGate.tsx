// src/renderer/src/components/licensing/ProGate.tsx
import { useState } from 'react'
import { useLicense } from '../../hooks/useLicense'
import { useAppStore } from '../../store/useAppStore'
import { FeatureKey, FEATURES } from '../../../../shared/features'
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react'

interface ProGateProps {
  feature: FeatureKey
  children: React.ReactNode
  fallback?: React.ReactNode // optional custom basic-tier fallback layout
  className?: string
}

export function ProGate({ feature, children, fallback, className = '' }: ProGateProps) {
  const { isFeatureEnabled, activateTrial } = useLicense()
  const { setActiveView } = useAppStore()
  const [sessionBypassed, setSessionBypassed] = useState(false)
  const [trialLoading, setTrialLoading] = useState(false)

  const featureDef = FEATURES[feature]
  const isEnabled = isFeatureEnabled(feature)

  // If the feature is enabled (or the user chose to bypass/continue in the free mode),
  // render the actual core workspace.
  if (isEnabled || sessionBypassed) {
    return <>{children}</>
  }

  const handleLearnMore = () => {
    // Navigate to Settings View
    setActiveView('settings')
    // Let the Settings page scroll to the Upgrade and Licensing section
    setTimeout(() => {
      const element = document.getElementById('upgrade-and-licensing-cores-card')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  const handleActivateTrial = async () => {
    setTrialLoading(true)
    try {
      await activateTrial()
    } catch (e) {
      console.error(e)
    } finally {
      setTrialLoading(false)
    }
  }

  // Render basic fallback if provided, or the premium inline card
  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <div 
      className={`bg-zinc-950/40 border border-zinc-900/80 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 max-w-4xl mx-auto my-6 animate-fadeIn ${className}`}
      id={`pro-gate-upsell-${feature}`}
    >
      <div className="space-y-2.5 max-w-xl">
        <div className="flex items-center gap-2">
          <span className="p-1 px-2 text-[9px] font-mono font-bold tracking-widest text-[#a855f7] bg-purple-500/10 border border-purple-500/20 rounded-md uppercase">
            Professional Enrichment feature
          </span>
        </div>
        <h3 className="text-sm font-semibold tracking-wide text-zinc-100 font-sans flex items-center gap-2">
          <Sparkles size={16} className="text-[#a855f7] animate-pulse" />
          When you're ready, Keystone Pro adds {featureDef?.name || 'advanced capabilities'}
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed font-sans font-medium">
          {featureDef?.upsellDescription || 'Enhance your local workflow with specialized productivity metrics and deep workspace insights.'}
        </p>
        <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-zinc-500 font-sans pt-1">
          <ShieldCheck size={13} className="text-emerald-500" />
          Keystone is dedicated to a perpetual offline free tier. This check never broadcasts telemetry.
        </div>
      </div>

      <div className="flex flex-row md:flex-col items-stretch justify-start gap-2.5 w-full md:w-auto shrink-0">
        <button
          type="button"
          onClick={handleActivateTrial}
          disabled={trialLoading}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-md active:scale-98 text-center"
        >
          {trialLoading ? 'Activating Pro...' : 'Try Pro Free (14 Days)'}
        </button>

        <button
          type="button"
          onClick={handleLearnMore}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer transition-all text-center flex items-center justify-center gap-1.5"
        >
          <span>Learn more</span>
          <ArrowRight size={12} />
        </button>

        <button
          type="button"
          onClick={() => setSessionBypassed(true)}
          className="px-3 py-1.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition-colors text-center font-sans underline decoration-dashed hover:decoration-solid cursor-pointer mt-1"
        >
          Continue with free version
        </button>
      </div>
    </div>
  )
}
