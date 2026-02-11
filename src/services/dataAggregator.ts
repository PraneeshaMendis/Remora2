import { Task, Project, TimeLog, Comment, Document, User } from '../types/index.ts'
import { apiGet } from './api'
import { getProjects } from './projectsAPI'

export interface AggregatedUserData {
  user: User
  tasks: Task[]
  projects: Project[]
  timeLogs: TimeLog[]
  comments: Comment[]
  documents: Document[]
  totalHoursThisMonth: number
  totalHoursAllTime: number
  projectsInvolved: number
  phasesContributed: number
  averageHoursPerWeek: number
  onTimeContribution: number
  delayedContribution: number
  overdueTasksCount: number
  commentsAdded: number
  commentsPerWeek: number
  documentsShared: number
  documentsReviewed: number
  timeSaved: number
  earlyCompletions: number
  averageTimeSaved: number
}

const toRounded = (value: number) => Math.round((value + Number.EPSILON) * 10) / 10

const safeIsoString = (value: unknown): string => {
  const parsed = new Date(String(value || ''))
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString()
}

const toTimestamp = (value?: string): number | null => {
  const ts = Date.parse(String(value || ''))
  return Number.isNaN(ts) ? null : ts
}

const getInitials = (name: string): string => {
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
    case 'IN_REVIEW':
      return 'in-review'
    case 'PLANNING':
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
    case 'IN_REVIEW':
      return 'in-review'
    case 'NOT_STARTED':
    default:
      return 'planning'
  }
}

const mapTaskPriority = (priority?: string): Task['priority'] => {
  const normalized = String(priority || '').toUpperCase()
  switch (normalized) {
    case 'CRITICAL':
      return 'critical'
    case 'HIGH':
      return 'high'
    case 'LOW':
      return 'low'
    case 'MEDIUM':
    default:
      return 'medium'
  }
}

const mapDocumentStatus = (status?: string): Document['status'] => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'approved') return 'approved'
  if (normalized === 'rejected') return 'rejected'
  if (normalized === 'needs-changes' || normalized === 'needs_changes') return 'needs-changes'
  if (normalized === 'in-review' || normalized === 'in_review') return 'in-review'
  if (normalized === 'pending') return 'pending'
  return 'draft'
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

const deriveProjectDates = (detail: any): { startDate: string; dueDate: string } => {
  const phases = Array.isArray(detail?.phases) ? detail.phases : []
  const parseDate = (value: unknown) => {
    const ts = Date.parse(String(value || ''))
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

export class DataAggregator {
  private allTasks: Task[] = []
  private allProjects: Project[] = []
  private allTimeLogs: TimeLog[] = []
  private allComments: Comment[] = []
  private allDocuments: Document[] = []

  constructor() {
    this.loadMockData()
  }

  private loadMockData() {
    // Load all mock data from different pages
    this.loadTasks()
    this.loadProjects()
    this.loadTimeLogs()
    this.loadComments()
    this.loadDocuments()
  }

  private loadTasks() {
    // Mock tasks data (in real app, this would come from API)
    this.allTasks = [
      {
        id: '1',
        title: 'Wireframe Creation',
        description: 'Create low-fidelity wireframes for all screens',
        status: 'completed',
        priority: 'high',
        dueDate: '2024-01-25',
        projectId: '1',
        phaseId: '1',
        assignees: ['1'],
        assignee: '1',
        createdAt: '2024-01-15T09:00:00Z',
        updatedAt: '2024-01-24T17:30:00Z',
        completedAt: '2024-01-24T17:30:00Z',
        progress: 100,
        isDone: true,
        createdBy: '1'
      },
      {
        id: '2',
        title: 'API Integration',
        description: 'Integrate backend API with frontend',
        status: 'in-progress',
        priority: 'medium',
        dueDate: '2024-02-15',
        projectId: '2',
        phaseId: '2',
        assignees: ['1'],
        assignee: '1',
        createdAt: '2024-01-20T10:00:00Z',
        updatedAt: '2024-01-20T10:00:00Z',
        progress: 65,
        isDone: false,
        createdBy: '2'
      },
      {
        id: '3',
        title: 'Security Testing',
        description: 'Perform penetration testing',
        status: 'completed',
        priority: 'critical',
        dueDate: '2024-01-30',
        projectId: '3',
        phaseId: '3',
        assignees: ['1'],
        assignee: '1',
        createdAt: '2024-01-10T08:00:00Z',
        updatedAt: '2024-01-28T16:00:00Z',
        completedAt: '2024-01-28T16:00:00Z',
        progress: 100,
        isDone: true,
        createdBy: '1'
      }
    ]
  }

  private loadProjects() {
    // Mock projects data
    this.allProjects = [
      {
        id: '1',
        name: 'Mobile App Redesign',
        description: 'Complete redesign of mobile application',
        status: 'in-progress',
        progress: 65,
        startDate: '2024-01-15',
        dueDate: '2024-03-15',
        team: ['1', '2', '3'],
        tags: ['mobile', 'design', 'ux'],
        priority: 'high',
        phases: [],
        tasks: [],
        members: [],
        allocatedHours: 200,
        loggedHours: 130,
        remainingHours: 70
      },
      {
        id: '2',
        name: 'Backend API Development',
        description: 'Develop REST API for mobile app',
        status: 'in-progress',
        progress: 45,
        startDate: '2024-01-20',
        dueDate: '2024-02-28',
        team: ['1', '4'],
        tags: ['backend', 'api', 'development'],
        priority: 'medium',
        phases: [],
        tasks: [],
        members: [],
        allocatedHours: 150,
        loggedHours: 68,
        remainingHours: 82
      },
      {
        id: '3',
        name: 'Security Audit',
        description: 'Comprehensive security audit',
        status: 'completed',
        progress: 100,
        startDate: '2024-01-10',
        dueDate: '2024-01-30',
        team: ['1', '5'],
        tags: ['security', 'audit'],
        priority: 'critical',
        phases: [],
        tasks: [],
        members: [],
        allocatedHours: 80,
        loggedHours: 75,
        remainingHours: 5
      }
    ]
  }

  private loadTimeLogs() {
    // Mock time logs data
    this.allTimeLogs = [
      {
        id: '1',
        userId: '1',
        userName: 'John Doe',
        projectId: '1',
        taskId: '1',
        phaseId: '1',
        hours: 8,
        description: 'Created wireframes for main screens',
        loggedAt: '2024-01-20T09:00:00Z',
        createdAt: '2024-01-20T09:00:00Z'
      },
      {
        id: '2',
        userId: '1',
        userName: 'John Doe',
        projectId: '1',
        taskId: '1',
        phaseId: '1',
        hours: 6,
        description: 'Refined wireframes based on feedback',
        loggedAt: '2024-01-21T10:00:00Z',
        createdAt: '2024-01-21T10:00:00Z'
      },
      {
        id: '3',
        userId: '1',
        userName: 'John Doe',
        projectId: '2',
        taskId: '2',
        phaseId: '2',
        hours: 7,
        description: 'Implemented API endpoints',
        loggedAt: '2024-01-22T08:30:00Z',
        createdAt: '2024-01-22T08:30:00Z'
      },
      {
        id: '4',
        userId: '1',
        userName: 'John Doe',
        projectId: '3',
        taskId: '3',
        phaseId: '3',
        hours: 9,
        description: 'Conducted security testing',
        loggedAt: '2024-01-25T09:15:00Z',
        createdAt: '2024-01-25T09:15:00Z'
      }
    ]
  }

  private loadComments() {
    // Mock comments data
    this.allComments = [
      {
        id: '1',
        content: 'Great work on the wireframes! The layout looks clean and intuitive.',
        author: { id: '1', name: 'John Doe', email: 'john@company.com', avatar: 'JD' },
        projectId: '1',
        phaseId: '1',
        taskId: '1',
        createdAt: '2024-01-20T14:30:00Z',
        replies: []
      },
      {
        id: '2',
        content: 'I suggest we add a dark mode option to the settings screen.',
        author: { id: '1', name: 'John Doe', email: 'john@company.com', avatar: 'JD' },
        projectId: '1',
        phaseId: '1',
        taskId: '1',
        createdAt: '2024-01-21T11:15:00Z',
        replies: []
      },
      {
        id: '3',
        content: 'The API integration is working well. Ready for testing.',
        author: { id: '1', name: 'John Doe', email: 'john@company.com', avatar: 'JD' },
        projectId: '2',
        phaseId: '2',
        taskId: '2',
        createdAt: '2024-01-22T16:45:00Z',
        replies: []
      }
    ]
  }

  private loadDocuments() {
    // Mock documents data
    this.allDocuments = [
      {
        id: '1',
        name: 'Wireframe_v1.pdf',
        fileName: 'Wireframe_v1.pdf',
        fileType: 'pdf',
        type: 'pdf',
        fileSize: 2048000,
        uploadedBy: '1',
        uploadedAt: '2024-01-20T10:00:00Z',
        projectId: '1',
        phaseId: '1',
        taskId: '1',
        status: 'approved',
        reviewedAt: '2024-01-21T15:00:00Z',
        sentTo: ['2', '3'],
        dateSubmitted: '2024-01-20T10:00:00Z',
        version: 1
      },
      {
        id: '2',
        name: 'API_Documentation.md',
        fileName: 'API_Documentation.md',
        fileType: 'markdown',
        type: 'markdown',
        fileSize: 512000,
        uploadedBy: '1',
        uploadedAt: '2024-01-22T09:30:00Z',
        projectId: '2',
        phaseId: '2',
        taskId: '2',
        status: 'pending',
        reviewedAt: undefined,
        sentTo: ['4'],
        dateSubmitted: '2024-01-22T09:30:00Z',
        version: 1
      },
      {
        id: '3',
        name: 'Security_Report.pdf',
        fileName: 'Security_Report.pdf',
        fileType: 'pdf',
        type: 'pdf',
        fileSize: 1536000,
        uploadedBy: '1',
        uploadedAt: '2024-01-25T14:20:00Z',
        projectId: '3',
        phaseId: '3',
        taskId: '3',
        status: 'approved',
        reviewedAt: '2024-01-26T10:30:00Z',
        sentTo: ['5'],
        dateSubmitted: '2024-01-25T14:20:00Z',
        version: 1
      }
    ]
  }

  public async aggregateUserDataFromApi(userId: string, userData?: User): Promise<AggregatedUserData> {
    const user: User = userData || {
      id: userId,
      name: 'Unknown User',
      email: 'unknown@company.com',
      role: 'member',
      department: 'General',
      avatar: 'U',
      isActive: true,
      lastActive: new Date().toISOString(),
    }

    try {
      const list = await getProjects().catch(() => [])
      const projects = Array.isArray(list) ? list : []
      const userProjectIds = projects
        .filter((project: any) => {
          const memberships = Array.isArray(project?.memberships) ? project.memberships : []
          if (memberships.length > 0) {
            return memberships.some((membership: any) => {
              const memberId = String(membership?.user?.id || membership?.userId || '')
              return memberId === userId
            })
          }
          const teamIds = Array.isArray(project?.team) ? project.team.map((id: any) => String(id)) : []
          return teamIds.includes(userId)
        })
        .map((project: any) => String(project?.id || ''))
        .filter(Boolean)

      const detailResponses = await Promise.all(
        userProjectIds.map(async (projectId) => {
          try {
            return await apiGet(`/projects/${projectId}`)
          } catch {
            return null
          }
        })
      )
      const validProjectDetails = detailResponses.filter(Boolean) as any[]

      const userProjects: Project[] = []
      const userTasks: Task[] = []
      const taskIds = new Set<string>()
      const taskContextById = new Map<string, { projectId: string; phaseId?: string }>()

      validProjectDetails.forEach((detail: any) => {
        const projectId = String(detail?.id || '')
        if (!projectId) return

        const phases = Array.isArray(detail?.phases) ? detail.phases : []
        const memberships = Array.isArray(detail?.memberships) ? detail.memberships : []
        const teamIds = memberships
          .map((membership: any) => String(membership?.user?.id || membership?.userId || ''))
          .filter(Boolean)

        const allProjectTasks: Task[] = []
        const mappedPhases = phases.map((phase: any) => {
          const phaseId = String(phase?.id || '')
          const phaseTasks = Array.isArray(phase?.tasks) ? phase.tasks : []
          const mappedTasksForPhase: Task[] = phaseTasks.map((task: any) => {
            const mappedStatus = mapTaskStatus(task?.status)
            const assignees = Array.isArray(task?.assignees) ? task.assignees : []
            const assigneeIds = assignees
              .map((assignee: any) => String(assignee?.user?.id || assignee?.userId || ''))
              .filter(Boolean)

            const createdAt = safeIsoString(task?.createdAt) || new Date().toISOString()
            const updatedAt = safeIsoString(task?.updatedAt) || createdAt
            const dueDate = safeIsoString(task?.dueDate)
            const completedAt = safeIsoString(task?.completedAt)
            const taskId = String(task?.id || '')

            if (taskId) {
              taskIds.add(taskId)
              taskContextById.set(taskId, { projectId, phaseId: phaseId || undefined })
            }

            const mappedTask: Task = {
              id: taskId,
              title: String(task?.title || ''),
              description: String(task?.description || ''),
              status: mappedStatus,
              priority: mapTaskPriority(task?.priority),
              dueDate,
              projectId,
              phaseId: phaseId || undefined,
              assignees: assigneeIds,
              assignee: assigneeIds[0],
              isDone: mappedStatus === 'completed' || mappedStatus === 'done',
              createdAt,
              updatedAt,
              completedAt: completedAt || undefined,
              progress: mappedStatus === 'completed' || mappedStatus === 'done'
                ? 100
                : mappedStatus === 'in-progress'
                  ? 50
                  : 0,
              createdBy: String(task?.createdById || task?.createdBy || ''),
            }

            allProjectTasks.push(mappedTask)
            if (mappedTask.assignees.includes(userId) || mappedTask.assignee === userId) {
              userTasks.push(mappedTask)
            }

            return mappedTask
          })

          const completedInPhase = mappedTasksForPhase.filter(task => task.status === 'completed' || task.status === 'done').length
          const hasInProgress = mappedTasksForPhase.some(task => task.status === 'in-progress')
          const phaseStatus = mappedTasksForPhase.length === 0
            ? 'pending'
            : completedInPhase === mappedTasksForPhase.length
              ? 'completed'
              : hasInProgress
                ? 'in-progress'
                : 'pending'

          return {
            id: phaseId,
            name: String(phase?.name || ''),
            description: String(phase?.description || ''),
            status: phaseStatus as 'pending' | 'in-progress' | 'completed',
            startDate: safeIsoString(phase?.startDate) || '',
            dueDate: safeIsoString(phase?.endDate) || '',
            projectId,
          }
        })

        const projectDates = deriveProjectDates(detail)
        const allocatedHours = Number(detail?.allocatedHours || 0)
        const loggedHours = Number(detail?.usedHours ?? detail?.loggedHours ?? 0)
        const remainingHours = Number(detail?.leftHours ?? Math.max(allocatedHours - loggedHours, 0))

        userProjects.push({
          id: projectId,
          name: String(detail?.title || detail?.name || 'Untitled Project'),
          description: String(detail?.description || ''),
          status: mapProjectStatus(detail?.status),
          progress: Number(detail?.progress || 0),
          startDate: projectDates.startDate,
          dueDate: projectDates.dueDate,
          team: teamIds,
          tags: [],
          priority: deriveProjectPriority(allProjectTasks),
          phases: mappedPhases,
          tasks: [],
          members: [],
          allocatedHours,
          loggedHours: toRounded(loggedHours),
          remainingHours: toRounded(remainingHours),
        })
      })

      const uniqueTaskIds = Array.from(taskIds)
      const [logsByTask, commentsByTask, sentDocsRaw, inboxDocsRaw] = await Promise.all([
        Promise.all(
          uniqueTaskIds.map(async taskId => {
            try {
              const logs = await apiGet(`/timelogs/tasks/${taskId}/timelogs`)
              return Array.isArray(logs) ? logs : []
            } catch {
              return []
            }
          })
        ),
        Promise.all(
          uniqueTaskIds.map(async taskId => {
            try {
              const comments = await apiGet(`/tasks/${taskId}/comments`)
              return Array.isArray(comments) ? comments : []
            } catch {
              return []
            }
          })
        ),
        apiGet('/api/documents/sent').catch(() => []),
        apiGet('/api/documents/inbox').catch(() => []),
      ])

      const userTimeLogs: TimeLog[] = []
      logsByTask.forEach((taskLogs, index) => {
        const fallbackTaskId = uniqueTaskIds[index] || ''
        const taskLogsList = Array.isArray(taskLogs) ? taskLogs : []
        taskLogsList.forEach((log: any) => {
          const ownerId = String(log?.userId || log?.user?.id || '')
          if (ownerId !== userId) return
          const taskId = String(log?.taskId || fallbackTaskId)
          const context = taskContextById.get(taskId)
          const startedAt = safeIsoString(log?.startedAt || log?.loggedAt || log?.createdAt) || new Date().toISOString()
          const hours = Number(log?.durationMins || 0) > 0
            ? Number(log.durationMins) / 60
            : Number(log?.hours || 0)

          userTimeLogs.push({
            id: String(log?.id || `${taskId}-${userTimeLogs.length + 1}`),
            userId,
            userName: String(log?.userName || log?.user?.name || user.name || 'Unknown'),
            projectId: context?.projectId || '',
            taskId,
            phaseId: context?.phaseId || '',
            hours: toRounded(hours),
            description: String(log?.description || ''),
            loggedAt: startedAt,
            createdAt: safeIsoString(log?.createdAt) || startedAt,
            attachmentUrl: log?.attachment?.filePath ? String(log.attachment.filePath) : undefined,
            attachmentFileName: log?.attachment?.filePath
              ? String(log.attachment.filePath).split('/').pop()
              : undefined,
          })
        })
      })

      const userComments: Comment[] = []
      commentsByTask.forEach((taskComments, index) => {
        const taskId = uniqueTaskIds[index] || ''
        const context = taskContextById.get(taskId)
        const list = Array.isArray(taskComments) ? taskComments : []

        const pushComment = (entry: any) => {
          const authorId = String(entry?.author?.id || '')
          if (authorId !== userId) return
          const authorName = String(entry?.author?.name || user.name || 'Unknown')
          userComments.push({
            id: String(entry?.id || `${taskId}-${userComments.length + 1}`),
            taskId,
            content: String(entry?.content || ''),
            author: {
              id: authorId,
              name: authorName,
              email: String(entry?.author?.email || user.email || ''),
              avatar: getInitials(authorName),
            },
            projectId: context?.projectId,
            phaseId: context?.phaseId,
            createdAt: safeIsoString(entry?.createdAt) || new Date().toISOString(),
            replies: [],
          })
        }

        list.forEach((comment: any) => {
          pushComment(comment)
          const replies = Array.isArray(comment?.replies) ? comment.replies : []
          replies.forEach((reply: any) => pushComment(reply))
        })
      })

      const userDocuments = this.mapApiDocuments(Array.isArray(sentDocsRaw) ? sentDocsRaw : [], userId)
      const reviewedDocuments = this
        .mapApiDocuments(Array.isArray(inboxDocsRaw) ? inboxDocsRaw : [], userId)
        .filter((doc) => {
          return Boolean(doc.reviewedAt) || ['approved', 'rejected', 'needs-changes'].includes(doc.status)
        })

      return this.buildAggregatedMetrics({
        user,
        tasks: userTasks,
        projects: userProjects,
        timeLogs: userTimeLogs,
        comments: userComments,
        documents: userDocuments,
        reviewedDocuments,
      })
    } catch (error) {
      console.error('Error loading profile data from API:', error)
      return this.aggregateUserData(userId, userData)
    }
  }

  private mapApiDocuments(items: any[], fallbackUserId: string): Document[] {
    return items.map((item: any, index: number) => {
      const reviewerId = item?.reviewer?.id ? String(item.reviewer.id) : (item?.reviewerId ? String(item.reviewerId) : undefined)
      const uploadedBy = String(item?.createdBy?.id || item?.createdById || item?.uploadedBy || fallbackUserId)
      const submittedAt = safeIsoString(item?.createdAt || item?.uploadedAt) || new Date().toISOString()

      return {
        id: String(item?.id || `doc-${index + 1}`),
        name: String(item?.name || item?.fileName || 'Untitled Document'),
        projectId: String(item?.projectId || ''),
        phaseId: item?.phaseId ? String(item.phaseId) : undefined,
        taskId: item?.taskId ? String(item.taskId) : undefined,
        reviewerId,
        reviewerRole: String(item?.reviewerRole || item?.reviewer?.role || ''),
        uploadedBy,
        uploadedByRole: String(item?.createdByRole || item?.uploadedByRole || ''),
        sentTo: reviewerId ? [reviewerId] : [],
        dateSubmitted: submittedAt,
        status: mapDocumentStatus(item?.status),
        fileName: String(item?.name || item?.fileName || 'document'),
        fileSize: Number(item?.fileSize || 0),
        fileType: String(item?.fileType || 'file'),
        type: String(item?.fileType || ''),
        version: Number(item?.version || 1),
        uploadedAt: submittedAt,
        reviewedAt: safeIsoString(item?.reviewedAt) || undefined,
        reviewNote: String(item?.reviewComment || item?.reviewNote || ''),
        reviewScore: typeof item?.reviewScore === 'number' ? Number(item.reviewScore) : undefined,
        externalLink: item?.externalLink ? String(item.externalLink) : undefined,
        reviewLink: item?.reviewLink ? String(item.reviewLink) : undefined,
      }
    })
  }

  private buildAggregatedMetrics(input: {
    user: User
    tasks: Task[]
    projects: Project[]
    timeLogs: TimeLog[]
    comments: Comment[]
    documents: Document[]
    reviewedDocuments: Document[]
  }): AggregatedUserData {
    const { user, tasks, projects, timeLogs, comments, documents, reviewedDocuments } = input
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const totalHoursThisMonth = toRounded(
      timeLogs
        .filter(log => {
          const ts = toTimestamp(log.loggedAt || log.createdAt)
          return ts !== null && ts >= thisMonthStart.getTime()
        })
        .reduce((sum, log) => sum + Number(log.hours || 0), 0)
    )

    const totalHoursAllTime = toRounded(
      timeLogs.reduce((sum, log) => sum + Number(log.hours || 0), 0)
    )

    const projectsInvolved = projects.length
    const phasesContributed = new Set(tasks.map(task => task.phaseId).filter(Boolean)).size

    const weeksInMonth = Math.max(
      1,
      Math.ceil((now.getTime() - thisMonthStart.getTime()) / (1000 * 60 * 60 * 24 * 7))
    )
    const averageHoursPerWeek = toRounded(totalHoursThisMonth / weeksInMonth)

    const completedTasks = tasks.filter(task => task.status === 'completed' || task.status === 'done')
    const onTimeTasks = completedTasks.filter(task => {
      const dueTs = toTimestamp(task.dueDate)
      const completedTs = toTimestamp(task.completedAt || task.updatedAt)
      return dueTs !== null && completedTs !== null && completedTs <= dueTs
    }).length

    const onTimeContribution = completedTasks.length > 0
      ? toRounded((onTimeTasks / completedTasks.length) * 100)
      : 0
    const delayedContribution = completedTasks.length > 0
      ? toRounded(((completedTasks.length - onTimeTasks) / completedTasks.length) * 100)
      : 0

    const overdueTasksCount = tasks.filter(task => {
      const dueTs = toTimestamp(task.dueDate)
      const isCompleted = task.status === 'completed' || task.status === 'done'
      return dueTs !== null && !isCompleted && dueTs < Date.now()
    }).length

    const commentsAdded = comments.length
    const commentsPerWeek = toRounded(commentsAdded / weeksInMonth)

    const documentsShared = documents.length
    const documentsReviewed = reviewedDocuments.length

    const completedProjects = projects.filter(project => project.status === 'completed')
    const projectHoursById = new Map<string, number>()
    timeLogs.forEach(log => {
      const projectId = String(log.projectId || '')
      if (!projectId) return
      const existing = projectHoursById.get(projectId) || 0
      projectHoursById.set(projectId, existing + Number(log.hours || 0))
    })

    const timeSaved = toRounded(
      completedProjects.reduce((total, project) => {
        const usedHours = projectHoursById.get(project.id) || 0
        if (project.allocatedHours <= 0) return total
        return total + Math.max(0, Number(project.allocatedHours) - usedHours)
      }, 0)
    )

    const latestCompletionByProject = new Map<string, number>()
    tasks
      .filter(task => task.status === 'completed' || task.status === 'done')
      .forEach(task => {
        const completionTs = toTimestamp(task.completedAt || task.updatedAt)
        if (completionTs === null) return
        const current = latestCompletionByProject.get(task.projectId) || 0
        if (completionTs > current) latestCompletionByProject.set(task.projectId, completionTs)
      })

    const earlyCompletions = completedProjects.filter(project => {
      const dueTs = toTimestamp(project.dueDate)
      const completionTs = latestCompletionByProject.get(project.id)
      return dueTs !== null && typeof completionTs === 'number' && completionTs <= dueTs
    }).length

    const averageTimeSaved = earlyCompletions > 0 ? toRounded(timeSaved / earlyCompletions) : 0

    return {
      user,
      tasks,
      projects,
      timeLogs,
      comments,
      documents,
      totalHoursThisMonth,
      totalHoursAllTime,
      projectsInvolved,
      phasesContributed,
      averageHoursPerWeek,
      onTimeContribution,
      delayedContribution,
      overdueTasksCount,
      commentsAdded,
      commentsPerWeek,
      documentsShared,
      documentsReviewed,
      timeSaved,
      earlyCompletions,
      averageTimeSaved,
    }
  }

  public aggregateUserData(userId: string, userData?: User): AggregatedUserData {
    const user: User = userData || {
      id: userId,
      name: 'John Doe',
      email: 'john@company.com',
      role: 'manager',
      department: 'Engineering',
      avatar: 'JD',
      isActive: true,
      lastActive: new Date().toISOString()
    }

    // Filter data for the specific user
    const userTasks = this.allTasks.filter(task => task.assignee === userId)
    const userProjects = this.allProjects.filter(project => project.team.includes(userId))
    const userTimeLogs = this.allTimeLogs.filter(log => log.userId === userId)
    const userComments = this.allComments.filter(comment => comment.author.id === userId)
    const userDocuments = this.allDocuments.filter(doc => doc.uploadedBy === userId)

    // Calculate metrics
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const totalHoursThisMonth = userTimeLogs
      .filter(log => new Date(log.loggedAt) >= thisMonthStart)
      .reduce((sum, log) => sum + log.hours, 0)

    const totalHoursAllTime = userTimeLogs.reduce((sum, log) => sum + log.hours, 0)

    const projectsInvolved = userProjects.length

    const phasesContributed = new Set(userTasks.map(task => task.phaseId)).size

    const weeksInMonth = Math.ceil((now.getTime() - thisMonthStart.getTime()) / (1000 * 60 * 60 * 24 * 7))
    const averageHoursPerWeek = totalHoursThisMonth / weeksInMonth

    // Task performance calculations
    const completedTasks = userTasks.filter(task => task.status === 'completed')
    const onTimeTasks = completedTasks.filter(task => {
      if (!task.dueDate || !task.completedAt) return false
      const dueDate = new Date(task.dueDate)
      const completedDate = new Date(task.completedAt)
      return completedDate <= dueDate
    }).length

    const onTimeContribution = completedTasks.length > 0 ? (onTimeTasks / completedTasks.length) * 100 : 0
    const delayedContribution = completedTasks.length > 0 ? ((completedTasks.length - onTimeTasks) / completedTasks.length) * 100 : 0

    const overdueTasksCount = userTasks.filter(task => {
      if (!task.dueDate || task.status === 'completed') return false
      const dueDate = new Date(task.dueDate)
      return new Date() > dueDate
    }).length

    // Collaboration metrics
    const commentsAdded = userComments.length
    const commentsPerWeek = commentsAdded / weeksInMonth

    const documentsShared = userDocuments.length
    const documentsReviewed = userDocuments.filter(doc => doc.status === 'approved').length

    // Efficiency metrics - only calculate for completed projects
    const completedUserProjects = userProjects.filter(project => project.status === 'completed')
    const timeSaved = completedUserProjects.reduce((total, project) => {
      if (project.allocatedHours > 0) {
        const projectTimeLogs = userTimeLogs.filter(log => log.projectId === project.id)
        const loggedHours = projectTimeLogs.reduce((sum, log) => sum + log.hours, 0)
        return total + Math.max(0, project.allocatedHours - loggedHours)
      }
      return total
    }, 0)

    const earlyCompletions = completedUserProjects.filter(project => {
      if (!project.dueDate) return false
      const dueDate = new Date(project.dueDate)
      const completedDate = new Date() // Assuming completed projects are finished now
      return completedDate < dueDate
    }).length

    const averageTimeSaved = earlyCompletions > 0 ? timeSaved / earlyCompletions : 0

    return {
      user,
      tasks: userTasks,
      projects: userProjects,
      timeLogs: userTimeLogs,
      comments: userComments,
      documents: userDocuments,
      totalHoursThisMonth,
      totalHoursAllTime,
      projectsInvolved,
      phasesContributed,
      averageHoursPerWeek,
      onTimeContribution,
      delayedContribution,
      overdueTasksCount,
      commentsAdded,
      commentsPerWeek,
      documentsShared,
      documentsReviewed,
      timeSaved,
      earlyCompletions,
      averageTimeSaved
    }
  }

  // Method to update data (for real-time updates)
  public updateTask(task: Task) {
    const index = this.allTasks.findIndex(t => t.id === task.id)
    if (index >= 0) {
      this.allTasks[index] = task
    } else {
      this.allTasks.push(task)
    }
  }

  public updateProject(project: Project) {
    const index = this.allProjects.findIndex(p => p.id === project.id)
    if (index >= 0) {
      this.allProjects[index] = project
    } else {
      this.allProjects.push(project)
    }
  }

  public addTimeLog(timeLog: TimeLog) {
    this.allTimeLogs.push(timeLog)
  }

  public addComment(comment: Comment) {
    this.allComments.push(comment)
  }

  public addDocument(document: Document) {
    this.allDocuments.push(document)
  }
}

// Singleton instance
export const dataAggregator = new DataAggregator()
