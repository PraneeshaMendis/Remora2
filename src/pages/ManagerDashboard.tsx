import React from 'react'
import { KPI, ActivityItem } from '../types/index.ts'

const ManagerDashboard: React.FC = () => {
  // Mock data - Manager focused
  const kpis: KPI[] = [
    { label: 'Team Tasks', value: 24, trend: 'up', change: 3, color: 'blue' },
    { label: 'Completed This Week', value: 18, trend: 'up', change: 5, color: 'green' },
    { label: 'Blocked Tasks', value: 2, trend: 'down', change: -1, color: 'red' },
    { label: 'Team Efficiency', value: 92, trend: 'up', change: 4, color: 'purple' }
  ]

  const teamActivity: ActivityItem[] = [
    {
      id: '1',
      type: 'task_completed',
      title: 'Task completed',
      description: 'Sarah completed "User authentication setup"',
      timestamp: '1 hour ago',
      user: 'Sarah Johnson',
      projectId: 'proj-1',
      taskId: 'task-1'
    },
    {
      id: '2',
      type: 'task_created',
      title: 'New task assigned',
      description: 'Task "Database optimization" assigned to Mike',
      timestamp: '3 hours ago',
      user: 'Mike Chen',
      projectId: 'proj-2',
      taskId: 'task-2'
    },
    {
      id: '3',
      type: 'review_submitted',
      title: 'Review submitted',
      description: 'Alex submitted review for "API Documentation"',
      timestamp: '5 hours ago',
      user: 'Alex Rodriguez',
      projectId: 'proj-3',
      taskId: 'task-3'
    }
  ]

  const teamMembers = [
    { name: 'Sarah Johnson', role: 'Senior Developer', tasks: 8, completed: 6, avatar: 'SJ' },
    { name: 'Mike Chen', role: 'Backend Developer', tasks: 6, completed: 5, avatar: 'MC' },
    { name: 'Alex Rodriguez', role: 'Frontend Developer', tasks: 7, completed: 4, avatar: 'AR' },
    { name: 'David Kim', role: 'DevOps Engineer', tasks: 3, completed: 3, avatar: 'DK' }
  ]

  const teamProjects = [
    {
      id: '1',
      name: 'Mobile App Redesign',
      team: ['Sarah Johnson', 'Mike Chen'],
      progress: 75,
      status: 'in-progress',
      nextMilestone: 'User Testing',
      dueDate: '2024-01-20'
    },
    {
      id: '2',
      name: 'Backend API Development',
      team: ['Mike Chen', 'David Kim'],
      progress: 60,
      status: 'in-progress',
      nextMilestone: 'API Documentation',
      dueDate: '2024-01-25'
    },
    {
      id: '3',
      name: 'Design System',
      team: ['Alex Rodriguez', 'Sarah Johnson'],
      progress: 90,
      status: 'in-review',
      nextMilestone: 'Final Review',
      dueDate: '2024-01-18'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress': return 'badge-info'
      case 'in-review': return 'badge-warning'
      case 'completed': return 'badge-success'
      case 'blocked': return 'badge-danger'
      default: return 'badge-info'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manager Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Team performance overview and delivery tracking
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
              </div>
              {kpi.trend && (
                <div className={`flex items-center ${
                  kpi.trend === 'up' ? 'text-green-600 dark:text-green-400' : 
                  kpi.trend === 'down' ? 'text-red-600 dark:text-red-400' : 
                  'text-gray-600 dark:text-gray-400'
                }`}>
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {kpi.trend === 'up' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
                    )}
                  </svg>
                  {kpi.change && Math.abs(kpi.change)}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Team Performance and Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Performance */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team Performance</h3>
          <div className="space-y-4">
            {teamMembers.map((member, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                    {member.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{member.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {member.completed}/{member.tasks} tasks
                  </p>
                  <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-1">
                    <div 
                      className="bg-primary-600 h-2 rounded-full" 
                      style={{ width: `${(member.completed / member.tasks) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Projects */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team Projects</h3>
          <div className="space-y-4">
            {teamProjects.map((project) => (
              <div key={project.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{project.name}</h4>
                  <span className={`badge ${getStatusColor(project.status)}`}>
                    {project.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="font-medium text-gray-900 dark:text-white">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Next Milestone:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{project.nextMilestone}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Due Date:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{project.dueDate}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Team Members:</p>
                  <div className="flex flex-wrap gap-1">
                    {project.team.map((member, index) => (
                      <span key={index} className="text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                        {member}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Activity and Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team Activity</h3>
          <div className="space-y-4">
            {teamActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <span className="text-sm">👥</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workload Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Workload Distribution</h3>
          <div className="space-y-4">
            {teamMembers.map((member, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{member.tasks} tasks</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(member.tasks / Math.max(...teamMembers.map(m => m.tasks))) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManagerDashboard
