// src/main/windows/bounds.ts
import { screen, Rectangle, BrowserWindow } from 'electron'
import { getSetting, setSetting } from '../db/settings'

export function getSavedBounds(
  windowKey: string,
  defaultBounds: { x?: number; y?: number; width: number; height: number }
): { x: number; y: number; width: number; height: number } {
  const defaultRect = {
    width: defaultBounds.width,
    height: defaultBounds.height,
    x: defaultBounds.x !== undefined ? defaultBounds.x : 0,
    y: defaultBounds.y !== undefined ? defaultBounds.y : 0
  }

  const hasDefaultPosition = defaultBounds.x !== undefined && defaultBounds.y !== undefined
  const storedStr = getSetting(`window:${windowKey}:bounds`, '')

  if (storedStr) {
    try {
      const parsed = JSON.parse(storedStr)
      if (
        parsed &&
        typeof parsed.x === 'number' &&
        typeof parsed.y === 'number' &&
        typeof parsed.width === 'number' &&
        typeof parsed.height === 'number'
      ) {
        const rect: Rectangle = {
          x: parsed.x,
          y: parsed.y,
          width: parsed.width,
          height: parsed.height
        }

        const matchedDisplay = screen.getDisplayMatching(rect)
        if (matchedDisplay) {
          const db = matchedDisplay.bounds
          const intersectionX = Math.max(rect.x, db.x)
          const intersectionY = Math.max(rect.y, db.y)
          const intersectionWidth = Math.min(rect.x + rect.width, db.x + db.width) - intersectionX
          const intersectionHeight = Math.min(rect.y + rect.height, db.y + db.height) - intersectionY

          if (intersectionWidth > 0 && intersectionHeight > 0) {
            return rect
          }
        }
      }
    } catch (err) {
      console.warn(`[BOUNDS] Error parsing bounds for ${windowKey}:`, err)
    }
  }

  // Fallback if stored bounds are invalid or off-screen
  const primaryDisplay = screen.getPrimaryDisplay()
  const pBounds = primaryDisplay.workArea || primaryDisplay.bounds

  if (hasDefaultPosition) {
    const rect = { ...defaultRect }
    const matchedDisplay = screen.getDisplayMatching(rect)
    if (matchedDisplay) {
      const db = matchedDisplay.bounds
      const intersectionX = Math.max(rect.x, db.x)
      const intersectionY = Math.max(rect.y, db.y)
      const intersectionWidth = Math.min(rect.x + rect.width, db.x + db.width) - intersectionX
      const intersectionHeight = Math.min(rect.y + rect.height, db.y + db.height) - intersectionY
      if (intersectionWidth > 0 && intersectionHeight > 0) {
        return rect
      }
    }
  }

  const x = Math.round(pBounds.x + (pBounds.width - defaultRect.width) / 2)
  const y = Math.round(pBounds.y + (pBounds.height - defaultRect.height) / 2)
  return {
    x,
    y,
    width: defaultRect.width,
    height: defaultRect.height
  }
}

export function trackWindowBounds(win: BrowserWindow, windowKey: string): void {
  let debounceTimeout: NodeJS.Timeout | null = null

  const saveBounds = (): void => {
    if (win.isDestroyed()) return
    try {
      const bounds = win.getBounds()
      setSetting(`window:${windowKey}:bounds`, JSON.stringify(bounds))
    } catch (err) {
      console.error(`[BOUNDS] Failed to save bounds for ${windowKey}:`, err)
    }
  }

  const handler = (): void => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }
    debounceTimeout = setTimeout(() => {
      saveBounds()
    }, 500)
  }

  win.on('moved', handler)
  win.on('resized', handler)

  win.on('close', (): void => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }
    saveBounds()
  })
}
