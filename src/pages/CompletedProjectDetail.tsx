import React, { useState, useMemo } from 'react'
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

  // Mock project data
  const project = {
    id: id || '1',
    title: 'E-commerce Platform Redesign',
    description: 'Complete redesign of the e-commerce platform with modern UI/UX principles, improved performance, and enhanced user experience.',
    startDate: '2024-01-15',
    endDate: '2024-06-30',
    completedAt: '2024-06-30',
    status: 'completed',
    progress: 100,
    priority: 'high',
    team: [
      { id: '1', name: 'Sarah Johnson', email: 'sarah@company.com', role: 'Project Manager', department: 'Product', avatar: 'SJ' },
      { id: '2', name: 'Mike Chen', email: 'mike@company.com', role: 'Lead Developer', department: 'Engineering', avatar: 'MC' },
      { id: '3', name: 'Emily Davis', email: 'emily@company.com', role: 'UI/UX Designer', department: 'Design', avatar: 'ED' },
      { id: '4', name: 'James Wilson', email: 'james@company.com', role: 'QA Engineer', department: 'Quality', avatar: 'JW' }
    ],
    phases: [
      {
        id: 'phase-1',
        title: 'Research & Planning',
        status: 'completed',
        startDate: '2024-01-15',
        endDate: '2024-02-15',
        tasks: [
          { id: 'task-1', title: 'User Research', status: 'completed', assignee: { id: '3', name: 'Emily Davis', email: 'emily@company.com', role: 'UI/UX Designer', department: 'Design', avatar: 'ED' } },
          { id: 'task-2', title: 'Technical Planning', status: 'completed', assignee: { id: '2', name: 'Mike Chen', email: 'mike@company.com', role: 'Lead Developer', department: 'Engineering', avatar: 'MC' } }
        ]
      },
      {
        id: 'phase-2',
        title: 'Design & Development',
        status: 'completed',
        startDate: '2024-02-16',
        endDate: '2024-06-30',
        tasks: [
          { id: 'task-3', title: 'UI Design', status: 'completed', assignee: { id: '3', name: 'Emily Davis', email: 'emily@company.com', role: 'UI/UX Designer', department: 'Design', avatar: 'ED' } },
          { id: 'task-4', title: 'Frontend Development', status: 'completed', assignee: { id: '2', name: 'Mike Chen', email: 'mike@company.com', role: 'Lead Developer', department: 'Engineering', avatar: 'MC' } }
        ]
      }
    ],
    manager: { id: '1', name: 'Sarah Johnson', email: 'sarah@company.com', role: 'Project Manager', department: 'Product', avatar: 'SJ' },
    department: 'Product',
    totalTasks: 4,
    completedTasks: 4,
    totalPhases: 2,
    uniqueAssignees: 4,
    duration: 167,
    allocatedHours: 320, // Total allocated time for the project
    actualHours: 0 // Will be calculated from time logs
  }

  // Mock timeline events
  const timelineEvents: ProjectEvent[] = [
    {
      id: '1',
      type: 'DOC_UPLOADED',
      occurredAt: '2025-01-03T14:30:00Z',
      actorId: '1',
      actorName: 'Gayan Silva',
      entityRef: 'doc-1',
      labels: ['Document', 'ProjectPlan.pdf'],
      description: 'ProjectPlan.pdf'
    },
    {
      id: '2',
      type: 'TASK_COMPLETED',
      occurredAt: '2025-01-05T16:00:00Z',
      actorId: '1',
      actorName: 'Gayan Silva',
      entityRef: 'task-1',
      phaseId: 'phase-1',
      taskId: 'task-1',
      labels: ['Task', 'Kickoff Meeting'],
      description: 'Kickoff Meeting'
    },
    {
      id: '3',
      type: 'COMMENT_ADDED',
      occurredAt: '2025-01-05T17:00:00Z',
      actorId: '1',
      actorName: 'Gayan Silva',
      entityRef: 'comment-1',
      phaseId: 'phase-1',
      labels: ['Comment'],
      description: 'Project kickoff went smoothly. All stakeholders aligned.'
    },
    {
      id: '4',
      type: 'TASK_COMPLETED',
      occurredAt: '2025-01-15T16:00:00Z',
      actorId: '1',
      actorName: 'Gayan Silva',
      entityRef: 'task-2',
      phaseId: 'phase-1',
      taskId: 'task-2',
      labels: ['Task', 'Project Plan Development'],
      description: 'Project Plan Development'
    },
    {
      id: '5',
      type: 'PHASE_COMPLETED',
      occurredAt: '2025-01-20T17:00:00Z',
      actorId: '1',
      actorName: 'Gayan Silva',
      entityRef: 'phase-1',
      phaseId: 'phase-1',
      labels: ['Phase', 'Planning'],
      description: 'Planning Completed'
    },
    {
      id: '6',
      type: 'TASK_COMPLETED',
      occurredAt: '2025-01-20T16:00:00Z',
      actorId: '1',
      actorName: 'Gayan Silva',
      entityRef: 'task-3',
      phaseId: 'phase-1',
      taskId: 'task-3',
      labels: ['Task', 'Resource Allocation'],
      description: 'Resource Allocation'
    },
    {
      id: '7',
      type: 'TASK_COMPLETED',
      occurredAt: '2025-02-10T16:00:00Z',
      actorId: '2',
      actorName: 'Sarah Chen',
      entityRef: 'task-4',
      phaseId: 'phase-2',
      taskId: 'task-4',
      labels: ['Task', 'Current State Analysis'],
      description: 'Current State Analysis'
    },
    {
      id: '8',
      type: 'TIME_LOG_ADDED',
      occurredAt: '2024-02-11T09:30:00Z',
      actorId: '1',
      actorName: 'Sarah Johnson',
      entityRef: 'time-log-1',
      phaseId: 'phase-1',
      taskId: 'task-1',
      labels: ['Time Log', 'User Research'],
      description: 'Logged 2.5 hours on User Research',
      duration: 2.5
    },
    {
      id: '9',
      type: 'TIME_LOG_ADDED',
      occurredAt: '2024-02-12T14:15:00Z',
      actorId: '2',
      actorName: 'Mike Chen',
      entityRef: 'time-log-2',
      phaseId: 'phase-1',
      taskId: 'task-2',
      labels: ['Time Log', 'Technical Architecture'],
      description: 'Logged 4 hours on Technical Architecture',
      duration: 4
    },
    {
      id: '10',
      type: 'TIME_LOG_ADDED',
      occurredAt: '2024-03-16T10:45:00Z',
      actorId: '3',
      actorName: 'Emily Davis',
      entityRef: 'time-log-3',
      phaseId: 'phase-2',
      taskId: 'task-3',
      labels: ['Time Log', 'UI Design Mockups'],
      description: 'Logged 6 hours on UI Design Mockups',
      duration: 6
    },
    {
      id: '11',
      type: 'TIME_LOG_ADDED',
      occurredAt: '2024-03-21T16:20:00Z',
      actorId: '4',
      actorName: 'Alex Rodriguez',
      entityRef: 'time-log-4',
      phaseId: 'phase-2',
      taskId: 'task-4',
      labels: ['Time Log', 'Database Optimization'],
      description: 'Logged 3.5 hours on Database Optimization',
      duration: 3.5
    },
    {
      id: '12',
      type: 'TIME_LOG_ADDED',
      occurredAt: '2024-04-06T11:30:00Z',
      actorId: '5',
      actorName: 'Lisa Wang',
      entityRef: 'time-log-5',
      phaseId: 'phase-3',
      taskId: 'task-5',
      labels: ['Time Log', 'User Acceptance Testing'],
      description: 'Logged 5 hours on User Acceptance Testing',
      duration: 5
    }
  ]

  // Mock documents
  const documents: ProjectDocument[] = [
    {
      id: '1',
      name: 'User Research Report.pdf',
      type: 'PDF',
      uploadedBy: { id: '3', name: 'Emily Davis', email: 'emily@company.com', role: 'UI/UX Designer', department: 'Design', avatar: 'ED' },
      uploadedAt: '2024-02-10T14:30:00Z',
      phaseId: 'phase-1',
      taskId: 'task-1',
      reviewStatus: 'approved',
      size: '2.4 MB'
    },
    {
      id: '2',
      name: 'Technical Architecture.docx',
      type: 'DOCX',
      uploadedBy: { id: '2', name: 'Mike Chen', email: 'mike@company.com', role: 'Lead Developer', department: 'Engineering', avatar: 'MC' },
      uploadedAt: '2024-02-12T11:15:00Z',
      phaseId: 'phase-1',
      reviewStatus: 'approved',
      size: '1.8 MB'
    },
    {
      id: '3',
      name: 'UI Design Mockups.fig',
      type: 'FIG',
      uploadedBy: { id: '3', name: 'Emily Davis', email: 'emily@company.com', role: 'UI/UX Designer', department: 'Design', avatar: 'ED' },
      uploadedAt: '2024-03-15T16:45:00Z',
      phaseId: 'phase-2',
      reviewStatus: 'approved',
      size: '5.2 MB'
    }
  ]

  // Mock time logs data
  const timeLogs = [
    {
      id: '1',
      userId: '1',
      userName: 'Sarah Johnson',
      projectId: '1',
      phaseId: 'phase-1',
      taskId: 'task-1',
      hours: 2.5,
      description: 'Project planning and coordination',
      loggedAt: '2024-01-16T09:00:00Z',
      createdAt: '2024-01-16T09:00:00Z'
    },
    {
      id: '2',
      userId: '2',
      userName: 'Mike Chen',
      projectId: '1',
      phaseId: 'phase-1',
      taskId: 'task-2',
      hours: 4.0,
      description: 'Technical architecture design',
      loggedAt: '2024-01-18T10:30:00Z',
      createdAt: '2024-01-18T10:30:00Z'
    },
    {
      id: '3',
      userId: '3',
      userName: 'Emily Davis',
      projectId: '1',
      phaseId: 'phase-1',
      taskId: 'task-1',
      hours: 6.0,
      description: 'User research and analysis',
      loggedAt: '2024-01-20T14:15:00Z',
      createdAt: '2024-01-20T14:15:00Z'
    },
    {
      id: '4',
      userId: '2',
      userName: 'Mike Chen',
      projectId: '1',
      phaseId: 'phase-2',
      taskId: 'task-4',
      hours: 8.5,
      description: 'Frontend development implementation',
      loggedAt: '2024-02-20T08:00:00Z',
      createdAt: '2024-02-20T08:00:00Z'
    },
    {
      id: '5',
      userId: '3',
      userName: 'Emily Davis',
      projectId: '1',
      phaseId: 'phase-2',
      taskId: 'task-3',
      hours: 12.0,
      description: 'UI design and prototyping',
      loggedAt: '2024-03-01T11:00:00Z',
      createdAt: '2024-03-01T11:00:00Z'
    },
    {
      id: '6',
      userId: '4',
      userName: 'James Wilson',
      projectId: '1',
      phaseId: 'phase-2',
      taskId: 'task-4',
      hours: 5.5,
      description: 'Quality assurance testing',
      loggedAt: '2024-03-15T13:30:00Z',
      createdAt: '2024-03-15T13:30:00Z'
    },
    {
      id: '7',
      userId: '1',
      userName: 'Sarah Johnson',
      projectId: '1',
      phaseId: 'phase-2',
      taskId: 'task-3',
      hours: 3.0,
      description: 'Project coordination and review',
      loggedAt: '2024-03-20T16:00:00Z',
      createdAt: '2024-03-20T16:00:00Z'
    },
    {
      id: '8',
      userId: '2',
      userName: 'Mike Chen',
      projectId: '1',
      phaseId: 'phase-2',
      taskId: 'task-4',
      hours: 6.5,
      description: 'Final integration and deployment',
      loggedAt: '2024-04-01T09:45:00Z',
      createdAt: '2024-04-01T09:45:00Z'
    }
  ]

  // Calculate actual hours from time logs
  const actualHours = timeLogs.reduce((total, log) => total + log.hours, 0)

  // Mock tasks data
  const tasks = [
    { id: 'task-1', name: 'User Research', phaseId: 'phase-1' },
    { id: 'task-2', name: 'Technical Architecture', phaseId: 'phase-1' },
    { id: 'task-3', name: 'UI Design Mockups', phaseId: 'phase-2' },
    { id: 'task-4', name: 'Database Optimization', phaseId: 'phase-2' },
    { id: 'task-5', name: 'User Acceptance Testing', phaseId: 'phase-3' }
  ]

  // Mock comments
  const comments: ProjectComment[] = [
    {
      id: '1',
      author: { id: '1', name: 'Sarah Johnson', email: 'sarah@company.com', role: 'Project Manager', department: 'Product', avatar: 'SJ' },
      content: 'Great work on the user research! The insights will be very valuable for the design phase.',
      createdAt: '2024-02-10T17:00:00Z',
      phaseId: 'phase-1',
      taskId: 'task-1'
    },
    {
      id: '2',
      author: { id: '2', name: 'Mike Chen', email: 'mike@company.com', role: 'Lead Developer', department: 'Engineering', avatar: 'MC' },
      content: 'The technical architecture is ready for review. Please let me know if you have any questions.',
      createdAt: '2024-02-12T12:00:00Z',
      phaseId: 'phase-1',
      taskId: 'task-2'
    },
    {
      id: '3',
      author: { id: '3', name: 'Emily Davis', email: 'emily@company.com', role: 'UI/UX Designer', department: 'Design', avatar: 'ED' },
      content: 'UI mockups are complete and ready for development. All screens have been designed with responsive layouts.',
      createdAt: '2024-03-15T17:30:00Z',
      phaseId: 'phase-2',
      taskId: 'task-3'
    },
    {
      id: '4',
      author: { id: '4', name: 'Alex Rodriguez', email: 'alex@company.com', role: 'Backend Developer', department: 'Engineering', avatar: 'AR' },
      content: 'Database optimization completed successfully. Performance improved by 40%.',
      createdAt: '2024-03-20T14:15:00Z',
      phaseId: 'phase-2',
      taskId: 'task-4'
    },
    {
      id: '5',
      author: { id: '5', name: 'Lisa Wang', email: 'lisa@company.com', role: 'QA Engineer', department: 'Quality', avatar: 'LW' },
      content: 'User acceptance testing passed with flying colors! All test cases completed successfully.',
      createdAt: '2024-04-05T16:45:00Z',
      phaseId: 'phase-3',
      taskId: 'task-5'
    }
  ]

  // Calculate team performance data from time logs and project data
  const teamPerformance: TeamPerformance[] = project.team.map(member => {
    // Calculate hours logged by this member for this project
    const memberTimeLogs = timeLogs.filter(log => log.userId === member.id)
    const hoursLogged = memberTimeLogs.reduce((total, log) => total + log.hours, 0)
    
    // Calculate tasks completed by this member
    const memberTasks = project.phases.flatMap(phase => 
      phase.tasks.filter(task => task.assignee.id === member.id)
    )
    const tasksCompleted = memberTasks.filter(task => task.status === 'completed').length
    
    // Calculate documents sent by this member
    const documentsSent = documents.filter(doc => doc.uploadedBy.id === member.id).length
    
    // Calculate comments by this member
    const commentsCount = comments.filter(comment => comment.author.id === member.id).length
    
    // Calculate effort share (hours logged / total hours)
    const totalProjectHours = timeLogs.reduce((total, log) => total + log.hours, 0)
    const effortShare = totalProjectHours > 0 ? hoursLogged / totalProjectHours : 0
    
    // Mock other metrics (these would be calculated from real data in a real app)
    const onTimeCompletion = 100 // Would calculate from task due dates vs completion dates
    const averageLateness = 0 // Would calculate from task lateness
    const reviewParticipation = Math.floor(Math.random() * 10) + 1 // Would calculate from review activities
    const approvalRatio = 100 // Would calculate from document approval rates
    const kpiScore = Math.floor(Math.random() * 20) + 80 // Would calculate from KPI system
    
    return {
      member,
      tasksCompleted,
      onTimeCompletion,
      averageLateness,
      reviewParticipation,
      approvalRatio,
      documentsSent,
      commentsCount,
      hoursLogged,
      kpiScore,
      effortShare
    }
  })

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
      // Simulate download
      const link = document.createElement('a')
      link.href = `#` // In real app, this would be the actual file URL
      link.download = doc.name
      link.click()
      
      // Show success message
      alert(`Downloading ${doc.name}...`)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
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

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
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
        <div className="border-b border-gray-200 dark:border-gray-700">
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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search timeline events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <select
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Time</option>
                  <option value="phase">By Phase</option>
                  <option value="month">By Month</option>
                </select>
                
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Phases</option>
                  {project.phases.map(phase => (
                    <option key={phase.id} value={phase.id}>{phase.title}</option>
                  ))}
                </select>
                
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                    <div className="absolute left-2.5 top-2 bottom-2 w-px bg-gray-300 dark:bg-gray-600" />
                    
                    {events.map((event) => (
                      <div key={event.id} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[1.375rem] top-1.5 w-5 h-5 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          {getEventIcon(event.type)}
                        </div>
                        
                        {/* Content */}
                        <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow ${
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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
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
                <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Comments</h3>
              
              {/* Filters */}
              <div className="flex items-center space-x-4">
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <div key={comment.id} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0 last:pb-0">
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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Time Logs</h3>
              
              {/* Filters */}
              <div className="flex items-center space-x-4">
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <div key={personName} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
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
                              <div key={event.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Team Performance Analytics</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
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
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
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
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
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
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mt-6 bg-opacity-50 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '0.4s' }}>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
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
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
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
