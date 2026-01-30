import React, { useState, useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { Task, User, Comment, TimeLog, Project } from '../types/index.ts'
import { HiArrowLeft, HiClock, HiDocument, HiChat, HiCheckCircle, HiCalendar, HiTrendingUp, HiEye, HiDownload, HiPlay, HiStop, HiUser, HiUsers } from 'react-icons/hi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { apiGet, apiJson, API_BASE } from '../services/api'
import { getCurrentUser } from '../services/usersAPI'

const TaskDetail: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>()
  const location = useLocation()
  
  // State management
  const [task, setTask] = useState<Task | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [projectTimeLogs, setProjectTimeLogs] = useState<TimeLog[]>([])
  const [taskTimeLogs, setTaskTimeLogs] = useState<Array<{ durationMins: number; startedAt: string; endedAt: string; description: string; userId: string; userName?: string; attachmentPath?: string | null }>>([])
  const [isMarkingDone, setIsMarkingDone] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0])
  const [newLogContent, setNewLogContent] = useState('')
  const [newLogHours, setNewLogHours] = useState(0)
  const [isSavingLog, setIsSavingLog] = useState(false)
  const [newCostDate, setNewCostDate] = useState(new Date().toISOString().split('T')[0])
  const [newCostAmount, setNewCostAmount] = useState('')
  const [newCostCategory, setNewCostCategory] = useState('Food')
  const [newCostCustomCategory, setNewCostCustomCategory] = useState('')
  const [newCostNote, setNewCostNote] = useState('')
  const [isSavingCost, setIsSavingCost] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [activity, setActivity] = useState<Array<{ id: string; description: string; timestamp: string; by?: string }>>([])
  type TimelineItem = {
    id: string
    type: 'history' | 'document' | 'timelog'
    title: string
    by?: string
    timestamp: string
    url?: string
    hours?: number
  }
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  // Speech-to-Text states (AssemblyAI via server proxy)
  const [isRecLog, setIsRecLog] = useState(false)
  const [isRecComment, setIsRecComment] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const recChunksLog = React.useRef<BlobPart[]>([])
  const recChunksComment = React.useRef<BlobPart[]>([])
  const mediaRecLog = React.useRef<MediaRecorder | null>(null)
  const mediaRecComment = React.useRef<MediaRecorder | null>(null)
  // Realtime dictation
  const [isLiveLog, setIsLiveLog] = useState(false)
  const [isLiveComment, setIsLiveComment] = useState(false)
  const wsRef = React.useRef<WebSocket | null>(null)
  const audioCtxRef = React.useRef<AudioContext | null>(null)
  const sourceRef = React.useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = React.useRef<ScriptProcessorNode | null>(null)
  const liveBaseTextRef = React.useRef<{ log: string; comment: string }>({ log: '', comment: '' })
  const [isSavingComment, setIsSavingComment] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSavingReply, setIsSavingReply] = useState(false)
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPosition, setMentionPosition] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [newLogFile, setNewLogFile] = useState<File | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'time' | 'comments' | 'documents' | 'history'>('overview')
  const [timeLogFilter, setTimeLogFilter] = useState<'all' | 'mine'>('all')
  const [docName, setDocName] = useState('')
  const [docReviewerId, setDocReviewerId] = useState('')
  const [taskDocuments, setTaskDocuments] = useState<Array<{
    id: string
    name: string
    fileUrl: string
    status: string
    createdAt: string
    createdBy?: { id: string; name: string; email: string } | null
  }>>([])

  // Helper to normalize relative file paths to full API URLs
  const buildFileUrl = (key?: string | null): string => {
    if (!key) return ''
    if (/^https?:\/\//i.test(key)) return key
    const k = key.startsWith('/') ? key : `/${key}`
    return `${API_BASE}${k}`
  }

  // Get task data from location state or use mock data
  const taskData = location.state?.task
  const projectName = location.state?.projectName || 'Mobile App Redesign'
  const phaseName = location.state?.phaseName || 'Design Phase'

  // Mock data for fallback
  const mockTask: Task = {
    id: taskId || '1',
    title: 'Wireframe Creation',
    description: 'Create low-fidelity wireframes for all screens in the mobile application. This includes the main navigation, user profiles, settings, and core functionality screens.',
    status: 'in-progress',
    priority: 'high',
    dueDate: '2024-01-25',
    projectId: projectId || '1',
    assignees: ['Alex Rodriguez', 'Sarah Johnson'],
    isDone: false,
    createdAt: '2024-01-16',
    updatedAt: '2024-01-20',
    progress: 65,
    phaseId: 'phase-1'
  }

  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; email: string; role: 'director' | 'manager' | 'member' | 'consultant' | 'lead' | 'client' | string; department: string; isActive: boolean; lastActive: string }>>([])

  // Mock project data with time allocation
  const mockProject: Project = {
    id: projectId || '1',
    name: projectName,
    description: 'Mobile app redesign project',
    status: 'in-progress',
    progress: 65,
    startDate: '2024-01-15',
    dueDate: '2024-02-15',
    team: ['1', '2', '3', '4'],
    tags: ['mobile', 'design', 'ux'],
    priority: 'high',
    phases: [],
    tasks: [],
    members: [],
    allocatedHours: 200, // Total allocated hours for the project
    loggedHours: 45.5,   // Hours already logged by team members
    remainingHours: 154.5 // Calculated remaining hours
  }

  // Mock time logs for the project
  const mockProjectTimeLogs: TimeLog[] = [
    {
      id: '1',
      userId: '1',
      userName: 'Alex Rodriguez',
      projectId: projectId || '1',
      taskId: '1',
      phaseId: 'phase-1',
      hours: 6.5,
      description: 'Worked on navigation wireframes',
      loggedAt: '2024-01-20T10:30:00Z',
      createdAt: '2024-01-20T10:30:00Z'
    },
    {
      id: '2',
      userId: '2',
      userName: 'Sarah Johnson',
      projectId: projectId || '1',
      taskId: '1',
      phaseId: 'phase-1',
      hours: 2.0,
      description: 'Reviewed wireframes and provided feedback',
      loggedAt: '2024-01-20T11:15:00Z',
      createdAt: '2024-01-20T11:15:00Z'
    },
    {
      id: '3',
      userId: '1',
      userName: 'Alex Rodriguez',
      projectId: projectId || '1',
      taskId: '2',
      phaseId: 'phase-1',
      hours: 4.0,
      description: 'Created user profile wireframes',
      loggedAt: '2024-01-19T14:00:00Z',
      createdAt: '2024-01-19T14:00:00Z'
    },
    {
      id: '4',
      userId: '3',
      userName: 'Mike Chen',
      projectId: projectId || '1',
      taskId: '3',
      phaseId: 'phase-2',
      hours: 8.0,
      description: 'Developed settings screen wireframes',
      loggedAt: '2024-01-18T09:00:00Z',
      createdAt: '2024-01-18T09:00:00Z'
    },
    {
      id: '5',
      userId: '4',
      userName: 'Emma Wilson',
      projectId: projectId || '1',
      taskId: '4',
      phaseId: 'phase-2',
      hours: 5.5,
      description: 'Worked on core functionality screens',
      loggedAt: '2024-01-17T13:30:00Z',
      createdAt: '2024-01-17T13:30:00Z'
    },
    {
      id: '6',
      userId: '2',
      userName: 'Sarah Johnson',
      projectId: projectId || '1',
      taskId: '5',
      phaseId: 'phase-2',
      hours: 3.5,
      description: 'Reviewed and approved designs',
      loggedAt: '2024-01-16T16:00:00Z',
      createdAt: '2024-01-16T16:00:00Z'
    },
    {
      id: '7',
      userId: '1',
      userName: 'Alex Rodriguez',
      projectId: projectId || '1',
      taskId: '6',
      phaseId: 'phase-3',
      hours: 7.0,
      description: 'Created high-fidelity mockups',
      loggedAt: '2024-01-15T10:00:00Z',
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '8',
      userId: '3',
      userName: 'Mike Chen',
      projectId: projectId || '1',
      taskId: '7',
      phaseId: 'phase-3',
      hours: 9.0,
      description: 'Developed interactive prototypes',
      loggedAt: '2024-01-14T08:30:00Z',
      createdAt: '2024-01-14T08:30:00Z'
    }
  ]

  // Removed local mock daily logs; using real time logs for totals

  const mockComments: Comment[] = [
    {
      id: '1',
      taskId: taskId || '1',
      content: 'Great progress on the navigation wireframes! The layout looks clean and intuitive. @Alex Rodriguez',
      author: { id: '2', name: 'Sarah Johnson', email: 'sarah@company.com', avatar: 'SJ' },
      createdAt: '2024-01-20T11:00:00Z',
      replies: [
        {
          id: '1-1',
          content: 'Thanks @Sarah Johnson! Working on the search functionality next.',
          author: { id: '5', name: 'Alex Rodriguez', email: 'alex@company.com', avatar: 'AR' },
          createdAt: '2024-01-20T11:15:00Z'
        }
      ]
    },
    {
      id: '2',
      taskId: taskId || '1',
      content: 'Should we consider adding a search functionality to the main navigation? @Sarah Johnson @Alex Rodriguez',
      author: { id: '3', name: 'Mike Chen', email: 'mike@company.com', avatar: 'MC' },
      createdAt: '2024-01-20T15:30:00Z',
      replies: [
        {
          id: '2-1',
          content: 'Good point! I\'ll add that to the next iteration. @Mike Chen',
          author: { id: '5', name: 'Alex Rodriguez', email: 'alex@company.com', avatar: 'AR' },
          createdAt: '2024-01-20T16:00:00Z'
        },
        {
          id: '2-2',
          content: 'Agreed! Search would be a great addition. @Mike Chen @Alex Rodriguez',
          author: { id: '2', name: 'Sarah Johnson', email: 'sarah@company.com', avatar: 'SJ' },
          createdAt: '2024-01-20T16:30:00Z'
        }
      ]
    },
    {
      id: '3',
      taskId: taskId || '1',
      content: 'I\'ve uploaded the updated wireframes with @Sarah Johnson feedback implemented. Please review when you have a chance.',
      author: { id: '5', name: 'Alex Rodriguez', email: 'alex@company.com', avatar: 'AR' },
      createdAt: '2024-01-20T14:30:00Z',
      replies: [
        {
          id: '3-1',
          content: 'Will review this afternoon. @Alex Rodriguez',
          author: { id: '2', name: 'Sarah Johnson', email: 'sarah@company.com', avatar: 'SJ' },
          createdAt: '2024-01-20T14:45:00Z'
        }
      ]
    },
    {
      id: '4',
      taskId: taskId || '1',
      content: 'The user profile wireframes look good! I think we should also consider the settings screen next. @Alex Rodriguez @Sarah Johnson',
      author: { id: '6', name: 'Emma Wilson', email: 'emma@company.com', avatar: 'EW' },
      createdAt: '2024-01-20T16:45:00Z',
      replies: []
    }
  ]

  // Replace mock documents with DB-backed list for this task

  const mockActivity = [
    {
      id: '1',
      type: 'created',
      description: 'Task created by Sarah Johnson',
      timestamp: '2024-01-16T09:00:00Z',
      user: 'Sarah Johnson'
    },
    {
      id: '2',
      type: 'assigned',
      description: 'Assigned to Alex Rodriguez and Emma Wilson',
      timestamp: '2024-01-16T10:30:00Z',
      user: 'Sarah Johnson'
    },
    {
      id: '3',
      type: 'status_changed',
      description: 'Status changed from Planning to In Progress',
      timestamp: '2024-01-18T08:45:00Z',
      user: 'Alex Rodriguez'
    },
    {
      id: '4',
      type: 'log_added',
      description: 'Alex Rodriguez logged 6.5 hours - Started navigation wireframes',
      timestamp: '2024-01-20T10:30:00Z',
      user: 'Alex Rodriguez'
    },
    {
      id: '5',
      type: 'document_uploaded',
      description: 'Alex Rodriguez uploaded Navigation Wireframes v1',
      timestamp: '2024-01-20T10:35:00Z',
      user: 'Alex Rodriguez'
    },
    {
      id: '6',
      type: 'comment_added',
      description: 'Sarah Johnson commented on the task',
      timestamp: '2024-01-20T11:00:00Z',
      user: 'Sarah Johnson'
    },
    {
      id: '7',
      type: 'log_added',
      description: 'Sarah Johnson logged 2 hours - Reviewed navigation wireframes',
      timestamp: '2024-01-20T11:15:00Z',
      user: 'Sarah Johnson'
    },
    {
      id: '8',
      type: 'document_uploaded',
      description: 'Alex Rodriguez uploaded Navigation Wireframes v2 (Updated)',
      timestamp: '2024-01-20T14:00:00Z',
      user: 'Alex Rodriguez'
    },
    {
      id: '9',
      type: 'log_added',
      description: 'Alex Rodriguez logged 4.5 hours - Implemented feedback and started profile wireframes',
      timestamp: '2024-01-20T14:30:00Z',
      user: 'Alex Rodriguez'
    },
    {
      id: '10',
      type: 'document_uploaded',
      description: 'Alex Rodriguez uploaded User Profile Wireframes',
      timestamp: '2024-01-20T15:30:00Z',
      user: 'Alex Rodriguez'
    },
    {
      id: '11',
      type: 'comment_added',
      description: 'Mike Chen commented on the task',
      timestamp: '2024-01-20T15:30:00Z',
      user: 'Mike Chen'
    },
    {
      id: '12',
      type: 'document_uploaded',
      description: 'Emma Wilson uploaded Settings Screen Wireframes (Draft)',
      timestamp: '2024-01-20T16:45:00Z',
      user: 'Emma Wilson'
    },
    {
      id: '13',
      type: 'comment_added',
      description: 'Emma Wilson commented on the task',
      timestamp: '2024-01-20T16:45:00Z',
      user: 'Emma Wilson'
    }
  ]
  // Silence TS unused for mocks retained for reference
  void mockComments; void mockActivity

  // Calculate task statistics
  const totalDurationMins = React.useMemo(() => {
    return taskTimeLogs.reduce((sum, l) => sum + (Number(l.durationMins) || 0), 0)
  }, [taskTimeLogs])
  const daysActive = React.useMemo(() => {
    const created = task?.createdAt ? new Date(task.createdAt) : null
    if (!created || isNaN(created.getTime())) return 0
    const diff = Date.now() - created.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [task?.createdAt])
  const daysLeft = React.useMemo(() => {
    if (!task?.dueDate) return 0
    const due = new Date(task.dueDate)
    if (isNaN(due.getTime())) return 0
    const diff = due.getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }, [task?.dueDate])
  const isOverdue = daysLeft < 0

  // Daily activity (last 7 days) and weekly breakdown (last 4 weeks) from real data
  const dailyActivityData = React.useMemo(() => {
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const now = new Date()
    const cutoff = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    const acc: Record<string, { hours: number; comments: number; documents: number }> = {}
    for (const d of order) acc[d] = { hours: 0, comments: 0, documents: 0 }

    // Hours from task time logs
    ;(taskTimeLogs || []).forEach(l => {
      const ts = new Date(l.endedAt || l.startedAt)
      if (isNaN(ts.getTime()) || ts < cutoff) return
      const day = order[new Date(ts).getDay() === 0 ? 6 : new Date(ts).getDay() - 1] // Map Mon..Sun
      const hrs = Math.max(0, Number(l.durationMins) || 0) / 60
      acc[day].hours += Math.round(hrs * 100) / 100
    })

    // Comments (top-level + replies)
    ;(comments || []).forEach(c => {
      const ts = new Date(c.createdAt)
      if (!isNaN(ts.getTime()) && ts >= cutoff) {
        const day = order[new Date(ts).getDay() === 0 ? 6 : new Date(ts).getDay() - 1]
        acc[day].comments += 1
      }
      ;(c.replies || []).forEach(r => {
        const tr = new Date(r.createdAt)
        if (!isNaN(tr.getTime()) && tr >= cutoff) {
          const day = order[new Date(tr).getDay() === 0 ? 6 : new Date(tr).getDay() - 1]
          acc[day].comments += 1
        }
      })
    })

    // Documents uploaded for this task
    ;(taskDocuments || []).forEach(d => {
      const ts = new Date(d.createdAt)
      if (isNaN(ts.getTime()) || ts < cutoff) return
      const day = order[new Date(ts).getDay() === 0 ? 6 : new Date(ts).getDay() - 1]
      acc[day].documents += 1
    })

    return order.map(day => ({ day, ...acc[day] }))
  }, [taskTimeLogs, comments, taskDocuments])

  const weeklyData = React.useMemo(() => {
    function startOfWeek(d: Date) {
      const x = new Date(d)
      const day = x.getDay()
      const diff = (day === 0 ? -6 : 1) - day // Monday as start
      x.setDate(x.getDate() + diff)
      x.setHours(0, 0, 0, 0)
      return x
    }
    function endOfWeek(s: Date) {
      const e = new Date(s)
      e.setDate(e.getDate() + 7)
      return e
    }
    function isoWeekNumber(d: Date) {
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      const dayNum = date.getUTCDay() || 7
      date.setUTCDate(date.getUTCDate() + 4 - dayNum)
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
      return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    }

    const now = new Date()
    const weeks: Array<{ label: string; start: Date; end: Date }> = []
    const curStart = startOfWeek(now)
    for (let i = 3; i >= 0; i--) {
      const start = new Date(curStart)
      start.setDate(start.getDate() - i * 7)
      const end = endOfWeek(start)
      const label = `W${isoWeekNumber(start)}`
      weeks.push({ label, start, end })
    }

    const agg = weeks.map(w => ({ week: w.label, hours: 0, comments: 0, documents: 0 }))

    ;(taskTimeLogs || []).forEach(l => {
      const ts = new Date(l.endedAt || l.startedAt)
      if (isNaN(ts.getTime())) return
      weeks.forEach((w, idx) => {
        if (ts >= w.start && ts < w.end) {
          agg[idx].hours += Math.round(((Number(l.durationMins) || 0) / 60) * 100) / 100
        }
      })
    })
    ;(comments || []).forEach(c => {
      const ts = new Date(c.createdAt)
      if (isNaN(ts.getTime())) return
      weeks.forEach((w, idx) => { if (ts >= w.start && ts < w.end) agg[idx].comments += 1 })
      ;(c.replies || []).forEach(r => {
        const tr = new Date(r.createdAt)
        if (isNaN(tr.getTime())) return
        weeks.forEach((w, idx) => { if (tr >= w.start && tr < w.end) agg[idx].comments += 1 })
      })
    })
    ;(taskDocuments || []).forEach(d => {
      const ts = new Date(d.createdAt)
      if (isNaN(ts.getTime())) return
      weeks.forEach((w, idx) => { if (ts >= w.start && ts < w.end) agg[idx].documents += 1 })
    })

    return agg
  }, [taskTimeLogs, comments, taskDocuments])

  // Timer functionality
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTimerRunning && timerStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((new Date().getTime() - timerStartTime.getTime()) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, timerStartTime])

  const startTimer = () => {
    setTimerStartTime(new Date())
    setIsTimerRunning(true)
  }

  const stopTimer = () => {
    setIsTimerRunning(false)
    setNewLogHours(Math.floor(elapsedTime / 3600 * 100) / 100)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatHoursMinutesFromMins = (mins: number) => {
    const m = Math.max(0, Math.round(Number(mins) || 0))
    const h = Math.floor(m / 60)
    const r = m % 60
    return `${h}h ${r}m`
  }

  const formatHoursMinutesFromHours = (hours: number) => {
    const totalMins = Math.max(0, Math.round((Number(hours) || 0) * 60))
    return formatHoursMinutesFromMins(totalMins)
  }

  // Normalize status to match ProjectDetail set: not-started | in-progress | completed | on-hold
  const normalizeStatus = (s?: string) => {
    switch ((s || '').toLowerCase()) {
      case 'planning': return 'not-started'
      case 'not-started': return 'not-started'
      case 'in-progress': return 'in-progress'
      case 'done':
      case 'completed': return 'completed'
      case 'blocked':
      case 'in-review':
      case 'on-hold': return 'on-hold'
      default: return 'in-progress'
    }
  }

  // Initialize task, project, and current user
  useEffect(() => {
    // Use task data from location state or fallback to mock data
    if (taskData) {
      setTask({ ...taskData, status: normalizeStatus(taskData.status) as any })
    } else {
      setTask({ ...mockTask, status: normalizeStatus(mockTask.status) as any })
    }
    
    // Set initial project data (will be overridden with real values if available)
    setProject(mockProject)

    // Set time logs
    setProjectTimeLogs(mockProjectTimeLogs)
    
    // Load current user from API using x-user-id header
    ;(async () => {
      try {
        const me = await getCurrentUser()
        if (me) {
          setCurrentUser({
            id: String(me.id),
            name: String(me.name || ''),
            email: String(me.email || ''),
            role: (me.role || 'member') as any,
            department: String(me.department || ''),
            isActive: true,
            lastActive: new Date().toISOString(),
          })
        }
      } catch (e) {
        console.warn('No current user; ensure x-user-id header is set')
      }
    })()

    // Load actual project members from API (assignees of the project)
    ;(async () => {
      if (!projectId) return
      try {
        // Prefer lightweight members endpoint if available
        const users = await apiGet(`/projects/${projectId}/members`).catch(() => null)
        if (Array.isArray(users) && users.length > 0) {
          const mapped = users.map((u: any) => ({
            id: String(u.id),
            name: String(u.name || ''),
            email: String(u.email || ''),
            role: String(u?.role?.name || u?.role || 'member').toLowerCase(),
            department: String(u?.department?.name || u?.department || ''),
            isActive: true,
            lastActive: new Date().toISOString(),
          }))
          setTeamMembers(mapped)
          // Do not return; still fetch project meta to sync allocated/logged hours
        }
        // Fallback: fetch full project and derive members from memberships
        const projectData = await apiGet(`/projects/${projectId}`).catch(() => null)
        if (projectData && Array.isArray(projectData.memberships)) {
          const mapped = projectData.memberships.map((m: any) => ({
            id: String(m.user?.id || m.userId),
            name: String(m.user?.name || 'Unknown'),
            email: String(m.user?.email || ''),
            role: String(m.role || 'member').toLowerCase(),
            department: String(m.user?.department?.name || ''),
            isActive: true,
            lastActive: new Date().toISOString(),
          }))
          setTeamMembers(mapped)
        }

        // If project was fetched, sync its allocated/logged/remaining hours from backend
        if (projectData) {
          const allocated = Number(projectData.allocatedHours) || 0
          const used = Number(projectData.usedHours ?? projectData.loggedHours) || 0
          const left = Number(
            projectData.leftHours ?? projectData.remainingHours ?? Math.max(allocated - used, 0)
          )
          setProject(prev => prev ? {
            ...prev,
            allocatedHours: allocated,
            loggedHours: used,
            remainingHours: left,
          } : {
            // Minimal fallback shape focusing on hours used by the UI
            id: String(projectId),
            name: projectName,
            description: projectData.description || '',
            status: 'in-progress',
            progress: Number(projectData.progress ?? 0),
            startDate: projectData.startDate || '',
            dueDate: projectData.endDate || '',
            team: [],
            tags: [],
            priority: 'medium',
            phases: [],
            tasks: [],
            members: [],
            allocatedHours: allocated,
            loggedHours: used,
            remainingHours: left,
          } as any)
        }
      } catch (e) {
        console.error('Failed to load project members', e)
        setTeamMembers([])
      }
    })()

    // Load actual task assignees and details from API
    ;(async () => {
      try {
        if (!taskId) return
        const t = await apiGet(`/tasks/${taskId}`)
        if (!t) return
        const mapStatus = (s: string) => {
          const m: any = { NOT_STARTED: 'not-started', IN_PROGRESS: 'in-progress', COMPLETED: 'completed', ON_HOLD: 'on-hold' }
          return m[String(s).toUpperCase()] || 'in-progress'
        }
        const due = t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : ''
        const names: string[] = Array.isArray(t.assignees) ? t.assignees.map((a: any) => a.user?.name).filter(Boolean) : []
        setTask(prev => prev ? {
          ...prev,
          title: t.title || prev.title,
          description: t.description || prev.description,
          status: mapStatus(t.status),
          dueDate: due,
          assignees: names.length ? names : prev.assignees,
          projectId: t.phase?.project?.id || prev.projectId,
          phaseId: t.phaseId || prev.phaseId,
        } : {
          id: t.id,
          title: t.title,
          description: t.description || '',
          status: mapStatus(t.status),
          priority: 'medium',
          dueDate: due,
          projectId: t.phase?.project?.id || projectId || '',
          assignees: names,
          isDone: t.status === 'COMPLETED',
          createdAt: t.createdAt || '',
          updatedAt: t.updatedAt || '',
          progress: t.status === 'COMPLETED' ? 100 : (t.status === 'IN_PROGRESS' ? 65 : 0),
          phaseId: t.phaseId || '',
        } as any)
      } catch (e) {
        console.error('Failed to load task', e)
      }
    })()

    // Load task time logs for Hours Logged metric
    ;(async () => {
      try {
        if (!taskId) return
        const logs = await apiGet(`/timelogs/tasks/${taskId}/timelogs`)
        if (Array.isArray(logs)) {
          setTaskTimeLogs(logs.map((l: any) => ({
            durationMins: Number(l.durationMins) || 0,
            startedAt: l.startedAt,
            endedAt: l.endedAt,
            description: l.description,
            userId: String(l.userId),
            userName: l.userName || l.user?.name || undefined,
            attachmentPath: l.attachment?.filePath || null,
          })))
        }
      } catch (e) {
        console.error('Failed to load task time logs', e)
        setTaskTimeLogs([])
      }
    })()

    // Load comments for this task
    ;(async () => {
      try {
        if (!taskId) return
        const list = await apiGet(`/tasks/${taskId}/comments`)
        if (Array.isArray(list)) {
          const mapped: Comment[] = list.map((c: any) => ({
            id: c.id,
            taskId: c.taskId,
            content: c.content,
            author: {
              id: c.author?.id || '',
              name: c.author?.name || 'Unknown',
              email: c.author?.email || '',
              avatar: (c.author?.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase(),
            },
            createdAt: c.createdAt,
            replies: (c.replies || []).map((r: any) => ({
              id: r.id,
              content: r.content,
              author: {
                id: r.author?.id || '',
                name: r.author?.name || 'Unknown',
                email: r.author?.email || '',
                avatar: (r.author?.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase(),
              },
              createdAt: r.createdAt,
            })),
          }))
          setComments(mapped)
        }
      } catch (e) {
        console.error('Failed to load comments', e)
        setComments([])
      }
    })()

    // Load activity/history for this task
    ;(async () => {
      try {
        if (!taskId) return
        const list = await apiGet(`/tasks/${taskId}/history`)
        if (Array.isArray(list)) {
          const mapped = list.map((h: any) => ({
            id: h.id,
            description: h.message || 'Update',
            timestamp: h.createdAt,
            by: h.createdBy?.name || undefined,
          }))
          setActivity(mapped)
        }
      } catch (e) {
        console.error('Failed to load history', e)
        setActivity([])
      }
    })()

    // Load documents for this task from API
    ;(async () => {
      try {
        if (!taskId) return
        const list = await apiGet(`/api/documents/by-task/${taskId}`)
        if (Array.isArray(list)) {
          const mapped = list.map((d: any) => ({
            id: d.id,
            name: d.name,
            fileUrl: buildFileUrl(d.fileUrl || (d.filePath ? `/${String(d.filePath).replace(/^\\+/, '')}` : '')),
            status: String(d.status || 'in-review'),
            createdAt: d.createdAt,
            createdBy: d.createdBy || null,
          }))
          setTaskDocuments(mapped)
        }
      } catch (e) {
        console.error('Failed to load task documents', e)
        setTaskDocuments([])
      }
    })()
  }, [taskId, taskData])

  // Map task time logs + team members into visible "Time Logs" list
  useEffect(() => {
    const nameById: Record<string, string> = {}
    teamMembers.forEach(tm => { nameById[tm.id] = tm.name })
    if (currentUser) nameById[currentUser.id] = currentUser.name
    const uiLogs = (taskTimeLogs || []).map((l: any) => {
      const uid = String(l.userId)
      const fallbackMine = (uid === currentUser?.id) ? (currentUser?.name || 'You') : undefined
      // Prefer server-provided name, then known team list, then mine, then Unknown
      const displayName = l.userName || nameById[uid] || fallbackMine || 'Unknown User'
      const attachmentUrl = l.attachmentPath ? `${API_BASE}/${String(l.attachmentPath).replace(/^\\+/, '')}` : undefined
      const attachmentFileName = l.attachmentPath ? String(l.attachmentPath).split('/').pop() : undefined
      return ({
        id: String(l.id || `${l.userId}-${l.startedAt}`),
        userId: uid,
        userName: displayName,
        projectId: String(projectId || ''),
        taskId: String(task?.id || ''),
        phaseId: String(task?.phaseId || ''),
        hours: Math.round(((Number(l.durationMins) || 0) / 60) * 100) / 100,
        description: l.description,
        loggedAt: l.endedAt || l.startedAt,
        createdAt: l.createdAt || l.endedAt || l.startedAt,
        attachmentUrl,
        attachmentFileName,
      })
    })
    setProjectTimeLogs(uiLogs)
  }, [taskTimeLogs, teamMembers, currentUser, projectId, task?.phaseId, task?.id])

  // Build unified timeline from history + documents + time logs
  useEffect(() => {
    const items: TimelineItem[] = []
    items.push(...activity.map(a => ({ id: `h-${a.id}`, type: 'history' as const, title: a.description, timestamp: a.timestamp, by: a.by })))
    items.push(...taskDocuments.map(d => ({ id: `d-${d.id}`, type: 'document' as const, title: d.name, timestamp: d.createdAt, url: d.fileUrl, by: d.createdBy?.name })))
    items.push(...projectTimeLogs.map(l => ({ id: `t-${l.id}`, type: 'timelog' as const, title: l.description || 'Time logged', timestamp: l.createdAt, hours: l.hours, by: l.userName })))
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setTimeline(items)
  }, [activity, taskDocuments, projectTimeLogs])

  const handleMarkDone = async () => {
    setIsMarkingDone(true)
    try {
      // Persist to backend if we have an id
      if (task?.id) {
        try {
          const { apiJson } = await import('../services/api')
          await apiJson(`/tasks/${task.id}`, 'PATCH', { status: 'COMPLETED' })
        } catch (e) { /* ignore, keep optimistic */ }
      }
      setTask(prev => prev ? { ...prev, status: 'completed' as any, isDone: true, progress: 100 } : null)
    } catch (error) {
      console.error('Failed to mark task as done:', error)
    } finally {
      setIsMarkingDone(false)
    }
  }

  const handleTimeLogSubmit = async () => {
    if (!newLogContent.trim() || !currentUser || !project || !task?.id) return

    setIsSavingLog(true)
    try {
      // Ensure x-user-id is set so backend attributes the log to this user
      try {
        const existingUid = localStorage.getItem('userId')
        if (!existingUid && currentUser?.id) {
          localStorage.setItem('userId', currentUser.id)
        }
      } catch (_) { /* ignore storage errors */ }

      // Compute startedAt/endedAt
      let startedAt: Date | null = null
      let endedAt: Date | null = null
      let hoursFloat = newLogHours

      if (isTimerRunning && timerStartTime) {
        // If timer is still running, finalize it at submit time
        endedAt = new Date()
        startedAt = new Date(timerStartTime)
        const secs = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000))
        hoursFloat = Math.round((secs / 3600) * 100) / 100
        // Stop the timer UI
        setIsTimerRunning(false)
        setElapsedTime(secs)
      } else if (timerStartTime && elapsedTime > 0) {
        // Timer was previously stopped; use captured duration
        startedAt = new Date(timerStartTime)
        endedAt = new Date(timerStartTime.getTime() + elapsedTime * 1000)
        const secs = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000))
        hoursFloat = Math.round((secs / 3600) * 100) / 100
      } else {
        // Manual entry based on date + hours
        const base = new Date(`${newLogDate}T12:00:00`)
        endedAt = isNaN(base.getTime()) ? new Date() : base
        const durationMs = Math.max(0, Math.round((Number(hoursFloat) || 0) * 60 * 60 * 1000))
        startedAt = new Date(endedAt.getTime() - durationMs)
      }

      if (!startedAt || !endedAt) return
      const payload = {
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        description: newLogContent.trim(),
      }

      // Persist to backend (multipart if file is present)
      const base = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000'
      const uid = localStorage.getItem('userId')
      if (newLogFile) {
        const form = new FormData()
        form.append('startedAt', payload.startedAt)
        form.append('endedAt', payload.endedAt)
        form.append('description', payload.description)
        form.append('file', newLogFile)
        const res = await fetch(`${base}/timelogs/tasks/${task.id}/timelogs`, {
          method: 'POST',
          headers: { ...(uid ? { 'x-user-id': uid } : {}) },
          body: form,
        })
        if (!res.ok) throw new Error(await res.text())
        await res.json()
      } else {
        await apiJson(`/timelogs/tasks/${task.id}/timelogs`, 'POST', payload)
      }

      // Update task hours metric by reloading logs
      try {
        const logs = await apiGet(`/timelogs/tasks/${task.id}/timelogs`)
        if (Array.isArray(logs)) {
          setTaskTimeLogs(logs.map((l: any) => ({
            durationMins: Number(l.durationMins) || 0,
            startedAt: l.startedAt,
            endedAt: l.endedAt,
            description: l.description,
            userId: String(l.userId),
            userName: l.userName || l.user?.name || undefined,
            attachmentPath: l.attachment?.filePath || null,
          })))
        }
      } catch (_) { /* ignore */ }

      // Refresh project meta to sync used/remaining hours from backend
      try {
        if (project?.id) {
          const pData = await apiGet(`/projects/${project.id}`)
          if (pData) {
            const allocated = Number(pData.allocatedHours) || 0
            const used = Number(pData.usedHours ?? pData.loggedHours) || 0
            const left = Number(pData.leftHours ?? pData.remainingHours ?? Math.max(allocated - used, 0))
            setProject(prev => prev ? { ...prev, allocatedHours: allocated, loggedHours: used, remainingHours: left } : prev)
          }
        }
      } catch (_) { /* ignore refresh errors */ }

      // Reset form and timer fields
      setNewLogContent('')
      setNewLogHours(0)
      setNewLogDate(new Date().toISOString().split('T')[0])
      setNewLogFile(null)
      setTimerStartTime(null)
      setElapsedTime(0)
    } catch (e) {
      console.error('Failed to save time log:', e)
      alert('Failed to save time log. Please try again.')
    } finally {
      setIsSavingLog(false)
    }
  }

  const handleAdditionalCostSubmit = async () => {
    if (!project?.id || !task?.id) return
    const amountValue = Number(newCostAmount)
    if (!amountValue || amountValue <= 0) return
    const category = newCostCategory.trim() || 'Other'
    const isOther = category.toLowerCase() === 'other'
    if (isOther && !newCostCustomCategory.trim()) return

    setIsSavingCost(true)
    try {
      try {
        const existingUid = localStorage.getItem('userId')
        if (!existingUid && currentUser?.id) {
          localStorage.setItem('userId', currentUser.id)
        }
      } catch (_) { /* ignore storage errors */ }

      const baseDate = new Date(`${newCostDate}T12:00:00`)
      const spentAt = isNaN(baseDate.getTime()) ? new Date() : baseDate

      await apiJson('/api/additional-costs', 'POST', {
        projectId: project.id,
        phaseId: task.phaseId || undefined,
        taskId: task.id,
        spentAt: spentAt.toISOString(),
        amount: amountValue,
        category,
        ...(isOther ? { customCategory: newCostCustomCategory.trim() } : {}),
        ...(newCostNote.trim() ? { note: newCostNote.trim() } : {}),
      })

      setNewCostAmount('')
      setNewCostCategory('Food')
      setNewCostCustomCategory('')
      setNewCostNote('')
      setNewCostDate(new Date().toISOString().split('T')[0])
    } catch (e) {
      console.error('Failed to save additional cost:', e)
      alert('Failed to save additional cost. Please try again.')
    } finally {
      setIsSavingCost(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      // Optimistic update
      setTask(prev => prev ? { ...prev, status: newStatus as any } : null)
      // Persist to backend mapping to API enum
      if (task?.id) {
        const map: Record<string, string> = {
          'not-started': 'NOT_STARTED',
          'in-progress': 'IN_PROGRESS',
          'completed': 'COMPLETED',
          'on-hold': 'ON_HOLD',
        }
        const { apiJson } = await import('../services/api')
        await apiJson(`/tasks/${task.id}`, 'PATCH', { status: map[newStatus] || 'NOT_STARTED' })
      }
    } catch (error) {
      console.error('Failed to change status:', error)
    }
  }


  const handleSaveComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSavingComment(true)
    try {
      if (!task?.id) throw new Error('Task not loaded')
      // Ensure auth header uses a user id
      try {
        const existingUid = localStorage.getItem('userId')
        if (!existingUid && currentUser?.id) {
          localStorage.setItem('userId', currentUser.id)
        }
      } catch {}
      // Extract mentions by name and map to user IDs when possible
      const names = Array.from(new Set((newComment.match(/@([\w\- ]+)/g) || []).map(s => s.slice(1).trim()))).filter(Boolean)
      const mentionUserIds = teamMembers
        .filter(m => names.some(n => n.toLowerCase() === m.name.toLowerCase()))
        .map(m => m.id)
      await apiJson(`/tasks/${task.id}/comments`, 'POST', {
        content: newComment.trim(),
        ...(mentionUserIds.length ? { mentionUserIds } : {}),
      })
      // Reload comments and history
      try {
        const list = await apiGet(`/tasks/${task.id}/comments`)
        if (Array.isArray(list)) {
          const mapped: Comment[] = list.map((c: any) => ({
            id: c.id,
            taskId: c.taskId,
            content: c.content,
            author: {
              id: c.author?.id || '',
              name: c.author?.name || 'Unknown',
              email: c.author?.email || '',
              avatar: (c.author?.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase(),
            },
            createdAt: c.createdAt,
            replies: (c.replies || []).map((r: any) => ({
              id: r.id,
              content: r.content,
              author: {
                id: r.author?.id || '',
                name: r.author?.name || 'Unknown',
                email: r.author?.email || '',
                avatar: (r.author?.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase(),
              },
              createdAt: r.createdAt,
            })),
          }))
          setComments(mapped)
        }
      } catch {}
      try {
        const list = await apiGet(`/tasks/${task.id}/history`)
        if (Array.isArray(list)) {
          setActivity(list.map((h: any) => ({ id: h.id, description: h.message || 'Update', timestamp: h.createdAt })))
        }
      } catch {}
      setNewComment('')
      setShowMentionDropdown(false)
    } catch (error) {
      console.error('Failed to save comment:', error)
    } finally {
      setIsSavingComment(false)
    }
  }

  const handleSaveReply = async (commentId: string) => {
    if (!replyText.trim()) return

    setIsSavingReply(true)
    try {
      if (!task?.id) throw new Error('Task not loaded')
      try {
        const existingUid = localStorage.getItem('userId')
        if (!existingUid && currentUser?.id) {
          localStorage.setItem('userId', currentUser.id)
        }
      } catch {}
      await apiJson(`/tasks/${task.id}/comments`, 'POST', { content: replyText.trim(), parentId: commentId })
      // Reload comments (replies included)
      try {
        const list = await apiGet(`/tasks/${task.id}/comments`)
        if (Array.isArray(list)) {
          const mapped: Comment[] = list.map((c: any) => ({
            id: c.id,
            taskId: c.taskId,
            content: c.content,
            author: {
              id: c.author?.id || '',
              name: c.author?.name || 'Unknown',
              email: c.author?.email || '',
              avatar: (c.author?.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase(),
            },
            createdAt: c.createdAt,
            replies: (c.replies || []).map((r: any) => ({
              id: r.id,
              content: r.content,
              author: {
                id: r.author?.id || '',
                name: r.author?.name || 'Unknown',
                email: r.author?.email || '',
                avatar: (r.author?.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase(),
              },
              createdAt: r.createdAt,
            })),
          }))
          setComments(mapped)
        }
      } catch {}
      setReplyText('')
      setReplyingTo(null)
    } catch (error) {
      console.error('Failed to save reply:', error)
    } finally {
      setIsSavingReply(false)
    }
  }

  const handleMentionInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    
    // Check for @ mention
    const textBeforeCursor = value.substring(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1])
      setMentionPosition(cursorPos)
      setShowMentionDropdown(true)
    } else {
      setShowMentionDropdown(false)
    }
    
    setNewComment(value)
  }

  const handleMentionSelect = (userName: string) => {
    const textBeforeMention = newComment.substring(0, mentionPosition - mentionQuery.length - 1)
    const textAfterMention = newComment.substring(mentionPosition)
    const newText = `${textBeforeMention}@${userName} ${textAfterMention}`
    
    setNewComment(newText)
    setShowMentionDropdown(false)
    setMentionQuery('')
  }

  const filteredUsers = teamMembers.filter(user => 
    user.name.toLowerCase().includes(mentionQuery.toLowerCase())
  )

  // Filter time logs based on selected filter
  const filteredTimeLogs = timeLogFilter === 'mine' 
    ? projectTimeLogs.filter(log => log.userId === currentUser?.id)
    : projectTimeLogs

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !projectId || !task?.phaseId || !docReviewerId) return

    setIsUploading(true)
    try {
      const form = new FormData()
      form.append('projectId', String(projectId))
      form.append('phaseId', String(task.phaseId))
      form.append('taskId', String(task.id))
      form.append('reviewerId', String(docReviewerId))
      form.append('status', 'in-review')
      if (docName) form.append('name', docName)
      form.append('files', selectedFile)
      const uid = localStorage.getItem('userId') || ''
      const token = localStorage.getItem('authToken') || ''
      const headers: Record<string,string> = token ? { authorization: `Bearer ${token}` } : { 'x-user-id': uid }
      const res = await fetch(`${API_BASE}/api/documents/upload`, { method: 'POST', headers, body: form, credentials: 'include' })
      if (!res.ok) throw new Error(await res.text())
      const created = await res.json()
      // Prepend new docs
      if (Array.isArray(created) && created.length) {
        const mapped = created.map((d: any) => ({
          id: d.id,
          name: d.name,
          fileUrl: buildFileUrl(d.fileUrl || (d.filePath ? `/${String(d.filePath).replace(/^\\+/, '')}` : '')),
          status: String(d.status || 'in-review'),
          createdAt: d.createdAt,
          createdBy: d.createdBy || null,
        }))
        setTaskDocuments(prev => [...mapped, ...prev])
      }
      // Reset form fields
      setSelectedFile(null)
      setDocName('')
      setDocReviewerId('')
    } catch (error) {
      console.error('Failed to upload file:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'badge-success'
      case 'in-progress': return 'badge-info'
      case 'not-started': return 'badge-info'
      case 'on-hold': return 'badge-warning'
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

  // --- Speech to text helpers ---
  const startRecording = async (kind: 'log' | 'comment') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      const chunksRef = kind === 'log' ? recChunksLog : recChunksComment
      chunksRef.current = []
      mr.ondataavailable = (e: BlobEvent) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await transcribeBlob(blob, kind)
        stream.getTracks().forEach(t => t.stop())
      }
      if (kind === 'log') { mediaRecLog.current = mr; setIsRecLog(true) } else { mediaRecComment.current = mr; setIsRecComment(true) }
      mr.start()
    } catch (e) {
      alert('Microphone access denied or not available')
    }
  }

  const stopRecording = (kind: 'log' | 'comment') => {
    const mr = kind === 'log' ? mediaRecLog.current : mediaRecComment.current
    if (mr && mr.state !== 'inactive') mr.stop()
    if (kind === 'log') setIsRecLog(false); else setIsRecComment(false)
  }

  const transcribeBlob = async (blob: Blob, kind: 'log' | 'comment') => {
    try {
      setIsTranscribing(true)
      const form = new FormData()
      form.append('audio', blob, 'audio.webm')
      const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000'
      const uid = localStorage.getItem('userId') || ''
      const token = localStorage.getItem('authToken') || ''
      const headers: Record<string,string> = token ? { authorization: `Bearer ${token}` } : { 'x-user-id': uid }
      const res = await fetch(`${String(base).replace(/\/+$/, '')}/api/speech/transcribe`, { method: 'POST', headers, body: form })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const text: string = String(data?.text || '')
      if (text) {
        if (kind === 'log') setNewLogContent(prev => prev ? (prev + (prev.endsWith(' ') ? '' : ' ') + text) : text)
        else setNewComment(prev => prev ? (prev + (prev.endsWith(' ') ? '' : ' ') + text) : text)
      }
    } catch (e: any) {
      alert(e?.message || 'Transcription failed')
    } finally {
      setIsTranscribing(false)
    }
  }

  // --- Realtime dictation (AssemblyAI Realtime WS) ---
  const startLiveDictation = async (kind: 'log' | 'comment') => {
    try {
      const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000'
      // Request an ephemeral token (server coerces deprecated models to universal and retries if needed)
      const tokenRes = await fetch(`${String(base).replace(/\/+$/, '')}/api/speech/realtime-token?model=universal`)
      if (!tokenRes.ok) throw new Error(await tokenRes.text())
      const { token } = await tokenRes.json()
      const sampleRate = 16000
      // Connect to AssemblyAI realtime. Token encodes model; avoid extra params that may cause deprecation errors.
      const ws = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${sampleRate}&token=${encodeURIComponent(token)}`)
      wsRef.current = ws
      liveBaseTextRef.current[kind] = kind === 'log' ? newLogContent : newComment
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          const text = String(msg?.text || '')
          if (text) {
            if (kind === 'log') {
              setNewLogContent(`${liveBaseTextRef.current.log}${liveBaseTextRef.current.log ? ' ' : ''}${text}`)
            } else {
              setNewComment(`${liveBaseTextRef.current.comment}${liveBaseTextRef.current.comment ? ' ' : ''}${text}`)
            }
          }
        } catch {}
      }
      ws.onerror = (ev) => { console.error('WS error', ev) }
      ws.onclose = () => stopLiveDictation(kind)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioCtx.createMediaStreamSource(stream)
      const processor = audioCtx.createScriptProcessor(4096, 1, 1)
      source.connect(processor)
      processor.connect(audioCtx.destination)
      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const input = e.inputBuffer.getChannelData(0)
        const down = downsampleBuffer(input, audioCtx.sampleRate, sampleRate)
        const pcm = floatTo16BitPCM(down)
        const b64 = arrayBufferToBase64(pcm.buffer)
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ audio_data: b64 }))
        }
      }
      audioCtxRef.current = audioCtx
      sourceRef.current = source
      processorRef.current = processor
      if (kind === 'log') setIsLiveLog(true); else setIsLiveComment(true)
    } catch (e: any) {
      alert(e?.message || 'Failed to start live dictation')
    }
  }

  const stopLiveDictation = (kind: 'log' | 'comment') => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try { wsRef.current.send(JSON.stringify({ terminate_session: true })) } catch {}
      }
      wsRef.current?.close()
    } catch {}
    try { processorRef.current?.disconnect() } catch {}
    try { sourceRef.current?.disconnect() } catch {}
    try { audioCtxRef.current?.close() } catch {}
    wsRef.current = null
    processorRef.current = null
    sourceRef.current = null
    audioCtxRef.current = null
    if (kind === 'log') setIsLiveLog(false); else setIsLiveComment(false)
  }

  function downsampleBuffer(buffer: Float32Array, sampleRate: number, outRate: number) {
    if (outRate === sampleRate) return buffer
    const sampleRateRatio = sampleRate / outRate
    const newLength = Math.round(buffer.length / sampleRateRatio)
    const result = new Float32Array(newLength)
    let offsetResult = 0
    let offsetBuffer = 0
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio)
      let accum = 0, count = 0
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i]
        count++
      }
      result[offsetResult] = accum / count
      offsetResult++
      offsetBuffer = nextOffsetBuffer
    }
    return result
  }
  function floatTo16BitPCM(input: Float32Array) {
    const buffer = new ArrayBuffer(input.length * 2)
    const view = new DataView(buffer)
    let offset = 0
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    }
    return view
  }
  function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  }

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 dark:text-green-400'
      case 'pending':
      case 'in-review': return 'text-yellow-600 dark:text-yellow-400'
      case 'rejected': return 'text-red-600 dark:text-red-400'
      case 'needs-changes': return 'text-orange-600 dark:text-orange-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            to={`/projects/${projectId}`}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <HiArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <Link 
                to={`/projects/${projectId}`}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
              >
                {projectName}
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{phaseName}</span>
              <span className="text-gray-400">/</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Tasks</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{task?.title || 'Task Detail'}</h1>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleMarkDone}
            disabled={isMarkingDone || task.isDone}
            className={`${task.isDone ? 'btn-secondary' : 'btn-primary'} ${isMarkingDone ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isMarkingDone ? 'Marking...' : task.isDone ? 'Done ✓' : 'Mark Done'}
          </button>
        </div>
      </div>

      {/* Task Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Days Active</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{daysActive}</p>
            </div>
            <HiCalendar className="h-8 w-8 text-primary-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Days Left</p>
              <p className={`text-2xl font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {isOverdue ? Math.abs(daysLeft) : daysLeft}
              </p>
              {isOverdue && <p className="text-xs text-red-600 dark:text-red-400">Overdue</p>}
            </div>
            <HiClock className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Task Hours Logged</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatHoursMinutesFromMins(totalDurationMins)}</p>
            </div>
            <HiTrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Progress</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{task.progress}%</p>
            </div>
            <HiCheckCircle className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-white/10">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: HiEye },
            { id: 'time', label: 'Time Tracking', icon: HiClock },
            { id: 'comments', label: 'Comments', icon: HiChat },
            { id: 'documents', label: 'Documents', icon: HiDocument },
            { id: 'history', label: 'History', icon: HiTrendingUp }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Overview */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Task Overview</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <p className="text-gray-900 dark:text-white">{task.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="input-field"
                    >
                      <option value="not-started">Not Started</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="on-hold">On Hold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority
                    </label>
                    <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={task.dueDate}
                      readOnly
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Assignees
                    </label>
                    <div className="flex -space-x-2">
                      {task.assignees.map((assignee, index) => (
                        <div key={index} className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-xs text-white border-2 border-white dark:border-gray-800">
                          {assignee.split(' ').map(n => n[0]).join('')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Progress
                  </label>
                  <div className="w-full bg-gray-200 dark:bg-black/50 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.progress}% complete</p>
                </div>
              </div>
            </div>

            {/* Daily Activity Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Activity</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyActivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" fill="#3B82F6" name="Hours" />
                    <Bar dataKey="comments" fill="#10B981" name="Comments" />
                    <Bar dataKey="documents" fill="#F59E0B" name="Documents" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Task Status */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Task Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                  <span className={`badge ${getStatusColor(task.status)}`}>
                    {task.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Priority</span>
                  <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Due Date</span>
                  <span className={`text-sm font-medium ${
                    isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                  }`}>
                    {new Date(task.dueDate).toLocaleDateString()}
                    {isOverdue && ' (Overdue)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Team Members Working on Task */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <HiUsers className="h-5 w-5 mr-2" />
                Team Members
              </h3>
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-xs text-white">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{member.role} • {member.department}</p>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(member.lastActive).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Current User Indicator */}
              {currentUser && (
                <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                  <div className="flex items-center space-x-2">
                    <HiUser className="h-4 w-4 text-primary-600" />
                    <span className="text-sm font-medium text-primary-900 dark:text-primary-100">
                      You are logged in as {currentUser.name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'time' && (
        <div className="space-y-6">
          {/* Project Time Allocation Display */}
          {project && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Project Time Allocation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{project.allocatedHours}h</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Allocated</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{project.loggedHours}h</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Project Hours Logged</div>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{project.remainingHours}h</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Project Time Remaining</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Progress</span>
                  <span>{project.allocatedHours > 0 ? Math.round((project.loggedHours / project.allocatedHours) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-black/50 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${project.allocatedHours > 0 ? Math.min(100, (project.loggedHours / project.allocatedHours) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Time Tracking Controls */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Time Tracking</h3>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-mono text-gray-900 dark:text-white">
                  {formatTime(elapsedTime)}
                </div>
                <div className="flex space-x-2">
                  {!isTimerRunning ? (
                    <button
                      onClick={startTimer}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <HiPlay className="h-4 w-4" />
                      <span>Start</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopTimer}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <HiStop className="h-4 w-4" />
                      <span>Stop</span>
                    </button>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Task Hours Logged</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatHoursMinutesFromMins(totalDurationMins)}</p>
              </div>
            </div>

            {/* Add Time Log Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleTimeLogSubmit(); }} className="p-4 bg-gray-50 dark:bg-black/50 rounded-xl">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={newLogDate}
                      onChange={(e) => setNewLogDate(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Hours
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      value={newLogHours}
                      onChange={(e) => setNewLogHours(parseFloat(e.target.value) || 0)}
                      className="input-field"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Attachment (Optional)
                    </label>
                    <input
                      type="file"
                      className="input-field"
                      onChange={(e) => setNewLogFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What did you work on?
                  </label>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Use mic to dictate your log</span>
                    <div className="space-x-2">
                      {!isRecLog ? (
                        <button type="button" onClick={() => startRecording('log')} className="text-xs px-2 py-1 rounded-md bg-primary-600 text-white disabled:opacity-50">
                          {isTranscribing ? 'Transcribing…' : '🎤 Speak'}
                        </button>
                      ) : (
                        <button type="button" onClick={() => stopRecording('log')} className="text-xs px-2 py-1 rounded-md bg-red-600 text-white">Stop</button>
                      )}
                      {!isLiveLog ? (
                        <button type="button" onClick={() => startLiveDictation('log')} className="text-xs px-2 py-1 rounded-md bg-green-600 text-white">🎙 Live</button>
                      ) : (
                        <button type="button" onClick={() => stopLiveDictation('log')} className="text-xs px-2 py-1 rounded-md bg-orange-600 text-white">Stop Live</button>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={newLogContent}
                    onChange={(e) => setNewLogContent(e.target.value)}
                    rows={3}
                    className="input-field"
                    placeholder="Describe what you accomplished..."
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSavingLog}
                  className="btn-primary"
                >
                  {isSavingLog ? 'Saving...' : 'Log Time'}
                </button>
              </div>
            </form>

            <div className="mt-6 border-t border-gray-200 dark:border-white/10 pt-6">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Additional Costs</h4>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleAdditionalCostSubmit()
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={newCostDate}
                      onChange={(e) => setNewCostDate(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newCostAmount}
                      onChange={(e) => setNewCostAmount(e.target.value)}
                      className="input-field"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={newCostCategory}
                      onChange={(e) => setNewCostCategory(e.target.value)}
                      className="input-field"
                    >
                      <option value="Food">Food</option>
                      <option value="Transport">Transport</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Accommodation">Accommodation</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {newCostCategory === 'Other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Other category
                    </label>
                    <input
                      type="text"
                      value={newCostCustomCategory}
                      onChange={(e) => setNewCostCustomCategory(e.target.value)}
                      className="input-field"
                      placeholder="Describe the cost category"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={newCostNote}
                    onChange={(e) => setNewCostNote(e.target.value)}
                    className="input-field"
                    placeholder="What was this for?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingCost}
                  className="btn-outline"
                >
                  {isSavingCost ? 'Saving...' : 'Add Cost'}
                </button>
              </form>
            </div>
          </div>

            {/* Time Logs History */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Time Logs</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setTimeLogFilter('all')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      timeLogFilter === 'all'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-black/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-black/40'
                    }`}
                  >
                    All Time Logs
                  </button>
                  <button
                    onClick={() => setTimeLogFilter('mine')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      timeLogFilter === 'mine'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-black/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-black/40'
                    }`}
                  >
                    My Time Logs
                  </button>
                </div>
              </div>
              <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredTimeLogs.length} of {projectTimeLogs.length} time logs
                {timeLogFilter === 'mine' && (
                  <span className="ml-2 text-primary-600 dark:text-primary-400">
                    (Your logs only)
                  </span>
                )}
              </div>
              <div className="space-y-4">
                {filteredTimeLogs.length > 0 ? (
                  filteredTimeLogs.map((log) => {
                  const isMyLog = log.userId === currentUser?.id
                  return (
                    <div key={log.id} className={`border rounded-xl p-4 ${
                      isMyLog && timeLogFilter === 'all'
                        ? 'border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-white/10'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs text-white ${
                            isMyLog ? 'bg-primary-600' : 'bg-gray-500'
                          }`}>
                            {log.userName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {log.userName || 'Unknown User'}
                              </span>
                              {isMyLog && timeLogFilter === 'all' && (
                                <span className="text-xs bg-primary-100 dark:bg-primary-800 text-primary-800 dark:text-primary-200 px-2 py-1 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(log.loggedAt).toLocaleDateString()} at {new Date(log.loggedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                            {formatHoursMinutesFromHours(log.hours)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">logged</div>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {log.description || 'No description provided'}
                        </p>
                        {log.attachmentUrl && (
                          <a
                            href={log.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            <HiDownload className="h-4 w-4 mr-1" />
                            {log.attachmentFileName || 'View attachment'}
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <HiClock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">
                      {timeLogFilter === 'mine' ? 'No time logs found' : 'No time logs available'}
                    </p>
                    <p className="text-sm">
                      {timeLogFilter === 'mine' 
                        ? 'You haven\'t logged any time for this task yet.' 
                        : 'No team members have logged time for this task yet.'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>


          {/* Weekly Breakdown Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Weekly Breakdown</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hours" fill="#3B82F6" name="Hours" />
                  <Bar dataKey="comments" fill="#10B981" name="Comments" />
                  <Bar dataKey="documents" fill="#F59E0B" name="Documents" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="space-y-6">
          {/* Add Comment Form */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Comment</h3>
            <form onSubmit={handleSaveComment} className="space-y-4">
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Use mic to dictate your comment</span>
                  <div className="space-x-2">
                    {!isRecComment ? (
                      <button type="button" onClick={() => startRecording('comment')} className="text-xs px-2 py-1 rounded-md bg-primary-600 text-white disabled:opacity-50">
                        {isTranscribing ? 'Transcribing…' : '🎤 Speak'}
                      </button>
                    ) : (
                      <button type="button" onClick={() => stopRecording('comment')} className="text-xs px-2 py-1 rounded-md bg-red-600 text-white">Stop</button>
                    )}
                    {!isLiveComment ? (
                      <button type="button" onClick={() => startLiveDictation('comment')} className="text-xs px-2 py-1 rounded-md bg-green-600 text-white">🎙 Live</button>
                    ) : (
                      <button type="button" onClick={() => stopLiveDictation('comment')} className="text-xs px-2 py-1 rounded-md bg-orange-600 text-white">Stop Live</button>
                    )}
                  </div>
                </div>
                <textarea
                  value={newComment}
                  onChange={handleMentionInput}
                  rows={4}
                  className="input-field"
                  placeholder="Add a comment or update... Use @ to mention team members"
                  required
                />
                
                {/* Mention Dropdown */}
                {showMentionDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-black/60 border border-gray-300 dark:border-white/10 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleMentionSelect(user.name)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-black/40 flex items-center space-x-2"
                        >
                          <div className="h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center text-xs text-white">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-sm text-gray-900 dark:text-white">{user.name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                        No users found
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Use @ to mention team members
                </div>
                <button
                  type="submit"
                  disabled={isSavingComment}
                  className="btn-primary"
                >
                  {isSavingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>
          </div>

          {/* Comments List */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Comments & Updates</h3>
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border border-gray-200 dark:border-white/10 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-xs text-white">
                      {comment.author.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{comment.author.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
                        {comment.content.split(' ').map((word, index) => {
                          if (word.startsWith('@')) {
                            return (
                              <span key={index} className="text-primary-600 dark:text-primary-400 font-medium">
                                {word}{' '}
                              </span>
                            )
                          }
                          return <span key={index}>{word}{' '}</span>
                        })}
                      </p>
                      
                      {/* Reply Button */}
                      <div className="flex items-center space-x-4 mb-3">
                        <button
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 flex items-center space-x-1"
                        >
                          <HiChat className="h-4 w-4" />
                          <span>Reply</span>
                        </button>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {comment.replies?.length || 0} replies
                        </span>
                      </div>
                      
                      {/* Reply Form */}
                      {replyingTo === comment.id && (
                        <div className="ml-4 mb-4 p-3 bg-gray-50 dark:bg-black/50 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <div className="h-6 w-6 rounded-full bg-gray-400 flex items-center justify-center text-xs text-white">
                              {currentUser?.name.split(' ').map(n => n[0]).join('') || 'U'}
                            </div>
                            <div className="flex-1">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={2}
                                className="w-full text-sm border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 bg-white dark:bg-black/60 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder={`Reply to ${comment.author.name}...`}
                              />
                              <div className="flex items-center justify-end space-x-2 mt-2">
                                <button
                                  onClick={() => {
                                    setReplyingTo(null)
                                    setReplyText('')
                                  }}
                                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveReply(comment.id)}
                                  disabled={isSavingReply || !replyText.trim()}
                                  className="text-sm bg-primary-600 text-white px-3 py-1 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSavingReply ? 'Posting...' : 'Reply'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-4 space-y-3">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start space-x-3">
                              <div className="h-6 w-6 rounded-full bg-gray-400 flex items-center justify-center text-xs text-white">
                                {reply.author.avatar}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{reply.author.name}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(reply.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {reply.content.split(' ').map((word, index) => {
                                    if (word.startsWith('@')) {
                                      return (
                                        <span key={index} className="text-primary-600 dark:text-primary-400 font-medium">
                                          {word}{' '}
                                        </span>
                                      )
                                    }
                                    return <span key={index}>{word}{' '}</span>
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Upload Document Form */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upload Document</h3>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Document Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter document name"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assign Reviewer
                  </label>
                  <select className="input-field" value={docReviewerId} onChange={(e) => setDocReviewerId(e.target.value)} required>
                    <option value="">Select reviewer</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select File
                </label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="input-field"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="btn-primary"
              >
                {isUploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </form>
          </div>

          {/* Documents List */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Documents</h3>
            <div className="space-y-4">
              {taskDocuments.map((doc) => (
                <div key={doc.id} className="border border-gray-200 dark:border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <HiDocument className="h-8 w-8 text-primary-600" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Uploaded by {doc.createdBy?.name || 'Unknown'} • {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getDocumentStatusColor(doc.status)}`}>
                        {String(doc.status || '').toUpperCase()}
                      </span>
                      {doc.fileUrl && (
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200" title="Open document">
                          <HiDownload className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activity Timeline</h3>
          <div className="space-y-6">
            {(() => {
              // Group by Month Year
              const groups: Record<string, TimelineItem[]> = {}
              const order: string[] = []
              timeline.forEach(it => {
                const d = new Date(it.timestamp)
                const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
                if (!groups[label]) { groups[label] = []; order.push(label) }
                groups[label].push(it)
              })
              return order.map(label => (
                <div key={label}>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{label}</div>
                  <div className="space-y-3">
                    {groups[label].map((it) => (
                      <div key={it.id} className="flex items-start justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/60">
                        <div className="flex items-start space-x-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white ${it.type === 'document' ? 'bg-blue-600' : it.type === 'timelog' ? 'bg-green-600' : 'bg-gray-600'}`}>
                            {it.type === 'document' ? '📄' : it.type === 'timelog' ? '⏱️' : '📝'}
                          </div>
                          <div>
                            <div className="text-sm text-gray-900 dark:text-white flex items-center flex-wrap gap-2">
                              {it.type === 'timelog' && it.hours !== undefined ? (
                                <>
                                  <span>
                                    Logged <span className="font-semibold">{it.hours}h</span>{it.title ? ` on ${it.title}` : ''}
                                  </span>
                                  <span className="inline-block text-xs px-2 py-0.5 rounded-md bg-orange-700 text-white dark:bg-orange-800">
                                    {it.hours}h
                                  </span>
                                </>
                              ) : (
                                <>{it.title}</>
                              )}
                            </div>
                            {it.by && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {`by ${it.by}`}
                              </div>
                            )}
                            {it.type === 'document' && it.url && (
                              <div className="mt-1 text-xs">
                                <a href={it.url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline mr-3">View</a>
                                <a href={it.url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">Download</a>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-3 whitespace-nowrap">
                          {new Date(it.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskDetail
