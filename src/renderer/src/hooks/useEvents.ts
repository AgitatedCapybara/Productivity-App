// src/renderer/src/hooks/useEvents.ts
import { useState, useEffect, useCallback } from 'react'
import type { CalendarEvent, CreateCalendarEventInput, UpdateCalendarEventInput, IElectronAPI } from '../types'
import { useAppStore } from '../store/useAppStore'

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const setError = useAppStore(state => state.setError)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    const api = (window as any).electronAPI as IElectronAPI | undefined
    if (!api) {
      // Setup elegant default mock events for fallback web environments
      const today = new Date()
      const formatOffset = (daysOffset: number, hours: number) => {
        const d = new Date(today)
        d.setDate(today.getDate() + daysOffset)
        d.setHours(hours, 0, 0, 0)
        return d.toISOString()
      }

      setEvents([
        {
          id: 'e1',
          title: 'Morning Code & Standup',
          description: 'Sync with the development team and outline task tickets.',
          start_at: formatOffset(0, 9),
          end_at: formatOffset(0, 10),
          project_id: null,
          recurrence: 'daily',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'e2',
          title: 'Client Demo: App Prototype',
          description: 'Share mockups of the newly integrated calendar and habit tracker modules.',
          start_at: formatOffset(1, 14),
          end_at: formatOffset(1, 15),
          project_id: 'default-work',
          recurrence: 'none',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'e3',
          title: 'Design Critique Session',
          description: 'Review interface layout guidelines and spacing densities.',
          start_at: formatOffset(2, 11),
          end_at: formatOffset(2, 12.5),
          project_id: 'default-personal',
          recurrence: 'weekly',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      setLoading(false)
      return
    }

    try {
      const list = await api.getEvents()
      setEvents(list)
    } catch (err: any) {
      setError(err.message || 'Failed to load calendar events')
    } finally {
      setLoading(false)
    }
  }, [setError])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const createEvent = async (input: CreateCalendarEventInput) => {
    const api = (window as any).electronAPI as IElectronAPI | undefined
    if (!api) {
      const mockEvent: CalendarEvent = {
        id: Math.random().toString(36).substring(7),
        title: input.title,
        description: input.description ?? null,
        start_at: input.start_at,
        end_at: input.end_at,
        project_id: input.project_id ?? null,
        recurrence: input.recurrence ?? 'none',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      setEvents(prev => [...prev, mockEvent])
      return
    }
    try {
      await api.createEvent(input)
      await loadEvents()
    } catch (err: any) {
      setError(err.message || 'Failed to create event')
    }
  }

  const updateEvent = async (input: UpdateCalendarEventInput) => {
    const api = (window as any).electronAPI as IElectronAPI | undefined
    if (!api) {
      setEvents(prev => prev.map(e => e.id === input.id ? { ...e, ...input, updated_at: new Date().toISOString() } as CalendarEvent : e))
      return
    }
    try {
      await api.updateEvent(input)
      await loadEvents()
    } catch (err: any) {
      setError(err.message || 'Failed to update event')
    }
  }

  const deleteEvent = async (id: string) => {
    const api = (window as any).electronAPI as IElectronAPI | undefined
    if (!api) {
      setEvents(prev => prev.filter(e => e.id !== id))
      return
    }
    try {
      await api.deleteEvent(id)
      await loadEvents()
    } catch (err: any) {
      setError(err.message || 'Failed to delete event')
    }
  }

  return {
    events,
    loading,
    refreshEvents: loadEvents,
    createEvent,
    updateEvent,
    deleteEvent
  }
}
