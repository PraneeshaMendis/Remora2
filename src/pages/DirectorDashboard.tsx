import React, { useEffect, useMemo, useState } from 'react'
import { ActivityItem, Comment, KPI, Project, Task, TimeLog } from '../types/index.ts'
import { apiGet } from '../services/api.ts'
import { getProjects } from '../services/projectsAPI.ts'

type ProjectDocumentMetric = {
  id: string
  taskId?: string
  createdById: string
  reviewerId?: string
  status: string
}

type ProjectMetrics = {
  timeLogs: TimeLog[]
  comments: Comment[]
  documents: ProjectDocumentMetric[]
}

type PortfolioContributor = {
  id: string
  name: string
  hours: number
}

type PortfolioTask = {
  id: string
  title: string
  status: Task['status']
  startDate?: string
  dueDate?: string
  totalHours: number
  logCount: number
  contributions: PortfolioContributor[]
}

type PortfolioPhase = {
  id: string
  name: string
  startDate?: string
  endDate?: string
  statusLabel: string
  progress: number
  totalHours: number
  tasks: PortfolioTask[]
}

type PortfolioProject = {
  id: string
  name: string
  leadName: string
  status: Project['status']
  startDate?: string
  endDate?: string
  totalHours: number
  team: Array<{ id: string; name: string }>
  phases: PortfolioPhase[]
}

const roundHours = (value: number) => {
  return Math.round((value + Number.EPSILON) * 10) / 10
}

const formatHours = (value: number) => {
  const safeValue = Number.isFinite(value) ? roundHours(value) : 0
  return `${Number.isInteger(safeValue) ? safeValue : safeValue.toFixed(1)}h`
}

const toReadableStatus = (value: string) => {
  return String(value || '')
    .split(/[-_]/g)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const getTaskStatusMeta = (status: Task['status']) => {
  switch (status) {
    case 'completed':
    case 'done':
      return {
        label: 'Completed',
        className: 'border border-emerald-200 bg-emerald-100/80 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300',
      }
    case 'in-progress':
      return {
        label: 'In Progress',
        className: 'border border-blue-200 bg-blue-100/80 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300',
      }
    case 'blocked':
      return {
        label: 'On Hold',
        className: 'border border-slate-300 bg-slate-100/90 text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-gray-300',
      }
    case 'in-review':
      return {
        label: 'In Review',
        className: 'border border-violet-200 bg-violet-100/80 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/20 dark:text-violet-300',
      }
    case 'planning':
    default:
      return {
        label: 'Planning',
        className: 'border border-amber-200 bg-amber-100/80 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300',
      }
  }
}

const getProjectStatusMeta = (status: Project['status']) => {
  switch (status) {
    case 'completed':
      return 'border border-emerald-200 bg-emerald-100/80 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300'
    case 'blocked':
      return 'border border-rose-200 bg-rose-100/80 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-300'
    case 'in-review':
      return 'border border-violet-200 bg-violet-100/80 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/20 dark:text-violet-300'
    case 'in-progress':
      return 'border border-blue-200 bg-blue-100/80 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300'
    case 'planning':
    default:
      return 'border border-slate-300 bg-slate-100/90 text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-gray-300'
  }
}

const getPhaseStatusLabel = (phaseTasks: PortfolioTask[]) => {
  if (phaseTasks.length === 0) return 'No Tasks'
  const completed = phaseTasks.filter(task => task.status === 'completed' || task.status === 'done').length
  if (completed === phaseTasks.length) return 'Completed'
  if (phaseTasks.some(task => task.status === 'in-progress')) return 'In Progress'
  if (phaseTasks.some(task => task.status === 'blocked')) return 'On Hold'
  return 'Planning'
}

const toInputDateStartTs = (value?: string) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  parsed.setHours(0, 0, 0, 0)
  return parsed.getTime()
}

const toInputDateEndTs = (value?: string) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  parsed.setHours(23, 59, 59, 999)
  return parsed.getTime()
}

const overlapsFilterRange = (
  itemStartDate: string | undefined,
  itemEndDate: string | undefined,
  filterStartTs: number | null,
  filterEndTs: number | null
) => {
  if (filterStartTs === null && filterEndTs === null) return true
  const startTs = toTimestamp(itemStartDate)
  const endTs = toTimestamp(itemEndDate)
  if (startTs === null && endTs === null) return false

  const effectiveStart = startTs ?? endTs ?? 0
  const effectiveEnd = endTs ?? startTs ?? effectiveStart
  const normalizedStart = Math.min(effectiveStart, effectiveEnd)
  const normalizedEnd = Math.max(effectiveStart, effectiveEnd)
  const rangeStart = filterStartTs ?? Number.NEGATIVE_INFINITY
  const rangeEnd = filterEndTs ?? Number.POSITIVE_INFINITY

  return normalizedEnd >= rangeStart && normalizedStart <= rangeEnd
}

const mapProjectStatus = (status?: string): Project['status'] => {
  const normalized = String(status || '').toUpperCase()
  switch (normalized) {
    case 'IN_PROGRESS':
      return 'in-progress'
    case 'ON_HOLD':
      return 'blocked'
    case 'COMPLETED':
      return 'completed'
    case 'CANCELLED':
      return 'blocked'
    case 'PLANNING':
      return 'planning'
    default:
      return 'planning'
  }
}

const mapTaskStatus = (status?: string): Task['status'] => {
  const normalized = String(status || '').toUpperCase()
  switch (normalized) {
    case 'IN_PROGRESS':
      return 'in-progress'
    case 'ON_HOLD':
      return 'blocked'
    case 'COMPLETED':
      return 'completed'
    case 'NOT_STARTED':
      return 'planning'
    default:
      return 'planning'
  }
}

const mapPriority = (priority?: string): Task['priority'] => {
  const normalized = String(priority || '').toUpperCase()
  switch (normalized) {
    case 'CRITICAL':
      return 'critical'
    case 'HIGH':
      return 'high'
    case 'LOW':
      return 'low'
    case 'MEDIUM':
      return 'medium'
    default:
      return 'medium'
  }
}

