import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { Project } from '../types'

export function useProjects() {
  const { 
    projects, 
    setProjects, 
    addProject, 
    updateProject: updateStoreProject, 
    removeProject, 
    setError 
  } = useAppStore()

  useEffect(() => {
    if (!window.electronAPI) {
      setProjects([
        { id: 'inbox-default', name: 'Inbox', color: '#6366f1', icon: 'inbox', sort_order: 0, created_at: new Date().toISOString() },
        { id: 'mock-1', name: 'Work', color: '#3b82f6', icon: 'briefcase', sort_order: 1, created_at: new Date().toISOString() },
        { id: 'mock-2', name: 'Personal', color: '#10b981', icon: 'user', sort_order: 2, created_at: new Date().toISOString() }
      ])
      return
    }
    
    window.electronAPI.getProjects()
      .then(setProjects)
      .catch((err: any) => setError(err.message || 'Failed to load projects'))
  }, [])

  const createProject = async (input: Omit<Project, 'id' | 'created_at'>) => {
    if (!window.electronAPI) {
      addProject({
        id: Math.random().toString(36).substring(7),
        ...input,
        created_at: new Date().toISOString()
      })
      return
    }
    try {
      const newProject = await window.electronAPI.createProject(input)
      addProject(newProject)
    } catch (err: any) {
      setError(err.message || 'Failed to create project')
    }
  }

  const updateProject = async (id: string, updates: Partial<Project>) => {
    if (!window.electronAPI) {
      const p = useAppStore.getState().projects.find((p) => p.id === id)
      if (p) updateStoreProject({ ...p, ...updates })
      return
    }
    try {
      const updatedProject = await window.electronAPI.updateProject(id, updates)
      updateStoreProject(updatedProject)
    } catch (err: any) {
      setError(err.message || 'Failed to update project')
    }
  }

  const deleteProject = async (id: string) => {
    if (!window.electronAPI) {
      removeProject(id)
      return
    }
    try {
      await window.electronAPI.deleteProject(id)
      removeProject(id)
    } catch (err: any) {
      setError(err.message || 'Failed to delete project')
    }
  }

  return {
    projects,
    createProject,
    updateProject,
    deleteProject
  }
}
