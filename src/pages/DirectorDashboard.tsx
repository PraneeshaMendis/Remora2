import React, { useState, useEffect } from 'react'
import { KPI, ActivityItem, Project, TimeLog } from '../types/index.ts'

const DirectorDashboard: React.FC = () => {
  // State for time tracking data
  const [projects, setProjects] = useState<Project[]>([])
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load data from data aggregator
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get all projects from the data aggregator
        const allProjects = [
          {
            id: '1',
            name: 'Mobile App Redesign',
            description: 'Complete redesign of the mobile application with modern UI/UX',
            owner: 'Sarah Johnson',
            status: 'in-progress' as const,
            progress: 75,
            startDate: '2024-01-01',
            dueDate: '2024-02-15',
            team: ['1', '2', '3'],
            tags: ['Mobile', 'UI/UX', 'React Native'],
            priority: 'high' as const,
            phases: [],
            tasks: [],
            members: [],
            allocatedHours: 200,
            loggedHours: 150,
            remainingHours: 50
          },
          {
            id: '2',
            name: 'Backend API Development',
            description: 'RESTful API development for the new platform',
            owner: 'Mike Chen',
            status: 'in-progress' as const,
            progress: 60,
            startDate: '2024-01-05',
            dueDate: '2024-02-20',
            team: ['2', '4'],
            tags: ['Backend', 'API', 'Node.js'],
            priority: 'medium' as const,
            phases: [],
            tasks: [],
            members: [],
            allocatedHours: 150,
            loggedHours: 90,
            remainingHours: 60
          },
          {
            id: '3',
            name: 'Design System',
            description: 'Comprehensive design system for consistent UI components',
            owner: 'Alex Rodriguez',
            status: 'in-review' as const,
            progress: 90,
            startDate: '2023-12-15',
            dueDate: '2024-01-30',
            team: ['3', '1'],
            tags: ['Design', 'Components', 'Figma'],
            priority: 'high' as const,
            phases: [],
            tasks: [],
            members: [],
            allocatedHours: 120,
            loggedHours: 110,
            remainingHours: 10
          },
          {
            id: '4',
            name: 'Database Migration',
            description: 'Migration from legacy database to new architecture',
            owner: 'David Kim',
            status: 'completed' as const,
            progress: 100,
            startDate: '2023-11-01',
            dueDate: '2023-12-31',
            team: ['4', '2'],
            tags: ['Database', 'Migration', 'PostgreSQL'],
            priority: 'medium' as const,
            phases: [],
            tasks: [],
            members: [],
            allocatedHours: 100,
            loggedHours: 95,
            remainingHours: 5
          },
          {
            id: '5',
            name: 'User Authentication',
            description: 'Implement secure user authentication and authorization',
            owner: 'Sarah Johnson',
            status: 'blocked' as const,
            progress: 20,
            startDate: '2024-01-10',
            dueDate: '2024-02-05',
            team: ['1', '2'],
            tags: ['Security', 'Auth', 'JWT'],
            priority: 'critical' as const,
            phases: [],
            tasks: [],
            members: [],
            allocatedHours: 80,
            loggedHours: 15,
            remainingHours: 65
          }
        ]

        // Mock time logs data
        const mockTimeLogs: TimeLog[] = [
          {
            id: '1',
            userId: '1',
            userName: 'Sarah Johnson',
            projectId: '1',
            taskId: 'task-1',
            phaseId: 'phase-1',
            hours: 8,
            description: 'UI/UX design work',
            loggedAt: '2024-01-15T09:00:00Z',
            createdAt: '2024-01-15T09:00:00Z'
          },
          {
            id: '2',
            userId: '1',
            userName: 'Sarah Johnson',
            projectId: '1',
            taskId: 'task-2',
            phaseId: 'phase-1',
            hours: 6,
            description: 'Wireframe creation',
            loggedAt: '2024-01-16T10:00:00Z',
            createdAt: '2024-01-16T10:00:00Z'
          },
          {
            id: '3',
            userId: '2',
            userName: 'Mike Chen',
            projectId: '2',
            taskId: 'task-3',
            phaseId: 'phase-2',
            hours: 7,
            description: 'API endpoint development',
            loggedAt: '2024-01-17T08:30:00Z',
            createdAt: '2024-01-17T08:30:00Z'
          },
          {
            id: '4',
            userId: '3',
            userName: 'Alex Rodriguez',
            projectId: '3',
            taskId: 'task-4',
            phaseId: 'phase-3',
            hours: 9,
            description: 'Component library development',
            loggedAt: '2024-01-18T09:15:00Z',
            createdAt: '2024-01-18T09:15:00Z'
          },
          {
            id: '5',
            userId: '4',
            userName: 'David Kim',
            projectId: '4',
            taskId: 'task-5',
            phaseId: 'phase-4',
            hours: 8,
            description: 'Database schema migration',
            loggedAt: '2024-01-19T10:00:00Z',
            createdAt: '2024-01-19T10:00:00Z'
          }
        ]

        // Mock team members
        const mockTeamMembers = [
          { id: '1', name: 'Sarah Johnson', email: 'sarah@company.com' },
          { id: '2', name: 'Mike Chen', email: 'mike@company.com' },
          { id: '3', name: 'Alex Rodriguez', email: 'alex@company.com' },
          { id: '4', name: 'David Kim', email: 'david@company.com' }
        ]

        setProjects(allProjects)
        setTimeLogs(mockTimeLogs)
        setTeamMembers(mockTeamMembers)
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading data:', error)
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Mock data
  const kpis: KPI[] = [
    { label: 'Active Projects', value: projects.filter(p => p.status === 'in-progress').length, trend: 'up', change: 2, color: 'blue' },
    { label: 'Tasks in Progress', value: 48, trend: 'down', change: -5, color: 'green' },
    { label: 'Overdue Tasks', value: 3, trend: 'down', change: -2, color: 'red' },
    { label: 'On-Track %', value: 87, trend: 'up', change: 3, color: 'purple' }
  ]

  const recentActivity: ActivityItem[] = [
    {
      id: '1',
      type: 'task_completed',
      title: 'Task completed',
      description: 'User completed "Design system implementation"',
      timestamp: '2 hours ago',
      user: 'Sarah Johnson',
      projectId: 'proj-1',
      taskId: 'task-1'
    },
    {
      id: '2',
      type: 'project_updated',
      title: 'Project updated',
      description: 'Project "Mobile App Redesign" status changed to In Review',
      timestamp: '4 hours ago',
      user: 'Mike Chen',
      projectId: 'proj-2'
    },
    {
      id: '3',
      type: 'task_created',
      title: 'New task created',
      description: 'Task "API Documentation" added to project',
      timestamp: '6 hours ago',
      user: 'Alex Rodriguez',
      projectId: 'proj-3',
      taskId: 'task-3'
    }
  ]

  const upcomingDeadlines = [
    { task: 'User Authentication Flow', dueDate: '2024-01-15', project: 'Mobile App Redesign' },
    { task: 'Database Schema Design', dueDate: '2024-01-16', project: 'Backend API' },
    { task: 'UI Component Library', dueDate: '2024-01-18', project: 'Design System' }
  ]

  // State for project detail modal
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)


  // Use all projects instead of just recent ones
  const displayProjects = projects

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress': return 'badge-info'
      case 'in-review': return 'badge-warning'
      case 'completed': return 'badge-success'
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  const cardBase = 'rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/60 dark:bg-gradient-to-b dark:from-white/[0.06] dark:to-white/[0.02] shadow-[0_20px_60px_rgba(0,0,0,0.45)]'
  const kpiIconStyles = [
    { icon: 'layers', tone: 'text-sky-400', ring: 'bg-sky-500/15 border-sky-500/30' },
    { icon: 'refresh', tone: 'text-orange-400', ring: 'bg-orange-500/15 border-orange-500/30' },
    { icon: 'alert', tone: 'text-rose-400', ring: 'bg-rose-500/15 border-rose-500/30' },
    { icon: 'pulse', tone: 'text-emerald-400', ring: 'bg-emerald-500/15 border-emerald-500/30' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Director Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Executive overview of project performance and team productivity
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <div key={index} className={`${cardBase} p-6`}>
            <div className="flex items-start justify-between">
              <div className={`h-12 w-12 rounded-2xl border ${kpiIconStyles[index]?.ring || 'border-gray-200 dark:border-white/10'} flex items-center justify-center`}>
                <svg className={`h-6 w-6 ${kpiIconStyles[index]?.tone || 'text-white'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  {kpiIconStyles[index]?.icon === 'layers' && (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4-8 4-8-4 8-4Zm0 8l8 4-8 4-8-4 8-4Z" />
                  )}
                  {kpiIconStyles[index]?.icon === 'refresh' && (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 0 1 13.7-5.7M20 12a8 8 0 0 1-13.7 5.7M4 7v4h4M20 17v-4h-4" />
                  )}
                  {kpiIconStyles[index]?.icon === 'alert' && (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5m0 4h.01M5.4 19h13.2a1 1 0 0 0 .9-1.4l-6.6-12a1 1 0 0 0-1.8 0l-6.6 12a1 1 0 0 0 .9 1.4Z" />
                  )}
                  {kpiIconStyles[index]?.icon === 'pulse' && (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2.5-5 4 10 2.5-5H21" />
                  )}
                </svg>
              </div>
              {kpi.trend && (
                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  kpi.trend === 'up' ? 'bg-emerald-500/15 text-emerald-400' :
                  kpi.trend === 'down' ? 'bg-rose-500/15 text-rose-400' :
                  'bg-white/10 text-gray-300'
                }`}>
                  {kpi.trend === 'up' ? '+' : ''}{kpi.change ? Math.abs(kpi.change) : 0}%
                </div>
              )}
            </div>
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.label}</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Chart */}
        <div className={`${cardBase} p-6`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide text-sm">
            Project Status Distribution
          </h3>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <div
              className="relative h-40 w-40 rounded-full"
              style={{ background: 'conic-gradient(#3b82f6 0 60%, #f97316 60% 85%, #22c55e 85% 100%)' }}
            >
              <div className="absolute inset-4 rounded-full bg-white dark:bg-black/80 border border-gray-200 dark:border-white/10 flex flex-col items-center justify-center">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">5</div>
                <div className="text-xs uppercase tracking-widest text-gray-400">Total</div>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-gray-400">In Progress</span>
                <span className="ml-auto text-gray-900 dark:text-white font-semibold">60%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-orange-500" />
                <span className="text-gray-400">In Review</span>
                <span className="ml-auto text-gray-900 dark:text-white font-semibold">25%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-gray-400">Completed</span>
                <span className="ml-auto text-gray-900 dark:text-white font-semibold">15%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Over Time Chart */}
        <div className={`${cardBase} p-6`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Progress Over Time</h3>
          <div className="h-32 flex items-end gap-2">
            {[20, 35, 45, 60, 75, 80, 85].map((height, index) => (
              <div key={index} className="flex-1 rounded-t-2xl bg-gradient-to-t from-blue-600 to-sky-400/70" style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
            Last 7 days
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className={`${cardBase} p-6`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">All Projects</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayProjects.map((project) => (
            <div 
              key={project.id} 
              className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 p-5 hover:border-gray-300 dark:hover:border-white/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition duration-200 cursor-pointer"
              onClick={() => {
                setSelectedProject(project)
                setIsProjectModalOpen(true)
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{project.name}</h4>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/40 ${getPriorityColor(project.priority)}`}>
                  {project.priority.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Owner: {project.owner}</p>
              
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Progress</span>
                  <span className="font-medium text-gray-900 dark:text-white">{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-black/40 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Time Tracking Information */}
              {project.allocatedHours > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Time Allocation</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {Math.round((project.loggedHours / project.allocatedHours) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-black/40 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        (project.loggedHours / project.allocatedHours) >= 1 ? 'bg-red-500' :
                        (project.loggedHours / project.allocatedHours) >= 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, (project.loggedHours / project.allocatedHours) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>Logged: {project.loggedHours}h</span>
                    <span>Allocated: {project.allocatedHours}h</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className={`badge ${getStatusColor(project.status)} px-3 py-1 rounded-full text-xs`}>
                  {project.status.replace('-', ' ').toUpperCase()}
                </span>
                <div className="flex -space-x-2">
                  {project.team.slice(0, 3).map((memberId, index) => {
                    const member = teamMembers.find(m => m.id === memberId)
                    return (
                      <div key={index} className="h-7 w-7 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-xs text-gray-700 dark:text-white border border-gray-200 dark:border-white/10">
                        {member ? member.name.charAt(0) : memberId.charAt(0)}
                      </div>
                    )
                  })}
                  {project.team.length > 3 && (
                    <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                      +{project.team.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Feed and Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <div className={`${cardBase} p-6`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Activity</h3>
          <div className="relative space-y-6">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200 dark:bg-white/10" />
            {recentActivity.map((activity, idx) => (
              <div key={activity.id} className="flex items-start gap-4">
                <div className={`h-10 w-10 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center ${
                  idx === 0 ? 'bg-emerald-500/15 text-emerald-400' :
                  idx === 1 ? 'bg-sky-500/15 text-sky-400' :
                  'bg-violet-500/15 text-violet-400'
                }`}>
                  <span className="text-sm font-semibold">{activity.title.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{activity.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className={`${cardBase} p-6`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Upcoming Deadlines</h3>
          <div className="space-y-4">
            {upcomingDeadlines.map((deadline, index) => (
              <div key={index} className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 p-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{deadline.task}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{deadline.project}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{deadline.dueDate}</p>
                  <p className="text-xs font-semibold text-rose-400">DUE</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project Detail Modal */}
      {isProjectModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-black/60 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedProject.name} - Team Performance
                </h2>
                <button
                  onClick={() => {
                    setIsProjectModalOpen(false)
                    setSelectedProject(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Project Overview */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedProject.allocatedHours}h
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Allocated</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedProject.loggedHours}h
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Logged</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Math.round((selectedProject.loggedHours / selectedProject.allocatedHours) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Utilization</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedProject.team.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Team Members</div>
                  </div>
                </div>
              </div>

              {/* Team Member Performance */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Team Member Performance
                </h3>
                <div className="space-y-4">
                  {selectedProject.team.map((memberId) => {
                    const member = teamMembers.find(m => m.id === memberId)
                    if (!member) return null

                    // Calculate member statistics
                    const memberTimeLogs = timeLogs.filter(log => 
                      log.userId === memberId && log.projectId === selectedProject.id
                    )
                    const totalLoggedHours = memberTimeLogs.reduce((sum, log) => sum + log.hours, 0)
                    
                    // Mock data for documents and comments (in real app, this would come from actual data)
                    const documentsShared = Math.floor(Math.random() * 5) + 1
                    const documentsReviewed = Math.floor(Math.random() * 3) + 1
                    const commentsAdded = Math.floor(Math.random() * 10) + 1

                    return (
                      <div key={memberId} className="border border-gray-200 dark:border-white/10 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">{member.name}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{member.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                              {totalLoggedHours}h
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Logged</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                                  {totalLoggedHours}h
                                </div>
                                <div className="text-xs text-blue-700 dark:text-blue-300">Time Logged</div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div>
                                <div className="text-lg font-semibold text-green-900 dark:text-green-100">
                                  {documentsShared}
                                </div>
                                <div className="text-xs text-green-700 dark:text-green-300">Documents Shared</div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <div>
                                <div className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                                  {commentsAdded}
                                </div>
                                <div className="text-xs text-purple-700 dark:text-purple-300">Comments Added</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                              <div>
                                <div className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                                  {documentsReviewed}
                                </div>
                                <div className="text-xs text-yellow-700 dark:text-yellow-300">Documents Reviewed</div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              <div>
                                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {Math.round((totalLoggedHours / selectedProject.allocatedHours) * 100)}%
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Project Contribution</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DirectorDashboard
