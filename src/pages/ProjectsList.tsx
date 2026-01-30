import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Project } from '../types/index.ts'
import { HiX, HiEye, HiPencil, HiDocument, HiClock, HiUsers, HiCheckCircle, HiTrash } from 'react-icons/hi'
import { getProjects } from '../services/projectsAPI'
import { listUsers as fetchUsers } from '../services/usersAPI.ts'
import { apiGet, apiJson } from '../services/api.ts'

const ProjectsList: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [drafts, setDrafts] = useState<any[]>([])
  const [showDrafts, setShowDrafts] = useState(false)
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    projectCode: '',
    category: '',
    subcategory: '',
    tags: [] as string[],
    projectTypeComments: '',
    startDate: '',
    projectDeadline: '',
    estimatedDuration: 0,
    workingDays: 0,
    totalWorkingHours: 0,
    projectHours: 0,
    excludeWeekends: true,
    status: 'planning' as const,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    visibility: 'assigned-only' as const,
    team: [] as string[],
    clients: [] as string[]
  })
  
  const [newTag, setNewTag] = useState('')
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([])
  const [attachments, setAttachments] = useState<File[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; email: string; role: string; department: string; avatar?: string }>>([])
  const [filteredTeamMembers, setFilteredTeamMembers] = useState<typeof teamMembers>([])
  const [originalMemberIds, setOriginalMemberIds] = useState<string[]>([])

  // Load real users for team assignment
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetchUsers({ page: 1, limit: 100 })
        const items = (res.items || []).map((u: any) => {
          const name = String(u.name || '')
          const initials = name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
          return {
            id: String(u.id),
            name,
            email: String(u.email || ''),
            role: String((u?.role?.name || u?.role || '')).toLowerCase(),
            department: String(u?.department?.name || u?.department || ''),
            avatar: initials,
          }
        })
        setTeamMembers(items)
        setFilteredTeamMembers(items)
      } catch (e) {
        console.error('Failed to load team members', e)
        setTeamMembers([])
        setFilteredTeamMembers([])
      }
    })()
  }, [])

  // Derive filters
  const departments = [...new Set(teamMembers.map(m => m.department).filter(Boolean))]
  const roles = [...new Set(teamMembers.map(m => m.role).filter(Boolean))]

  // Apply filters
  useEffect(() => {
    let list = teamMembers
    if (selectedDepartment) list = list.filter(m => m.department === selectedDepartment)
    if (selectedRole) list = list.filter(m => m.role === selectedRole)
    setFilteredTeamMembers(list)
  }, [selectedDepartment, selectedRole, teamMembers])

  // Load drafts from localStorage
  useEffect(() => {
    const savedDrafts = localStorage.getItem('projectDrafts')
    if (savedDrafts) {
      setDrafts(JSON.parse(savedDrafts))
    }
  }, [])

  // Calculate working days and hours for edit modal
  useEffect(() => {
    if (editData.startDate && editData.projectDeadline) {
      const start = new Date(editData.startDate)
      const end = new Date(editData.projectDeadline)
      const diffTime = end.getTime() - start.getTime()
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      let workingDays = totalDays
      if (editData.excludeWeekends) {
        // Calculate working days excluding weekends
        workingDays = calculateWorkingDays(start, end)
      }
      
      const totalWorkingHours = workingDays * 8 // 8 hours per working day
      
      setEditData(prev => ({ 
        ...prev, 
        estimatedDuration: totalDays,
        workingDays: workingDays,
        totalWorkingHours: totalWorkingHours
      }))
    }
  }, [editData.startDate, editData.projectDeadline, editData.excludeWeekends])

  // Helper function to calculate working days excluding weekends
  const calculateWorkingDays = (startDate: Date, endDate: Date) => {
    let count = 0
    const current = new Date(startDate)
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay()
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }
    
    return count
  }

  // Toggle for mock data during development; default to false to use API
  const USE_MOCK = (import.meta as any).env?.VITE_USE_MOCK === 'true'

  // Real projects from API; start empty
  const [projects, setProjects] = useState<Project[]>([])

  // Optional mock fallback if desired
  const mockProjects: Project[] = [
    {
      id: '1',
      name: 'Mobile App Redesign',
      description: 'Complete redesign of the mobile application with modern UI/UX',
      status: 'in-progress',
      progress: 60,
      startDate: '2024-01-01',
      dueDate: '2024-02-15',
      team: ['Sarah Johnson', 'Mike Chen', 'Alex Rodriguez'],
      tags: ['Mobile', 'UI/UX', 'React Native'],
      priority: 'high',
      phases: [],
      tasks: [],
      members: [],
      allocatedHours: 200,
      loggedHours: 45.5,
      remainingHours: 154.5,
    },
  ]

  // Load projects from API on mount; gate with USE_MOCK
  useEffect(() => {
    if (USE_MOCK) {
      setProjects(mockProjects)
      return
    }
    getProjects()
      .then((data: any) => {
        // Normalize API to Project shape if needed
        // Expecting fields: id, title, description, allocatedHours, progress, usedHours, leftHours
        const mapped = (data || []).map((p: any) => ({
          id: p.id,
          name: p.title,
          description: p.description,
          status: (p.status || 'PLANNING').toLowerCase(),
          progress: p.progress ?? 0,
          startDate: p.startDate || '',
          dueDate: p.endDate || '',
          team: Array.isArray(p.memberships) ? p.memberships.map((m: any) => m.user?.name).filter(Boolean) : [],
          tags: [],
          priority: 'medium',
          phases: [],
          tasks: [],
          members: [],
          allocatedHours: p.allocatedHours ?? 0,
          loggedHours: p.usedHours ?? 0,
          remainingHours: p.leftHours ?? Math.max((p.allocatedHours ?? 0) - (p.usedHours ?? 0), 0),
        })) as Project[]
        setProjects(mapped)
      })
      .catch((err: any) => {
        console.error('Failed to load projects', err)
      })
  }, [])

  // Helper for UI to render Duration label
  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '')

  const filteredProjects = projects.filter(project => {
    if (project.status === 'completed') return false
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  const handleViewProject = (project: Project) => {
    setSelectedProject(project)
    setIsViewModalOpen(true)
  }

  const handleEditProject = (project: Project) => {
    setSelectedProject(project)
    setEditData({
      title: project.name,
      description: project.description,
      projectCode: project.id,
      category: 'Tech-Related Services',
      subcategory: 'Development',
      tags: project.tags,
      projectTypeComments: '',
      startDate: project.startDate,
      projectDeadline: project.dueDate || '',
      estimatedDuration: 0,
      workingDays: 0,
      totalWorkingHours: 0,
      projectHours: project.allocatedHours || 0,
      excludeWeekends: true,
      status: project.status as any,
      priority: project.priority as any,
      visibility: 'assigned-only' as const,
      team: project.team,
      clients: []
    })
    // Preload current members from API (user IDs)
    ;(async () => {
      try {
        const users = await apiGet(`/projects/${project.id}/members`)
        const ids = Array.isArray(users) ? users.map((u: any) => String(u.id)) : []
        setOriginalMemberIds(ids)
        setSelectedTeamMembers(ids)
      } catch (e) {
        console.error('Failed to load project members', e)
        setOriginalMemberIds([])
        setSelectedTeamMembers([])
      }
    })()
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (selectedProject && editData) {
      // Update the project data
      const updatedProject = {
        ...selectedProject,
        name: editData.title,
        description: editData.description,
        status: editData.status,
        priority: editData.priority,
        startDate: editData.startDate,
        dueDate: editData.projectDeadline,
        tags: editData.tags,
        team: selectedTeamMembers,
        allocatedHours: editData.projectHours || selectedProject.allocatedHours,
        loggedHours: selectedProject.loggedHours, // Keep existing logged hours
        remainingHours: Math.max(0, (editData.projectHours || selectedProject.allocatedHours) - selectedProject.loggedHours)
      }
      
      // Persist changes to backend
      try {
        await apiJson(`/projects/${selectedProject.id}`, 'PATCH', {
          title: updatedProject.name,
          description: updatedProject.description,
          allocatedHours: updatedProject.allocatedHours,
          startDate: updatedProject.startDate ? new Date(updatedProject.startDate).toISOString() : null,
          endDate: updatedProject.dueDate ? new Date(updatedProject.dueDate).toISOString() : null,
        })

        // Sync members: add new ones, remove deselected
        const current = new Set(originalMemberIds)
        const chosen = new Set(selectedTeamMembers)
        const toAdd = [...chosen].filter(id => !current.has(id))
        const toRemove = [...current].filter(id => !chosen.has(id))

        if (toAdd.length) {
          await apiJson(`/projects/${selectedProject.id}/members`, 'POST', { userIds: toAdd })
        }
        if (toRemove.length) {
          await apiJson(`/projects/${selectedProject.id}/members`, 'DELETE', { userIds: toRemove })
        }
      } catch (e) {
        console.error('Failed to update project', e)
      }

      // Update the projects state
      setProjects(prevProjects => 
        prevProjects.map((project: Project) => 
          project.id === selectedProject.id ? updatedProject : project
        )
      )
      
      // In a real app, this would update the project in the backend
      console.log('Saving project:', selectedProject.id, updatedProject, { add: selectedTeamMembers, remove: originalMemberIds })
      
      // Show success message
      alert('Project updated successfully!')
      
      setIsEditModalOpen(false)
      setSelectedProject(null)
      handleCloseModals()
    }
  }

  const handleCloseModals = () => {
    setIsViewModalOpen(false)
    setIsEditModalOpen(false)
    setSelectedProject(null)
    setEditData({
      title: '',
      description: '',
      projectCode: '',
      category: '',
      subcategory: '',
      tags: [],
      projectTypeComments: '',
      startDate: '',
      projectDeadline: '',
      estimatedDuration: 0,
      workingDays: 0,
      totalWorkingHours: 0,
      projectHours: 0,
      excludeWeekends: true,
      status: 'planning' as const,
      priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
      visibility: 'assigned-only' as const,
      team: [],
      clients: []
    })
    setSelectedTeamMembers([])
    setNewTag('')
  }

  const handleInputChange = (field: string, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddTag = () => {
    if (newTag.trim() && !editData.tags.includes(newTag.trim())) {
      setEditData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setEditData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  // Removed old toggle helper; consolidated inline where used


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleContinueDraft = (draft: any) => {
    // Navigate to AddProject page with draft data
    navigate('/projects/add', { state: { draft } })
  }

  const handleDeleteDraft = (draftId: string) => {
    const updatedDrafts = drafts.filter(draft => draft.id !== draftId)
    setDrafts(updatedDrafts)
    localStorage.setItem('projectDrafts', JSON.stringify(updatedDrafts))
  }

  const handlePublishDraft = (draft: any) => {
    // Convert draft to published project
    const publishedProject = {
      ...draft,
      id: `project-${Date.now()}`,
      status: 'planning',
      publishedAt: new Date().toISOString()
    }
    
    // Remove from drafts
    const updatedDrafts = drafts.filter(d => d.id !== draft.id)
    setDrafts(updatedDrafts)
    localStorage.setItem('projectDrafts', JSON.stringify(updatedDrafts))
    
    // In a real app, this would save to the backend
    console.log('Draft published as project:', publishedProject)
    alert('Draft published successfully!')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress': return 'badge-info'
      case 'in-review': return 'badge-warning'
      case 'completed': return 'badge-success'
      case 'blocked': return 'badge-danger'
      case 'planning': return 'badge-info'
      default: return 'badge-info'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'badge-danger'
      case 'high': return 'badge-warning'
      case 'medium': return 'badge-success'
      case 'low': return 'badge-secondary'
      default: return 'badge-secondary'
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-600'
    if (progress >= 60) return 'bg-blue-600'
    if (progress >= 40) return 'bg-yellow-600'
    return 'bg-red-600'
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Create and manage your projects
          </p>
        </div>
        <Link to="/projects/add" className="btn-primary inline-flex items-center">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Project
        </Link>
      </div>

      {/* Project Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card dark:bg-black/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">5</p>
            </div>
            <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card dark:bg-black/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">0</p>
            </div>
            <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center">
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card dark:bg-black/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Planning</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">5</p>
            </div>
            <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900 rounded-xl flex items-center justify-center">
              <svg className="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card dark:bg-black/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">0</p>
            </div>
            <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card dark:bg-black/60 dark:border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="planning">Planning</option>
              <option value="in-progress">In Progress</option>
              <option value="in-review">In Review</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Drafts Section */}
      {drafts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Draft Projects</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Continue working on your saved drafts</p>
            </div>
            <button
              onClick={() => setShowDrafts(!showDrafts)}
              className="btn-secondary text-sm"
            >
              {showDrafts ? 'Hide Drafts' : 'Show Drafts'} ({drafts.length})
            </button>
          </div>

          {showDrafts && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drafts.map((draft) => (
                <div key={draft.id} className="card dark:bg-black/60 dark:border-white/10 border-2 border-dashed border-orange-200 dark:border-orange-800">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                        {draft.title || 'Untitled Draft'}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Created: {new Date(draft.createdAt).toLocaleDateString()}
                      </p>
                      <span className="inline-block bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs px-2 py-1 rounded-full">
                        Draft
                      </span>
                    </div>
                  </div>

                  {draft.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {draft.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleContinueDraft(draft)}
                        className="btn-primary text-xs px-3 py-1"
                      >
                        <HiPencil className="h-3 w-3 mr-1" />
                        Continue
                      </button>
                      <button
                        onClick={() => handlePublishDraft(draft)}
                        className="btn-secondary text-xs px-3 py-1"
                      >
                        Publish
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeleteDraft(draft.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete draft"
                    >
                      <HiTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Projects Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Projects</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Your latest projects</p>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="card dark:bg-black/60 dark:border-white/10 text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No projects found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="block"
              >
                <div className="card dark:bg-black/60 dark:border-white/10 hover:shadow-lg transition-shadow duration-200 cursor-pointer group border border-gray-200 dark:border-white/10">
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {project.name}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          project.priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          project.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          project.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-gray-100 text-gray-800 dark:bg-black/50 dark:text-gray-200'
                        }`}>
                          {project.priority.toUpperCase()}
                        </span>
                      </div>
                      {/* Project ID hidden on list view as requested */}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {project.startDate && project.dueDate
                          ? `Duration: ${formatDate(project.startDate)} - ${formatDate(project.dueDate)}`
                          : project.dueDate
                            ? `Due: ${formatDate(project.dueDate)}`
                            : 'Due: No due date'}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className={`badge ${getStatusColor(project.status)}`}>
                          {project.status.replace('-', ' ').toUpperCase()}
                        </span>
                        {project.team.length > 0 ? (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                            {project.team.length} assigned
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                            Not assigned
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        className="btn-secondary text-sm px-3 py-1"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleViewProject(project)
                        }}
                      >
                        <HiEye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      <button 
                        className="btn-primary text-sm px-3 py-1"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleEditProject(project)
                        }}
                      >
                        <HiPencil className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="font-medium text-gray-900 dark:text-white">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-black/50 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(project.progress)}`}
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="flex items-center justify-between text-sm mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <span className="text-gray-600 dark:text-gray-400">{project.team.length} members</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-gray-600 dark:text-gray-400">$60,000</span>
                      </div>
                    </div>
                  </div>


                  {/* Time Allocation Progress */}
                  {project.allocatedHours > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Time Allocation</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {Math.round((project.loggedHours / project.allocatedHours) * 100)}%
                        </span>
                      </div>
                      <div className="w-1/6 bg-gray-200 dark:bg-black/50 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (project.loggedHours / project.allocatedHours) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Hours Section */}
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-4">
                      <span>Allocated: <span className="font-medium text-gray-900 dark:text-white">{project.allocatedHours}h</span></span>
                      <span>Logged: <span className="font-medium text-gray-900 dark:text-white">{project.loggedHours}h</span></span>
                      <span>Remaining: <span className="font-medium text-gray-900 dark:text-white">{project.remainingHours}h</span></span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* View Project Modal */}
      {isViewModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-black/60 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Project Details</h2>
              <button
                onClick={handleCloseModals}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <HiX className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Project Header */}
              <div className="border-b border-gray-200 dark:border-white/10 pb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {selectedProject.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {selectedProject.description}
                </p>
                <div className="flex items-center space-x-4">
                  <span className={`badge ${getStatusColor(selectedProject.status)}`}>
                    {selectedProject.status}
                  </span>
                  <span className={`badge ${getPriorityColor(selectedProject.priority)}`}>
                    {selectedProject.priority}
                  </span>
                </div>
              </div>

              {/* Project Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Project Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Project ID:</span>
                      <span className="text-gray-900 dark:text-white">{selectedProject.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(selectedProject.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Due Date:</span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedProject.dueDate ? new Date(selectedProject.dueDate).toLocaleDateString() : 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Progress:</span>
                      <span className="text-gray-900 dark:text-white">{selectedProject.progress}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Allocated Hours:</span>
                      <span className="text-gray-900 dark:text-white">{selectedProject.allocatedHours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Logged Hours:</span>
                      <span className="text-gray-900 dark:text-white">{selectedProject.loggedHours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Remaining Hours:</span>
                      <span className="text-gray-900 dark:text-white">{selectedProject.remainingHours}h</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Team & Tags</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 text-sm">Team Members:</span>
                      <div className="mt-1">
                        {selectedProject.team.map((member, index) => (
                          <span key={index} className="inline-block bg-gray-100 dark:bg-black/50 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md text-sm mr-2 mb-1">
                            {member}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 text-sm">Tags:</span>
                      <div className="mt-1">
                        {selectedProject.tags.map((tag, index) => (
                          <span key={index} className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md text-sm mr-2 mb-1">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Overall Progress</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedProject.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-black/50 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(selectedProject.progress)}`}
                    style={{ width: `${selectedProject.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleCloseModals}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-black/60 rounded-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Project</h2>
                <button
                  onClick={handleCloseModals}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <HiX className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-8">
                  {/* 1. Project Basic Information */}
                  <div className="card dark:bg-black/60 dark:border-white/10">
                    <div className="flex items-center mb-6">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg mr-3">
                        <HiDocument className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Project Basic Information</h3>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Project Title *
                        </label>
                        <input
                          type="text"
                          value={editData.title}
                          onChange={(e) => handleInputChange('title', e.target.value)}
                          className="input-field"
                          placeholder="Enter project title"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Project Description
                        </label>
                        <textarea
                          value={editData.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          className="input-field"
                          rows={4}
                          placeholder="Describe the project objectives and scope"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Project Code / ID
                          </label>
                          <input
                            type="text"
                            value={editData.projectCode}
                            onChange={(e) => handleInputChange('projectCode', e.target.value)}
                            className="input-field"
                            placeholder="Auto-generated"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Project Status
                          </label>
                          <select
                            value={editData.status}
                            onChange={(e) => handleInputChange('status', e.target.value)}
                            className="input-field"
                          >
                            <option value="planning">Planning</option>
                            <option value="active">Active</option>
                            <option value="on-hold">On Hold</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Project Category
                          </label>
                          <select
                            value={editData.category}
                            onChange={(e) => handleInputChange('category', e.target.value)}
                            className="input-field"
                          >
                            <option value="">Select Category</option>
                            <option value="GRC-Related Services">GRC-Related Services</option>
                            <option value="Tech-Related Services">Tech-Related Services</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Subcategory
                          </label>
                          <select
                            value={editData.subcategory}
                            onChange={(e) => handleInputChange('subcategory', e.target.value)}
                            className="input-field"
                          >
                            <option value="">Select Subcategory</option>
                            <option value="Development">Development</option>
                            <option value="Security">Security</option>
                            <option value="Compliance">Compliance</option>
                            <option value="Testing">Testing</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Tags / Keywords
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {editData.tags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md text-sm">
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-1 text-blue-500 hover:text-blue-700"
                              >
                                <HiX className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            className="input-field flex-1"
                            placeholder="Add a tag"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddTag()
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleAddTag}
                            className="btn-secondary"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Project Type Comments
                        </label>
                        <textarea
                          value={editData.projectTypeComments}
                          onChange={(e) => handleInputChange('projectTypeComments', e.target.value)}
                          className="input-field"
                          rows={3}
                          placeholder="Additional comments about the project type"
                        />
                      </div>
                </div>
              </div>

              {/* 2. Timeline & Scheduling */}
              <div className="card dark:bg-black/60 dark:border-white/10">
                    <div className="flex items-center mb-6">
                      <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg mr-3">
                        <HiClock className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Timeline & Scheduling</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Start Date *
                          </label>
                          <input
                            type="date"
                            value={editData.startDate}
                            onChange={(e) => handleInputChange('startDate', e.target.value)}
                            className="input-field"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Project Deadline
                          </label>
                          <input
                            type="date"
                            value={editData.projectDeadline}
                            onChange={(e) => handleInputChange('projectDeadline', e.target.value)}
                            className="input-field"
                          />
                        </div>
                      </div>


                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Project Hours Allocation
                        </label>
                        <input
                          type="number"
                          value={editData.projectHours}
                          onChange={(e) => handleInputChange('projectHours', parseInt(e.target.value) || 0)}
                          className="input-field"
                          min="0"
                          placeholder="Hours allocated for this project"
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="excludeWeekends"
                          checked={editData.excludeWeekends}
                          onChange={(e) => handleInputChange('excludeWeekends', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="excludeWeekends" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                          Exclude weekends from working days calculation
                        </label>
                      </div>

                      {/* Calculated Values Display */}
                      {(editData.estimatedDuration > 0 || editData.workingDays > 0) && (
                        <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Calculated Timeline</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Days</div>
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">{editData.estimatedDuration}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Working Days</div>
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">{editData.workingDays}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Hours</div>
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">{editData.totalWorkingHours}h</div>
                            </div>
                          </div>
                          
                          {editData.totalWorkingHours > 0 && editData.projectHours > 0 && (
                            <div className="mt-4">
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                <span>Project Hours Allocation</span>
                                <span>{Math.round((editData.projectHours / editData.totalWorkingHours) * 100)}% of available time</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-black/40 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${Math.min(100, (editData.projectHours / editData.totalWorkingHours) * 100)}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Assign Team & Roles — consolidated below */}

                  {/* 4. Project Status & Priority */}
                  <div className="card dark:bg-black/60 dark:border-white/10">
                    <div className="flex items-center mb-6">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg mr-3">
                        <HiCheckCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Project Status & Priority</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Priority Level
                          </label>
                          <select
                            value={editData.priority}
                            onChange={(e) => handleInputChange('priority', e.target.value)}
                            className="input-field"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Visibility
                          </label>
                          <select
                            value={editData.visibility}
                            onChange={(e) => handleInputChange('visibility', e.target.value)}
                            className="input-field"
                          >
                            <option value="assigned-only">Only Assigned Members</option>
                            <option value="organization">Whole Organization</option>
                            <option value="directors-managers">Directors + Managers Only</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Attachments */}
                  <div className="card dark:bg-black/60 dark:border-white/10">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attachments</h3>
                    <div>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="input-field"
                        accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                      />
                      {attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {attachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-black/50 rounded-lg">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <HiX className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Assign Team & Roles */}
              <div className="card dark:bg-black/60 dark:border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg mr-3">
                      <HiUsers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Assign Team & Roles</h3>
                  </div>
                </div>

                {/* Selected Members */}
                {selectedTeamMembers.length > 0 && (
                  <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-primary-900 dark:text-primary-100">
                        Selected Team Members ({selectedTeamMembers.length})
                      </h4>
                      <button
                        onClick={() => setSelectedTeamMembers([])}
                        className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTeamMembers.map(id => {
                        const m = teamMembers.find(t => t.id === id)
                        return m ? (
                          <span key={id} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-200">
                            {m.name}
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedTeamMembers(prev => prev.filter(x => x !== id)) }}
                              className="ml-1 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                            >
                              <HiX className="h-3 w-3" />
                            </button>
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Department</label>
                    <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="input-field">
                      <option value="">All Departments</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Role</label>
                    <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="input-field">
                      <option value="">All Roles</option>
                      {roles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </div>
                </div>

                {/* Available Members */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {filteredTeamMembers.length > 0 ? (
                    filteredTeamMembers.map(member => (
                      <div
                        key={member.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors duration-200 ${
                          selectedTeamMembers.includes(member.id)
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-black/40'
                        }`}
                        onClick={() => setSelectedTeamMembers(prev => prev.includes(member.id) ? prev.filter(x => x !== member.id) : [...prev, member.id])}
                      >
                        <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium mr-3">
                          {member.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">{member.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)} • {member.department}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{member.email}</div>
                        </div>
                        <div className={`h-5 w-5 rounded border-2 ${selectedTeamMembers.includes(member.id) ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-white/10'}`} />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <HiUsers className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p>No team members found for the selected filters</p>
                      <button onClick={() => { setSelectedDepartment(''); setSelectedRole('') }} className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200 text-sm mt-2">Clear filters</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={handleCloseModals}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectsList
