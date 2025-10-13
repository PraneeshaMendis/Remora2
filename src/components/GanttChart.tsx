import React, { useState, useMemo, useRef } from 'react'
import { Edit3, Calendar, Users, Clock, CheckCircle2, AlertCircle, Play, Pause, ChevronDown, ChevronRight } from 'lucide-react'

interface Task {
  id: string
  name: string
  start: string
  end: string
  progress: number
  dependencies?: string
  custom_class?: string
  phaseId?: string
  assignees?: string[]
  status?: string
  description?: string
}

interface Phase {
  id: string
  name: string
  startDate: string
  endDate: string
  tasks: Task[]
}

interface GanttChartProps {
  phases: Phase[]
  onTaskClick: (task: Task) => void
  onPhaseClick: (phase: Phase) => void
  onTaskEdit: (task: Task) => void
  onPhaseEdit: (phase: Phase) => void
}

const GanttChart: React.FC<GanttChartProps> = ({
  phases,
  onTaskClick,
  onTaskEdit
}) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(phases.map(p => p.id)))
  const [hoveredItem, setHoveredItem] = useState<any>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily')
  const chartRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Generate timeline dates
  const { timelineData, timelineStart, timelineEnd, cellWidth } = useMemo(() => {
    const allDates = new Set<string>()
    
    phases.forEach(phase => {
      allDates.add(phase.startDate)
      allDates.add(phase.endDate)
      phase.tasks.forEach(task => {
        allDates.add(task.start)
        allDates.add(task.end)
      })
    })

    const sortedDates = Array.from(allDates).sort()
    const startDate = new Date(sortedDates[0])
    const endDate = new Date(sortedDates[sortedDates.length - 1])
    
    let dates = []
    let cellWidth = 24 // Default daily cell width
    
    if (viewMode === 'daily') {
      // Generate daily timeline
      const current = new Date(startDate)
      while (current <= endDate) {
        dates.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
    } else {
      // Generate weekly timeline
      const current = new Date(startDate)
      // Start from the beginning of the week
      const dayOfWeek = current.getDay()
      current.setDate(current.getDate() - dayOfWeek)
      
      while (current <= endDate) {
        dates.push(new Date(current))
        current.setDate(current.getDate() + 7)
      }
      cellWidth = 80 // Wider cells for weekly view
    }

    return { 
      timelineData: dates, 
      timelineStart: startDate, 
      timelineEnd: endDate,
      cellWidth
    }
  }, [phases, viewMode])

  // Calculate position and width for bars
  const calculateBarPosition = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (viewMode === 'daily') {
      const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24))
      const startOffset = Math.ceil((start.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24))
      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      
      const left = (startOffset / totalDays) * 100
      const width = (duration / totalDays) * 100
      
      return { left: `${left}%`, width: `${width}%` }
    } else {
      // Weekly view calculation
      const totalWeeks = timelineData.length
      const startWeek = timelineData.findIndex(date => {
        const weekStart = new Date(date)
        const weekEnd = new Date(date)
        weekEnd.setDate(weekEnd.getDate() + 6)
        return start >= weekStart && start <= weekEnd
      })
      
      const endWeek = timelineData.findIndex(date => {
        const weekStart = new Date(date)
        const weekEnd = new Date(date)
        weekEnd.setDate(weekEnd.getDate() + 6)
        return end >= weekStart && end <= weekEnd
      })
      
      const left = (startWeek / totalWeeks) * 100
      const width = ((endWeek - startWeek + 1) / totalWeeks) * 100
      
      return { left: `${left}%`, width: `${width}%` }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981'
      case 'in-progress':
        return '#3b82f6'
      case 'on-hold':
        return '#f59e0b'
      default:
        return '#6b7280'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'in-progress':
        return <Play className="h-4 w-4 text-blue-500" />
      case 'on-hold':
        return <Pause className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases)
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId)
    } else {
      newExpanded.add(phaseId)
    }
    setExpandedPhases(newExpanded)
  }

  const handleTaskSelect = (taskId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      const newSelected = new Set(selectedTasks)
      if (newSelected.has(taskId)) {
        newSelected.delete(taskId)
      } else {
        newSelected.add(taskId)
      }
      setSelectedTasks(newSelected)
    } else {
      setSelectedTasks(new Set([taskId]))
    }
  }

  const handleDragStart = (_task: any, event: React.MouseEvent) => {
    event.preventDefault()
  }

  const handleDragEnd = () => {
    // Handle drag end if needed
  }

  // Convert phases to flat task list for easier rendering
  const allTasks = useMemo(() => {
    const tasks: any[] = []
    phases.forEach(phase => {
      tasks.push({
        id: `phase-${phase.id}`,
        name: phase.name,
        start: phase.startDate,
        end: phase.endDate,
        progress: 0,
        type: 'summary',
        parent: 0,
        phaseId: phase.id,
        assignees: [],
        status: 'in-progress',
        description: `Phase: ${phase.name}`,
        open: expandedPhases.has(phase.id)
      })
      
      if (expandedPhases.has(phase.id)) {
        phase.tasks.forEach(task => {
          tasks.push({
            id: `task-${task.id}`,
            name: task.name,
            start: task.start,
            end: task.end,
            progress: task.progress,
            type: 'task',
            parent: `phase-${phase.id}`,
            phaseId: phase.id,
            assignees: task.assignees || [],
            status: task.status || 'not-started',
            description: task.description
          })
        })
      }
    })
    return tasks
  }, [phases, expandedPhases])

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Timeline</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Interactive Gantt chart - Click on phases or tasks to edit them</p>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-600">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'daily'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'weekly'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>
      </div>

      {/* Gantt Chart Container */}
      <div className="flex h-96">
        {/* Left Grid Panel */}
        <div ref={gridRef} className="w-80 border-r border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Tasks</h4>
          </div>
          <div className="space-y-0">
            {allTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center p-3 border-b border-gray-100 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors ${
                  selectedTasks.has(task.id) ? 'bg-blue-100 dark:bg-blue-800' : ''
                } ${task.type === 'summary' ? 'font-semibold' : 'pl-8'}`}
                onClick={(e) => {
                  if (task.type === 'summary') {
                    togglePhase(task.phaseId)
                  } else {
                    handleTaskSelect(task.id, e)
                    onTaskClick(task)
                  }
                }}
              >
                <div className="flex items-center space-x-2 flex-1">
                  {task.type === 'summary' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePhase(task.phaseId)
                      }}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      {expandedPhases.has(task.phaseId) ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  )}
                  <div className="flex-1">
                    <div className="text-sm text-gray-900 dark:text-white truncate">
                      {task.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(task.start).toLocaleDateString()} - {new Date(task.end).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {task.type === 'task' && getStatusIcon(task.status)}
                  {task.type === 'task' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onTaskEdit(task)
                      }}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100"
                    >
                      <Edit3 className="h-3 w-3 text-gray-500" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Chart Panel */}
        <div ref={chartRef} className="flex-1 overflow-auto">
          {/* Timeline Header */}
          <div className="sticky top-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
            <div className="flex" style={{ width: `${timelineData.length * cellWidth}px` }}>
              {timelineData.map((date, index) => (
                <div 
                  key={index} 
                  className="p-1 text-center border-r border-gray-200 dark:border-gray-600" 
                  style={{ minWidth: `${cellWidth}px`, width: `${cellWidth}px` }}
                >
                  {viewMode === 'daily' ? (
                    <>
                      <div className="text-xs font-semibold text-gray-900 dark:text-white">
                        {index % 7 === 0 ? date.toLocaleDateString('en-US', { month: 'short' }) : ''}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {date.getDate()}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-semibold text-gray-900 dark:text-white">
                        {date.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Week {Math.ceil((date.getDate()) / 7)}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {date.getFullYear()}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chart Area */}
          <div className="relative" style={{ height: 'calc(100% - 40px)', width: `${timelineData.length * cellWidth}px` }}>
            {allTasks.map((task, index) => {
              const position = calculateBarPosition(task.start, task.end)
              const isSelected = selectedTasks.has(task.id)
              
              return (
                <div
                  key={task.id}
                  className={`absolute h-8 cursor-pointer transition-all duration-200 ${
                    isSelected ? 'ring-2 ring-blue-500' : ''
                  }`}
                  style={{
                    left: position.left,
                    width: position.width,
                    top: `${index * 32}px`
                  }}
                  onMouseEnter={(e) => {
                    setHoveredItem({
                      type: task.type,
                      data: task
                    })
                    setTooltipPosition({ x: e.clientX, y: e.clientY })
                  }}
                  onMouseLeave={() => setHoveredItem(null)}
                  onMouseMove={(e) => setTooltipPosition({ x: e.clientX, y: e.clientY })}
                  onMouseDown={(e) => handleDragStart(task, e)}
                  onMouseUp={handleDragEnd}
                >
                  <div
                    className={`h-full rounded flex items-center justify-center text-white text-xs font-medium shadow-sm hover:shadow-md transition-all ${
                      task.type === 'summary' 
                        ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' 
                        : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}
                    style={{
                      backgroundColor: task.type === 'summary' ? '#6366f1' : getStatusColor(task.status)
                    }}
                  >
                    <div className="flex items-center space-x-1 px-2">
                      <span className="truncate">{task.name}</span>
                      {task.type === 'task' && (
                        <span className="text-xs opacity-75 bg-white bg-opacity-20 px-1 rounded">
                          {task.progress}%
                        </span>
                      )}
                    </div>
                    
                    {/* Progress bar for tasks */}
                    {task.type === 'task' && (
                      <div 
                        className="absolute inset-0 bg-white bg-opacity-20 rounded"
                        style={{ width: `${100 - task.progress}%`, right: 0 }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredItem && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-xs"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            pointerEvents: 'none'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {hoveredItem.data.name}
            </h3>
            <div className="flex items-center space-x-1">
              {hoveredItem.type === 'task' && getStatusIcon(hoveredItem.data.status)}
            </div>
          </div>
          
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(hoveredItem.data.start).toLocaleDateString()} - {new Date(hoveredItem.data.end).toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3" />
              <span>
                {Math.ceil((new Date(hoveredItem.data.end).getTime() - new Date(hoveredItem.data.start).getTime()) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
            
            {hoveredItem.type === 'task' && hoveredItem.data.assignees && hoveredItem.data.assignees.length > 0 && (
              <div className="flex items-center space-x-2">
                <Users className="h-3 w-3" />
                <span>{hoveredItem.data.assignees.join(', ')}</span>
              </div>
            )}
            
            {hoveredItem.type === 'task' && (
              <>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${hoveredItem.data.progress}%` }}
                  />
                </div>
                <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                  {hoveredItem.data.progress}% Complete
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default GanttChart
