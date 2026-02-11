import { Task, Project, TimeLog, Comment, Document, User } from '../types/index.ts'

export interface KPICalculationResult {
  delivery: number
  reliability: number
  collaboration: number
  quality: number
  initiative: number
  efficiency: number
  overall: number
  grade: string
}

export interface UserActivityData {
  tasks: Task[]
  projects: Project[]
  timeLogs: TimeLog[]
  comments: Comment[]
  documents: Document[]
  user: User
}

export class KPICalculator {
  private userData: UserActivityData
  private timeWindow: '30days' | '90days' | 'ytd' = '30days'

  constructor(userData: UserActivityData, timeWindow: '30days' | '90days' | 'ytd' = '30days') {
    this.userData = userData
    this.timeWindow = timeWindow
  }

  // Calculate Delivery Score (20% weight)
  private calculateDelivery(): number {
    const { tasks, projects } = this.userData
    const filteredTasks = this.filterByTimeWindow(tasks)
    
    if (filteredTasks.length === 0) return 0

    // On-time delivery percentage
    const onTimeTasks = filteredTasks.filter(task => {
      if (!task.dueDate) return false
      const dueDate = new Date(task.dueDate)
      const completedDate = task.status === 'completed' ? new Date(task.completedAt || '') : new Date()
      return completedDate <= dueDate
    }).length

    const onTimePercentage = (onTimeTasks / filteredTasks.length) * 100

    // Priority weighting bonus
    const priorityWeight = filteredTasks.reduce((acc, task) => {
      const weight = task.priority === 'critical' ? 1.2 : 
                   task.priority === 'high' ? 1.1 : 
                   task.priority === 'medium' ? 1.0 : 0.9
      return acc + weight
    }, 0) / filteredTasks.length

    // Project milestone hit rate
    const projectMilestoneRate = this.calculateProjectMilestoneRate(projects)

    return Math.min(100, (onTimePercentage * 0.6 + projectMilestoneRate * 0.4) * priorityWeight)
  }

  // Calculate Reliability Score (25% weight)
  private calculateReliability(): number {
    const { tasks, timeLogs } = this.userData
    const filteredTasks = this.filterByTimeWindow(tasks)
    
    if (filteredTasks.length === 0) return 0

    // Overdue tasks penalty
    const overdueTasks = filteredTasks.filter(task => {
      if (!task.dueDate || task.status === 'completed') return false
      const dueDate = new Date(task.dueDate)
      return new Date() > dueDate
    }).length

    const overduePenalty = (overdueTasks / filteredTasks.length) * 30

    // Task freshness (how recent tasks are completed)
    const completedTasks = filteredTasks.filter(task => task.status === 'completed')
    const avgCompletionTime = completedTasks.length > 0 ? completedTasks.reduce((acc, task) => {
      if (!task.createdAt || !task.completedAt) return acc
      const created = new Date(task.createdAt)
      const completed = new Date(task.completedAt)
      return acc + (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) // days
    }, 0) / completedTasks.length : 0

    const freshnessScore = Math.max(0, 100 - avgCompletionTime * 2) // Penalty for slow completion

    // Daily log consistency
    const logConsistency = this.calculateLogConsistency(timeLogs)

    return Math.max(0, 100 - overduePenalty - (100 - freshnessScore) * 0.3 - (100 - logConsistency) * 0.2)
  }

  // Calculate Collaboration Score (20% weight)
  private calculateCollaboration(): number {
    const { comments, documents } = this.userData
    const filteredComments = this.filterByTimeWindow(comments)
    const filteredDocuments = this.filterByTimeWindow(documents)

    // Comments per week
    const weeksInWindow = this.getWeeksInTimeWindow()
    const commentsPerWeek = filteredComments.length / weeksInWindow
    const commentsScore = Math.min(100, commentsPerWeek * 5) // 20 comments/week = 100%

    // Document sharing and review
    const documentsShared = filteredDocuments.length
    const documentsReviewed = filteredDocuments.filter(doc => doc.status === 'approved').length
    const documentScore = Math.min(100, (documentsShared * 2 + documentsReviewed * 3))

    // Cross-project interactions (comments on different projects)
    const uniqueProjects = new Set(filteredComments.map(c => c.projectId || c.taskId)).size
    const projectDiversityScore = Math.min(100, uniqueProjects * 15)

    return (commentsScore * 0.4 + documentScore * 0.4 + projectDiversityScore * 0.2)
  }

