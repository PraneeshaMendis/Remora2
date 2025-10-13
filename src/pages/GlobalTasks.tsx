import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Task, Project } from '../types/index.ts'

const GlobalTasks: React.FC = () => {
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskProject, setNewTaskProject] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [isAddingTask, setIsAddingTask] = useState(false)

  // Mock data
  const projects: Project[] = [
    { id: '1', name: 'Mobile App Redesign', description: '', owner: '', status: 'in-progress', progress: 0, startDate: '', dueDate: '', team: [], tags: [], priority: 'high', phases: [], tasks: [], members: [], allocatedHours: 200, loggedHours: 45.5, remainingHours: 154.5 },
    { id: '2', name: 'Backend API Development', description: '', owner: '', status: 'in-progress', progress: 0, startDate: '', dueDate: '', team: [], tags: [], priority: 'medium', phases: [], tasks: [], members: [], allocatedHours: 150, loggedHours: 30.0, remainingHours: 120.0 },
    { id: '3', name: 'Design System', description: '', owner: '', status: 'in-review', progress: 0, startDate: '', dueDate: '', team: [], tags: [], priority: 'high', phases: [], tasks: [], members: [], allocatedHours: 120, loggedHours: 85.0, remainingHours: 35.0 }
  ]

  const tasks: Task[] = [
    {
      id: '1',
      title: 'User Research Analysis',
      description: 'Analyze user research data and create personas',
      status: 'done',
      priority: 'high',
      dueDate: '2024-01-10',
      projectId: '1',
      assignees: ['Sarah Johnson'],
      isDone: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-10',
      progress: 100
    },
    {
      id: '2',
      title: 'Wireframe Creation',
      description: 'Create low-fidelity wireframes for all screens',
      status: 'in-progress',
      priority: 'high',
      dueDate: '2024-01-25',
      projectId: '1',
      assignees: ['Alex Rodriguez'],
      isDone: false,
      createdAt: '2024-01-16',
      updatedAt: '2024-01-20',
      progress: 65
    },
    {
      id: '3',
      title: 'API Integration',
      description: 'Integrate with backend APIs',
      status: 'planning',
      priority: 'medium',
      dueDate: '2024-02-10',
      projectId: '2',
      assignees: ['Mike Chen'],
      isDone: false,
      createdAt: '2024-01-20',
      updatedAt: '2024-01-20',
      progress: 0
    },
    {
      id: '4',
      title: 'Component Library Setup',
      description: 'Set up the component library structure',
      status: 'in-progress',
      priority: 'high',
      dueDate: '2024-01-30',
      projectId: '3',
      assignees: ['Alex Rodriguez', 'Sarah Johnson'],
      isDone: false,
      createdAt: '2024-01-15',
      updatedAt: '2024-01-22',
      progress: 40
    },
    {
      id: '5',
      title: 'Database Schema Design',
      description: 'Design the database schema for the new system',
      status: 'blocked',
      priority: 'critical',
      dueDate: '2024-01-28',
      projectId: '2',
      assignees: ['Mike Chen', 'David Kim'],
      isDone: false,
      createdAt: '2024-01-18',
      updatedAt: '2024-01-25',
      progress: 20
    }
  ]

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !newTaskProject) return

    setIsAddingTask(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Adding task:', { title: newTaskTitle, project: newTaskProject, dueDate: newTaskDueDate })
      
      // Reset form
      setNewTaskTitle('')
      setNewTaskProject('')
      setNewTaskDueDate('')
    } catch (error) {
      console.error('Failed to add task:', error)
    } finally {
      setIsAddingTask(false)
    }
  }

  const handleToggleTask = async (taskId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('Toggling task:', taskId)
    } catch (error) {
      console.error('Failed to toggle task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('Deleting task:', taskId)
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    return project?.name || 'Unknown Project'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'badge-success'
      case 'in-progress': return 'badge-info'
      case 'planning': return 'badge-warning'
      case 'blocked': return 'badge-danger'
      default: return 'badge-info'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 dark:text-red-400'
      case 'high': return 'text-orange-600 dark:text-orange-400'
      case 'medium': return 'text-yellow-600 dark:text-yellow-400'
      case 'low': return 'text-green-600 dark:text-green-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const isOverdue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    return due < today
  }

  const isDueSoon = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 3 && diffDays >= 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Global Tasks</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage all tasks across projects in one place
        </p>
      </div>

      {/* Quick Add Toolbar */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Add Task</h3>
        <form onSubmit={handleAddTask} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="input-field"
              required
            />
            <select
              value={newTaskProject}
              onChange={(e) => setNewTaskProject(e.target.value)}
              className="input-field"
              required
            >
              <option value="">Select Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={newTaskDueDate}
              onChange={(e) => setNewTaskDueDate(e.target.value)}
              className="input-field"
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={isAddingTask}
                className="btn-primary flex-1"
              >
                {isAddingTask ? 'Adding...' : 'Add Task'}
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-secondary"
                title="Refresh tasks"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Tasks Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Done
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Assignees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tasks yet</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Add your first task using the form above.
                    </p>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={task.isDone}
                        onChange={() => handleToggleTask(task.id)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <Link
                          to={`/projects/${task.projectId}/tasks/${task.id}`}
                          className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                        >
                          {task.title}
                        </Link>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/projects/${task.projectId}`}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
                      >
                        {getProjectName(task.projectId)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm ${
                        isOverdue(task.dueDate) ? 'text-red-600 dark:text-red-400' :
                        isDueSoon(task.dueDate) ? 'text-orange-600 dark:text-orange-400' :
                        'text-gray-900 dark:text-white'
                      }`}>
                        {new Date(task.dueDate).toLocaleDateString()}
                        {isOverdue(task.dueDate) && ' (Overdue)'}
                        {isDueSoon(task.dueDate) && !isOverdue(task.dueDate) && ' (Due Soon)'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${getStatusColor(task.status)}`}>
                        {task.status.replace('-', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex -space-x-2">
                        {task.assignees.slice(0, 3).map((assignee, index) => (
                          <div key={index} className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-xs text-white border-2 border-white dark:border-gray-800">
                            {assignee.split(' ').map(n => n[0]).join('')}
                          </div>
                        ))}
                        {task.assignees.length > 3 && (
                          <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 border-2 border-white dark:border-gray-800">
                            +{task.assignees.length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default GlobalTasks
