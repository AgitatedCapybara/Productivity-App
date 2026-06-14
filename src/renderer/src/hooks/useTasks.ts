import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import * as chrono from 'chrono-node'
import { useAppStore } from '../store/useAppStore'
import type { CreateTaskInput, UpdateTaskInput } from '../types'

export function splitChronoText(text: string): string[] {
  // Matches preposition times like "at 3pm", "around 10:30am", "by noon", "at 5"
  const prepTimeRegex = /(?:at|around|by|in)\s+(?:\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?|noon|midnight|\d{1,2})/gi;
  // Matches standalone times like "3pm", "10:30am"
  const standaloneTimeRegex = /\b\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)\b/gi;
  // Matches relative day/weekday expressions
  const relativeDaysRegex = /\b(?:today|tomorrow|tonight|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;

  const matches: { start: number; end: number; text: string }[] = [];
  let match;

  // 1. Match preposition times
  while ((match = prepTimeRegex.exec(text)) !== null) {
    if (!matches.some(existing => match!.index >= existing.start && match!.index < existing.end)) {
      matches.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
    }
  }

  // 2. Match standalone times
  while ((match = standaloneTimeRegex.exec(text)) !== null) {
    if (!matches.some(existing => match!.index >= existing.start && match!.index < existing.end)) {
      matches.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
    }
  }

  // 3. Match relative days
  while ((match = relativeDaysRegex.exec(text)) !== null) {
    if (!matches.some(existing => match!.index >= existing.start && match!.index < existing.end)) {
      matches.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
    }
  }

  matches.sort((a, b) => a.start - b.start);

  const parts: string[] = [];
  let currentPos = 0;
  for (const m of matches) {
    if (m.start > currentPos) {
      const skipped = text.substring(currentPos, m.start).trim();
      if (skipped) {
        parts.push(skipped);
      }
    }
    parts.push(m.text.trim());
    currentPos = m.end;
  }
  if (currentPos < text.length) {
    const remaining = text.substring(currentPos).trim();
    if (remaining) parts.push(remaining);
  }

  return parts.filter(Boolean);
}

export function parseTaskInput(raw: string, keepDateText = false, ignoredPhrases: string[] = []) {
  let title = raw
  
  // Track all potential parseable phrases with details
  const parsedPhrases: { text: string; type: 'project' | 'priority' | 'date'; ignored: boolean }[] = []

  let projectTag: string | null = null
  const projectMatch = title.match(/@(\w+)/)
  if (projectMatch) {
    const fullMatchText = projectMatch[0]
    const isIgnored = ignoredPhrases.some(phrase => phrase.toLowerCase() === fullMatchText.toLowerCase())
    parsedPhrases.push({
      text: fullMatchText,
      type: 'project',
      ignored: isIgnored
    })
    
    if (!isIgnored) {
      projectTag = projectMatch[1]
      title = title.replace(fullMatchText, '').trim()
    }
  }

  let priority: 0 | 1 | 2 | 3 = 0
  const priorityMatch = title.match(/\bp([123])\b/i)
  if (priorityMatch) {
    const fullMatchText = priorityMatch[0]
    const isIgnored = ignoredPhrases.some(phrase => phrase.toLowerCase() === fullMatchText.toLowerCase())
    parsedPhrases.push({
      text: fullMatchText,
      type: 'priority',
      ignored: isIgnored
    })
    
    if (!isIgnored) {
      if (priorityMatch[1] === '1') priority = 3
      else if (priorityMatch[1] === '2') priority = 2
      else if (priorityMatch[1] === '3') priority = 1
      
      title = title.replace(fullMatchText, '').trim()
    }
  }

  // Generate reference parsing results to see what words were captured
  const rawResults = chrono.parse(title, new Date(), { forwardDate: true })
  for (const res of rawResults) {
    const splitParts = splitChronoText(res.text)
    for (const part of splitParts) {
      const isIgnored = ignoredPhrases.some(phrase => phrase.toLowerCase() === part.toLowerCase())
      parsedPhrases.push({
        text: part,
        type: 'date',
        ignored: isIgnored
      })
    }
  }

  // Create masked title by removing any ignored phrases entirely so that chrono doesn't parse them
  let chronoTitle = title
  for (const phrase of ignoredPhrases) {
    const escaped = phrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    const isWord = /^\w+$/.test(phrase)
    const regex = isWord ? new RegExp(`\\b${escaped}\\b`, 'gi') : new RegExp(escaped, 'gi')
    chronoTitle = chronoTitle.replace(regex, ' ')
  }

  // Execute actual parsing on the masked text to get real date/time outputs
  const activeResults = chrono.parse(chronoTitle, new Date(), { forwardDate: true })

  if (activeResults.length === 0) {
    return { title, due_date: null, due_time: null, priority, projectTag, parsedPhrases }
  }
  
  // Start with the first result's date info
  const firstResult = activeResults[0]
  let date = firstResult.start.date()
  let hasTime = firstResult.start.isCertain('hour')
  let hasExplicitDate = firstResult.start.isCertain('day') || firstResult.start.isCertain('weekday') || firstResult.start.isCertain('month')

  // Merge subsequent results in case date and time are parsed as separate blocks (e.g., "tomorrow 10am")
  for (let i = 1; i < activeResults.length; i++) {
    const res = activeResults[i]
    if (res.start.isCertain('hour')) {
      hasTime = true
      const hour = res.start.get('hour')
      const minute = res.start.get('minute')
      if (hour !== undefined && hour !== null) date.setHours(hour)
      if (minute !== undefined && minute !== null) date.setMinutes(minute)
    }
    if (res.start.isCertain('day') || res.start.isCertain('weekday') || res.start.isCertain('month')) {
      hasExplicitDate = true
      const year = res.start.get('year')
      const month = res.start.get('month')
      const day = res.start.get('day')
      if (year !== undefined && year !== null) date.setFullYear(year)
      if (month !== undefined && month !== null) date.setMonth(month - 1)
      if (day !== undefined && day !== null) date.setDate(day)
    }
  }

  // Prevent time forwarding to tomorrow if no explicit date keyword was specified (e.g. only "9 AM")
  if (hasTime && !hasExplicitDate) {
    const today = new Date()
    date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), date.getHours(), date.getMinutes(), date.getSeconds())
  }
  
  // Use local time, not UTC time for the date string format
  const due_date = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  
  const due_time = hasTime
    ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    : null
    
  if (keepDateText) {
    return { title, due_date, due_time, priority, projectTag, parsedPhrases }
  }

  // Clean the title by removing parsed chronological texts from activeResults
  for (const res of activeResults) {
    const escaped = res.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    title = title.replace(new RegExp(escaped, 'i'), '')
  }
  
  title = title.replace(/\(\s*\)/g, '').replace(/\[\s*\]/g, '').replace(/\s+/g, ' ').trim()
  return { title, due_date, due_time, priority, projectTag, parsedPhrases }
}

export function useTasks(enableLoading = false) {
  const { 
    tasks, 
    completedTasks, 
    deletedTasks,
    error, 
    setTasks, 
    setCompletedTasks, 
    setDeletedTasks,
    addCompletedTask, 
    addTask, 
    updateTask: updateStoreTask, 
    removeTask, 
    reorderTasks: reorderStoreTasks, 
    setError,
    incrementTasksRevision
  } = useAppStore()
  const setActiveSession = useAppStore(state => state.setActiveSession)
  const setActiveTaskId = useAppStore(state => state.setActiveTaskId)
  const tasksRevision = useAppStore(state => state.tasksRevision)
  const [isLoading, setLoading] = useState(false)
  const activeView = useAppStore(state => state.activeView)
  const selectedProjectId = useAppStore(state => state.selectedProjectId)

  const loadTasks = useCallback(async (silent = false): Promise<void> => {
    if (!silent) setLoading(true)
    setError(null)
    if (!window.electronAPI) {
      // Local state only fallback for web preview
      if (!silent) setLoading(false)
      return
    }
    
    try {
      if (window.electronAPI.getDeletedTasks) {
        const dl = await window.electronAPI.getDeletedTasks()
        setDeletedTasks(dl)
      } else {
        setDeletedTasks([])
      }

      const activeView = useAppStore.getState().activeView
      const selectedProjectId = useAppStore.getState().selectedProjectId

      if (activeView === 'today') {
        const [tasksResult, completedResult] = await Promise.allSettled([
          window.electronAPI.getTasksForToday(),
          window.electronAPI.getTodayCompletedTasks()
        ])
        if (tasksResult.status === 'fulfilled') setTasks(tasksResult.value)
        else setTasks([])
        if (completedResult.status === 'fulfilled') setCompletedTasks(completedResult.value)
        else setCompletedTasks([])
      } else if (activeView === 'upcoming') {
        const upcomingTasks = await window.electronAPI.getTasksUpcoming()
        setTasks(upcomingTasks)
        setCompletedTasks([])
      } else if (activeView === 'project') {
        if (!selectedProjectId) {
          if (!silent) setLoading(false)
          return
        }
        const projectTasks = await window.electronAPI.getTasksByProject(selectedProjectId)
        setTasks(projectTasks)
        setCompletedTasks([])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [setDeletedTasks, setTasks, setCompletedTasks, setError, setLoading])

  const loadTasksRef = useRef(loadTasks)
  useEffect(() => {
    loadTasksRef.current = loadTasks
  })

  useEffect(() => {
    if (!enableLoading) return
    // Standard load for view/project changes
    loadTasksRef.current(false)
  }, [activeView, selectedProjectId, enableLoading])

  const prevRevision = useRef(tasksRevision)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (!enableLoading) return
    // Silent load for background operations/mutations to prevent flickering
    if (tasksRevision !== prevRevision.current) {
      prevRevision.current = tasksRevision
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      debounceTimer.current = setTimeout(() => {
        loadTasksRef.current(true)
      }, 150)
    }
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [tasksRevision, enableLoading])

  const createTask = useCallback(async (title: string, extra?: Partial<CreateTaskInput> & { isManuallyOverridden?: boolean; ignoredPhrases?: string[] }): Promise<void> => {
    try {
      const isManuallyOverridden = extra?.isManuallyOverridden || false
      const { isManuallyOverridden: _, ignoredPhrases = [], ...cleanExtra } = extra || {}
      
      const parsed = parseTaskInput(title, isManuallyOverridden, ignoredPhrases)
      const currentTasks = useAppStore.getState().tasks
      const calculatedSortOrder = currentTasks.length > 0 ? Math.max(...currentTasks.map(t => t.sort_order ?? 0)) + 1000 : 1000

      const input: CreateTaskInput = {
        title: parsed.title,
        due_date: parsed.due_date,
        due_time: parsed.due_time,
        priority: parsed.priority,
        sort_order: calculatedSortOrder,
        ...cleanExtra
      }

      const activeView = useAppStore.getState().activeView
      const selectedProjectId = useAppStore.getState().selectedProjectId

      if (parsed.projectTag) {
        const { projects } = useAppStore.getState()
        const project = projects.find(p => p.name.toLowerCase() === parsed.projectTag!.toLowerCase())
        if (project) {
          input.project_id = project.id
        }
      } else if (activeView === 'project' && selectedProjectId) {
        input.project_id = selectedProjectId
      }

      if (extra && 'project_id' in extra) {
        input.project_id = extra.project_id
      }

      const tempId = 'temp-' + Math.random().toString(36).substring(7)
      const tempTask = {
        id: tempId,
        client_id: tempId,
        title: input.title,
        notes: input.notes || '',
        status: 'todo' as const,
        project_id: input.project_id || null,
        due_date: input.due_date || null,
        due_time: input.due_time || null,
        recurrence: input.recurrence || null,
        priority: input.priority as 0|1|2|3,
        sort_order: calculatedSortOrder,
        time_estimate_mins: input.time_estimate_mins || 0,
        time_logged_mins: input.time_logged_mins || 0,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Optimistic update
      addTask(tempTask)

      if (!window.electronAPI) {
        return
      }

      try {
        const createdTask = await window.electronAPI.createTask(input)
        // Swap temp ID with the actual created task record natively, preserving client_id
        useAppStore.setState((state) => {
          const idx = state.tasks.findIndex(t => t.id === tempId)
          if (idx !== -1) {
            state.tasks[idx] = {
              ...createdTask,
              client_id: tempId
            }
          }
        })
      } catch (err: any) {
        removeTask(tempId)
        setError(err.message || 'Failed to create task')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create task')
    }
  }, [addTask, removeTask, setError])

  const updateTask = useCallback(async (input: UpdateTaskInput): Promise<void> => {
    const { tasks, completedTasks } = useAppStore.getState()
    const task = tasks.find(t => t.id === input.id) || completedTasks.find(t => t.id === input.id)
    if (!task) return

    const previousTask = { ...task }
    // Optimistic update
    updateStoreTask({ ...task, ...input, updated_at: new Date().toISOString() })

    if (!window.electronAPI) {
      return
    }
    
    try {
      await window.electronAPI.updateTask(input)
    } catch (err: any) {
      // Revert on error
      updateStoreTask(previousTask)
      setError(err.message || 'Failed to update task')
    }
  }, [updateStoreTask, setError])

  const completeTask = useCallback(async (id: string): Promise<void> => {
    const { tasks, completedTasks } = useAppStore.getState()
    // 1. Check if the task is in the incomplete list
    const taskToComplete = tasks.find(t => t.id === id)
    if (taskToComplete) {
      // Optimistic update
      removeTask(id)
      const completedTask = { ...taskToComplete, status: 'done' as const, completed_at: new Date().toISOString() }
      addCompletedTask(completedTask)

      if (!window.electronAPI) {
        return
      }
      
      try {
        await window.electronAPI.completeTask(id)
      } catch (err: any) {
        // Revert on failure
        useAppStore.setState((state) => {
          const idx = state.completedTasks.findIndex(t => t.id === id)
          if (idx !== -1) state.completedTasks.splice(idx, 1)
        })
        addTask(taskToComplete)
        setError(err.message || 'Failed to complete task')
      }
      return
    }

    // 2. Clicked a task in completed list -> Un-complete it!
    const taskToUncomplete = completedTasks.find(t => t.id === id)
    if (taskToUncomplete) {
      // Optimistic: remove from completed, add back to active
      useAppStore.setState((state) => {
        const idx = state.completedTasks.findIndex(t => t.id === id)
        if (idx !== -1) state.completedTasks.splice(idx, 1)
      })
      const activeTask = { ...taskToUncomplete, status: 'todo' as const, completed_at: null }
      addTask(activeTask)

      if (!window.electronAPI) {
        return
      }

      try {
        await window.electronAPI.updateTask({ id, status: 'todo', completed_at: null })
      } catch (err: any) {
        // Revert on failure
        removeTask(id)
        addCompletedTask(taskToUncomplete)
        setError(err.message || 'Failed to un-complete task')
      }
    }
  }, [removeTask, addCompletedTask, addTask, setError])

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    const { tasks, completedTasks, deletedTasks } = useAppStore.getState()
    const taskToDelete = tasks.find(t => t.id === id) || completedTasks.find(t => t.id === id) || deletedTasks.find(t => t.id === id)
    if (!taskToDelete) return

    const previousTasks = [...tasks]
    const previousCompleted = [...completedTasks]
    const previousDeleted = [...deletedTasks]

    // Optimistic update
    removeTask(id)
    useAppStore.setState((state) => {
      const idx = state.completedTasks.findIndex(t => t.id === id)
      if (idx !== -1) state.completedTasks.splice(idx, 1)
    })

    const alreadyDeleted = previousDeleted.some(t => t.id === id)
    if (alreadyDeleted) {
      setDeletedTasks(previousDeleted.filter(t => t.id !== id))
    } else {
      setDeletedTasks([...previousDeleted, { ...taskToDelete, status: 'deleted' as const }])
    }

    if (!window.electronAPI) {
      incrementTasksRevision()
      return
    }

    try {
      await window.electronAPI.deleteTask(id)
    } catch (err: any) {
      // Revert on failure
      setTasks(previousTasks)
      setCompletedTasks(previousCompleted)
      setDeletedTasks(previousDeleted)
      setError(err.message || 'Failed to delete task')
    }
  }, [removeTask, setDeletedTasks, incrementTasksRevision, setTasks, setCompletedTasks, setError])

  const purgeDeletedTasks = useCallback(async (): Promise<void> => {
    const { deletedTasks } = useAppStore.getState()
    const previousDeleted = [...deletedTasks]
    setDeletedTasks([])

    if (!window.electronAPI) {
      incrementTasksRevision()
      return
    }
    try {
      await window.electronAPI.purgeDeletedTasks()
      incrementTasksRevision()
    } catch (err: any) {
      setDeletedTasks(previousDeleted)
      setError(err.message || 'Failed to purge deleted tasks')
    }
  }, [setDeletedTasks, incrementTasksRevision, setError])

  const reorderTasks = useCallback((orderedIds: string[]): void => {
    // Optimistic reorder
    reorderStoreTasks(orderedIds)
    
    if (!window.electronAPI) return
    
    // Background update
    window.electronAPI.reorderTasks(orderedIds).catch((err: any) => {
      setError(err.message || 'Failed to reorder tasks')
    })
  }, [reorderStoreTasks, setError])

  const startSession = useCallback(async (payload: string | { taskId?: string | null; projectId?: string | null; targetDurationMins?: number }): Promise<any> => {
    const isString = typeof payload === 'string'
    const trackingId = isString ? payload : (payload.taskId || payload.projectId || 'project-session')
    const trackingTaskId = isString ? payload : (payload.taskId || null)
    
    if (!window.electronAPI) {
      setActiveSession(trackingId)
      setActiveTaskId(trackingTaskId)
      return null
    }
    try {
      const session = await window.electronAPI.startSession?.(payload)
      // Save the actual active session id as state
      setActiveSession(session?.id || trackingId)
      setActiveTaskId(session?.taskId || (session as any)?.task_id || trackingTaskId)
      return session
    } catch (err: any) {
      setError(err.message || 'Failed to start session')
      return null
    }
  }, [setActiveSession, setActiveTaskId, setError])

  const stopSession = useCallback(async (): Promise<void> => {
    if (!window.electronAPI) {
      setActiveSession(null)
      setActiveTaskId(null)
      return
    }
    try {
      await window.electronAPI.stopSession?.()
      setActiveSession(null)
      setActiveTaskId(null)
    } catch (err: any) {
      setError(err.message || 'Failed to stop session')
    }
  }, [setActiveSession, setActiveTaskId, setError])

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const pA = a.priority ?? 0
      const pB = b.priority ?? 0
      if (pB !== pA) {
        return pB - pA
      }
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })
  }, [tasks])

  return {
    tasks: sortedTasks,
    completedTasks,
    deletedTasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    reorderTasks,
    loadTasks,
    startSession,
    stopSession,
    purgeDeletedTasks
  }
}