  // Calculate Quality Score (20% weight)
  private calculateQuality(): number {
    const { documents } = this.userData
    const filteredDocuments = this.filterByTimeWindow(documents)

    if (filteredDocuments.length === 0) return 0

    const ratings = filteredDocuments
      .map(doc => this.resolveDocumentRating(doc))
      .filter((rating): rating is number => typeof rating === 'number' && Number.isFinite(rating))

    if (ratings.length === 0) return 0

    const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    return Math.min(100, Math.max(0, (averageRating / 5) * 100))
  }

  // Calculate Initiative Score (10% weight)
  private calculateInitiative(): number {
    const { timeLogs, tasks, comments } = this.userData
    const filteredTasks = this.filterByTimeWindow(tasks)
    const filteredComments = this.filterByTimeWindow(comments)

    // Daily log consistency
    const logConsistency = this.calculateLogConsistency(timeLogs)

    // Self-started tasks (tasks created by the user)
    const selfStartedTasks = filteredTasks.filter(task => task.createdBy === this.userData.user.id).length
    const selfStartedScore = Math.min(100, selfStartedTasks * 20)

    // Proactive comments (comments that initiate discussions)
    const proactiveComments = filteredComments.filter(comment => 
      comment.content.includes('?') || comment.content.includes('suggest') || comment.content.includes('recommend')
    ).length
    const proactiveScore = Math.min(100, proactiveComments * 10)

    return (logConsistency * 0.4 + selfStartedScore * 0.3 + proactiveScore * 0.3)
  }

  // Calculate Efficiency Score (5% weight)
  private calculateEfficiency(): number {
    const { projects, timeLogs } = this.userData
    const filteredTimeLogs = this.filterByTimeWindow(timeLogs)

    // Only consider completed projects for efficiency calculation
    const completedProjects = projects.filter(project => project.status === 'completed')
    
    if (completedProjects.length === 0) return 85 // Base score if no completed projects

    let totalEfficiency = 0
    let projectCount = 0

    completedProjects.forEach(project => {
      if (project.allocatedHours > 0) {
        const projectTimeLogs = filteredTimeLogs.filter(log => log.projectId === project.id)
        const totalLoggedHours = projectTimeLogs.reduce((sum, log) => sum + log.hours, 0)
        
        if (totalLoggedHours > 0) {
          // Calculate efficiency: allocated hours / actual hours used
          const efficiency = (project.allocatedHours / totalLoggedHours) * 100
          totalEfficiency += Math.min(150, efficiency) // Cap at 150% efficiency
          projectCount++
        }
      }
    })

    return projectCount > 0 ? totalEfficiency / projectCount : 85
  }

  // Helper methods
  private filterByTimeWindow<T extends { createdAt?: string; loggedAt?: string; uploadedAt?: string }>(items: T[]): T[] {
    const now = new Date()
    const cutoffDate = new Date()

    switch (this.timeWindow) {
      case '30days':
        cutoffDate.setDate(now.getDate() - 30)
        break
      case '90days':
        cutoffDate.setDate(now.getDate() - 90)
        break
      case 'ytd':
        cutoffDate.setFullYear(now.getFullYear(), 0, 1)
        break
    }

    return items.filter(item => {
      const itemDate = new Date(item.createdAt || item.loggedAt || item.uploadedAt || '')
      return itemDate >= cutoffDate
    })
  }

  private getWeeksInTimeWindow(): number {
    const now = new Date()
    const cutoffDate = new Date()

    switch (this.timeWindow) {
      case '30days':
        cutoffDate.setDate(now.getDate() - 30)
        break
      case '90days':
        cutoffDate.setDate(now.getDate() - 90)
        break
      case 'ytd':
        cutoffDate.setFullYear(now.getFullYear(), 0, 1)
        break
    }

    return Math.ceil((now.getTime() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24 * 7))
  }

  private calculateProjectMilestoneRate(projects: Project[]): number {
    if (projects.length === 0) return 0

    const completedProjects = projects.filter(project => project.status === 'completed').length
    return (completedProjects / projects.length) * 100
  }

