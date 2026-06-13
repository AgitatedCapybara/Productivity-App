import { useEffect, useState, useRef } from 'react'
import * as chrono from 'chrono-node'
import { useAppStore } from '../store/useAppStore'
import type { CreateTaskInput, UpdateTaskInput } from '../types'

export function parseTaskInput(raw: string, keepDateText = false) {
  let title = raw
  let projectTag: string | null = null
  const projectMatch = title.match(/@(\w+)/)
  if (projectMatch) {
    projectTag = projectMatch[1]
    title = title.replace(projectMatch[0], '').trim()
  }

  let priority: 0 | 1 | 2 | 3 = 0
  const priorityMatch = title.match(/\bp([123])\b/i)
  if (priorityMatch) {
    if (priorityMatch[1] === '1') priority = 3
    else if (priorityMatch[1] === '2') priority = 2
    else if (priorityMatch[1] === '3') priority = 1
    
    title = title.replace(priorityMatch[0], '').trim()
  }

  const results = chrono.parse(title, new Date(), { forwardDate: true })
  if (results.length === 0) return { title, due_date: null, due_time: null, priority, projectTag }
  
  // Start with the first result's date info
  const firstResult = results[0]
  let date = firstResult.start.date()
  let hasTime = firstResult.start.isCertain('hour')
  let hasExplicitDate = firstResult.start.isCertain('day') || firstResult.start.isCertain('weekday') || firstResult.start.isCertain('month')

  // Merge subsequent results in case date and time are parsed as separate blocks (e.g., "tomorrow 10am")
  for (let i = 1; i < results.length; i++) {
    const res = results[i]
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
    return { title, due_date, due_time, priority, projectTag }
  }

  // Handle surrounding parentheses brackets cleanly (e.g. "(tomorrow)") in descending index order
  const sortedResults = [...results].sort((a, b) => b.index - a.index)
  for (const res of sortedResults) {
    let startIndex = res.index
    let endIndex = res.index + res.text.length
    
    if (startIndex > 0 && title[startIndex - 1] === '(' && title[endIndex] === ')') {
      startIndex = startIndex - 1
      endIndex = endIndex + 1
    } else if (startIndex > 0 && title[startIndex - 1] === '[' && title[endIndex] === ']') {
      startIndex = startIndex - 1
      endIndex = endIndex + 1
    }
    
    title = title.slice(0, startIndex) + title.slice(endIndex)
  }
  
  title = title.replace(/\(\s*\)/g, '').replace(/\[\s*\]/g, '').replace(/\s+/g, ' ').trim()
  return { title, due_date, due_time, priority, projectTag }
}

export function useTasks() {
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

  const loadTasks = async (silent = false) => {
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
  }

  const loadTasksRef = useRef(loadTasks)
  useEffect(() => {
    loadTasksRef.current = loadTasks
  })

  useEffect(() => {
    // Standard load for view/project changes
    loadTasks(false)
  }, [activeView, selectedProjectId])

  const prevRevision = useRef(tasksRevision)
  useEffect(() => {
    // Silent load for background operations/mutations to prevent flickering
    if (tasksRevision !== prevRevision.current) {
      prevRevision.current = tasksRevision
      loadTasks(true)
    }
  }, [tasksRevision])

  const createTask = async (title: string, extra?: Partial<CreateTaskInput> & { isManuallyOverridden?: boolean }) => {
    try {
      const isManuallyOverridden = extra?.isManuallyOverridden || false
      const { isManuallyOverridden: _, ...cleanExtra } = extra || {}
      
      const parsed = parseTaskInput(title, isManuallyOverridden)
      const input: CreateTaskInput = {
        title: parsed.title,
        due_date: parsed.due_date,
        due_time: parsed.due_time,
        priority: parsed.priority,
        ...cleanExtra
      }

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
        title: input.title,
        notes: input.notes || '',
        status: 'todo' as const,
        project_id: input.project_id || null,
        due_date: input.due_date || null,
        due_time: input.due_time || null,
        recurrence: input.recurrence || null,
        priority: input.priority as 0|1|2|3,
        sort_order: tasks.length,
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
        await window.electronAPI.createTask(input)
        removeTask(tempId)
        incrementTasksRevision()
      } catch (err: any) {
        removeTask(tempId)
        setError(err.message || 'Failed to create task')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create task')
    }
  }

  const updateTask = async (input: UpdateTaskInput) => {
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
      incrementTasksRevision()
    } catch (err: any) {
      // Revert on error
      updateStoreTask(previousTask)
      setError(err.message || 'Failed to update task')
    }
  }

  const completeTask = async (id: string) => {
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
        incrementTasksRevision()
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
        incrementTasksRevision()
      } catch (err: any) {
        // Revert on failure
        removeTask(id)
        addCompletedTask(taskToUncomplete)
        setError(err.message || 'Failed to un-complete task')
      }
    }
  }

  const deleteTask = async (id: string) => {
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

    const alreadyDeleted = deletedTasks.some(t => t.id === id)
    if (alreadyDeleted) {
      setDeletedTasks(deletedTasks.filter(t => t.id !== id))
    } else {
      setDeletedTasks([...deletedTasks, { ...taskToDelete, status: 'deleted' as const }])
    }

    if (!window.electronAPI) {
      incrementTasksRevision()
      return
    }

    try {
      await window.electronAPI.deleteTask(id)
      incrementTasksRevision()
    } catch (err: any) {
      // Revert on failure
      setTasks(previousTasks)
      setCompletedTasks(previousCompleted)
      setDeletedTasks(previousDeleted)
      setError(err.message || 'Failed to delete task')
    }
  }

  const purgeDeletedTasks = async () => {
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
  }

  const reorderTasks = (orderedIds: string[]) => {
    // Optimistic reorder
    reorderStoreTasks(orderedIds)
    
    if (!window.electronAPI) return
    
    // Background update
    window.electronAPI.reorderTasks(orderedIds).catch((err: any) => {
      setError(err.message || 'Failed to reorder tasks')
    })
  }

  const startSession = async (payload: string | { taskId?: string | null; projectId?: string | null; targetDurationMins?: number }) => {
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
  }

  const stopSession = async () => {
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
  }

  return {
    tasks: [...tasks].sort((a, b) => {
      const pA = a.priority ?? 0
      const pB = b.priority ?? 0
      if (pB !== pA) {
        return pB - pA
      }
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    }),
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
