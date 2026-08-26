// src/renderer/src/hooks/useSafeClickOutside.ts
import { useEffect, useRef, useState } from 'react'

interface UseSafeClickOutsideProps<T extends HTMLElement = any> {
  isOpen: boolean
  onClose: () => void
  isDirty?: boolean
  externalRef?: React.RefObject<T | null>
}

/**
 * Hook to handle clicks outside of a modal container.
 * If the form/modal is dirty, clicking outside will trigger a shake/flash effect
 * instead of closing, helping to prevent accidental loss of changes.
 */
export function useSafeClickOutside<T extends HTMLElement = any>({
  isOpen,
  onClose,
  isDirty = false,
  externalRef
}: UseSafeClickOutsideProps<T>): {
  containerRef: React.RefObject<any>
  shakeKey: number
  isFlashing: boolean
} {
  const localRef = useRef<T | null>(null)
  const containerRef = (externalRef || localRef) as React.RefObject<any>

  const [shakeKey, setShakeKey] = useState(0)
  const [isFlashing, setIsFlashing] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const handleClick = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return

      const target = e.target as HTMLElement
      if (!target) return

      // Check if click is inside the container
      if (container.contains(target)) {
        return
      }

      // Check if click is on any Radix / headless UI portal/dropdown elements
      let isPortal = false
      let curr: HTMLElement | null = target
      while (curr) {
        if (
          curr.getAttribute?.('data-radix-portal') !== null ||
          curr.getAttribute?.('data-radix-popper-content-wrapper') !== null ||
          curr.className?.includes?.('radix') ||
          curr.className?.includes?.('select-content') ||
          curr.className?.includes?.('dropdown-menu')
        ) {
          isPortal = true
          break
        }
        curr = curr.parentElement
      }

      if (isPortal) {
        return
      }

      if (isDirty) {
        // Trigger shake and flash effect
        setShakeKey(prev => prev + 1)
        setIsFlashing(true)
        const timer = setTimeout(() => {
          setIsFlashing(false)
        }, 500)
        return () => clearTimeout(timer)
      } else {
        // Safe to close
        onClose()
      }
    }

    // Capture phase listener to intercept before other handlers
    document.addEventListener('mousedown', handleClick, true)
    return () => {
      document.removeEventListener('mousedown', handleClick, true)
    }
  }, [isOpen, onClose, isDirty, containerRef])

  return {
    containerRef,
    shakeKey,
    isFlashing
  }
}
