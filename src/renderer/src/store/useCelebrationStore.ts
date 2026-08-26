import { create } from 'zustand'

export interface CelebrationState {
  activeEffect: 'confetti' | 'balloons' | null
  triggerCelebration: (type: 'confetti' | 'balloons') => void
  clearCelebration: () => void
}

export const useCelebrationStore = create<CelebrationState>((set, get) => ({
  activeEffect: null,
  triggerCelebration: (type) => {
    if (get().activeEffect !== null) {
      // Safeguard Logic: If activeEffect is NOT null, immediately return and drop the request.
      return
    }
    set({ activeEffect: type })
  },
  clearCelebration: () => set({ activeEffect: null })
}))
