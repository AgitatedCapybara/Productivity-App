import { useState } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AnimatePresence } from 'motion/react'
import { Task } from '../../types'
import { TaskItem } from './TaskItem'
import { useTasks } from '../../hooks/useTasks'

import { useAppStore } from '../../store/useAppStore'

interface TaskListProps {
  tasks: Task[]
}

export function TaskList({ tasks }: TaskListProps) {
  const { completeTask, updateTask, deleteTask, reorderTasks } = useTasks()
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const selectedTaskIds = useAppStore(state => state.selectedTaskIds)
  const setSelectedTaskIds = useAppStore(state => state.setSelectedTaskIds)
  const lastSelectedTaskId = useAppStore(state => state.lastSelectedTaskId)
  const setLastSelectedTaskId = useAppStore(state => state.setLastSelectedTaskId)

  const handleSelect = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    
    // As requested: "only when shift + click is pressed ... is what can be selected"
    if (!e.shiftKey && !e.metaKey && !e.ctrlKey && selectedTaskIds.length === 0) {
      return // Do not initiate selection on a normal click if no selection exists
    }

    if (e.shiftKey && lastSelectedTaskId) {
      const domNodes = Array.from(document.querySelectorAll('[data-task-id]'))
      const ids = domNodes.map(node => node.getAttribute('data-task-id')) as string[]
      
      const startIndex = ids.indexOf(lastSelectedTaskId)
      const endIndex = ids.indexOf(taskId)
      
      if (startIndex !== -1 && endIndex !== -1) {
        const min = Math.min(startIndex, endIndex)
        const max = Math.max(startIndex, endIndex)
        const toSelect = ids.slice(min, max + 1)
        
        const newSelection = new Set([...selectedTaskIds, ...toSelect])
        setSelectedTaskIds(Array.from(newSelection))
      } else {
        setSelectedTaskIds([...selectedTaskIds, taskId])
        setLastSelectedTaskId(taskId)
      }
    } else if (e.metaKey || e.ctrlKey) {
      if (selectedTaskIds.includes(taskId)) {
        setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId))
        setLastSelectedTaskId(null)
      } else {
        setSelectedTaskIds([...selectedTaskIds, taskId])
        setLastSelectedTaskId(taskId)
      }
    } else {
      if (selectedTaskIds.length > 0 && selectedTaskIds.length === 1 && selectedTaskIds[0] === taskId) {
         setSelectedTaskIds([])
         setLastSelectedTaskId(null)
      } else {
         setSelectedTaskIds([taskId])
         setLastSelectedTaskId(taskId)
      }
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id)
      const newIndex = tasks.findIndex((t) => t.id === over.id)
      const newTasks = [...tasks]
      const [moved] = newTasks.splice(oldIndex, 1)
      newTasks.splice(newIndex, 0, moved)
      
      const newOrderIds = newTasks.map(t => t.id)
      reorderTasks(newOrderIds)
    }
    
    setActiveId(null)
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  const uniqueTasks = tasks.reduce<Task[]>((acc, current) => {
    if (!acc.some(item => item.id === current.id)) {
      acc.push(current)
    }
    return acc
  }, [])

  const activeTask = uniqueTasks.find(t => t.id === activeId)

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={uniqueTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-0.5 relative z-10 w-full mb-4">
          <AnimatePresence initial={false}>
            {uniqueTasks.map(task => (
              <TaskItem
                key={task.client_id || task.id}
                task={task}
                onComplete={completeTask}
                onUpdate={updateTask}
                onDelete={deleteTask}
                isSelected={selectedTaskIds.includes(task.id)}
                onSelect={handleSelect}
              />
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>

      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.4',
              },
            },
          }),
        }}
      >
        {activeTask ? (
          <TaskItem task={activeTask} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
