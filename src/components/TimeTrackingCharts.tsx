import React from 'react'
import { Project, TimeLog } from '../types/index.ts'

interface TimeTrackingData {
  projectId: string
  projectName: string
  allocatedHours: number
  loggedHours: number
  remainingHours: number
  teamMembers: string[]
  utilizationPercentage: number
}

interface EmployeeTimeData {
  employeeId: string
  employeeName: string
  totalAllocatedHours: number
  totalLoggedHours: number
  projects: Array<{
    projectId: string
    projectName: string
    allocatedHours: number
    loggedHours: number
  }>
}

interface TimeTrackingChartsProps {
  projects: Project[]
  timeLogs: TimeLog[]
  teamMembers: Array<{ id: string; name: string; email: string }>
}

const TimeTrackingCharts: React.FC<TimeTrackingChartsProps> = ({ 
  projects, 
  timeLogs, 
  teamMembers 
}) => {
  // Process data for charts
  const processTimeTrackingData = (): TimeTrackingData[] => {
    return projects.map(project => ({
      projectId: project.id,
      projectName: project.name,
      allocatedHours: project.allocatedHours || 0,
      loggedHours: project.loggedHours || 0,
      remainingHours: project.remainingHours || 0,
      teamMembers: project.team || [],
      utilizationPercentage: project.allocatedHours > 0 
        ? Math.round((project.loggedHours / project.allocatedHours) * 100) 
        : 0
    }))
  }

  const processEmployeeTimeData = (): EmployeeTimeData[] => {
    return teamMembers.map(member => {
      const memberProjects = projects.filter(project => 
        project.team.includes(member.id)
      )
      
      const totalAllocatedHours = memberProjects.reduce(
        (sum, project) => sum + (project.allocatedHours || 0), 0
      )
      
      const memberTimeLogs = timeLogs.filter(log => log.userId === member.id)
      const totalLoggedHours = memberTimeLogs.reduce(
        (sum, log) => sum + log.hours, 0
      )
      
      const memberProjectData = memberProjects.map(project => ({
        projectId: project.id,
        projectName: project.name,
        allocatedHours: project.allocatedHours || 0,
        loggedHours: project.loggedHours || 0
      }))
      
      return {
        employeeId: member.id,
        employeeName: member.name,
        totalAllocatedHours,
        totalLoggedHours,
        projects: memberProjectData
      }
    })
  }

  const timeTrackingData = processTimeTrackingData()
  const employeeTimeData = processEmployeeTimeData()

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600 dark:text-red-400'
    if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getUtilizationBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-6">
      {/* Project Time Allocation Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Project Time Allocation
        </h3>
        <div className="space-y-4">
          {timeTrackingData.map((project) => (
            <div key={project.projectId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {project.projectName}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>Allocated: {project.allocatedHours}h</span>
                    <span>Logged: {project.loggedHours}h</span>
                    <span>Remaining: {project.remainingHours}h</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-semibold ${getUtilizationColor(project.utilizationPercentage)}`}>
                    {project.utilizationPercentage}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Utilization
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${getUtilizationBarColor(project.utilizationPercentage)}`}
                  style={{ 
                    width: `${Math.min(100, project.utilizationPercentage)}%` 
                  }}
                ></div>
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Team: {project.teamMembers.length} members</span>
                <span>•</span>
                <span>
                  {project.utilizationPercentage >= 100 ? 'Over allocated' : 
                   project.utilizationPercentage >= 80 ? 'Near capacity' : 
                   'Under utilized'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Time Distribution Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Employee Time Distribution
        </h3>
        <div className="space-y-4">
          {employeeTimeData.map((employee) => (
            <div key={employee.employeeId} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {employee.employeeName}
                  </h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {employee.projects.length} projects • {employee.totalLoggedHours}h logged
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {employee.totalAllocatedHours}h
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Allocated
                  </div>
                </div>
              </div>
              
              {/* Project breakdown */}
              <div className="space-y-2">
                {employee.projects.map((project) => {
                  const projectUtilization = project.allocatedHours > 0 
                    ? Math.round((project.loggedHours / project.allocatedHours) * 100) 
                    : 0
                  
                  return (
                    <div key={project.projectId} className="flex items-center space-x-3">
                      <div className="w-24 text-xs text-gray-600 dark:text-gray-400 truncate">
                        {project.projectName}
                      </div>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getUtilizationBarColor(projectUtilization)}`}
                          style={{ 
                            width: `${Math.min(100, projectUtilization)}%` 
                          }}
                        ></div>
                      </div>
                      <div className="w-16 text-xs text-gray-600 dark:text-gray-400 text-right">
                        {project.loggedHours}h / {project.allocatedHours}h
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time Efficiency Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(
                timeTrackingData.reduce((sum, p) => sum + p.utilizationPercentage, 0) / 
                timeTrackingData.length || 0
              )}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Average Utilization
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {timeTrackingData.filter(p => p.utilizationPercentage >= 100).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Over-allocated Projects
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {timeTrackingData.reduce((sum, p) => sum + p.loggedHours, 0)}h
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Hours Logged
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TimeTrackingCharts
