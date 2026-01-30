import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  Calendar, 
  Users, 
  Target, 
  CheckCircle2, 
  ArrowLeft,
  Download,
  RefreshCw,
  FileText,
  MessageSquare,
  BarChart3,
  Search,
  Clock,
  Eye,
  X
} from 'lucide-react'
import PerformanceDetailModal from '../components/PerformanceDetailModal'
import { AvatarGroup, AvatarGroupTooltip } from '@/components/animate-ui/components/animate/avatar-group'
import { apiGet } from '../services/api'

interface ProjectMember {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
  department: string
}

interface ProjectEvent {
  id: string
  type: 'PHASE_STARTED' | 'PHASE_COMPLETED' | 'TASK_CREATED' | 'TASK_STARTED' | 'TASK_COMPLETED' | 'TASK_REASSIGNED' | 'TASK_MOVED_PHASE' | 'MILESTONE_ACHIEVED' | 'DOC_UPLOADED' | 'DOC_REVIEW_REQUESTED' | 'DOC_APPROVED' | 'DOC_REJECTED' | 'DOC_REVISED' | 'COMMENT_ADDED' | 'PROJECT_KICKOFF' | 'PROJECT_DECISION' | 'PROJECT_CLOSED' | 'PROJECT_REOPENED' | 'TIME_LOG_ADDED'
  occurredAt: string
  actorId?: string
  actorName?: string
  entityRef: string
  labels: string[]
  phaseId?: string
  taskId?: string
  description: string
  duration?: number
  metadata?: any
}

interface ProjectDocument {
  id: string
  name: string
  type: string
  uploadedBy: ProjectMember
  uploadedAt: string
  phaseId?: string
  taskId?: string
  reviewStatus: 'pending' | 'approved' | 'rejected'
  size: string
  fileUrl?: string
}

interface ProjectComment {
  id: string
  author: ProjectMember
  content: string
  createdAt: string
  phaseId?: string
  taskId?: string
  replies?: ProjectComment[]
}

interface ProjectTimeLog {
  id: string
  userId: string
  userName: string
  projectId: string
  phaseId?: string
  taskId?: string
  hours: number
  description: string
  loggedAt: string
  createdAt: string
}

interface ProjectTaskSummary {
  id: string
  name: string
  phaseId?: string
}

interface ProjectTaskDetail {
  id: string
  title: string
  status: 'completed' | 'in-progress' | 'not-started' | 'on-hold'
  assignee: ProjectMember
  dueDate?: string
}

interface ProjectPhaseDetail {
  id: string
  title: string
  status: 'completed'
  startDate: string
  endDate: string
  tasks: ProjectTaskDetail[]
}

interface CompletedProjectData {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  completedAt: string
  status: 'completed'
  progress: number
  team: ProjectMember[]
  phases: ProjectPhaseDetail[]
  manager: ProjectMember
  department: string
  totalTasks: number
  completedTasks: number
  totalPhases: number
  uniqueAssignees: number
  duration: number
  allocatedHours: number
}

interface TeamPerformance {
  member: ProjectMember
  tasksCompleted: number
  onTimeCompletion: number
  averageLateness: number
  reviewParticipation: number
  approvalRatio: number
  documentsSent: number
  commentsCount: number
  hoursLogged: number
  kpiScore: number
  effortShare: number
}

const CompletedProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<'timeline' | 'documents' | 'comments' | 'time-logs' | 'analytics'>('timeline')
  const [timeWindow, setTimeWindow] = useState<'all' | 'phase' | 'month'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPhase, setSelectedPhase] = useState<string>('all')
  const [selectedMember, setSelectedMember] = useState<TeamPerformance | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<ProjectDocument | null>(null)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [selectedEventType, setSelectedEventType] = useState<string>('all')

  const [project, setProject] = useState<CompletedProjectData | null>(null)
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [comments, setComments] = useState<ProjectComment[]>([])
  const [timeLogs, setTimeLogs] = useState<ProjectTimeLog[]>([])
  const [timelineEvents, setTimelineEvents] = useState<ProjectEvent[]>([])
  const [tasks, setTasks] = useState<ProjectTaskSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

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

  const mapMember = (user: any, roleOverride?: string, departmentOverride?: string): ProjectMember => {
    const name = String(user?.name || 'Unknown')
    return {
      id: String(user?.id || ''),
      name,
      email: String(user?.email || ''),
      role: String(roleOverride || user?.role?.name || user?.role || 'Member'),
      department: String(departmentOverride || user?.department?.name || user?.department || ''),
      avatar: buildAvatar(name),
    }
  }

  const normalizeTaskStatus = (status: string): ProjectTaskDetail['status'] => {
    const raw = String(status || '').toUpperCase()
    if (raw === 'IN_PROGRESS') return 'in-progress'
    if (raw === 'COMPLETED') return 'completed'
    if (raw === 'ON_HOLD') return 'on-hold'
    return 'not-started'
  }

  const deriveDateRange = (phases: ProjectPhaseDetail[]) => {
    let minStart = Number.POSITIVE_INFINITY
    let maxEnd = Number.NEGATIVE_INFINITY
    phases.forEach(phase => {
      const startTs = phase.startDate ? Date.parse(phase.startDate) : NaN
      const endTs = phase.endDate ? Date.parse(phase.endDate) : NaN
      if (!Number.isNaN(startTs)) minStart = Math.min(minStart, startTs)
      if (!Number.isNaN(endTs)) maxEnd = Math.max(maxEnd, endTs)
    })
    return {
      start: Number.isFinite(minStart) ? new Date(minStart).toISOString() : '',
      end: Number.isFinite(maxEnd) ? new Date(maxEnd).toISOString() : '',
    }
  }

  const pickDate = (...values: Array<string | null | undefined>) => {
    for (const value of values) {
      if (!value) continue
      const ts = Date.parse(value)
      if (!Number.isNaN(ts)) return new Date(ts).toISOString()
    }
    return new Date().toISOString()
  }

  const resolveAssignee = (task: any, team: ProjectMember[]) => {
    const assignees = Array.isArray(task?.assignees) ? task.assignees : []
    const first = assignees[0]?.user || assignees[0]
    if (first) return mapMember(first, assignees[0]?.role, assignees[0]?.user?.department?.name)
    if (team[0]) return team[0]
    return { id: 'unknown', name: 'Unassigned', email: '', role: '', department: '', avatar: 'U' }
  }

  const mapReviewStatus = (status: string): ProjectDocument['reviewStatus'] => {
    const normalized = String(status || '').toLowerCase()
    if (normalized === 'approved') return 'approved'
    if (normalized === 'rejected') return 'rejected'
    return 'pending'
  }

  const mapDocumentType = (name: string) => {
    const parts = String(name || '').split('.')
    const ext = parts.length > 1 ? parts[parts.length - 1] : ''
    return ext ? ext.toUpperCase() : 'FILE'
  }

  useEffect(() => {
    if (!id) return
    let active = true

    const loadProject = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const detail = await apiGet(`/projects/${id}`)
        if (!detail) throw new Error('Project not found')
        const memberships = Array.isArray(detail?.memberships) ? detail.memberships : []
        const team = memberships
          .map((m: any) => mapMember(m?.user, m?.role, m?.user?.department?.name))
          .filter((member: ProjectMember) => member.id)
        const teamById = new Map(team.map(member => [member.id, member]))
        const phases = Array.isArray(detail?.phases) ? detail.phases : []
        const phaseDetails: ProjectPhaseDetail[] = phases.map((phase: any) => {
          const tasksInPhase = Array.isArray(phase?.tasks) ? phase.tasks : []
          return {
            id: String(phase?.id || ''),
            title: String(phase?.name || ''),
            status: 'completed',
            startDate: phase?.startDate ? new Date(phase.startDate).toISOString() : '',
            endDate: phase?.endDate ? new Date(phase.endDate).toISOString() : '',
            tasks: tasksInPhase.map((task: any) => ({
              id: String(task?.id || ''),
              title: String(task?.title || ''),
              status: normalizeTaskStatus(task?.status),
              assignee: resolveAssignee(task, team),
              dueDate: task?.dueDate ? new Date(task.dueDate).toISOString() : undefined,
            })),
          }
        })

        const taskSummaries: ProjectTaskSummary[] = phaseDetails.flatMap(phase =>
          phase.tasks.map(task => ({ id: task.id, name: task.title, phaseId: phase.id }))
        )
        const allTasks = phaseDetails.flatMap(phase => phase.tasks)
        const completedTasks = allTasks.filter(task => task.status === 'completed').length
        const assigneeIds = new Set(allTasks.map(task => task.assignee?.id).filter(Boolean) as string[])
        const range = deriveDateRange(phaseDetails)
        const startDate = pickDate(detail?.startDate, range.start, detail?.createdAt)
        const endDate = pickDate(detail?.endDate, range.end, detail?.updatedAt)
        const progress = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0

        let manager: ProjectMember | null = null
        const preferred = memberships.find((m: any) => String(m?.role || '').toUpperCase() === 'DIRECTOR')
          || memberships.find((m: any) => String(m?.role || '').toUpperCase() === 'MANAGER')
        if (preferred?.user) manager = mapMember(preferred.user, preferred.role, preferred.user?.department?.name)
        if (!manager) manager = team[0] || { id: 'unknown', name: 'Unknown', email: '', role: 'Manager', department: '', avatar: 'U' }

        const projectData: CompletedProjectData = {
          id: String(detail?.id || ''),
          title: String(detail?.title || ''),
          description: String(detail?.description || ''),
          startDate,
          endDate,
          completedAt: endDate,
          status: 'completed',
          progress,
          team,
          phases: phaseDetails,
          manager,
          department: manager.department || team[0]?.department || '',
          totalTasks: allTasks.length,
          completedTasks,
          totalPhases: phaseDetails.length,
          uniqueAssignees: assigneeIds.size || team.length,
          duration: 0,
          allocatedHours: Number(detail?.allocatedHours || 0),
        }

        if (active) {
          setProject(projectData)
          setTasks(taskSummaries)
        }

        const taskIds = taskSummaries.map(task => task.id).filter(Boolean)
        if (taskIds.length === 0) {
          if (active) {
            setDocuments([])
            setComments([])
            setTimeLogs([])
            setTimelineEvents([])
          }
          return
        }

        const [commentsByTask, documentsByTask, timeLogsByTask] = await Promise.all([
          Promise.all(taskIds.map(taskId => apiGet(`/tasks/${taskId}/comments`).catch(() => []))),
          Promise.all(taskIds.map(taskId => apiGet(`/api/documents/by-task/${taskId}`).catch(() => []))),
          Promise.all(taskIds.map(taskId => apiGet(`/timelogs/tasks/${taskId}/timelogs`).catch(() => []))),
        ])

        const taskPhaseMap = new Map(taskSummaries.map(task => [task.id, task.phaseId]))
        const taskNameMap = new Map(taskSummaries.map(task => [task.id, task.name]))

        const mappedComments: ProjectComment[] = commentsByTask
          .flat()
          .map((comment: any) => ({
            id: String(comment?.id || ''),
            author: mapMember(comment?.author),
            content: String(comment?.content || ''),
            createdAt: String(comment?.createdAt || new Date().toISOString()),
            phaseId: taskPhaseMap.get(comment?.taskId),
            taskId: comment?.taskId ? String(comment.taskId) : undefined,
          }))

        const mappedDocuments: ProjectDocument[] = documentsByTask
          .flat()
          .map((doc: any) => ({
            id: String(doc?.id || ''),
            name: String(doc?.name || ''),
            type: mapDocumentType(doc?.name),
            uploadedBy: mapMember(doc?.createdBy || {}),
            uploadedAt: String(doc?.createdAt || new Date().toISOString()),
            phaseId: doc?.phaseId ? String(doc.phaseId) : undefined,
            taskId: doc?.taskId ? String(doc.taskId) : undefined,
            reviewStatus: mapReviewStatus(doc?.status),
            size: String(doc?.size || '-'),
            fileUrl: doc?.fileUrl ? String(doc.fileUrl) : undefined,
          }))

        const mappedTimeLogs: ProjectTimeLog[] = timeLogsByTask
          .flat()
          .map((log: any) => {
            const userId = String(log?.userId || '')
            const teamMember = teamById.get(userId)
            return {
              id: String(log?.id || ''),
              userId,
              userName: String(log?.userName || log?.user?.name || teamMember?.name || 'Unknown'),
              projectId: String(detail?.id || ''),
              phaseId: taskPhaseMap.get(log?.taskId),
              taskId: log?.taskId ? String(log.taskId) : undefined,
              hours: Math.round(((Number(log?.durationMins || 0) / 60) + Number.EPSILON) * 10) / 10,
              description: String(log?.description || ''),
              loggedAt: String(log?.startedAt || log?.createdAt || new Date().toISOString()),
              createdAt: String(log?.createdAt || log?.startedAt || new Date().toISOString()),
            }
          })

        const timeline: ProjectEvent[] = []
        mappedDocuments.forEach(doc => {
          timeline.push({
            id: `doc-${doc.id}`,
            type: 'DOC_UPLOADED',
            occurredAt: doc.uploadedAt,
            actorId: doc.uploadedBy.id,
            actorName: doc.uploadedBy.name,
            entityRef: doc.id,
            labels: ['Document', doc.name],
            phaseId: doc.phaseId,
            taskId: doc.taskId,
            description: doc.name,
          })
        })
        mappedComments.forEach(comment => {
          const snippet = comment.content.length > 120 ? `${comment.content.slice(0, 120)}...` : comment.content
          timeline.push({
            id: `comment-${comment.id}`,
            type: 'COMMENT_ADDED',
            occurredAt: comment.createdAt,
            actorId: comment.author.id,
            actorName: comment.author.name,
            entityRef: comment.id,
            labels: ['Comment'],
            phaseId: comment.phaseId,
            taskId: comment.taskId,
            description: snippet || 'Comment added',
          })
        })
        mappedTimeLogs.forEach(log => {
          const taskName = log.taskId ? taskNameMap.get(log.taskId) : ''
          timeline.push({
            id: `time-${log.id}`,
            type: 'TIME_LOG_ADDED',
            occurredAt: log.createdAt,
            actorId: log.userId,
            actorName: log.userName,
            entityRef: log.id,
            labels: ['Time Log', taskName || 'Task'],
            phaseId: log.phaseId,
            taskId: log.taskId,
            description: log.description || `Logged ${log.hours}h`,
            duration: log.hours,
          })
        })

        if (active) {
          setDocuments(mappedDocuments)
          setComments(mappedComments)
          setTimeLogs(mappedTimeLogs)
          setTimelineEvents(timeline.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()))
        }
      } catch (e: any) {
        if (active) setLoadError(e?.message || 'Failed to load project')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadProject()
    return () => {
      active = false
    }
  }, [id])

  const actualHours = useMemo(() => {
    return timeLogs.reduce((total, log) => total + log.hours, 0)
  }, [timeLogs])

  const teamPerformance: TeamPerformance[] = useMemo(() => {
    if (!project) return []
    const totalProjectHours = timeLogs.reduce((total, log) => total + log.hours, 0)
    const allTasks = project.phases.flatMap(phase => phase.tasks)

    return project.team.map(member => {
      const memberTimeLogs = timeLogs.filter(log => log.userId === member.id)
      const hoursLogged = memberTimeLogs.reduce((total, log) => total + log.hours, 0)
      const memberTasks = allTasks.filter(task => task.assignee.id === member.id)
      const tasksCompleted = memberTasks.filter(task => task.status === 'completed').length
      const documentsSent = documents.filter(doc => doc.uploadedBy.id === member.id).length
      const commentsCount = comments.filter(comment => comment.author.id === member.id).length
      const effortShare = totalProjectHours > 0 ? hoursLogged / totalProjectHours : 0
      const onTimeCompletion = memberTasks.length > 0 ? Math.round((tasksCompleted / memberTasks.length) * 100) : 0
      const approvalRatio = documentsSent > 0
        ? Math.round((documents.filter(doc => doc.uploadedBy.id === member.id && doc.reviewStatus === 'approved').length / documentsSent) * 100)
        : 0
      const kpiScore = Math.min(100, Math.round(onTimeCompletion * 0.7 + effortShare * 30))

      return {
        member,
        tasksCompleted,
        onTimeCompletion,
        averageLateness: 0,
        reviewParticipation: documentsSent,
        approvalRatio,
        documentsSent,
        commentsCount,
        hoursLogged,
        kpiScore,
        effortShare,
      }
    })
  }, [project, timeLogs, documents, comments])
  const formatDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleDocumentAction = (doc: ProjectDocument, action: 'view' | 'download') => {
    if (action === 'view') {
      setSelectedDocument(doc)
      setShowDocumentModal(true)
    } else if (action === 'download') {
      const fileUrl = doc.fileUrl || ''
      if (!fileUrl) {
        alert('No file URL available for this document.')
        return
      }
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = doc.name
      link.click()
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'PROJECT_KICKOFF':
      case 'PROJECT_CLOSED':
        return <div className="w-3 h-3 rounded-full bg-blue-500" />
      case 'PHASE_STARTED':
      case 'PHASE_COMPLETED':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />
      case 'TASK_CREATED':
      case 'TASK_STARTED':
      case 'TASK_COMPLETED':
        return <CheckCircle2 className="h-3 w-3 text-blue-500" />
      case 'DOC_UPLOADED':
      case 'DOC_APPROVED':
        return <FileText className="h-3 w-3 text-purple-500" />
      case 'COMMENT_ADDED':
        return <MessageSquare className="h-3 w-3 text-gray-500" />
      case 'TIME_LOG_ADDED':
        return <Clock className="h-3 w-3 text-orange-500" />
      default:
        return <div className="w-3 h-3 rounded-full bg-gray-400" />
    }
  }


  const filteredEvents = useMemo(() => {
    return timelineEvents.filter(event => {
      const matchesSearch = event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.actorName?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesPhase = selectedPhase === 'all' || event.phaseId === selectedPhase
      
      const matchesEventType = selectedEventType === 'all' || event.type === selectedEventType
      
      return matchesSearch && matchesPhase && matchesEventType
    })
  }, [timelineEvents, searchTerm, selectedPhase, selectedEventType])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-black dark:bg-black flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">Loading completed project...</div>
      </div>
    )
  }

  if (loadError || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-black dark:bg-black flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">{loadError || 'Project not found.'}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-black dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
          <Link
            to="/completed-projects"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Completed Projects
          </Link>
          
          <div className="flex items-center space-x-3">
            <button className="btn-secondary flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span>Reopen Project</span>
            </button>
            <button className="btn-secondary flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </button>
            <button className="btn-primary flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Download All Files</span>
            </button>
          </div>
        </div>
        </div>

        <div className="bg-white dark:bg-black/60 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{project.title}</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{project.description}</p>
              {/* Animated team avatars (Animate UI) */}
              <div className="mb-6">
                <AvatarGroup className="h-10 -space-x-3">
                  {project.team.map((m) => (
                    <div key={m.id} className="inline-flex items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-800 bg-gradient-to-br from-indigo-500 to-blue-600 text-white h-10 w-10 text-xs">
                      {(m.avatar || m.name).split(' ').map(p => p[0]).join('').slice(0,2)}
                      <AvatarGroupTooltip className="max-w-xs">
                        <div className="font-medium">{m.name}</div>
                        <div className="text-white/90 text-xs">{m.role}</div>
                      </AvatarGroupTooltip>
                    </div>
                  ))}
                </AvatarGroup>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatDuration(project.startDate, project.endDate)} days
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Phases</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{project.totalPhases}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tasks Completed</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{project.completedTasks}/{project.totalTasks}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Team Size</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{project.uniqueAssignees}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Allocated Time</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{project.allocatedHours}h</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Estimated</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Actual Time</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{actualHours}h</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {project.allocatedHours > 0 ? 
                        `${Math.round((actualHours / project.allocatedHours) * 100)}% of allocated` : 
                        'Logged time'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200 dark:border-white/10">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'timeline', name: 'Timeline', icon: Clock },
              { id: 'documents', name: 'Documents', icon: FileText },
              { id: 'comments', name: 'Comments', icon: MessageSquare },
              { id: 'time-logs', name: 'Time Logs', icon: Clock },
              { id: 'analytics', name: 'Team Analytics', icon: BarChart3 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          {/* Timeline Controls */}
          <div className="bg-white dark:bg-black/60 rounded-xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search timeline events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-black/50 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <select
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-black/50 dark:text-white"
                >
                  <option value="all">All Time</option>
                  <option value="phase">By Phase</option>
                  <option value="month">By Month</option>
                </select>
                
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-black/50 dark:text-white"
                >
                  <option value="all">All Phases</option>
                  {project.phases.map(phase => (
                    <option key={phase.id} value={phase.id}>{phase.title}</option>
                  ))}
                </select>
                
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-black/50 dark:text-white"
                >
                  <option value="all">All Events</option>
                  <option value="PROJECT_KICKOFF">Project Events</option>
                  <option value="PHASE_STARTED">Phase Events</option>
                  <option value="TASK_CREATED">Task Events</option>
                  <option value="DOC_UPLOADED">Document Events</option>
                  <option value="COMMENT_ADDED">Comment Events</option>
                  <option value="TIME_LOG_ADDED">Time Logs</option>
                </select>
              </div>
            </div>
          </div>

          {/* Timeline Events */}
          <div className="space-y-8">
            {Object.entries(
              filteredEvents.reduce((acc, event) => {
                const date = new Date(event.occurredAt)
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                if (!acc[monthKey]) {
                  acc[monthKey] = []
                }
                acc[monthKey].push(event)
                return acc
              }, {} as Record<string, typeof filteredEvents>)
            ).map(([monthKey, events]) => {
              const [year, month] = monthKey.split('-')
              const date = new Date(parseInt(year), parseInt(month) - 1)
              const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              
              return (
                <div key={monthKey} className="animate-fade-in">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{monthName}</h3>
                  </div>
                  
                  <div className="relative pl-8 space-y-4">
                    {/* Timeline line */}
                    <div className="absolute left-2.5 top-2 bottom-2 w-px bg-gray-300 dark:bg-white/10" />
                    
                    {events.map((event) => (
                      <div key={event.id} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[1.375rem] top-1.5 w-5 h-5 rounded-full bg-white dark:bg-black/60 border-2 border-gray-300 dark:border-white/10 flex items-center justify-center">
                          {getEventIcon(event.type)}
                        </div>
                        
                        {/* Content */}
                        <div className={`bg-white dark:bg-black/60 rounded-lg border border-gray-200 dark:border-white/10 p-4 hover:shadow-md transition-shadow ${
                          event.type === 'DOC_UPLOADED' || event.type === 'DOC_APPROVED' ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''
                        }`}
                        onClick={() => {
                          if (event.type === 'DOC_UPLOADED' || event.type === 'DOC_APPROVED') {
                            // Find the document in the documents array
                            const doc = documents.find(d => d.name === event.description)
                            if (doc) {
                              // Open document preview or download
                              handleDocumentAction(doc, 'view')
                            }
                          }
                        }}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 dark:text-white">{event.description}</p>
                                  {event.type === 'TIME_LOG_ADDED' && event.duration && (
                                    <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-2 py-1 rounded">
                                      {event.duration}h
                                    </span>
                                  )}
                                </div>
                                {(event.type === 'DOC_UPLOADED' || event.type === 'DOC_APPROVED') && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const doc = documents.find(d => d.name === event.description)
                                        if (doc) {
                                          handleDocumentAction(doc, 'view')
                                        }
                                      }}
                                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium"
                                    >
                                      View
                                    </button>
                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const doc = documents.find(d => d.name === event.description)
                                        if (doc) {
                                          handleDocumentAction(doc, 'download')
                                        }
                                      }}
                                      className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-xs font-medium"
                                    >
                                      Download
                                    </button>
                                  </div>
                                )}
                              </div>
                              {event.actorName && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  by {event.actorName}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {new Date(event.occurredAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-black/60 rounded-xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Documents</h3>
              <div className="flex items-center space-x-2">
                <button className="btn-secondary flex items-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Download All</span>
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-black/70">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{doc.name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{doc.type}</span>
                        <span>{doc.size}</span>
                        <span>by {doc.uploadedBy.name}</span>
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      doc.reviewStatus === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      doc.reviewStatus === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {doc.reviewStatus}
                    </span>
                    <button className="btn-secondary flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>Preview</span>
                    </button>
                    <button className="btn-primary flex items-center space-x-1">
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-black/60 rounded-xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Comments</h3>
              
              {/* Filters */}
              <div className="flex items-center space-x-4">
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Phases</option>
                  {project.phases.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-6">
              {comments
                .filter(comment => selectedPhase === 'all' || comment.phaseId === selectedPhase)
                .map((comment) => (
                <div key={comment.id} className="border-b border-gray-200 dark:border-white/10 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-start space-x-4">
                    <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                      {comment.author.avatar}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{comment.author.name}</h4>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 dark:text-gray-300 mb-3">{comment.content}</p>
                      
                      <div className="flex items-center space-x-4">
                        {comment.phaseId && (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Phase:</span>
                            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                              {project.phases.find(p => p.id === comment.phaseId)?.title}
                            </span>
                          </div>
                        )}
                        
                        {comment.taskId && (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Task:</span>
                            <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">
                              {tasks.find(t => t.id === comment.taskId)?.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Time Logs Tab */}
      {activeTab === 'time-logs' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-black/60 rounded-xl border border-gray-200 dark:border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Time Logs</h3>
              
              {/* Filters */}
              <div className="flex items-center space-x-4">
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 bg-white dark:bg-black/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Phases</option>
                  {project.phases.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-6">
              {(() => {
                // Get all time log events
                const timeLogEvents = timelineEvents.filter(event => event.type === 'TIME_LOG_ADDED')
                
                // Group by person
                const groupedByPerson = timeLogEvents.reduce((acc, event) => {
                  const personName = event.actorName || 'Unknown'
                  if (!acc[personName]) {
                    acc[personName] = []
                  }
                  acc[personName].push(event)
                  return acc
                }, {} as Record<string, typeof timeLogEvents>)
                
                // Filter by phase if selected
                const filteredGrouped = Object.entries(groupedByPerson).reduce((acc, [personName, events]) => {
                  const filteredEvents = events.filter(event => 
                    selectedPhase === 'all' || event.phaseId === selectedPhase
                  )
                  if (filteredEvents.length > 0) {
                    acc[personName] = filteredEvents
                  }
                  return acc
                }, {} as Record<string, typeof timeLogEvents>)
                
                return Object.entries(filteredGrouped).map(([personName, events]) => {
                  const totalHours = events.reduce((sum, event) => sum + (event.duration || 0), 0)
                  
                  return (
                    <div key={personName} className="border border-gray-200 dark:border-white/10 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium">
                            {personName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{personName}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {events.length} time log{events.length !== 1 ? 's' : ''} • {totalHours.toFixed(1)}h total
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            {totalHours.toFixed(1)}h
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Total Time</div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {events
                          .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
                          .map((event) => {
                            const phase = project.phases.find(p => p.id === event.phaseId)
                            const task = tasks.find(t => t.id === event.taskId)
                            
                            return (
                              <div key={event.id} className="bg-gray-50 dark:bg-black/50 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Clock className="h-4 w-4 text-orange-500" />
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {event.duration}h logged
                                      </span>
                                      <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-2 py-1 rounded">
                                        {event.duration}h
                                      </span>
                                    </div>
                                    
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                      {event.description}
                                    </p>
                                    
                                    <div className="flex items-center space-x-4">
                                      {phase && (
                                        <div className="flex items-center space-x-1">
                                          <span className="text-xs text-gray-500 dark:text-gray-400">Phase:</span>
                                          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                                            {phase.title}
                                          </span>
                                        </div>
                                      )}
                                      
                                      {task && (
                                        <div className="flex items-center space-x-1">
                                          <span className="text-xs text-gray-500 dark:text-gray-400">Task:</span>
                                          <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">
                                            {task.name}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(event.occurredAt).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500">
                                      {new Date(event.occurredAt).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )
                })
              })()}
              
              {(() => {
                const timeLogEvents = timelineEvents.filter(event => event.type === 'TIME_LOG_ADDED')
                const filteredEvents = timeLogEvents.filter(event => 
                  selectedPhase === 'all' || event.phaseId === selectedPhase
                )
                
                if (filteredEvents.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No Time Logs Found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedPhase === 'all' 
                          ? 'No time logs have been recorded for this project.'
                          : 'No time logs found for the selected phase.'
                        }
                      </p>
                    </div>
                  )
                }
                return null
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Team Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-black/60 rounded-xl border border-gray-200 dark:border-white/10 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Team Performance Analytics</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                <thead className="bg-gray-50 dark:bg-black/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tasks Completed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">On-Time %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Documents</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Comments</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">KPI Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-black/60 divide-y divide-gray-200 dark:divide-white/10">
                  {teamPerformance.map((member) => (
                    <tr key={member.member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                            {member.member.avatar}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{member.member.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{member.member.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {member.tasksCompleted.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {member.onTimeCompletion}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {member.documentsSent}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {member.commentsCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {member.hoursLogged}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{member.kpiScore}</span>
                          <div className="w-16 bg-gray-200 dark:bg-black/50 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${member.kpiScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedMember(member)}
                          className="btn-secondary text-sm"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manager Notes Section */}
      <div className="bg-white dark:bg-black/60 rounded-xl border border-gray-200 dark:border-white/10 p-6 mt-6 bg-opacity-50 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Manager Notes & Final Comments
        </h3>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          Excellent project execution. Team demonstrated strong collaboration and met all deadlines. 
          The project was completed successfully with 100% task completion rate and all phases delivered on time. 
          Special recognition to the development team for their outstanding work on the UI/UX implementation.
        </p>
      </div>

      {/* Performance Detail Modal */}
      {selectedMember && (
        <PerformanceDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {/* Document Preview Modal */}
      {showDocumentModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-black/60 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedDocument.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Uploaded by {selectedDocument.uploadedBy.name} • {selectedDocument.size}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDocumentModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="bg-gray-50 dark:bg-black/50 rounded-lg p-8 text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Document Preview
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Preview for {selectedDocument.name} is not available in this demo.
                </p>
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={() => handleDocumentAction(selectedDocument, 'download')}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Document</span>
                  </button>
                  <button
                    onClick={() => setShowDocumentModal(false)}
                    className="btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompletedProjectDetail
