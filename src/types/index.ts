export interface Project {
  id: string
  name: string
  description: string
  owner: string
  status: 'planning' | 'in-progress' | 'in-review' | 'completed' | 'blocked'
  progress: number
  startDate: string
  dueDate: string
  team: string[]
  tags: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  phases: Phase[]
  tasks: Task[]
  members: ProjectMember[]
  allocatedHours: number
  loggedHours: number
  remainingHours: number
}

export interface Phase {
  id: string
  name: string
  description: string
  status: 'pending' | 'in-progress' | 'completed'
  startDate: string
  dueDate: string
  projectId: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'planning' | 'in-progress' | 'in-review' | 'done' | 'blocked' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  dueDate: string
  projectId: string
  phaseId?: string
  assignees: string[]
  assignee?: string // For backward compatibility
  isDone: boolean
  createdAt: string
  updatedAt: string
  completedAt?: string
  progress: number
  createdBy?: string
}

export interface ProjectMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'manager' | 'member'
  department: string
  avatar?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'director' | 'manager' | 'member' | 'consultant' | 'lead' | 'client'
  department: string
  isActive: boolean
  avatar?: string
  lastActive: string
}

export interface Document {
  id: string
  name: string
  projectId: string
  phaseId?: string
  taskId?: string
  reviewerId?: string
  reviewerRole?: string
  uploadedBy: string
  uploadedByRole?: string
  sentTo: string[]
  dateSubmitted: string
  status: 'draft' | 'in-review' | 'approved' | 'needs-changes' | 'rejected' | 'pending'
  fileName: string
  fileSize: number
  fileType: string
  type?: string // For backward compatibility
  version: number
  uploadedAt: string
  reviewedAt?: string
  reviewNote?: string
}

export interface Review {
  id: string
  content: string
  date: string
  taskId: string
  taskTitle: string
  projectId?: string
  projectName?: string
  reviewer: string
  attachment?: string
}

export interface DailyLog {
  id: string
  taskId: string
  date: string
  content: string
  attachment?: string
  createdAt: string
  hours?: number
  userId?: string
  userName?: string
}

export interface Comment {
  id: string
  taskId: string
  content: string
  author: { id: string; name: string; email: string; avatar: string }
  projectId?: string
  phaseId?: string
  createdAt: string
  replies?: CommentReply[]
}

export interface CommentReply {
  id: string
  content: string
  author: { id: string; name: string; email: string; avatar: string }
  createdAt: string
}

export interface KPI {
  label: string
  value: number
  trend?: 'up' | 'down' | 'stable'
  change?: number
  color?: string
}

export interface ActivityItem {
  id: string
  type: 'task_created' | 'task_completed' | 'project_updated' | 'review_submitted'
  title: string
  description: string
  timestamp: string
  user: string
  projectId?: string
  taskId?: string
}

export interface InviteInfo {
  email: string
  role: 'director' | 'manager' | 'member'
  expiresAt: string
  isValid: boolean
}

export interface TimeLog {
  id: string
  userId: string
  userName: string
  projectId: string
  taskId: string
  phaseId: string
  hours: number
  description: string
  loggedAt: string
  createdAt: string
  attachmentUrl?: string
  attachmentFileName?: string
}
