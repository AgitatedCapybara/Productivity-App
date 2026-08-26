import { useEffect, useState } from 'react'

export const overlaySlide = { duration: 0.15, ease: 'easeOut' } as const
export const dialogTransition = { duration: 0.167, ease: 'easeInOut' } as const
export const sheetTransition = { duration: 0.25, ease: 'easeInOut' } as const
export const swipeTransition = { duration: 0.085, ease: 'linear' } as const

export const taskCompleteExit = {
  opacity: 0,
  y: -8,
  transition: { duration: 0.21, ease: 'easeOut' }
} as const

export const buttonTap = { scale: 0.96 }

export function useReducedMotion() {
  const [isReduced, setIsReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (e: MediaQueryListEvent) => {
      setIsReduced(e.matches)
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isReduced ? { duration: 0.00001 } : null
}
