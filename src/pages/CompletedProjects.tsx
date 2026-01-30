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
  Search,
  ChevronDown
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
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [completedProjects, setCompletedProjects] = useState<CompletedProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [movingProjectId, setMovingProjectId] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add('completed-projects-page')
    return () => {
      document.body.classList.remove('completed-projects-page')
    }
  }, [])

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
          let manager = team[0]
          if (manager && !manager.department) {
            const match = team.find((member: ProjectMember) => member.id === manager.id)
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
      
      const matchesPriority = priorityFilter === 'all' || 
                             project.priority === priorityFilter

      return matchesSearch && matchesYear && matchesDepartment && matchesManager && matchesPriority
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
  }, [completedProjects, searchTerm, sortBy, sortOrder, yearFilter, departmentFilter, managerFilter, priorityFilter])

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-black dark:via-black dark:to-black">
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <div className="flex items-center justify-between py-6 border-b border-gray-200/60 dark:border-white/10">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Completed Projects</h1>
            <button
              type="button"
              className="px-4 py-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-xs font-semibold tracking-[0.2em] text-gray-600 dark:text-gray-300"
            >
              ARCHIVE
            </button>
          </div>
        </div>

        <div className="py-6 space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Manage your finished projects portfolio.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="appearance-none pl-9 pr-10 py-2 text-sm rounded-full border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10"
                >
                  <option value="all">Date Range</option>
                  {getUniqueYears().map((year) => (
                    <option key={year} value={year.toString()}>{year}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="relative">
                <CheckCircle2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'low' | 'medium' | 'high' | 'critical')}
                  className="appearance-none pl-9 pr-10 py-2 text-sm rounded-full border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10"
                >
                  <option value="all">Status</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-black/60 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr,1fr,1fr,auto] gap-4 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects by name or manager..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                  />
                </div>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                >
                  <option value="all">All Departments</option>
                  {getUniqueDepartments().map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <select
                  value={managerFilter}
                  onChange={(e) => setManagerFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                >
                  <option value="all">All Managers</option>
                  {getUniqueManagers().map((manager) => (
                    <option key={manager.id} value={manager.id}>{manager.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'endDate' | 'name' | 'tasks')}
                    className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 text-gray-900 dark:text-white"
                  >
                    <option value="endDate">End Date</option>
                    <option value="name">Name</option>
                    <option value="tasks">Total Tasks</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 hover:bg-gray-50 dark:hover:bg-black/40"
                  >
                    {sortOrder === 'asc' ? (
                      <HiSortAscending className="h-4 w-4" />
                    ) : (
                      <HiSortDescending className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/60 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs tracking-[0.2em] text-gray-500 dark:text-gray-500">TOTAL COMPLETED</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">{completedProjects.length}</p>
                </div>
                <div className="h-12 w-12 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/60 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs tracking-[0.2em] text-gray-500 dark:text-gray-500">TEAM MEMBERS</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                    {new Set(completedProjects.flatMap(p => p.team.map(m => m.id))).size}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/60 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs tracking-[0.2em] text-gray-500 dark:text-gray-500">TOTAL PHASES</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-2">
                    {completedProjects.reduce((sum, p) => sum + p.totalPhases, 0)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 flex items-center justify-center">
                  <Target className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </div>
          </div>

          {filteredAndSortedProjects.length > 0 ? (
            <div className="space-y-6">
              {filteredAndSortedProjects.map((project, index) => (
                <div
                  key={project.id}
                  className="rounded-[28px] border border-gray-200 dark:border-white/10 bg-white dark:bg-black/60 p-6 shadow-sm animate-slide-up"
                  style={{ animationDelay: `${0.2 + index * 0.05}s` }}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{project.title}</h3>
                      <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest ${
                        project.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300' :
                        project.priority === 'medium' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' :
                        project.priority === 'low' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
                        'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                      }`}>
                        {project.priority.toUpperCase()} PRIORITY
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDuration(project.startDate, project.endDate)} duration</span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Completed {new Date(project.endDate).toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 px-4 py-3 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gray-800 text-white flex items-center justify-center text-sm font-semibold">
                      {project.manager.avatar}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-500">Manager</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{project.manager.name}</p>
                    </div>
                    <div className="ml-auto h-2.5 w-2.5 rounded-full bg-emerald-400"></div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/60 flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs tracking-[0.2em] text-gray-500 dark:text-gray-500">MEMBERS</p>
                          <p className="text-xl font-semibold text-gray-900 dark:text-white">{project.uniqueAssignees}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/60 flex items-center justify-center">
                          <Target className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-xs tracking-[0.2em] text-gray-500 dark:text-gray-500">PHASES</p>
                          <p className="text-xl font-semibold text-gray-900 dark:text-white">{project.totalPhases}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/60 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-xs tracking-[0.2em] text-gray-500 dark:text-gray-500">TASKS</p>
                          <p className="text-xl font-semibold text-gray-900 dark:text-white">{project.completedTasks}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gray-200 dark:border-white/10 pt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => moveToActiveProjects(project.id)}
                      disabled={movingProjectId === project.id}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      {movingProjectId === project.id ? 'Moving...' : 'Move to Active'}
                    </button>
                    <Link
                      to={`/completed-projects/${project.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white py-3 font-semibold hover:bg-gray-200 dark:hover:bg-white/15"
                    >
                      <HiEye className="h-4 w-4" />
                      View Project Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-black/50 rounded-full flex items-center justify-center mb-4">
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

          {filteredAndSortedProjects.length > 0 && (
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredAndSortedProjects.length} of {completedProjects.length} completed projects
            </div>
          )}
        </div>
      </div>
    </div>
  )

}

export default CompletedProjects
