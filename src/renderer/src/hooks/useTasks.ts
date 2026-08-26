import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import * as chrono from 'chrono-node'
import { useAppStore } from '../store/useAppStore'
import { useCelebrationStore } from '../store/useCelebrationStore'
import type { CreateTaskInput, UpdateTaskInput } from '../types'
import { getNextOccurrenceDate } from '../lib/recurrence'

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

export function parseTaskInput(
  raw: string,
  keepDateText = false,
  ignoredPhrases: string[] = [],
  knownProjectNames: string[] = []
) {
  let title = raw
  const parsedPhrases: { text: string; type: 'project' | 'priority' | 'date' | 'recurrence' | 'duration' | 'label' | 'energy' | 'location' | 'reminder'; ignored: boolean }[] = []

  let projectTag: string | null = null
  let location: string | null = null

  const lowerKnownProjects = knownProjectNames.map(p => p.toLowerCase())

  // Disambiguate and extract @projects vs @locations
  const projectOrLocationMatches = [...title.matchAll(/@([\w-]+)/g)]
  for (const match of projectOrLocationMatches) {
    const fullMatchText = match[0]
    const nameStr = match[1]
    const nameStrLower = nameStr.toLowerCase()

    const isIgnored = ignoredPhrases.some(phrase => phrase.toLowerCase() === fullMatchText.toLowerCase())
    if (isIgnored) {
      parsedPhrases.push({ text: fullMatchText, type: 'project', ignored: true })
      continue
    }

    const commonLocations = ['home', 'office', 'school', 'gym', 'store', 'cafe', 'room', 'desk', 'kitchen']
    const isExplicitLocation = commonLocations.includes(nameStrLower)
    const isKnownProject = lowerKnownProjects.includes(nameStrLower)

    if (isExplicitLocation || (!isKnownProject && (nameStrLower === 'home' || nameStrLower === 'office' || !lowerKnownProjects.includes(nameStrLower)))) {
      location = nameStr
      parsedPhrases.push({ text: fullMatchText, type: 'location', ignored: false })
      title = title.replace(fullMatchText, '').trim()
    } else {
      projectTag = nameStr
      parsedPhrases.push({ text: fullMatchText, type: 'project', ignored: false })
      title = title.replace(fullMatchText, '').trim()
    }
  }

  // Energy tags: "low energy", "high focus"
  let energy_tag: string | null = null
  const energyMatch = title.match(/\b(low energy|high focus|medium energy|high energy|low focus|med energy)\b/i)
  if (energyMatch) {
    const fullMatchText = energyMatch[0]
    energy_tag = energyMatch[1]
    parsedPhrases.push({ text: fullMatchText, type: 'energy', ignored: false })
    title = title.replace(new RegExp(`\\b${fullMatchText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i'), '').trim()
  }

  // Duration estimation: "for 30m", "for 2h", "~45min", etc.
  let time_estimate_mins = 0
  const durationMatch = title.match(/\b(?:for\s+|^~|~)\s*(\d+)\s*(m|min|mins|h|hr|hrs|hour|hours)\b/i)
  if (durationMatch) {
    const fullMatchText = durationMatch[0]
    const amount = parseInt(durationMatch[1], 10)
    const unit = durationMatch[2].toLowerCase()
    
    if (unit.startsWith('h')) {
      time_estimate_mins = amount * 60
    } else {
      time_estimate_mins = amount
    }

    parsedPhrases.push({ text: fullMatchText, type: 'duration', ignored: false })
    title = title.replace(fullMatchText, '').trim()
  }

  // Labels: "#deep-work", "#email", "#errand"
  const labels: string[] = []
  const labelMatches = [...title.matchAll(/#([\w-]+)/g)]
  for (const match of labelMatches) {
    const fullMatchText = match[0]
    const labelVal = match[1]
    labels.push(labelVal)
    parsedPhrases.push({ text: fullMatchText, type: 'label', ignored: false })
    title = title.replace(fullMatchText, '').trim()
  }

  // Reminder syntax: "remind 10m before", "!1h"
  let reminder: string | null = null
  const reminderMatch = title.match(/\bremind\s+(\d+\s*(?:m|min|mins|h|hr|hrs|hour|hours))\s+before\b/i) || title.match(/\b!(\d+\s*(?:m|min|mins|h|hr|hrs|hour|hours))\b/i)
  if (reminderMatch) {
    const fullMatchText = reminderMatch[0]
    reminder = reminderMatch[1]
    parsedPhrases.push({ text: fullMatchText, type: 'reminder', ignored: false })
    title = title.replace(fullMatchText, '').trim()
  }

  // Recurring patterns: "every Monday", "every 2 weeks", "every weekday", "first Friday of each month"
  let recurrence: string | null = null
  const recurrenceMatch = title.match(/\bevery\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekday|day|week|month|year|2\s+weeks|\d+\s+days|\d+\s+weeks)/i) || 
                          title.match(/\bfirst\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+of\s+each\s+month/i)
  if (recurrenceMatch) {
    const fullMatchText = recurrenceMatch[0]
    recurrence = fullMatchText
    parsedPhrases.push({ text: fullMatchText, type: 'recurrence', ignored: false })
    title = title.replace(fullMatchText, '').trim()
  }

  // Priority
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

  // Chrono date/time parsing
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

  let chronoTitle = title
  for (const phrase of ignoredPhrases) {
    const escaped = phrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    const isWord = /^\w+$/.test(phrase)
    const regex = isWord ? new RegExp(`\\b${escaped}\\b`, 'gi') : new RegExp(escaped, 'gi')
    chronoTitle = chronoTitle.replace(regex, ' ')
  }

  const activeResults = chrono.parse(chronoTitle, new Date(), { forwardDate: true })

  let due_date: string | null = null
  let due_time: string | null = null

  if (activeResults.length > 0) {
    const firstResult = activeResults[0]
    let date = firstResult.start.date()
    let hasTime = firstResult.start.isCertain('hour')
    let hasExplicitDate = firstResult.start.isCertain('day') || firstResult.start.isCertain('weekday') || firstResult.start.isCertain('month')

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

    if (hasTime && !hasExplicitDate) {
      const today = new Date()
      date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), date.getHours(), date.getMinutes(), date.getSeconds())
    }
    
    due_date = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    due_time = hasTime
      ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      : null

    if (!keepDateText) {
      for (const res of activeResults) {
        const escaped = res.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
        title = title.replace(new RegExp(escaped, 'i'), '')
      }
    }
  }

  title = title.replace(/\(\s*\)/g, '').replace(/\[\s*\]/g, '').replace(/\s+/g, ' ').trim()

  // Confidence calculation
  let baseScore = 0.5
  if (due_date) baseScore += 0.15
  if (projectTag) baseScore += 0.15
  if (priority > 0) baseScore += 0.10
  if (recurrence) baseScore += 0.15
  if (time_estimate_mins > 0) baseScore += 0.15
  if (labels.length > 0) baseScore += 0.10
  if (energy_tag || location || reminder) baseScore += 0.10
  const confidence = Math.max(0.0, Math.min(1.0, baseScore))

  return {
    title,
    due_date,
    due_time,
    priority,
    projectTag,
    parsedPhrases,
    recurrence,
    time_estimate_mins,
    labels,
    energy_tag,
    location,
    reminder,
    confidence
  }
}

const EMPTY_ARRAY: any[] = []

export function useTasks(enableLoading = false, viewOverride?: string) {
  const deletedTasks = useAppStore(state => state.deletedTasks)
  const error = useAppStore(state => state.error)
  const setTasksForView = useAppStore(state => state.setTasksForView)
  const setCompletedTasksForView = useAppStore(state => state.setCompletedTasksForView)
  const setDeletedTasks = useAppStore(state => state.setDeletedTasks)
  const addCompletedTask = useAppStore(state => state.addCompletedTask)
  const addTask = useAppStore(state => state.addTask)
  const updateStoreTask = useAppStore(state => state.updateTask)
  const removeTask = useAppStore(state => state.removeTask)
  const reorderStoreTasks = useAppStore(state => state.reorderTasks)
  const setError = useAppStore(state => state.setError)
  const incrementTasksRevision = useAppStore(state => state.incrementTasksRevision)

  const setActiveSession = useAppStore(state => state.setActiveSession)
  const setActiveTaskId = useAppStore(state => state.setActiveTaskId)
  const tasksRevision = useAppStore(state => state.tasksRevision)
  const [isLoading, setLoading] = useState(false)
  const activeView = useAppStore(state => state.activeView)
  const selectedProjectId = useAppStore(state => state.selectedProjectId)

  // Resolve targetViewKey
  let targetViewKey = 'today'
  if (viewOverride) {
    if (viewOverride === 'project') {
      targetViewKey = selectedProjectId ? `project-${selectedProjectId}` : 'project'
    } else {
      targetViewKey = viewOverride
    }
  } else {
    targetViewKey = activeView === 'project' && selectedProjectId ? `project-${selectedProjectId}` : activeView
  }

  const tasks = useAppStore(state => state.tasksByView[targetViewKey] || EMPTY_ARRAY)
  const completedTasks = useAppStore(state => state.completedTasksByView[targetViewKey] || EMPTY_ARRAY)

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

      if (targetViewKey === 'today') {
        const [tasksResult, completedResult] = await Promise.allSettled([
          window.electronAPI.getTasksForToday(),
          window.electronAPI.getTodayCompletedTasks()
        ])
        if (tasksResult.status === 'fulfilled') setTasksForView('today', tasksResult.value)
        else setTasksForView('today', [])
        if (completedResult.status === 'fulfilled') setCompletedTasksForView('today', completedResult.value)
        else setCompletedTasksForView('today', [])
      } else if (targetViewKey === 'upcoming') {
        const upcomingTasks = await window.electronAPI.getTasksUpcoming()
        setTasksForView('upcoming', upcomingTasks)
        setCompletedTasksForView('upcoming', [])
      } else if (targetViewKey.startsWith('project-')) {
        const projectId = targetViewKey.replace('project-', '')
        const projectTasks = await window.electronAPI.getTasksByProject(projectId)
        setTasksForView(targetViewKey, projectTasks)
        setCompletedTasksForView(targetViewKey, [])
      } else {
        // Fallback for views like Inbox: load all tasks
        try {
          const allTasks = await window.electronAPI.getTasks()
          const active = allTasks.filter((t: any) => t.status !== 'done' && t.status !== 'deleted')
          const completed = allTasks.filter((t: any) => t.status === 'done')
          setTasksForView(targetViewKey, active)
          setCompletedTasksForView(targetViewKey, completed)
        } catch (err) {
          setTasksForView(targetViewKey, [])
          setCompletedTasksForView(targetViewKey, [])
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [targetViewKey, setDeletedTasks, setTasksForView, setCompletedTasksForView, setError, setLoading])

  const loadTasksRef = useRef(loadTasks)
  useEffect(() => {
    loadTasksRef.current = loadTasks
  })

  useEffect(() => {
    if (!enableLoading) return
    // Standard load for view/project changes
    loadTasksRef.current(false)
  }, [targetViewKey, enableLoading])

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
      
      const projects = useAppStore.getState().projects
      const knownProjectNames = projects.map(p => p.name)
      const parsed = parseTaskInput(title, isManuallyOverridden, ignoredPhrases, knownProjectNames)
      const currentTasks = useAppStore.getState().tasks
      const calculatedSortOrder = currentTasks.length > 0 ? Math.max(...currentTasks.map(t => t.sort_order ?? 0)) + 1000 : 1000

      const notesParts: string[] = []
      if (cleanExtra.notes) notesParts.push(cleanExtra.notes)
      if (parsed.labels.length) notesParts.push(`Tags: ${parsed.labels.map(l => '#' + l).join(' ')}`)
      if (parsed.energy_tag) notesParts.push(`Energy: ${parsed.energy_tag}`)
      if (parsed.location) notesParts.push(`Location: @${parsed.location}`)
      if (parsed.reminder) notesParts.push(`Reminder: ${parsed.reminder}`)
      const combinedNotes = notesParts.join('\n')

      const input: CreateTaskInput = {
        title: parsed.title,
        due_date: parsed.due_date,
        due_time: parsed.due_time,
        priority: parsed.priority,
        recurrence: parsed.recurrence,
        time_estimate_mins: parsed.time_estimate_mins || cleanExtra.time_estimate_mins || 0,
        notes: combinedNotes,
        sort_order: calculatedSortOrder,
        ...cleanExtra
      }

      const activeView = useAppStore.getState().activeView
      const selectedProjectId = useAppStore.getState().selectedProjectId

      if (parsed.projectTag) {
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
        updated_at: new Date().toISOString(),
        plan_when: input.plan_when || null,
        plan_where: input.plan_where || null,
        plan_how: input.plan_how || null
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
        incrementTasksRevision()
      } catch (err: any) {
        removeTask(tempId)
        setError(err.message || 'Failed to create task')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create task')
    }
  }, [addTask, removeTask, setError, incrementTasksRevision])

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
      incrementTasksRevision()
    } catch (err: any) {
      // Revert on error
      updateStoreTask(previousTask)
      setError(err.message || 'Failed to update task')
    }
  }, [updateStoreTask, setError, incrementTasksRevision])

  const completeTask = useCallback(async (id: string): Promise<void> => {
    const { tasks, completedTasks } = useAppStore.getState()
    // 1. Check if the task is in the incomplete list
    const taskToComplete = tasks.find(t => t.id === id)
    if (taskToComplete) {
      // Optimistic update
      removeTask(id)
      const completedTask = { ...taskToComplete, status: 'done' as const, completed_at: new Date().toISOString() }
      addCompletedTask(completedTask)

      // Trigger visual celebration strictly as a side-effect
      const celebType = Math.random() < 0.5 ? 'confetti' : 'balloons'
      useCelebrationStore.getState().triggerCelebration(celebType)

      // Handle recurrence if configured
      if (taskToComplete.recurrence) {
        try {
          const today = new Date()
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          const nextDate = getNextOccurrenceDate(taskToComplete.due_date || todayStr, taskToComplete.recurrence)
          const nextTaskInput: CreateTaskInput = {
            title: taskToComplete.title,
            notes: taskToComplete.notes || '',
            project_id: taskToComplete.project_id || undefined,
            priority: taskToComplete.priority || 0,
            due_date: nextDate,
            due_time: taskToComplete.due_time || undefined,
            recurrence: taskToComplete.recurrence,
            time_estimate_mins: taskToComplete.time_estimate_mins || 0,
            plan_when: taskToComplete.plan_when || undefined,
            plan_where: taskToComplete.plan_where || undefined,
            plan_how: taskToComplete.plan_how || undefined
          }
          createTask(nextTaskInput.title, nextTaskInput).catch(err => {
            console.error('Failed to automatically schedule next recurring iteration:', err)
          })
        } catch (recErr) {
          console.error('Error parsing recurrence rule:', recErr)
        }
      }

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
  }, [removeTask, addCompletedTask, addTask, setError, incrementTasksRevision])

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
      incrementTasksRevision()
    } catch (err: any) {
      // Revert on failure
      setTasksForView(targetViewKey, previousTasks)
      setCompletedTasksForView(targetViewKey, previousCompleted)
      setDeletedTasks(previousDeleted)
      setError(err.message || 'Failed to delete task')
    }
  }, [removeTask, setDeletedTasks, incrementTasksRevision, setTasksForView, setCompletedTasksForView, setError, targetViewKey])

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

  const startSession = useCallback(async (payload: string | { taskId?: string | null; projectId?: string | null; targetDurationMins?: number; targetBreakDurationMins?: number }): Promise<any> => {
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
