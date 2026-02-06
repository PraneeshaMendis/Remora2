import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HiSortAscending, HiSortDescending, HiEye } from 'react-icons/hi'
import {
  Calendar,
  Users,
  Target,
  CheckCircle2,
  ArrowUpDown,
  Filter,
  Search,
  ChevronDown,
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

interface DumpedProject {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  completedAt: string
  status: 'cancelled'
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

const ProjectDump: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'endDate' | 'name' | 'tasks'>('endDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [managerFilter, setManagerFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [dumpedProjects, setDumpedProjects] = useState<DumpedProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [movingProjectId, setMovingProjectId] = useState<string | null>(null)

  const cardBase = 'rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-black/60 shadow-soft'

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

  const formatRole = (role?: string) => {
    if (!role) return 'Member'
    return role
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
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
        const dumpedList = (list || []).filter((p: any) => String(p?.status || '').toUpperCase() === 'CANCELLED')
        const details = await Promise.all(
          dumpedList.map((p: any) => apiGet(`/projects/${p.id}`).catch(() => null))
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
            status: 'cancelled',
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
          } as DumpedProject
        })
        if (active) setDumpedProjects(mapped)
      } catch (e) {
        if (active) setLoadError('Failed to load dumped projects.')
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
      setDumpedProjects(prev => prev.filter(p => p.id !== projectId))
    } catch (e: any) {
      console.error('Failed to move project to active', e)
      alert(e?.message || 'Failed to move project to active')
    } finally {
      setMovingProjectId(null)
    }
  }

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = dumpedProjects.filter(project => {
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
  }, [dumpedProjects, searchTerm, sortBy, sortOrder, yearFilter, departmentFilter, managerFilter, priorityFilter])

  const getUniqueYears = () => {
    const years = [...new Set(dumpedProjects.map(p => new Date(p.endDate).getFullYear()))]
    return years.sort((a, b) => b - a)
  }

  const getUniqueDepartments = () => {
    const departments = [...new Set(dumpedProjects.map(p => p.department))]
    return departments.sort()
  }

  const getUniqueManagers = () => {
    const managerMap = new Map<string, ProjectMember>()
    dumpedProjects.forEach(project => {
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
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Project Dump</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Projects moved out of the active portfolio.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-black/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
          Dump
        </span>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-black/50 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-black/60"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="appearance-none pl-9 pr-10 py-2 text-sm rounded-full border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-black/50 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-black/60"
            >
              <option value="all">Date Range</option>
              {getUniqueYears().map((year) => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
          </div>
          <div className="relative">
            <CheckCircle2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'low' | 'medium' | 'high' | 'critical')}
              className="appearance-none pl-9 pr-10 py-2 text-sm rounded-full border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-black/50 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-black/60"
            >
              <option value="all">Status</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="card dark:bg-black/60 dark:border-white/10 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr,1fr,1fr,auto] gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects by name or manager..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white"
            >
              <option value="all">All Departments</option>
              {getUniqueDepartments().map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white"
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
                className="px-3 py-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white"
              >
                <option value="endDate">End Date</option>
                <option value="name">Name</option>
                <option value="tasks">Total Tasks</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-black/50 hover:bg-slate-50 dark:hover:bg-black/40"
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
        <div className={`${cardBase} p-5`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Total Dumped</p>
              <p className="text-3xl font-semibold text-slate-900 dark:text-white mt-2">{dumpedProjects.length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-rose-500" />
            </div>
          </div>
        </div>

        <div className={`${cardBase} p-5`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Team Members</p>
              <p className="text-3xl font-semibold text-slate-900 dark:text-white mt-2">
                {new Set(dumpedProjects.flatMap(p => p.team.map(m => m.id))).size}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className={`${cardBase} p-5`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Total Phases</p>
              <p className="text-3xl font-semibold text-slate-900 dark:text-white mt-2">
                {dumpedProjects.reduce((sum, p) => sum + p.totalPhases, 0)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex items-center justify-center">
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
              className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-black/60 p-6 shadow-soft animate-slide-up"
              style={{ animationDelay: `${0.2 + index * 0.05}s` }}
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{project.title}</h3>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                    project.priority === 'high' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200' :
                    project.priority === 'medium' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200' :
                    project.priority === 'low' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200' :
                    'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200'
                  }`}>
                    {project.priority.toUpperCase()} PRIORITY
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDuration(project.startDate, project.endDate)} duration</span>
                  </div>
                  <span className="text-slate-400">•</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Dumped {new Date(project.endDate).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/80 dark:bg-black/40 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-3">Team Members</p>
                <div className="flex flex-wrap gap-4">
                  {project.team.map(member => (
                    <div key={member.id} className="flex items-center gap-3 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-black/60 px-3 py-2">
                      <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 border border-slate-200/70 flex items-center justify-center text-[11px] font-semibold dark:bg-white/10 dark:text-slate-100 dark:border-white/10">
                        {member.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{member.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatRole(member.role)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/80 dark:bg-black/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-black/60 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Members</p>
                      <p className="text-xl font-semibold text-slate-900 dark:text-white">{project.uniqueAssignees}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/80 dark:bg-black/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-black/60 flex items-center justify-center">
                      <Target className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Phases</p>
                      <p className="text-xl font-semibold text-slate-900 dark:text-white">{project.totalPhases}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/80 dark:bg-black/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-black/60 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Tasks</p>
                      <p className="text-xl font-semibold text-slate-900 dark:text-white">{project.completedTasks}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-200/70 dark:border-white/10 pt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => moveToActiveProjects(project.id)}
                  disabled={movingProjectId === project.id}
                  className="btn-primary flex-1"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {movingProjectId === project.id ? 'Moving...' : 'Move to Active'}
                </button>
                <Link
                  to={`/completed-projects/${project.id}`}
                  className="btn-secondary flex-1"
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
          <div className="mx-auto w-24 h-24 bg-slate-100 dark:bg-black/50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-12 w-12 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No dumped projects found
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {isLoading
              ? 'Loading dumped projects...'
              : loadError
                ? loadError
                : (searchTerm || yearFilter !== 'all' || departmentFilter !== 'all' || managerFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Use the Delete Project action to move projects here.')
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
        <div className="text-center text-sm text-slate-600 dark:text-slate-400">
          Showing {filteredAndSortedProjects.length} of {dumpedProjects.length} dumped projects
        </div>
      )}
    </div>
  )
}

export default ProjectDump