  private calculateLogConsistency(timeLogs: TimeLog[]): number {
    if (timeLogs.length === 0) return 0

    const weeksInWindow = this.getWeeksInTimeWindow()
    const expectedLogs = weeksInWindow * 5 // Expected 5 logs per week
    const actualLogs = timeLogs.length

    return Math.min(100, (actualLogs / expectedLogs) * 100)
  }

  private parseRatingFromReviewNote(note?: string): number | null {
    const raw = String(note || '').trim()
    if (!raw) return null
    const match = raw.match(/rating:\s*(\d(?:\.\d+)?)\s*\/\s*5/i)
    if (!match) return null
    const rating = Number(match[1])
    if (!Number.isFinite(rating)) return null
    return Math.min(5, Math.max(0, rating))
  }

  private resolveDocumentRating(doc: Document): number | null {
    if (typeof doc.reviewScore === 'number' && Number.isFinite(doc.reviewScore)) {
      return Math.min(5, Math.max(0, doc.reviewScore))
    }
    return this.parseRatingFromReviewNote(doc.reviewNote)
  }

  private hasDocumentQualityRatings(): boolean {
    const filteredDocuments = this.filterByTimeWindow(this.userData.documents)
    return filteredDocuments.some(doc => this.resolveDocumentRating(doc) !== null)
  }

  private calculateGrade(overallScore: number): string {
    if (overallScore >= 95) return 'A+'
    if (overallScore >= 90) return 'A'
    if (overallScore >= 85) return 'B+'
    if (overallScore >= 80) return 'B'
    if (overallScore >= 75) return 'C+'
    if (overallScore >= 70) return 'C'
    if (overallScore >= 65) return 'D+'
    if (overallScore >= 60) return 'D'
    return 'F'
  }

  // Main calculation method
  public calculateKPI(): KPICalculationResult {
    const delivery = this.calculateDelivery()
    const reliability = this.calculateReliability()
    const collaboration = this.calculateCollaboration()
    const quality = this.calculateQuality()
    const initiative = this.calculateInitiative()
    const efficiency = this.calculateEfficiency()

    // Weighted average based on role
    const weights = this.getRoleWeights()
    const weightedOverall =
      delivery * weights.delivery +
      reliability * weights.reliability +
      collaboration * weights.collaboration +
      quality * weights.quality +
      initiative * weights.initiative +
      efficiency * weights.efficiency
    const overall = this.hasDocumentQualityRatings() ? quality : weightedOverall

    return {
      delivery: Math.round(delivery * 10) / 10,
      reliability: Math.round(reliability * 10) / 10,
      collaboration: Math.round(collaboration * 10) / 10,
      quality: Math.round(quality * 10) / 10,
      initiative: Math.round(initiative * 10) / 10,
      efficiency: Math.round(efficiency * 10) / 10,
      overall: Math.round(overall * 10) / 10,
      grade: this.calculateGrade(overall)
    }
  }

  private getRoleWeights() {
    const role = this.userData.user.role?.toLowerCase() || 'member'
    
    switch (role) {
      case 'manager':
        return {
          delivery: 0.20,
          reliability: 0.25,
          collaboration: 0.20,
          quality: 0.20,
          initiative: 0.10,
          efficiency: 0.05
        }
      case 'director':
        return {
          delivery: 0.15,
          reliability: 0.20,
          collaboration: 0.25,
          quality: 0.20,
          initiative: 0.15,
          efficiency: 0.05
        }
      case 'employee':
      case 'member':
      default:
        return {
          delivery: 0.25,
          reliability: 0.25,
          collaboration: 0.20,
          quality: 0.20,
          initiative: 0.05,
          efficiency: 0.05
        }
    }
  }
}

// Factory function to create calculator with real data
export function createKPICalculator(
  user: User,
  tasks: Task[],
  projects: Project[],
  timeLogs: TimeLog[],
  comments: Comment[],
  documents: Document[],
  timeWindow: '30days' | '90days' | 'ytd' = '30days'
): KPICalculator {
  const userData: UserActivityData = {
    user,
    tasks: tasks.filter(task => task.assignee === user.id || task.assignees.includes(user.id)),
    projects: projects.filter(project => project.team.includes(user.id)),
    timeLogs: timeLogs.filter(log => log.userId === user.id),
    comments: comments.filter(comment => comment.author.id === user.id),
    documents: documents.filter(doc => doc.uploadedBy === user.id)
  }

  return new KPICalculator(userData, timeWindow)
}
