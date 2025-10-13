import React, { useState, useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { Task, DailyLog, User, Document, Comment, TimeLog, Project } from '../types/index.ts'
import { HiArrowLeft, HiClock, HiDocument, HiChat, HiCheckCircle, HiCalendar, HiTrendingUp, HiEye, HiDownload, HiPlay, HiStop, HiUser, HiUsers } from 'react-icons/hi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const TaskDetail: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>()
  const location = useLocation()
  
  // State management
  const [task, setTask] = useState<Task | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [projectTimeLogs, setProjectTimeLogs] = useState<TimeLog[]>([])
  const [isMarkingDone, setIsMarkingDone] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0])
  const [newLogContent, setNewLogContent] = useState('')
  const [newLogHours, setNewLogHours] = useState(0)
  const [isSavingLog, setIsSavingLog] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSavingComment, setIsSavingComment] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSavingReply, setIsSavingReply] = useState(false)
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPosition, setMentionPosition] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'time' | 'comments' | 'documents' | 'history'>('overview')
  const [timeLogFilter, setTimeLogFilter] = useState<'all' | 'mine'>('all')

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

  const teamMembers = [
    { id: '1', name: 'Alex Rodriguez', email: 'alex@company.com', role: 'member' as const, department: 'Design', isActive: true, lastActive: '2024-01-20T10:30:00Z' },
    { id: '2', name: 'Sarah Johnson', email: 'sarah@company.com', role: 'manager' as const, department: 'Design', isActive: true, lastActive: '2024-01-20T11:00:00Z' },
    { id: '3', name: 'Mike Chen', email: 'mike@company.com', role: 'member' as const, department: 'Design', isActive: true, lastActive: '2024-01-20T15:30:00Z' },
    { id: '4', name: 'Emma Wilson', email: 'emma@company.com', role: 'member' as const, department: 'Design', isActive: true, lastActive: '2024-01-20T14:20:00Z' }
  ]

  // Mock project data with time allocation
  const mockProject: Project = {
    id: projectId || '1',
    name: projectName,
    description: 'Mobile app redesign project',
    owner: 'Sarah Johnson',
    status: 'in-progress',
    progress: 65,
    startDate: '2024-01-15',
    dueDate: '2024-02-15',
    team: ['1', '2', '3', '4'],
    tags: ['mobile', 'design', 'ux'],
    priority: 'high',
    phases: [],
    tasks: [],
    members: teamMembers,
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

  // Collaborative daily logs with multiple users
  const dailyLogs: DailyLog[] = [
    {
      id: '1',
      taskId: taskId || '1',
      date: '2024-01-20',
      content: 'Started working on the main navigation wireframes. Created initial layout for the bottom tab navigation.',
      attachment: 'wireframe-nav.png',
      createdAt: '2024-01-20T10:30:00Z',
      hours: 6.5,
      userId: '1',
      userName: 'Alex Rodriguez'
    },
    {
      id: '2',
      taskId: taskId || '1',
      date: '2024-01-20',
      content: 'Reviewed Alex\'s navigation wireframes and provided feedback. Suggested improvements for accessibility.',
      createdAt: '2024-01-20T11:15:00Z',
      hours: 2.0,
      userId: '2',
      userName: 'Sarah Johnson'
    },
    {
      id: '3',
      taskId: taskId || '1',
      date: '2024-01-20',
      content: 'Implemented Sarah\'s feedback and updated the navigation structure. Also started working on user profile wireframes.',
      createdAt: '2024-01-20T14:00:00Z',
      hours: 4.5,
      userId: '1',
      userName: 'Alex Rodriguez'
    },
    {
      id: '4',
      taskId: taskId || '1',
      date: '2024-01-19',
      content: 'Reviewed design requirements and user research data. Identified key user flows that need to be wireframed.',
      createdAt: '2024-01-19T14:15:00Z',
      hours: 4.0,
      userId: '2',
      userName: 'Sarah Johnson'
    },
    {
      id: '5',
      taskId: taskId || '1',
      date: '2024-01-19',
      content: 'Set up the wireframing tool and created the project structure. Started with the user profile screen wireframe.',
      createdAt: '2024-01-19T09:00:00Z',
      hours: 7.5,
      userId: '1',
      userName: 'Alex Rodriguez'
    },
    {
      id: '6',
      taskId: taskId || '1',
      date: '2024-01-18',
      content: 'Initial project setup and research phase. Gathered requirements from stakeholders.',
      createdAt: '2024-01-18T16:30:00Z',
      hours: 3.0,
      userId: '3',
      userName: 'Mike Chen'
    }
  ]

  const comments: Comment[] = [
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

  const documents: Document[] = [
    {
      id: '1',
      name: 'Navigation Wireframes v2 (Updated)',
      fileName: 'wireframe-nav-v2.png',
      status: 'approved',
      uploadedBy: 'Alex Rodriguez',
      uploadedAt: '2024-01-20T14:00:00Z',
      projectId: projectId || '1',
      taskId: taskId || '1',
      sentTo: ['Sarah Johnson', 'Mike Chen'],
      dateSubmitted: '2024-01-20T14:00:00Z',
      fileSize: 1024000,
      fileType: 'image/png',
      version: 2
    },
    {
      id: '2',
      name: 'User Profile Wireframes',
      fileName: 'wireframe-profile.png',
      status: 'in-review',
      uploadedBy: 'Alex Rodriguez',
      uploadedAt: '2024-01-20T15:30:00Z',
      projectId: projectId || '1',
      taskId: taskId || '1',
      sentTo: ['Sarah Johnson'],
      dateSubmitted: '2024-01-20T15:30:00Z',
      fileSize: 856000,
      fileType: 'image/png',
      version: 1
    },
    {
      id: '3',
      name: 'Design Requirements Document',
      fileName: 'design-requirements.pdf',
      status: 'approved',
      uploadedBy: 'Sarah Johnson',
      uploadedAt: '2024-01-19T10:00:00Z',
      projectId: projectId || '1',
      taskId: taskId || '1',
      sentTo: ['Alex Rodriguez', 'Mike Chen', 'Emma Wilson'],
      dateSubmitted: '2024-01-19T10:00:00Z',
      fileSize: 2048000,
      fileType: 'application/pdf',
      version: 1
    },
    {
      id: '4',
      name: 'Settings Screen Wireframes',
      fileName: 'wireframe-settings.png',
      status: 'draft',
      uploadedBy: 'Emma Wilson',
      uploadedAt: '2024-01-20T16:45:00Z',
      projectId: projectId || '1',
      taskId: taskId || '1',
      sentTo: [],
      dateSubmitted: '2024-01-20T16:45:00Z',
      fileSize: 920000,
      fileType: 'image/png',
      version: 1
    }
  ]

  const activity = [
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

  // Calculate task statistics
  const totalHoursLogged = dailyLogs.reduce((sum, log) => sum + (log.hours || 0), 0)
  const daysActive = Math.ceil((new Date().getTime() - new Date(task?.createdAt || '').getTime()) / (1000 * 60 * 60 * 24))
  const daysLeft = Math.ceil((new Date(task?.dueDate || '').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = daysLeft < 0

  // Daily activity data for charts
  const dailyActivityData = [
    { day: 'Mon', hours: 0, comments: 0, documents: 0 },
    { day: 'Tue', hours: 0, comments: 0, documents: 0 },
    { day: 'Wed', hours: 7.5, comments: 1, documents: 1 },
    { day: 'Thu', hours: 4.0, comments: 0, documents: 1 },
    { day: 'Fri', hours: 6.5, comments: 2, documents: 1 },
    { day: 'Sat', hours: 0, comments: 0, documents: 0 },
    { day: 'Sun', hours: 0, comments: 0, documents: 0 }
  ]

  const weeklyData = [
    { week: 'Week 1', hours: 12, comments: 3, documents: 2 },
    { week: 'Week 2', hours: 18, comments: 5, documents: 3 },
    { week: 'Week 3', hours: 15, comments: 4, documents: 1 }
  ]

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

  // Initialize task, project, and current user
  useEffect(() => {
    // Use task data from location state or fallback to mock data
    setTask(taskData || mockTask)
    
    // Set project data
    setProject(mockProject)
    
    // Set time logs
    setProjectTimeLogs(mockProjectTimeLogs)
    
    // Set current user (in a real app, this would come from auth context)
    setCurrentUser({
      id: '1',
      name: 'Alex Rodriguez',
      email: 'alex@company.com',
      role: 'consultant',
      department: 'Design',
      isActive: true,
      lastActive: new Date().toISOString()
    })
  }, [taskId, taskData])

  const handleMarkDone = async () => {
    setIsMarkingDone(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setTask(prev => prev ? { ...prev, status: 'done', isDone: true, progress: 100 } : null)
    } catch (error) {
      console.error('Failed to mark task as done:', error)
    } finally {
      setIsMarkingDone(false)
    }
  }

  const handleTimeLogSubmit = async () => {
    if (!newLogContent.trim() || newLogHours <= 0 || !currentUser || !project) return

    setIsSavingLog(true)
    try {
      const newTimeLog: TimeLog = {
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        projectId: project.id,
        taskId: task?.id || '',
        phaseId: task?.phaseId || '',
        hours: newLogHours,
        description: newLogContent,
        loggedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }

      // Add to project time logs
      setProjectTimeLogs(prev => [newTimeLog, ...prev])

      // Update project's logged hours and remaining hours
      const newLoggedHours = project.loggedHours + newLogHours
      const newRemainingHours = project.allocatedHours - newLoggedHours
      
      setProject(prev => prev ? {
        ...prev,
        loggedHours: newLoggedHours,
        remainingHours: newRemainingHours
      } : null)

      // Reset form
      setNewLogContent('')
      setNewLogHours(0)
      setNewLogDate(new Date().toISOString().split('T')[0])
      
      // Stop timer if running
      if (isTimerRunning) {
        stopTimer()
      }
    } finally {
      setIsSavingLog(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      setTask(prev => prev ? { ...prev, status: newStatus as any } : null)
    } catch (error) {
      console.error('Failed to change status:', error)
    }
  }


  const handleSaveComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSavingComment(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Saving comment:', newComment)
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
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Saving reply:', replyText, 'to comment:', commentId)
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
    if (!selectedFile) return

    setIsUploading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Uploading file:', selectedFile.name)
      setSelectedFile(null)
    } catch (error) {
      console.error('Failed to upload file:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'badge-success'
      case 'in-progress': return 'badge-info'
      case 'planning': return 'badge-warning'
      case 'blocked': return 'badge-danger'
      case 'in-review': return 'badge-warning'
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

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 dark:text-green-400'
      case 'pending': return 'text-yellow-600 dark:text-yellow-400'
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Hours Logged</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalHoursLogged}</p>
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
      <div className="border-b border-gray-200 dark:border-gray-700">
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
                      <option value="planning">Planning</option>
                      <option value="in-progress">In Progress</option>
                      <option value="in-review">In Review</option>
                      <option value="done">Done</option>
                      <option value="blocked">Blocked</option>
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
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
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
                  <div className="text-sm text-gray-600 dark:text-gray-400">Hours Logged</div>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{project.remainingHours}h</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Time Remaining</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Progress</span>
                  <span>{Math.round((project.loggedHours / project.allocatedHours) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (project.loggedHours / project.allocatedHours) * 100)}%` }}
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Hours Logged</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalHoursLogged}</p>
              </div>
            </div>

            {/* Add Time Log Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleTimeLogSubmit(); }} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
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
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What did you work on?
                  </label>
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
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    All Time Logs
                  </button>
                  <button
                    onClick={() => setTimeLogFilter('mine')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      timeLogFilter === 'mine'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
                        : 'border-gray-200 dark:border-gray-700'
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
                            {log.hours}h
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">logged</div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {log.description || 'No description provided'}
                        </p>
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
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleMentionSelect(user.name)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
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
                <div key={comment.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
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
                        <div className="ml-4 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <div className="h-6 w-6 rounded-full bg-gray-400 flex items-center justify-center text-xs text-white">
                              {currentUser?.name.split(' ').map(n => n[0]).join('') || 'U'}
                            </div>
                            <div className="flex-1">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={2}
                                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assign Reviewer
                  </label>
                  <select className="input-field">
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
              {documents.map((doc) => (
                <div key={doc.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <HiDocument className="h-8 w-8 text-primary-600" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Uploaded by {doc.uploadedBy} • {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getDocumentStatusColor(doc.status)}`}>
                        {doc.status.toUpperCase()}
                      </span>
                      <button className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200">
                        <HiDownload className="h-4 w-4" />
                      </button>
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
          <div className="space-y-4">
            {activity.map((item) => (
              <div key={item.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <span className="text-xs">📝</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">{item.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskDetail