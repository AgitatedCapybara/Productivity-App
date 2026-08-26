import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
  let inThrottle = false
  let lastArgs: any[] | null = null
  let lastThis: any = null

  return function (this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
        if (lastArgs) {
          func.apply(lastThis, lastArgs)
          lastArgs = null
          lastThis = null
        }
      }, limit)
    } else {
      lastArgs = args
      lastThis = this
    }
  } as unknown as T
}

