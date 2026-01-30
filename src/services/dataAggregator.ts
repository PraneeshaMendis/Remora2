import { Task, Project, TimeLog, Comment, Document, User } from '../types/index.ts'

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
