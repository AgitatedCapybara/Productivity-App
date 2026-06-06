import { useEffect } from 'react'
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
  const { tasks, completedTasks, isLoading, error, setTasks, setCompletedTasks, addCompletedTask, addTask, updateTask: updateStoreTask, removeTask, reorderTasks: reorderStoreTasks, setLoading, setError } = useAppStore()
  const activeView = useAppStore(state => state.activeView)
  const selectedProjectId = useAppStore(state => state.selectedProjectId)

  const loadTasks = async () => {
    setLoading(true)
    setError(null)
    if (!window.electronAPI) {
      // Local state only fallback for web preview
      setLoading(false)
      return
    }
    
    try {
      if (activeView === 'today') {
        const todayTasks = await window.electronAPI.getTasksForToday()
        setTasks(todayTasks)
        const completed = await window.electronAPI.getTodayCompletedTasks()
        setCompletedTasks(completed)
      } else if (activeView === 'upcoming') {
        const upcomingTasks = await window.electronAPI.getTasksUpcoming()
        setTasks(upcomingTasks)
        setCompletedTasks([])
      } else if (activeView === 'project') {
        if (!selectedProjectId) {
          setLoading(false)
          return
        }
        const projectTasks = await window.electronAPI.getTasksByProject(selectedProjectId)
        setTasks(projectTasks)
        setCompletedTasks([])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [activeView, selectedProjectId])

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

      if (!window.electronAPI) {
        // Web preview mock
        addTask({
          id: Math.random().toString(36).substring(7),
          title: input.title,
          notes: input.notes || '',
          status: 'todo',
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
        })
        return
      }

      const newTask = await window.electronAPI.createTask(input)
      addTask(newTask)
    } catch (err: any) {
      setError(err.message || 'Failed to create task')
    }
  }

  const updateTask = async (input: UpdateTaskInput) => {
    if (!window.electronAPI) {
      const task = tasks.find(t => t.id === input.id)
      if (task) {
        updateStoreTask({ ...task, ...input, updated_at: new Date().toISOString() })
      }
      return
    }
    
    try {
      const updatedTask = await window.electronAPI.updateTask(input)
      updateStoreTask(updatedTask)
    } catch (err: any) {
      setError(err.message || 'Failed to update task')
    }
  }

  const completeTask = async (id: string) => {
    // 1. Check if the task is in the incomplete list
    const taskToComplete = tasks.find(t => t.id === id)
    if (taskToComplete) {
      if (!window.electronAPI) {
        removeTask(id)
        addCompletedTask({ ...taskToComplete, status: 'done', completed_at: new Date().toISOString() })
        return
      }
      
      // Optimistic update
      removeTask(id)
      
      try {
        const updatedTask = await window.electronAPI.completeTask(id)
        addCompletedTask(updatedTask)
      } catch (err: any) {
        // Revert on failure
        addTask(taskToComplete)
        setError(err.message || 'Failed to complete task')
      }
      return
    }

    // 2. Clicked a task in completed list -> Un-complete it!
    const taskToUncomplete = completedTasks.find(t => t.id === id)
    if (taskToUncomplete) {
      if (!window.electronAPI) {
        // Remove from completedTasks in store
        useAppStore.setState((state) => {
          const idx = state.completedTasks.findIndex(t => t.id === id)
          if (idx !== -1) state.completedTasks.splice(idx, 1)
        })
        // Add back to active tasks
        addTask({ ...taskToUncomplete, status: 'todo', completed_at: null })
        return
      }

      // Optimistic: remove from completed, add back to active
      useAppStore.setState((state) => {
        const idx = state.completedTasks.findIndex(t => t.id === id)
        if (idx !== -1) state.completedTasks.splice(idx, 1)
      })
      addTask({ ...taskToUncomplete, status: 'todo', completed_at: null })

      try {
        const updatedTask = await window.electronAPI.updateTask({ id, status: 'todo', completed_at: null })
        updateStoreTask(updatedTask)
      } catch (err: any) {
        // Revert on failure
        removeTask(id)
        addCompletedTask(taskToUncomplete)
        setError(err.message || 'Failed to un-complete task')
      }
    }
  }

  const deleteTask = async (id: string) => {
    if (!window.electronAPI) {
      removeTask(id)
      // Also remove from completed just in case they delete from completed section
      useAppStore.setState((state) => {
        const idx = state.completedTasks.findIndex(t => t.id === id)
        if (idx !== -1) state.completedTasks.splice(idx, 1)
      })
      return
    }
    try {
      await window.electronAPI.deleteTask(id)
      removeTask(id)
      useAppStore.setState((state) => {
        const idx = state.completedTasks.findIndex(t => t.id === id)
        if (idx !== -1) state.completedTasks.splice(idx, 1)
      })
    } catch (err: any) {
      setError(err.message || 'Failed to delete task')
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

  return {
    tasks: [...tasks].sort((a,b) => a.sort_order - b.sort_order),
    completedTasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    reorderTasks,
    loadTasks
  }
}
