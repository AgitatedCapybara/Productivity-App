import { useState } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AnimatePresence } from 'motion/react'
import { Task } from '../../types'
import { TaskItem } from './TaskItem'
import { useTasks } from '../../hooks/useTasks'

interface TaskListProps {
  tasks: Task[]
}

export function TaskList({ tasks }: TaskListProps) {
  const { completeTask, updateTask, deleteTask, reorderTasks } = useTasks()
  const [activeId, setActiveId] = useState<string | null>(null)

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

  if (tasks.length === 0) {
    return null
  }

  const activeTask = tasks.find(t => t.id === activeId)

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-0.5 relative z-10 w-full mb-4">
          <AnimatePresence initial={false}>
            {tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={completeTask}
                onUpdate={updateTask}
                onDelete={deleteTask}
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
