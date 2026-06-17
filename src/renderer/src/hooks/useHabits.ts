// src/renderer/src/hooks/useHabits.ts
import { useState, useEffect, useCallback } from 'react'
import type { Habit, HabitLog, CreateHabitInput, UpdateHabitInput } from '../types'
import { useAppStore } from '../store/useAppStore'

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const setError = useAppStore(state => state.setError)

  const loadData = useCallback(async () => {
    setLoading(true)
    if (!window.electronAPI) {
      // Mock data in fallback environment
      setHabits([
        { id: 'h1', name: 'Code React', frequency: 'daily', current_streak: 3, longest_streak: 5, project_id: 'default-work', is_paused: 0, session_link: 1, created_at: new Date().toISOString() },
        { id: 'h2', name: 'Workout Routine', frequency: 'daily', current_streak: 0, longest_streak: 2, project_id: 'default-personal', is_paused: 1, session_link: 0, created_at: new Date().toISOString() },
        { id: 'h3', name: 'Drink Water', frequency: 'daily', current_streak: 1, longest_streak: 1, project_id: null, is_paused: 0, session_link: 0, created_at: new Date().toISOString() },
      ])
      const todayStr = new Date().toLocaleDateString('en-CA')
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toLocaleDateString('en-CA')
      setLogs([
        { id: 'l1', habit_id: 'h1', date: todayStr, created_at: new Date().toISOString() },
        { id: 'l2', habit_id: 'h1', date: yesterdayStr, created_at: new Date().toISOString() },
        { id: 'l3', habit_id: 'h3', date: todayStr, created_at: new Date().toISOString() },
      ])
      setLoading(false)
      return
    }

    try {
      const [hList, lList] = await Promise.all([
        window.electronAPI.getHabits(),
        window.electronAPI.getHabitLogs()
      ])
      setHabits(hList)
      setLogs(lList)
    } catch (err: any) {
      setError(err.message || 'Failed to load habits')
    } finally {
      setLoading(false)
    }
  }, [setError])

  useEffect(() => {
    loadData()
  }, [loadData])

  const createHabit = async (input: CreateHabitInput) => {
    if (!window.electronAPI) {
      const mockHabit: Habit = {
        id: Math.random().toString(36).substring(7),
        name: input.name,
        frequency: input.frequency,
        current_streak: 0,
        longest_streak: 0,
        project_id: input.project_id ?? null,
        is_paused: input.is_paused ?? 0,
        session_link: input.session_link ?? 0,
        created_at: new Date().toISOString()
      }
      setHabits(prev => [...prev, mockHabit])
      return
    }
    try {
      await window.electronAPI.createHabit(input)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to create habit')
    }
  }

  const updateHabit = async (input: UpdateHabitInput) => {
    if (!window.electronAPI) {
      setHabits(prev => prev.map(h => h.id === input.id ? { ...h, ...input } as Habit : h))
      return
    }
    try {
      await window.electronAPI.updateHabit(input)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to update habit')
    }
  }

  const deleteHabit = async (id: string) => {
    if (!window.electronAPI) {
      setHabits(prev => prev.filter(h => h.id !== id))
      return
    }
    try {
      await window.electronAPI.deleteHabit(id)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to delete habit')
    }
  }

  const checkIn = async (habitId: string, date: string) => {
    if (!window.electronAPI) {
      const mockLog: HabitLog = {
        id: Math.random().toString(36).substring(7),
        habit_id: habitId,
        date,
        created_at: new Date().toISOString()
      }
      setLogs(prev => [...prev, mockLog])
      setHabits(prev => prev.map(h => {
        if (h.id === habitId) {
          const nextStreak = h.current_streak + 1
          return {
            ...h,
            current_streak: nextStreak,
            longest_streak: Math.max(h.longest_streak, nextStreak)
          }
        }
        return h
      }))
      return
    }
    try {
      await window.electronAPI.checkInHabit(habitId, date)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to check in habit')
    }
  }

  const uncheckIn = async (habitId: string, date: string) => {
    if (!window.electronAPI) {
      setLogs(prev => prev.filter(l => !(l.habit_id === habitId && l.date === date)))
      setHabits(prev => prev.map(h => {
        if (h.id === habitId) {
          const nextStreak = Math.max(0, h.current_streak - 1)
          return { ...h, current_streak: nextStreak }
        }
        return h
      }))
      return
    }
    try {
      await window.electronAPI.uncheckInHabit(habitId, date)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to undo habit check-in')
    }
  }

  return {
    habits,
    logs,
    loading,
    refreshHabits: loadData,
    createHabit,
    updateHabit,
    deleteHabit,
    checkIn,
    uncheckIn
  }
}
