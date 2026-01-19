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

        const memberMap = new Map<string, { id: string; name: string; email: string }>()
        const allTasks: Task[] = []

        const mappedProjects = details
          .filter(Boolean)
          .map((detail: any) => {
            const memberships = Array.isArray(detail?.memberships) ? detail.memberships : []
            const owner = detail?.owner || null
            const teamIds = memberships
              .map((m: any) => String(m?.user?.id || m?.userId || ''))
              .filter(Boolean)

            if (owner?.id && !teamIds.includes(String(owner.id))) {
              teamIds.unshift(String(owner.id))
            }

            memberships.forEach((member: any) => {
              const user = member?.user
              if (!user?.id) return
              memberMap.set(String(user.id), {
                id: String(user.id),
                name: String(user.name || 'Unknown'),
                email: String(user.email || ''),
              })
            })

            if (owner?.id) {
              memberMap.set(String(owner.id), {
                id: String(owner.id),
                name: String(owner.name || 'Unknown'),
                email: String(owner.email || ''),
              })
            }

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
              owner: String(owner?.name || memberships[0]?.user?.name || 'Unassigned'),
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

        if (active) {
          setProjects(mappedProjects)
          setTasks(allTasks)
          setTeamMembers(Array.from(memberMap.values()))
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
              style={{ background: statusBreakdown.gradient }}
            >
              <div className="absolute inset-4 rounded-full bg-white dark:bg-black/80 border border-gray-200 dark:border-white/10 flex flex-col items-center justify-center">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">{statusBreakdown.total}</div>
                <div className="text-xs uppercase tracking-widest text-gray-400">Total</div>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              {statusBreakdown.segments.map(segment => (
                <div key={segment.label} className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${segment.color}`} />
                  <span className="text-gray-400">{segment.label}</span>
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
                        {allocationPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-black/40 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          allocationRatio >= 1 ? 'bg-red-500' :
                          allocationRatio >= 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, allocationRatio * 100)}%` }}
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
                      const member = teamMemberById.get(memberId)
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
