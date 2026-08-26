import { useEffect, useRef } from 'react'

interface UseModalFocusTrapOptions {
  isOpen: boolean
  onClose: () => void
  autoFocusFirst?: boolean
}

export function useModalFocusTrap<T extends HTMLElement>({
  isOpen,
  onClose,
  autoFocusFirst = true
}: UseModalFocusTrapOptions) {
  const containerRef = useRef<T>(null)

  useEffect(() => {
    if (!isOpen) return

    const container = containerRef.current
    if (!container) return

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const getFocusableElements = () => {
      return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (el) => el.tabIndex !== -1 && el.offsetParent !== null
      )
    }

    // Auto-focus the first element when open
    if (autoFocusFirst) {
      const focusables = getFocusableElements()
      if (focusables.length > 0) {
        focusables[0].focus()
      } else {
        container.focus()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'Tab') {
        const focusables = getFocusableElements()
        if (focusables.length === 0) {
          e.preventDefault()
          return
        }

        const firstEl = focusables[0]
        const lastEl = focusables[focusables.length - 1]
        const activeEl = document.activeElement as HTMLElement

        if (e.shiftKey) {
          // Shift + Tab -> reverse
          if (activeEl === firstEl || !container.contains(activeEl)) {
            e.preventDefault()
            lastEl.focus()
          }
        } else {
          // Tab -> forward
          if (activeEl === lastEl || !container.contains(activeEl)) {
            e.preventDefault()
            firstEl.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isOpen, onClose, autoFocusFirst])

  return containerRef
}
