import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  HiSortAscending, 
  HiSortDescending,
  HiEye
} from 'react-icons/hi'
import { 
  Calendar, 
  Users, 
  Target, 
  CheckCircle2, 
  ArrowUpDown,
  Filter,
  Search
} from 'lucide-react'
import { getProjects } from '../services/projectsAPI'
import { apiGet, apiJson } from '../services/api'

interface ProjectMember {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
  department: string
}

interface CompletedProject {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  completedAt: string
  status: 'completed'
  progress: 100
  priority: 'low' | 'medium' | 'high' | 'critical'
  team: ProjectMember[]
  phases: {
    id: string
    title: string
    status: 'completed'
    tasks: {
      id: string
      title: string
      status: 'completed'
      assignee: ProjectMember
    }[]
  }[]
  manager: ProjectMember
  department: string
  totalTasks: number
  completedTasks: number
  totalPhases: number
  uniqueAssignees: number
  duration: number
}

const CompletedProjects: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'endDate' | 'name' | 'tasks'>('endDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [managerFilter, setManagerFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [completedProjects, setCompletedProjects] = useState<CompletedProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [movingProjectId, setMovingProjectId] = useState<string | null>(null)

  const buildAvatar = (name: string) => {
    const initials = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    return initials || 'U'
  }

  const mapMember = (user: any, roleOverride?: string): ProjectMember => {
    const name = String(user?.name || 'Unknown')
    return {
      id: String(user?.id || ''),
      name,
      email: String(user?.email || ''),
      role: String(roleOverride || user?.role?.name || user?.role || 'Member'),
      department: String(user?.department?.name || user?.department || ''),
      avatar: buildAvatar(name),
    }
  }

  const deriveDateRange = (phases: any[]) => {
    let minStart = Number.POSITIVE_INFINITY
    let maxEnd = Number.NEGATIVE_INFINITY
    phases.forEach(phase => {
      const startTs = phase?.startDate ? Date.parse(phase.startDate) : NaN
      const endTs = phase?.endDate ? Date.parse(phase.endDate) : NaN
      if (!Number.isNaN(startTs)) minStart = Math.min(minStart, startTs)
      if (!Number.isNaN(endTs)) maxEnd = Math.max(maxEnd, endTs)
    })
    return {
      start: Number.isFinite(minStart) ? new Date(minStart).toISOString() : '',
      end: Number.isFinite(maxEnd) ? new Date(maxEnd).toISOString() : '',
    }
  }

  const pickDate = (...values: Array<string | null | undefined>) => {
    for (const val of values) {
      if (!val) continue
      const ts = Date.parse(val)
      if (!Number.isNaN(ts)) return new Date(ts).toISOString()
    }
    return new Date().toISOString()
  }

  const resolveAssignee = (task: any, team: ProjectMember[]) => {
    const assignees = Array.isArray(task?.assignees) ? task.assignees : []
    const first = assignees[0]?.user || assignees[0]
    if (first) return mapMember(first)
    if (team[0]) return team[0]
    return { id: 'unknown', name: 'Unassigned', email: '', role: '', department: '', avatar: 'U' }
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const list = await getProjects()
        const completedList = (list || []).filter((p: any) => String(p?.status || '').toUpperCase() === 'COMPLETED')
        const details = await Promise.all(
          completedList.map((p: any) => apiGet(`/projects/${p.id}`).catch(() => null))
        )
        const mapped = details.filter(Boolean).map((detail: any) => {
          const memberships = Array.isArray(detail?.memberships) ? detail.memberships : []
          const team = memberships
            .map((m: any) => mapMember(m?.user, m?.role))
            .filter((m: ProjectMember) => m.id)
          const phases = Array.isArray(detail?.phases) ? detail.phases : []
          const tasks = phases.flatMap((p: any) => Array.isArray(p?.tasks) ? p.tasks : [])
          const completedTasks = tasks.filter((t: any) => String(t?.status || '').toUpperCase() === 'COMPLETED').length
          const totalTasks = tasks.length
          const assigneeIds = new Set<string>()
          tasks.forEach((task: any) => {
            const assignees = Array.isArray(task?.assignees) ? task.assignees : []
            assignees.forEach((a: any) => {
              const user = a?.user || a
              if (user?.id) assigneeIds.add(String(user.id))
            })
          })
          const range = deriveDateRange(phases)
          let manager = detail?.owner ? mapMember(detail.owner) : team[0]
          if (manager && !manager.department) {
            const match = team.find(m => m.id === manager.id)
            if (match?.department) manager = { ...manager, department: match.department }
          }
          if (!manager) {
            manager = { id: 'unknown', name: 'Unknown', email: '', role: 'Manager', department: '', avatar: 'U' }
          }
          const startDate = pickDate(detail?.startDate, range.start, detail?.createdAt)
          const endDate = pickDate(detail?.endDate, range.end, detail?.updatedAt)

          return {
            id: String(detail?.id || ''),
            title: String(detail?.title || ''),
            description: String(detail?.description || ''),
            startDate,
            endDate,
            completedAt: endDate,
            status: 'completed',
            progress: 100,
            priority: 'medium',
            team,
            phases: phases.map((phase: any) => ({
              id: String(phase?.id || ''),
              title: String(phase?.name || ''),
              status: 'completed',
              tasks: (Array.isArray(phase?.tasks) ? phase.tasks : []).map((task: any) => ({
                id: String(task?.id || ''),
                title: String(task?.title || ''),
                status: 'completed',
                assignee: resolveAssignee(task, team),
              })),
            })),
            manager,
            department: manager.department || '',
            totalTasks,
            completedTasks,
            totalPhases: phases.length,
            uniqueAssignees: assigneeIds.size || team.length,
            duration: 0,
          } as CompletedProject
        })
        if (active) setCompletedProjects(mapped)
      } catch (e) {
        if (active) setLoadError('Failed to load completed projects.')
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const moveToActiveProjects = async (projectId: string) => {
    if (!projectId) return
    if (!confirm('Move this project back to active projects?')) return
    setMovingProjectId(projectId)
    try {
      await apiJson(`/projects/${projectId}`, 'PATCH', { status: 'IN_PROGRESS' })
      setCompletedProjects(prev => prev.filter(p => p.id !== projectId))
    } catch (e: any) {
      console.error('Failed to move project to active', e)
      alert(e?.message || 'Failed to move project to active')
    } finally {
      setMovingProjectId(null)
    }
  }

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = completedProjects.filter(project => {
      const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.manager.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesYear = yearFilter === 'all' || 
                         new Date(project.endDate).getFullYear().toString() === yearFilter
      
      const matchesDepartment = departmentFilter === 'all' || 
                               project.department === departmentFilter
      
      const matchesManager = managerFilter === 'all' || 
                            project.manager.id === managerFilter

      return matchesSearch && matchesYear && matchesDepartment && matchesManager
    })

    return filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'endDate':
          comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
          break
        case 'name':
          comparison = a.title.localeCompare(b.title)
          break
        case 'tasks':
          comparison = a.totalTasks - b.totalTasks
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [completedProjects, searchTerm, sortBy, sortOrder, yearFilter, departmentFilter, managerFilter])

  const getUniqueYears = () => {
    const years = [...new Set(completedProjects.map(p => new Date(p.endDate).getFullYear()))]
    return years.sort((a, b) => b - a)
  }

  const getUniqueDepartments = () => {
    const departments = [...new Set(completedProjects.map(p => p.department))]
    return departments.sort()
  }

  const getUniqueManagers = () => {
    const managerMap = new Map<string, ProjectMember>()
    completedProjects.forEach(project => {
      const mgr = project.manager
      if (mgr?.id && !managerMap.has(mgr.id)) managerMap.set(mgr.id, mgr)
    })
    return Array.from(managerMap.values())
  }

  const formatDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 30) {
      return `${diffDays} days`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} month${months > 1 ? 's' : ''}`
    } else {
      const years = Math.floor(diffDays / 365)
      return `${years} year${years > 1 ? 's' : ''}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Completed Projects</h1>
            <Link
              to="/projects"
              className="btn-secondary flex items-center space-x-2"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span>Active Projects</span>
            </Link>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            View details and history of all finished projects
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects by name or manager..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'endDate' | 'name' | 'tasks')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="endDate">End Date</option>
                <option value="name">Name</option>
                <option value="tasks">Total Tasks</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {sortOrder === 'asc' ? (
                  <HiSortAscending className="h-4 w-4" />
                ) : (
                  <HiSortDescending className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Completion Year
                  </label>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">All Years</option>
                    {getUniqueYears().map(year => (
                      <option key={year} value={year.toString()}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department
                  </label>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">All Departments</option>
                    {getUniqueDepartments().map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Manager
                  </label>
                  <select
                    value={managerFilter}
                    onChange={(e) => setManagerFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">All Managers</option>
                    {getUniqueManagers().map(manager => (
                      <option key={manager.id} value={manager.id}>{manager.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedProjects.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Completed</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Set(completedProjects.flatMap(p => p.team.map(m => m.id))).size}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Team Members</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {completedProjects.reduce((sum, p) => sum + p.totalPhases, 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Phases</p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      {filteredAndSortedProjects.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAndSortedProjects.map((project, index) => (
            <div
              key={project.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200 animate-slide-up group"
              style={{ animationDelay: `${0.3 + index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {project.description}
                  </p>
                </div>
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDuration(project.startDate, project.endDate)}</span>
                  <span>•</span>
                  <span>{new Date(project.endDate).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{project.uniqueAssignees} members</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target className="h-4 w-4" />
                    <span>{project.totalPhases} phases</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{project.completedTasks} tasks</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Manager:</span>
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                      {project.manager.avatar}
                    </div>
                    <span className="text-gray-900 dark:text-white">{project.manager.name}</span>
                  </div>
                </div>
              </div>

              {/* Team Avatars */}
              <div className="flex items-center gap-2 mb-4">
                {project.team.slice(0, 4).map((member, idx) => (
                  <div 
                    key={idx}
                    className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400"
                    style={{ marginLeft: idx > 0 ? '-8px' : '0' }}
                  >
                    {member.avatar}
                  </div>
                ))}
                {project.team.length > 4 && (
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-400" style={{ marginLeft: '-8px' }}>
                    +{project.team.length - 4}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    project.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    project.priority === 'low' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                  }`}>
                    {project.priority}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    {project.department}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => moveToActiveProjects(project.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                    disabled={movingProjectId === project.id}
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span>{movingProjectId === project.id ? 'Moving...' : 'Move to Active'}</span>
                  </button>
                  <Link
                    to={`/completed-projects/${project.id}`}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <HiEye className="h-4 w-4" />
                    <span>View Project</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No completed projects found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {isLoading
              ? 'Loading completed projects...'
              : loadError
                ? loadError
                : (searchTerm || yearFilter !== 'all' || departmentFilter !== 'all' || managerFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Mark projects as completed from the Active Projects view to see them here.')
            }
          </p>
          <Link
            to="/projects"
            className="btn-primary"
          >
            View Active Projects
          </Link>
        </div>
      )}

      {/* Results Summary */}
      {filteredAndSortedProjects.length > 0 && (
        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredAndSortedProjects.length} of {completedProjects.length} completed projects
        </div>
      )}
    </div>
  )
}

export default CompletedProjects