const priorityRank: Record<Task['priority'], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

const deriveProjectPriority = (tasks: Task[]): Project['priority'] => {
  if (!tasks.length) return 'medium'
  return tasks.reduce<Project['priority']>((current, task) => {
    return priorityRank[task.priority] > priorityRank[current] ? task.priority : current
  }, 'low')
}

const formatRelativeTime = (iso?: string) => {
  if (!iso) return ''
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  const diff = Date.now() - ts
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(iso).toLocaleDateString()
}

const formatDate = (value?: string) => {
  if (!value) return ''
  const ts = Date.parse(value)
  if (Number.isNaN(ts)) return value
  return new Date(ts).toLocaleDateString()
}

const getInitials = (name: string) => {
  const cleaned = String(name || '').trim()
  if (!cleaned) return 'U'
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const toTimestamp = (value?: string) => {
  const ts = Date.parse(value || '')
  return Number.isNaN(ts) ? null : ts
}

const calcPercentChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}

const trendFromChange = (change: number): KPI['trend'] => {
  if (change > 0) return 'up'
  if (change < 0) return 'down'
  return 'stable'
}

const deriveProjectDates = (detail: any) => {
  const phases = Array.isArray(detail?.phases) ? detail.phases : []
  const parseDate = (value: any) => {
    const ts = Date.parse(value || '')
    return Number.isNaN(ts) ? null : new Date(ts)
  }
  let start = parseDate(detail?.startDate)
  let end = parseDate(detail?.endDate)

  if (!start) {
    const phaseStarts = phases
      .map((phase: any) => parseDate(phase?.startDate))
      .filter(Boolean) as Date[]
    if (phaseStarts.length) {
      start = new Date(Math.min(...phaseStarts.map(date => date.getTime())))
    }
  }

  if (!end) {
    const phaseEnds = phases
      .map((phase: any) => parseDate(phase?.endDate))
      .filter(Boolean) as Date[]
    if (phaseEnds.length) {
      end = new Date(Math.max(...phaseEnds.map(date => date.getTime())))
    }
  }

  return {
    startDate: start ? start.toISOString() : '',
    dueDate: end ? end.toISOString() : '',
  }
}

const DirectorDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [portfolioProjects, setPortfolioProjects] = useState<PortfolioProject[]>([])
  const [portfolioDateFrom, setPortfolioDateFrom] = useState('')
  const [portfolioDateTo, setPortfolioDateTo] = useState('')
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({})
  const [metricsByProjectId, setMetricsByProjectId] = useState<Record<string, ProjectMetrics>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadData = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const list = await getProjects()
        const projectIds = (list || [])
          .map((p: any) => String(p?.id || ''))
          .filter(Boolean)

        const details = await Promise.all(
          projectIds.map(id => apiGet(`/projects/${id}`).catch(() => null))
        )
        const validDetails = details.filter(Boolean) as any[]

        const uniqueTaskIds = Array.from(
          new Set(
            validDetails.flatMap((detail: any) => {
              const phases = Array.isArray(detail?.phases) ? detail.phases : []
              return phases.flatMap((phase: any) => {
                const phaseTasks = Array.isArray(phase?.tasks) ? phase.tasks : []
                return phaseTasks
                  .map((task: any) => String(task?.id || ''))
                  .filter(Boolean)
              })
            })
          )
        )

        const logsByTaskId = new Map<string, any[]>()
        if (uniqueTaskIds.length) {
          const logResponses = await Promise.all(
            uniqueTaskIds.map(async taskId => {
              const logs = await apiGet(`/timelogs/tasks/${taskId}/timelogs`).catch(() => [])
              return { taskId, logs: Array.isArray(logs) ? logs : [] }
            })
          )
          logResponses.forEach(({ taskId, logs }) => {
            logsByTaskId.set(taskId, logs)
          })
        }

        const memberMap = new Map<string, { id: string; name: string; email: string }>()
        const allTasks: Task[] = []

        const mappedProjects = validDetails.map((detail: any) => {
            const memberships = Array.isArray(detail?.memberships) ? detail.memberships : []
            const teamIds = memberships
              .map((m: any) => String(m?.user?.id || m?.userId || ''))
              .filter(Boolean)

            memberships.forEach((member: any) => {
              const user = member?.user
              if (!user?.id) return
              memberMap.set(String(user.id), {
                id: String(user.id),
                name: String(user.name || 'Unknown'),
                email: String(user.email || ''),
              })
            })


            const phases = Array.isArray(detail?.phases) ? detail.phases : []
            const projectTasks: Task[] = phases.flatMap((phase: any) => {
              const phaseTasks = Array.isArray(phase?.tasks) ? phase.tasks : []
              return phaseTasks.map((task: any) => {
                const assignees = Array.isArray(task?.assignees) ? task.assignees : []
                const assigneeIds = assignees
                  .map((a: any) => String(a?.user?.id || a?.userId || ''))
                  .filter(Boolean)
                const status = mapTaskStatus(task?.status)
                const createdAt = String(task?.createdAt || new Date().toISOString())
                const updatedAt = String(task?.updatedAt || createdAt)
                return {
                  id: String(task?.id || ''),
                  title: String(task?.title || ''),
                  description: String(task?.description || ''),
                  status,
                  priority: mapPriority(task?.priority),
                  dueDate: task?.dueDate ? new Date(task.dueDate).toISOString() : '',
                  projectId: String(detail?.id || ''),
                  phaseId: String(phase?.id || ''),
                  assignees: assigneeIds,
                  assignee: assigneeIds[0],
                  isDone: status === 'completed',
                  createdAt,
                  updatedAt,
                  completedAt: status === 'completed' ? updatedAt : undefined,
                  progress: status === 'completed' ? 100 : status === 'in-progress' ? 50 : 0,
                }
              })
            })

            allTasks.push(...projectTasks)

            const projectPriority = deriveProjectPriority(projectTasks)
            const { startDate, dueDate } = deriveProjectDates(detail)
            const allocatedHours = Number(detail?.allocatedHours || 0)
            const loggedHours = Number(detail?.usedHours ?? detail?.loggedHours ?? 0)
            const remainingHours = Number(detail?.leftHours ?? Math.max(allocatedHours - loggedHours, 0))

            return {
              id: String(detail?.id || ''),
              name: String(detail?.title || ''),
              description: String(detail?.description || ''),
              status: mapProjectStatus(detail?.status),
              progress: Number(detail?.progress ?? 0),
              startDate,
              dueDate,
              team: teamIds,
              tags: [],
              priority: projectPriority,
              phases: [],
              tasks: [],
              members: [],
              allocatedHours,
              loggedHours,
              remainingHours,
            } as Project
          })

        const portfolioData: PortfolioProject[] = validDetails.map((detail: any) => {
          const projectId = String(detail?.id || '')
          const projectDates = deriveProjectDates(detail)
          const memberships = Array.isArray(detail?.memberships) ? detail.memberships : []
          const teamById = new Map<string, { id: string; name: string }>()
          memberships.forEach((member: any) => {
            const memberId = String(member?.user?.id || member?.userId || '')
            if (!memberId) return
            teamById.set(memberId, {
              id: memberId,
              name: String(member?.user?.name || memberMap.get(memberId)?.name || 'Unknown'),
            })
          })
          const team = Array.from(teamById.values())

          const leadMembership = memberships.find((member: any) => {
            const role = String(member?.role || '').toUpperCase()
            return ['DIRECTOR', 'MANAGER', 'LEAD'].includes(role)
          })
          const leadName = String(
            leadMembership?.user?.name ||
            leadMembership?.user?.email ||
            team[0]?.name ||
            'Unassigned'
          )

          const phases = Array.isArray(detail?.phases) ? detail.phases : []
          const portfolioPhases: PortfolioPhase[] = phases.map((phase: any) => {
            const phaseTasks = Array.isArray(phase?.tasks) ? phase.tasks : []
            const tasksForPhase: PortfolioTask[] = phaseTasks.map((task: any) => {
              const taskId = String(task?.id || '')
              const logs = logsByTaskId.get(taskId) || []
              const contributionByUser = new Map<string, PortfolioContributor>()

              logs.forEach((log: any) => {
                const userId = String(log?.userId || log?.user?.id || '')
                if (!userId) return
                const hours = roundHours(Number(log?.durationMins || 0) / 60)
                const existing = contributionByUser.get(userId)
                if (existing) {
                  existing.hours = roundHours(existing.hours + hours)
                  return
                }
                contributionByUser.set(userId, {
                  id: userId,
                  name: String(log?.userName || log?.user?.name || memberMap.get(userId)?.name || 'Unknown'),
                  hours,
                })
              })

              const assignees = Array.isArray(task?.assignees) ? task.assignees : []
              assignees.forEach((assignee: any) => {
                const userId = String(assignee?.user?.id || assignee?.userId || '')
                if (!userId || contributionByUser.has(userId)) return
                contributionByUser.set(userId, {
                  id: userId,
                  name: String(assignee?.user?.name || memberMap.get(userId)?.name || 'Unknown'),
                  hours: 0,
                })
              })

              const contributions = Array.from(contributionByUser.values()).sort((a, b) => {
                if (b.hours !== a.hours) return b.hours - a.hours
                return a.name.localeCompare(b.name)
              })

              const totalHours = roundHours(
                logs.reduce((sum: number, log: any) => sum + (Number(log?.durationMins || 0) / 60), 0)
              )

              return {
                id: taskId,
                title: String(task?.title || ''),
                status: mapTaskStatus(task?.status),
                startDate: task?.startDate ? new Date(task.startDate).toISOString() : '',
                dueDate: task?.dueDate ? new Date(task.dueDate).toISOString() : '',
                totalHours,
                logCount: logs.length,
                contributions,
              }
            })

            const phaseTotal = roundHours(
              tasksForPhase.reduce((sum, task) => sum + task.totalHours, 0)
            )
            const completedTasks = tasksForPhase.filter(task => task.status === 'completed' || task.status === 'done').length
            const phaseProgress = tasksForPhase.length
              ? Math.round((completedTasks / tasksForPhase.length) * 100)
              : 0

            return {
              id: String(phase?.id || ''),
              name: String(phase?.name || 'Untitled Phase'),
              startDate: phase?.startDate ? new Date(phase.startDate).toISOString() : '',
              endDate: phase?.endDate ? new Date(phase.endDate).toISOString() : '',
              statusLabel: getPhaseStatusLabel(tasksForPhase),
              progress: phaseProgress,
              totalHours: phaseTotal,
              tasks: tasksForPhase,
            }
          })

          const taskHoursTotal = roundHours(
            portfolioPhases.reduce((sum, phase) => sum + phase.totalHours, 0)
          )
          const fallbackLoggedHours = Number(detail?.usedHours ?? detail?.loggedHours ?? 0)

          return {
            id: projectId,
            name: String(detail?.title || 'Untitled Project'),
            leadName,
            status: mapProjectStatus(detail?.status),
            startDate: projectDates.startDate,
            endDate: projectDates.dueDate,
            totalHours: taskHoursTotal > 0 ? taskHoursTotal : fallbackLoggedHours,
            team,
            phases: portfolioPhases,
          }
        })

        const initialExpandedProjects: Record<string, boolean> = {}
        const initialExpandedPhases: Record<string, boolean> = {}
        portfolioData.forEach((project, projectIndex) => {
          initialExpandedProjects[project.id] = projectIndex === 0
          project.phases.forEach((phase, phaseIndex) => {
            const phaseId = phase.id || String(phaseIndex)
            initialExpandedPhases[`${project.id}:${phaseId}`] = projectIndex === 0 && phaseIndex === 0
          })
        })

        if (active) {
          setProjects(mappedProjects)
          setTasks(allTasks)
          setTeamMembers(Array.from(memberMap.values()))
          setPortfolioProjects(portfolioData)
          setExpandedProjects(initialExpandedProjects)
          setExpandedPhases(initialExpandedPhases)
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        if (active) setLoadError('Failed to load dashboard data.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [])

  const teamMemberById = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string }>()
    teamMembers.forEach(member => map.set(member.id, member))
    return map
  }, [teamMembers])

  const projectById = useMemo(() => {
    const map = new Map<string, Project>()
    projects.forEach(project => map.set(project.id, project))
    return map
  }, [projects])

  const tasksByProjectId = useMemo(() => {
    const map = new Map<string, Task[]>()
    tasks.forEach(task => {
      if (!map.has(task.projectId)) map.set(task.projectId, [])
      map.get(task.projectId)?.push(task)
    })
    return map
  }, [tasks])

  const kpis: KPI[] = useMemo(() => {
    const now = Date.now()
    const activeProjects = projects.filter(project => project.status !== 'completed').length
    const tasksInProgress = tasks.filter(task => task.status === 'in-progress').length
    const tasksWithDueDates = tasks.filter(task => toTimestamp(task.dueDate) !== null)
    const overdueTasks = tasksWithDueDates.filter(task => {
      const dueTs = toTimestamp(task.dueDate)
      return dueTs !== null && dueTs < now && task.status !== 'completed'
    }).length
    const onTrackTasks = tasksWithDueDates.filter(task => {
      const dueTs = toTimestamp(task.dueDate)
      if (task.status === 'completed') return true
      return dueTs !== null && dueTs >= now
    }).length
    const onTrackPercent = tasksWithDueDates.length
      ? Math.round((onTrackTasks / tasksWithDueDates.length) * 100)
      : 100

    const weekMs = 7 * 24 * 60 * 60 * 1000
    const recentStart = now - weekMs
    const prevStart = now - weekMs * 2
    const inProgressRecent = tasks.filter(task => {
      const updatedTs = toTimestamp(task.updatedAt)
      return task.status === 'in-progress' && updatedTs !== null && updatedTs >= recentStart
    }).length
    const inProgressPrev = tasks.filter(task => {
      const updatedTs = toTimestamp(task.updatedAt)
      return task.status === 'in-progress' && updatedTs !== null && updatedTs >= prevStart && updatedTs < recentStart
    }).length
    const inProgressChange = calcPercentChange(inProgressRecent, inProgressPrev)

    const overdueRecent = tasks.filter(task => {
      const dueTs = toTimestamp(task.dueDate)
      return dueTs !== null && dueTs >= recentStart && dueTs < now && task.status !== 'completed'
    }).length
    const overduePrev = tasks.filter(task => {
      const dueTs = toTimestamp(task.dueDate)
      return dueTs !== null && dueTs >= prevStart && dueTs < recentStart && task.status !== 'completed'
    }).length
    const overdueChange = calcPercentChange(overdueRecent, overduePrev)

    return [
      { label: 'Active Projects', value: activeProjects, trend: 'stable', change: 0, color: 'blue' },
      { label: 'Tasks in Progress', value: tasksInProgress, trend: trendFromChange(inProgressChange), change: inProgressChange, color: 'green' },
      { label: 'Overdue Tasks', value: overdueTasks, trend: trendFromChange(overdueChange), change: overdueChange, color: 'red' },
      { label: 'On-Track %', value: onTrackPercent, trend: 'stable', change: 0, color: 'purple' },
    ]
  }, [projects, tasks])

  const recentActivity: ActivityItem[] = useMemo(() => {
    const items: Array<{ time: number; item: ActivityItem }> = []
    tasks.forEach(task => {
      const projectName = projectById.get(task.projectId)?.name || 'Project'
      const assigneeId = task.assignees?.[0]
      const actor = assigneeId ? teamMemberById.get(assigneeId)?.name : undefined
      const userName = actor || 'Team'

      if (task.status === 'completed' && task.updatedAt) {
        const time = toTimestamp(task.updatedAt) || 0
        items.push({
          time,
          item: {
            id: `task-complete-${task.id}`,
            type: 'task_completed',
            title: 'Task completed',
            description: `${userName} completed "${task.title}" in ${projectName}`,
            timestamp: formatRelativeTime(task.updatedAt),
            user: userName,
            projectId: task.projectId,
            taskId: task.id,
          },
        })
      }

      if (task.createdAt) {
        const time = toTimestamp(task.createdAt) || 0
        items.push({
          time,
          item: {
            id: `task-created-${task.id}`,
            type: 'task_created',
            title: 'New task created',
            description: `${userName} created "${task.title}" in ${projectName}`,
            timestamp: formatRelativeTime(task.createdAt),
            user: userName,
            projectId: task.projectId,
            taskId: task.id,
          },
        })
      }
    })

    return items
      .sort((a, b) => b.time - a.time)
      .slice(0, 3)
      .map(entry => entry.item)
  }, [tasks, projectById, teamMemberById])

  const upcomingDeadlines = useMemo(() => {
    const now = Date.now()
    const cutoff = now + 30 * 24 * 60 * 60 * 1000
    const tasksWithDue = tasks
      .map(task => ({ task, dueTs: toTimestamp(task.dueDate) }))
      .filter(item => item.dueTs !== null && item.dueTs >= now) as Array<{ task: Task; dueTs: number }>

    let list = tasksWithDue.filter(item => item.dueTs <= cutoff)
    if (!list.length) list = tasksWithDue

    return list
      .sort((a, b) => a.dueTs - b.dueTs)
      .slice(0, 3)
      .map(({ task }) => ({
        task: task.title,
        dueDate: formatDate(task.dueDate),
        project: projectById.get(task.projectId)?.name || 'Project',
      }))
  }, [tasks, projectById])

  const statusBreakdown = useMemo(() => {
    const inProgressCount = projects.filter(project => ['in-progress', 'planning', 'in-review'].includes(project.status)).length
    const blockedCount = projects.filter(project => project.status === 'blocked').length
    const completedCount = projects.filter(project => project.status === 'completed').length
    const total = inProgressCount + blockedCount + completedCount

    const inProgressPct = total ? (inProgressCount / total) * 100 : 0
    const blockedPct = total ? (blockedCount / total) * 100 : 0
    const completedPct = total ? (completedCount / total) * 100 : 0

    const gradient = total
      ? `conic-gradient(#3b82f6 0 ${inProgressPct}%, #f97316 ${inProgressPct}% ${inProgressPct + blockedPct}%, #22c55e ${inProgressPct + blockedPct}% 100%)`
      : 'conic-gradient(#e5e7eb 0 100%)'

    return {
      total,
      gradient,
      segments: [
        { label: 'In Progress', color: 'bg-blue-500', percent: Math.round(inProgressPct) },
        { label: 'On Hold', color: 'bg-orange-500', percent: Math.round(blockedPct) },
        { label: 'Completed', color: 'bg-emerald-500', percent: Math.round(completedPct) },
      ],
    }
  }, [projects])

  const progressHeights = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - 6)
    const startTs = start.getTime()
    const dayMs = 24 * 60 * 60 * 1000
    const counts = Array(7).fill(0)

    tasks.forEach(task => {
      if (task.status !== 'completed') return
      const updatedTs = toTimestamp(task.updatedAt)
      if (updatedTs === null || updatedTs < startTs) return
      const index = Math.floor((updatedTs - startTs) / dayMs)
      if (index >= 0 && index < counts.length) counts[index] += 1
    })

    const max = Math.max(...counts, 1)
    return counts.map(count => Math.round((count / max) * 100))
  }, [tasks])

  // State for project detail modal
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)

  const selectedProjectId = selectedProject?.id

  useEffect(() => {
    if (!isProjectModalOpen || !selectedProjectId) return
    if (metricsByProjectId[selectedProjectId]) return

    const projectTasks = tasksByProjectId.get(selectedProjectId) || []
    if (!projectTasks.length) {
      setMetricsByProjectId(prev => ({
        ...prev,
        [selectedProjectId]: { timeLogs: [], comments: [], documents: [] },
      }))
      return
    }

    let active = true
    const loadMetrics = async () => {
      try {
        const taskIds = projectTasks.map(task => task.id).filter(Boolean)
        const taskMetaById = new Map(projectTasks.map(task => [task.id, { phaseId: task.phaseId }]))

        const [logsByTask, commentsByTask, documentsByTask] = await Promise.all([
          Promise.all(taskIds.map(taskId => apiGet(`/timelogs/tasks/${taskId}/timelogs`).catch(() => []))),
          Promise.all(taskIds.map(taskId => apiGet(`/tasks/${taskId}/comments`).catch(() => []))),
          Promise.all(taskIds.map(taskId => apiGet(`/api/documents/by-task/${taskId}`).catch(() => []))),
        ])

        const mappedLogs: TimeLog[] = logsByTask.flat().map((log: any) => {
          const taskId = String(log?.taskId || '')
          const taskMeta = taskMetaById.get(taskId)
          const userId = String(log?.userId || log?.user?.id || '')
          const userName = String(
            log?.userName ||
            log?.user?.name ||
            teamMemberById.get(userId)?.name ||
            'Unknown'
          )
          const hours = Math.round(((Number(log?.durationMins || 0) / 60) + Number.EPSILON) * 10) / 10
          return {
            id: String(log?.id || ''),
            userId,
            userName,
            projectId: selectedProjectId,
            taskId,
            phaseId: taskMeta?.phaseId || '',
            hours,
            description: String(log?.description || ''),
            loggedAt: String(log?.startedAt || log?.createdAt || new Date().toISOString()),
            createdAt: String(log?.createdAt || log?.startedAt || new Date().toISOString()),
          }
        })

        const mappedComments: Comment[] = commentsByTask.flat().map((comment: any) => {
          const taskId = String(comment?.taskId || '')
          const taskMeta = taskMetaById.get(taskId)
          const authorName = String(comment?.author?.name || 'Unknown')
          return {
            id: String(comment?.id || ''),
            taskId,
            content: String(comment?.content || ''),
            author: {
              id: String(comment?.author?.id || ''),
              name: authorName,
              email: String(comment?.author?.email || ''),
              avatar: getInitials(authorName),
            },
            projectId: selectedProjectId,
            phaseId: taskMeta?.phaseId,
            createdAt: String(comment?.createdAt || new Date().toISOString()),
            replies: (comment?.replies || []).map((reply: any) => {
              const replyName = String(reply?.author?.name || 'Unknown')
              return {
                id: String(reply?.id || ''),
                content: String(reply?.content || ''),
                author: {
                  id: String(reply?.author?.id || ''),
                  name: replyName,
                  email: String(reply?.author?.email || ''),
                  avatar: getInitials(replyName),
                },
                createdAt: String(reply?.createdAt || new Date().toISOString()),
              }
            }),
          }
        })

        const mappedDocuments: ProjectDocumentMetric[] = documentsByTask.flat().map((doc: any) => ({
          id: String(doc?.id || ''),
          taskId: doc?.taskId ? String(doc.taskId) : undefined,
          createdById: String(doc?.createdBy?.id || doc?.createdById || ''),
          reviewerId: doc?.reviewer?.id ? String(doc.reviewer.id) : undefined,
          status: String(doc?.status || '').toLowerCase(),
        }))

        if (active) {
          setMetricsByProjectId(prev => ({
            ...prev,
            [selectedProjectId]: {
              timeLogs: mappedLogs,
              comments: mappedComments,
              documents: mappedDocuments,
            },
          }))
        }
      } catch (error) {
        console.error('Error loading project metrics:', error)
        if (active) {
          setMetricsByProjectId(prev => ({
            ...prev,
            [selectedProjectId]: { timeLogs: [], comments: [], documents: [] },
          }))
        }
      }
    }

    loadMetrics()
    return () => {
      active = false
    }
  }, [isProjectModalOpen, selectedProjectId, tasksByProjectId, metricsByProjectId, teamMemberById])

  const selectedMetrics = selectedProjectId ? metricsByProjectId[selectedProjectId] : undefined
  const projectTimeLogs = selectedMetrics?.timeLogs ?? []
  const projectComments = selectedMetrics?.comments ?? []
  const projectDocuments = selectedMetrics?.documents ?? []
  const projectLoggedHours = projectTimeLogs.length
    ? projectTimeLogs.reduce((sum, log) => sum + log.hours, 0)
    : (selectedProject?.loggedHours || 0)
  const projectUtilization = selectedProject?.allocatedHours
    ? Math.round((projectLoggedHours / selectedProject.allocatedHours) * 100)
    : 0
  const totalProjectLogged = projectTimeLogs.reduce((sum, log) => sum + log.hours, 0)
  const flattenedComments = useMemo(() => {
    return projectComments.flatMap(comment => [comment, ...(comment.replies || [])])
  }, [projectComments])

  // Use all projects instead of just recent ones
  const displayProjects = projects
  const isPortfolioDateFilterActive = Boolean(portfolioDateFrom || portfolioDateTo)
  const filteredPortfolioProjects = useMemo(() => {
    const rawStartTs = toInputDateStartTs(portfolioDateFrom)
    const rawEndTs = toInputDateEndTs(portfolioDateTo)
    const filterStartTs = rawStartTs !== null && rawEndTs !== null ? Math.min(rawStartTs, rawEndTs) : rawStartTs
    const filterEndTs = rawStartTs !== null && rawEndTs !== null ? Math.max(rawStartTs, rawEndTs) : rawEndTs
    const hasFilter = filterStartTs !== null || filterEndTs !== null
    if (!hasFilter) return portfolioProjects

    return portfolioProjects
      .map(project => {
        const filteredPhases = project.phases
          .map(phase => {
            const phaseMatches = overlapsFilterRange(phase.startDate, phase.endDate, filterStartTs, filterEndTs)
            const filteredTasks = phase.tasks.filter(task =>
              overlapsFilterRange(task.startDate, task.dueDate, filterStartTs, filterEndTs)
            )

            if (!phaseMatches && filteredTasks.length === 0) return null

            const filteredHours = roundHours(filteredTasks.reduce((sum, task) => sum + task.totalHours, 0))
            const completedTasks = filteredTasks.filter(task => task.status === 'completed' || task.status === 'done').length
            const filteredProgress = filteredTasks.length
              ? Math.round((completedTasks / filteredTasks.length) * 100)
              : phase.progress

            return {
              ...phase,
              statusLabel: filteredTasks.length ? getPhaseStatusLabel(filteredTasks) : phase.statusLabel,
              progress: filteredProgress,
              totalHours: filteredTasks.length ? filteredHours : phase.totalHours,
              tasks: filteredTasks,
            }
          })
          .filter(Boolean) as PortfolioPhase[]

        const projectMatches = overlapsFilterRange(project.startDate, project.endDate, filterStartTs, filterEndTs)
        if (!projectMatches && filteredPhases.length === 0) return null

        const phaseHours = roundHours(filteredPhases.reduce((sum, phase) => sum + phase.totalHours, 0))

        return {
          ...project,
          totalHours: filteredPhases.length ? phaseHours : project.totalHours,
          phases: filteredPhases,
        }
      })
      .filter(Boolean) as PortfolioProject[]
  }, [portfolioProjects, portfolioDateFrom, portfolioDateTo])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'badge-info'
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

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId],
    }))
  }

  const togglePhaseExpansion = (projectId: string, phaseId: string) => {
    const key = `${projectId}:${phaseId}`
    setExpandedPhases(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
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

  const cardBase = 'rounded-3xl border border-slate-200/80 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-black/60 dark:bg-gradient-to-b dark:from-white/[0.06] dark:to-white/[0.02] dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)]'
  const kpiIconStyles = [
    { icon: 'layers', tone: 'text-sky-600 dark:text-sky-400', ring: 'bg-sky-100 border-sky-200 dark:bg-sky-500/15 dark:border-sky-500/30' },
    { icon: 'refresh', tone: 'text-orange-600 dark:text-orange-400', ring: 'bg-orange-100 border-orange-200 dark:bg-orange-500/15 dark:border-orange-500/30' },
    { icon: 'alert', tone: 'text-rose-600 dark:text-rose-400', ring: 'bg-rose-100 border-rose-200 dark:bg-rose-500/15 dark:border-rose-500/30' },
    { icon: 'pulse', tone: 'text-emerald-600 dark:text-emerald-400', ring: 'bg-emerald-100 border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/30' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Director Dashboard</h1>
        <p className="text-slate-600 dark:text-gray-400">
          Executive overview of project performance and team productivity
        </p>
      </div>
      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <div key={index} className={`${cardBase} p-6`}>
            <div className="flex items-start justify-between">
              <div className={`h-12 w-12 rounded-2xl border ${kpiIconStyles[index]?.ring || 'border-slate-200/80 dark:border-white/10'} flex items-center justify-center`}>
                <svg className={`h-6 w-6 ${kpiIconStyles[index]?.tone || 'text-slate-600 dark:text-white'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
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
                  kpi.trend === 'up' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' :
                  kpi.trend === 'down' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' :
                  'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-gray-300'
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Chart */}
        <div className={`${cardBase} p-6`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide text-sm">
            Project Status Distribution
          </h3>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <div
              className="relative h-40 w-40 rounded-full"
              style={{ background: statusBreakdown.gradient }}
            >
              <div className="absolute inset-4 rounded-full bg-white dark:bg-black/80 border border-gray-200 dark:border-white/10 flex flex-col items-center justify-center">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">{statusBreakdown.total}</div>
                <div className="text-xs uppercase tracking-widest text-slate-500 dark:text-gray-400">Total</div>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              {statusBreakdown.segments.map(segment => (
                <div key={segment.label} className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${segment.color}`} />
                  <span className="text-slate-600 dark:text-gray-400">{segment.label}</span>
                  <span className="ml-auto text-gray-900 dark:text-white font-semibold">{segment.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Over Time Chart */}
        <div className={`${cardBase} p-6`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Progress Over Time</h3>
          <div className="h-32 flex items-end gap-2">
            {progressHeights.map((height, index) => (
              <div key={index} className="flex-1 rounded-t-2xl bg-gradient-to-t from-blue-600 to-sky-400/70" style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
            Last 7 days
          </div>
        </div>
      </div>

      {/* Project Portfolio Tracker */}
      <div className={`${cardBase} overflow-hidden`}>
        <div className="border-b border-slate-200/80 dark:border-white/10 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Project Portfolio Tracker</h3>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-medium text-slate-500 dark:text-gray-400">From</span>
              <input
                type="date"
                value={portfolioDateFrom}
                onChange={event => setPortfolioDateFrom(event.target.value)}
                max={portfolioDateTo || undefined}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-700 outline-none transition focus:border-slate-300 dark:border-white/15 dark:bg-black/40 dark:text-gray-200 dark:focus:border-white/25"
              />
              <span className="font-medium text-slate-500 dark:text-gray-400">To</span>
              <input
                type="date"
                value={portfolioDateTo}
                onChange={event => setPortfolioDateTo(event.target.value)}
                min={portfolioDateFrom || undefined}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-700 outline-none transition focus:border-slate-300 dark:border-white/15 dark:bg-black/40 dark:text-gray-200 dark:focus:border-white/25"
              />
              <button
                type="button"
                onClick={() => {
                  setPortfolioDateFrom('')
                  setPortfolioDateTo('')
                }}
                disabled={!isPortfolioDateFilterActive}
                className="h-8 rounded-lg border border-slate-200 px-3 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
        {filteredPortfolioProjects.length === 0 ? (
          <div className="px-6 py-12 text-xs text-slate-500 dark:text-gray-400">
            {isPortfolioDateFilterActive
              ? 'No projects, phases, or tasks found in the selected date range.'
              : 'No project, phase, or task data available.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[minmax(0,2.4fr)_1fr_1.5fr_140px] px-6 py-5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                <div>Project / Phase / Task</div>
                <div>Status</div>
                <div>Team Contribution</div>
                <div className="text-right">Total Hours</div>
              </div>

              <div className="divide-y divide-slate-200/80 dark:divide-white/10">
                {filteredPortfolioProjects.map((project, projectIndex) => {
                  const projectExpanded = expandedProjects[project.id] ?? projectIndex === 0
                  return (
                    <div key={project.id || `project-${projectIndex}`} className="bg-white/70 dark:bg-transparent">
                      <div className="grid grid-cols-[minmax(0,2.4fr)_1fr_1.5fr_140px] items-center gap-4 px-6 py-6">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleProjectExpansion(project.id)}
                            className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:border-white/15 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                          >
                            <svg
                              className={`mx-auto h-4 w-4 transition-transform ${projectExpanded ? 'rotate-90' : ''}`}
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 4l6 6-6 6" />
                            </svg>
                          </button>
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7.5Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5V4a3 3 0 0 1 6 0v1" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-base font-semibold text-gray-900 dark:text-white">{project.name}</p>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                              Lead: {project.leadName}
                            </p>
                          </div>
                        </div>
                        <div>
                          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${getProjectStatusMeta(project.status)}`}>
                            {toReadableStatus(project.status)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          {project.team.length === 0 ? (
                            <span className="text-[11px] text-slate-500 dark:text-gray-400">No team assigned</span>
                          ) : (
                            <div className="flex -space-x-2">
                              {project.team.slice(0, 4).map(member => (
                                <div
                                  key={member.id}
                                  title={member.name}
                                  className="h-8 w-8 rounded-full border border-white bg-slate-200 text-[11px] font-semibold text-slate-700 flex items-center justify-center dark:border-black dark:bg-white/20 dark:text-white"
                                >
                                  {getInitials(member.name)}
                                </div>
                              ))}
                              {project.team.length > 4 && (
                                <div className="h-8 w-8 rounded-full border border-white bg-slate-300 text-[11px] font-semibold text-slate-700 flex items-center justify-center dark:border-black dark:bg-white/15 dark:text-gray-200">
                                  +{project.team.length - 4}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-base font-semibold text-slate-700 dark:text-gray-100">
                          {formatHours(project.totalHours)}
                        </div>
                      </div>

                      {projectExpanded && (
                        <div className="border-t border-slate-200/80 bg-slate-50/60 dark:border-white/10 dark:bg-black/20">
                          {project.phases.length === 0 ? (
                            <div className="px-6 py-4 text-xs text-slate-500 dark:text-gray-400">
                              {isPortfolioDateFilterActive ? 'No phases in this date range.' : 'No phases found for this project.'}
                            </div>
                          ) : (
                            project.phases.map((phase, phaseIndex) => {
                              const phaseKey = `${project.id}:${phase.id || phaseIndex}`
                              const phaseExpanded = expandedPhases[phaseKey] ?? (projectIndex === 0 && phaseIndex === 0)
                              return (
                                <div key={phase.id || phaseKey} className="border-b border-slate-200/70 dark:border-white/10 last:border-b-0">
                                  <div className="grid grid-cols-[minmax(0,2.4fr)_1fr_1.5fr_140px] items-center gap-4 px-6 py-4">
                                    <div className="flex items-center gap-3 pl-10">
                                      <button
                                        type="button"
                                        onClick={() => togglePhaseExpansion(project.id, phase.id || String(phaseIndex))}
                                        className="h-8 w-8 shrink-0 rounded-lg border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 dark:text-gray-400 dark:hover:border-white/10 dark:hover:bg-white/5"
                                      >
                                        <svg
                                          className={`mx-auto h-4 w-4 transition-transform ${phaseExpanded ? 'rotate-90' : ''}`}
                                          viewBox="0 0 20 20"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth={2}
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 4l6 6-6 6" />
                                        </svg>
                                      </button>
                                      <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{phase.name}</p>
                                    </div>
                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                                      {phase.statusLabel}
                                    </div>
                                    <div className="flex items-center">
                                      <div className="h-2 w-36 rounded-full bg-slate-200 dark:bg-white/10">
                                        <div
                                          className="h-2 rounded-full bg-slate-400 dark:bg-white/30"
                                          style={{ width: `${Math.max(0, Math.min(100, phase.progress))}%` }}
                                        />
                                      </div>
                                      <span className="ml-3 text-[11px] font-medium text-slate-500 dark:text-gray-400">{phase.progress}%</span>
                                    </div>
                                    <div className="text-right text-sm font-semibold text-slate-600 dark:text-gray-200">
                                      {formatHours(phase.totalHours)}
                                    </div>
                                  </div>

                                  {phaseExpanded && (
                                    <div className="divide-y divide-slate-200/70 dark:divide-white/10">
                                      {phase.tasks.length === 0 ? (
                                        <div className="px-6 py-4 pl-24 text-xs text-slate-500 dark:text-gray-400">
                                          {isPortfolioDateFilterActive ? 'No tasks in this date range.' : 'No tasks in this phase.'}
                                        </div>
                                      ) : (
                                        phase.tasks.map((task, taskIndex) => {
                                          const taskStatusMeta = getTaskStatusMeta(task.status)
                                          return (
                                            <div key={task.id || `${phaseKey}-task-${taskIndex}`} className="grid grid-cols-[minmax(0,2.4fr)_1fr_1.5fr_140px] items-center gap-4 px-6 py-4">
                                              <div className="flex items-center gap-3 pl-16">
                                                <div className="h-8 w-px bg-slate-300 dark:bg-white/15" />
                                                <p className="text-sm text-slate-700 dark:text-gray-200">{task.title || 'Untitled task'}</p>
                                              </div>
                                              <div>
                                                <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${taskStatusMeta.className}`}>
                                                  {taskStatusMeta.label}
                                                </span>
                                              </div>
                                              <div className="flex flex-wrap items-center gap-2">
                                                {task.contributions.length === 0 ? (
                                                  <span className="text-[11px] text-slate-500 dark:text-gray-400">No contributions logged</span>
                                                ) : (
                                                  task.contributions.slice(0, 3).map(contribution => (
                                                    <span
                                                      key={`${task.id || taskIndex}-${contribution.id}`}
                                                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-gray-300"
                                                    >
                                                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                                        <circle cx="10" cy="6" r="3.2" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.2 16.2a5.8 5.8 0 0 1 11.6 0" />
                                                      </svg>
                                                      <span>{contribution.name}</span>
                                                      <span className="font-semibold">{formatHours(contribution.hours)}</span>
                                                    </span>
                                                  ))
                                                )}
                                                {task.contributions.length > 3 && (
                                                  <span className="text-[11px] font-semibold text-slate-500 dark:text-gray-400">
                                                    +{task.contributions.length - 3} more
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-right">
                                                <p className="text-sm font-semibold text-slate-700 dark:text-gray-100">{formatHours(task.totalHours)}</p>
                                                <p className="text-[11px] text-slate-500 dark:text-gray-400">
                                                  {task.logCount} {task.logCount === 1 ? 'log' : 'logs'}
                                                </p>
                                              </div>
                                            </div>
                                          )
                                        })
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Projects Grid */}
      <div className={`${cardBase} p-6`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">All Projects</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayProjects.map((project) => {
            const allocationRatio = project.allocatedHours > 0 ? project.loggedHours / project.allocatedHours : 0
            const allocationPercent = Math.round(allocationRatio * 100)
            return (
              <div
                key={project.id}
                className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-black/50 p-5 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-[0_18px_45px_rgba(15,23,42,0.16)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition duration-200 cursor-pointer"
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

                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-gray-400">Progress</span>
                    <span className="font-medium text-gray-900 dark:text-white">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-black/40 rounded-full h-2">
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
                      <span className="text-slate-600 dark:text-gray-400">Time Allocation</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {allocationPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-black/40 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          allocationRatio >= 1 ? 'bg-red-500' :
                          allocationRatio >= 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, allocationRatio * 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 mt-1">
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
                      const member = teamMemberById.get(memberId)
                      return (
                        <div key={index} className="h-7 w-7 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-xs text-slate-700 dark:text-white border border-slate-200/80 dark:border-white/10">
                          {member ? member.name.charAt(0) : memberId.charAt(0)}
                        </div>
                      )
                    })}
                    {project.team.length > 3 && (
                      <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-xs text-slate-600 dark:text-gray-300 border border-slate-200/80 dark:border-white/10">
                        +{project.team.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Activity Feed and Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <div className={`${cardBase} p-6`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Activity</h3>
          <div className="relative space-y-6">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity yet.</p>
            ) : (
              <>
                <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-200 dark:bg-white/10" />
                {recentActivity.map((activity, idx) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-full border border-slate-200/80 dark:border-white/10 flex items-center justify-center ${
                      idx === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' :
                      idx === 1 ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400' :
                      'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400'
                    }`}>
                      <span className="text-sm font-semibold">{activity.title.charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{activity.title}</p>
                      <p className="text-sm text-slate-600 dark:text-gray-400">{activity.description}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className={`${cardBase} p-6`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Upcoming Deadlines</h3>
          <div className="space-y-4">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming deadlines.</p>
            ) : (
              upcomingDeadlines.map((deadline, index) => (
                <div key={index} className="flex items-center justify-between rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-black/50 p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{deadline.task}</p>
                    <p className="text-xs text-slate-600 dark:text-gray-400">{deadline.project}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{deadline.dueDate}</p>
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">DUE</p>
                  </div>
                </div>
              ))
            )}
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
                      {projectLoggedHours}h
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Logged</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {projectUtilization}%
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
                    const member = teamMemberById.get(memberId)
                    if (!member) return null

                    // Calculate member statistics
                    const memberTimeLogs = projectTimeLogs.filter(log =>
                      log.userId === memberId
                    )
                    const totalLoggedHours = memberTimeLogs.reduce((sum, log) => sum + log.hours, 0)
                    const documentsShared = projectDocuments.filter(doc => doc.createdById === memberId).length
                    const documentsReviewed = projectDocuments.filter(doc =>
                      doc.reviewerId === memberId && doc.status === 'approved'
                    ).length
                    const commentsAdded = flattenedComments.filter(comment => comment.author?.id === memberId).length
                    const contributionPercent = totalProjectLogged > 0
                      ? Math.round((totalLoggedHours / totalProjectLogged) * 100)
                      : 0

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
                                  {contributionPercent}%
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
