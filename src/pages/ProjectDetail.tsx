import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  HiArrowLeft, 
  HiPlus,
  HiChevronDown,
  HiDotsVertical,
  HiX
} from 'react-icons/hi'
import { 
  CalendarDays, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Pause, 
  Play,
  Filter,
  ArrowUpDown,
  TrendingUp,
  Target,
  BarChart3,
  List
} from 'lucide-react'
import GanttChart from '../components/GanttChart'
import EditPhaseModal from '../components/modals/EditPhaseModal'
import EditTaskModal from '../components/modals/EditTaskModal'
import { useAuth } from '../contexts/AuthContext.tsx'

// Interface for progress calculation
interface PhaseWithTasks {
  id: string
  title: string
  tasks: Array<{
    id: string
    title: string
    status: string
  }>
}

// Function to calculate project progress based on task completion
const calculateProjectProgress = (phases: PhaseWithTasks[]): number => {
  if (!phases || phases.length === 0) return 0
  
  let totalTasks = 0
  let completedTasks = 0
  
  phases.forEach(phase => {
    if (phase.tasks && phase.tasks.length > 0) {
      totalTasks += phase.tasks.length
      completedTasks += phase.tasks.filter(task => task.status === 'completed').length
    }
  })
  
  if (totalTasks === 0) return 0
  return Math.round((completedTasks / totalTasks) * 100)
}

// Helper function to convert actual phases to progress calculation format
const convertPhasesForProgress = (phases: any[]): PhaseWithTasks[] => {
  return phases.map(phase => ({
    id: phase.id,
    title: phase.title,
    tasks: phase.tasks.map((task: any) => ({
      id: task.id,
      title: task.title,
      status: task.status
    }))
  }))
}

interface ProjectMember {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
  department: string
}

interface Task {
  id: string
  title: string
  description: string
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold'
  priority: 'low' | 'medium' | 'high' | 'critical'
  dueDate: string
  assignee?: ProjectMember
  assignees?: ProjectMember[]
  phaseId: string
  createdAt: string
  updatedAt: string
}

interface Phase {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  status: 'planning' | 'not-started' | 'in-progress' | 'completed' | 'on-hold'
  tasks: Task[]
  projectId: string
  assignees: string[]
}

interface Project {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  status: 'planning' | 'active' | 'completed' | 'on-hold'
  progress: number
  team: ProjectMember[]
  phases: Phase[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  createdAt: string
  updatedAt: string
}

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [taskFilter, setTaskFilter] = useState('all')
  const [taskSort, setTaskSort] = useState('deadline')
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  
  // Modal states
  const [isAddPhaseModalOpen, setIsAddPhaseModalOpen] = useState(false)
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false)
  const [selectedPhaseForTask, setSelectedPhaseForTask] = useState<string | null>(null)
  
  // Form data
  const [phaseData, setPhaseData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: ''
  })
  
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    startDate: '',
    dueDate: '',
    assigneeIds: [] as string[]
  })
  
  // View toggle and modals
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list')
  const [isEditPhaseModalOpen, setIsEditPhaseModalOpen] = useState(false)
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false)
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '')
  const isExecutive = String(user?.department || '').trim().toLowerCase() === 'executive department'
  
  // Helper: reload project from API
  const reloadProject = async () => {
    if (!id) return
    const base = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000'
    const res = await fetch(`${base}/projects/${id}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const apiPhases = (data.phases || []).map((p: any) => ({
      id: p.id,
      title: p.name,
      description: p.description || '',
      startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '',
      endDate: p.endDate ? new Date(p.endDate).toISOString().split('T')[0] : '',
      status: 'active',
      projectId: data.id,
      assignees: [],
      tasks: (p.tasks || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        status: (t.status || 'NOT_STARTED').toString().toLowerCase().replace('_', '-') as any,
        priority: 'medium',
        dueDate: t.dueDate || '',
        assignee: { id: '', name: '', email: '', role: '', department: '' },
        phaseId: p.id,
        createdAt: '',
        updatedAt: ''
      }))
    }))
    const teamMembers: ProjectMember[] = (data.memberships || []).map((m: any) => ({
      id: m.user?.id || m.userId,
      name: m.user?.name || 'Unknown',
      email: m.user?.email || '',
      role: (m.role || 'member').toString().toLowerCase(),
      department: m.user?.department?.name || '',
      avatar: (m.user?.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase(),
    }))

    const mapped: Project = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined as any,
      endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined as any,
      status: (data.status || 'PLANNING').toString().toLowerCase().replace('_', '-') as any,
      progress: data.progress ?? 0,
      team: teamMembers,
      phases: apiPhases,
      priority: 'medium',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }
    setProject(mapped)
  }

  // Load project on mount and when id changes
  useEffect(() => {
    reloadProject().catch(err => console.error('Failed to load project', err))
  }, [id])

  const submitAddPhase = async () => {
    if (!id) return
    if (!phaseData.title.trim()) {
      alert('Please enter a phase name')
      return
    }
    try {
      const base = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000'
      const res = await fetch(`${base}/projects/${id}/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: phaseData.title,
          description: phaseData.description || undefined,
          startDate: phaseData.startDate ? new Date(phaseData.startDate).toISOString() : undefined,
          endDate: phaseData.endDate ? new Date(phaseData.endDate).toISOString() : undefined,
        }),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || `Failed to add phase: ${res.status}`)
      }
      await reloadProject()
      setIsAddPhaseModalOpen(false)
      setPhaseData({ title: '', description: '', startDate: '', endDate: '' })
    } catch (e: any) {
      console.error(e)
      alert(e.message || 'Failed to add phase')
    }
  }

  const markProjectCompleted = async () => {
    if (!id || !project) return
    if (!isExecutive) {
      alert('Only the Executive Department can mark projects as completed.')
      return
    }
    if (!confirm('Are you sure you want to mark this project as completed? This will move it to the completed projects list.')) {
      return
    }
    setIsCompleting(true)
    try {
      const base = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000'
      const payload: any = { status: 'COMPLETED' }
      if (!project.endDate) {
        payload.endDate = new Date().toISOString()
      }
      const res = await fetch(`${base}/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || `Failed to mark project completed (${res.status})`)
      }
      await reloadProject()
      navigate('/completed-projects')
    } catch (e: any) {
      console.error('Failed to mark project completed', e)
      alert(e?.message || 'Failed to mark project completed')
    } finally {
      setIsCompleting(false)
    }
  }

  // Mock project data
  const _initialProject: Project = {
    id: id || '1',
    title: 'Mobile App Redesign',
    description: 'Complete redesign of the mobile application with modern UI/UX principles, improved performance, and enhanced user experience.',
    startDate: '2025-01-01',
    endDate: '2025-06-30',
    status: 'active',
    progress: calculateProjectProgress([
      {
        id: 'phase-1',
        title: 'Research & Planning',
        tasks: [
          { id: 'task-1', title: 'User Research & Interviews', status: 'completed' },
          { id: 'task-2', title: 'Competitive Analysis', status: 'completed' },
          { id: 'task-3', title: 'Technical Architecture Planning', status: 'completed' }
        ]
      },
      {
        id: 'phase-2',
        title: 'Design & Prototyping',
        tasks: [
          { id: 'task-4', title: 'Wireframe Creation', status: 'completed' },
          { id: 'task-5', title: 'Visual Design System', status: 'completed' },
          { id: 'task-6', title: 'Interactive Prototypes', status: 'in-progress' },
          { id: 'task-7', title: 'User Testing Sessions', status: 'not-started' }
        ]
      },
      {
        id: 'phase-3',
        title: 'Development',
        tasks: [
          { id: 'task-8', title: 'Frontend Development', status: 'completed' },
          { id: 'task-9', title: 'Backend API Development', status: 'not-started' },
          { id: 'task-10', title: 'Database Design & Implementation', status: 'not-started' }
        ]
      }
    ]),
    priority: 'high',
    createdAt: '2024-12-15',
    updatedAt: '2025-01-15',
    team: [
      { id: '1', name: 'Sarah Johnson', email: 'sarah@company.com', role: 'Project Manager', department: 'Product', avatar: 'SJ' },
      { id: '2', name: 'Mike Chen', email: 'mike@company.com', role: 'Lead Developer', department: 'Engineering', avatar: 'MC' },
      { id: '3', name: 'Emily Davis', email: 'emily@company.com', role: 'UI/UX Designer', department: 'Design', avatar: 'ED' },
      { id: '4', name: 'James Wilson', email: 'james@company.com', role: 'QA Engineer', department: 'Quality', avatar: 'JW' },
      { id: '5', name: 'Lisa Anderson', email: 'lisa@company.com', role: 'Backend Developer', department: 'Engineering', avatar: 'LA' }
    ],
    phases: [
      {
        id: 'phase-1',
        title: 'Research & Planning',
        description: 'Market research, user interviews, and technical planning phase',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        status: 'completed',
        projectId: id || '1',
        assignees: ['Emily Davis', 'Mike Johnson'],
        tasks: [
          {
            id: 'task-1',
            title: 'User Research & Interviews',
            description: 'Conduct user interviews and analyze current app usage patterns',
            status: 'completed',
            priority: 'high',
            dueDate: '2025-01-10',
            assignee: { id: '3', name: 'Emily Davis', email: 'emily@company.com', role: 'UI/UX Designer', department: 'Design', avatar: 'ED' },
            phaseId: 'phase-1',
            createdAt: '2025-01-01',
            updatedAt: '2025-01-08'
          },
          {
            id: 'task-2',
            title: 'Competitive Analysis',
            description: 'Analyze competitor apps and identify opportunities',
            status: 'completed',
            priority: 'medium',
            dueDate: '2025-01-15',
            assignee: { id: '3', name: 'Emily Davis', email: 'emily@company.com', role: 'UI/UX Designer', department: 'Design', avatar: 'ED' },
            phaseId: 'phase-1',
            createdAt: '2025-01-01',
            updatedAt: '2025-01-12'
          },
          {
            id: 'task-3',
            title: 'Technical Architecture Planning',
            description: 'Define technical requirements and architecture',
            status: 'completed',
            priority: 'high',
            dueDate: '2025-01-20',
            assignee: { id: '2', name: 'Mike Chen', email: 'mike@company.com', role: 'Lead Developer', department: 'Engineering', avatar: 'MC' },
            phaseId: 'phase-1',
            createdAt: '2025-01-01',
            updatedAt: '2025-01-18'
          }
        ]
      },
      {
        id: 'phase-2',
        title: 'Design & Prototyping',
        description: 'UI/UX design, wireframing, and interactive prototyping',
        startDate: '2025-02-01',
        endDate: '2025-03-15',
        status: 'in-progress',
        projectId: id || '1',
        assignees: ['Emily Davis', 'Sarah Johnson'],
        tasks: [
          {
            id: 'task-4',
            title: 'Wireframe Creation',
            description: 'Create detailed wireframes for all app screens',
            status: 'completed',
            priority: 'high',
            dueDate: '2025-02-10',
            assignee: { id: '3', name: 'Emily Davis', email: 'emily@company.com', role: 'UI/UX Designer', department: 'Design', avatar: 'ED' },
            phaseId: 'phase-2',
            createdAt: '2025-02-01',
            updatedAt: '2025-02-08'
          },
          {
            id: 'task-5',
            title: 'Visual Design System',
            description: 'Create comprehensive design system with colors, typography, and components',
            status: 'in-progress',
            priority: 'high',
            dueDate: '2025-02-20',
            assignee: { id: '3', name: 'Emily Davis', email: 'emily@company.com', role: 'UI/UX Designer', department: 'Design', avatar: 'ED' },
            phaseId: 'phase-2',
            createdAt: '2025-02-01',
            updatedAt: '2025-02-15'
          },
          {
            id: 'task-6',
            title: 'Interactive Prototypes',
            description: 'Create clickable prototypes for user testing',
            status: 'not-started',
            priority: 'medium',
            dueDate: '2025-03-05',
            assignee: { id: '3', name: 'Emily Davis', email: 'emily@company.com', role: 'UI/UX Designer', department: 'Design', avatar: 'ED' },
            phaseId: 'phase-2',
            createdAt: '2025-02-01',
            updatedAt: '2025-02-01'
          },
          {
            id: 'task-7',
            title: 'User Testing Sessions',
            description: 'Conduct user testing with interactive prototypes',
            status: 'not-started',
            priority: 'high',
            dueDate: '2025-03-10',
            assignee: { id: '3', name: 'Emily Davis', email: 'emily@company.com', role: 'UI/UX Designer', department: 'Design', avatar: 'ED' },
            phaseId: 'phase-2',
            createdAt: '2025-02-01',
            updatedAt: '2025-02-01'
          }
        ]
      },
      {
        id: 'phase-3',
        title: 'Development',
        description: 'Frontend and backend development of the mobile application',
        startDate: '2025-03-16',
        endDate: '2025-05-31',
        status: 'not-started',
        projectId: id || '1',
        assignees: ['Mike Johnson', 'Lisa Anderson', 'James Wilson'],
        tasks: [
          {
            id: 'task-8',
            title: 'Frontend Development',
            description: 'Develop React Native frontend components',
            status: 'not-started',
            priority: 'high',
            dueDate: '2025-04-15',
            assignee: { id: '2', name: 'Mike Chen', email: 'mike@company.com', role: 'Lead Developer', department: 'Engineering', avatar: 'MC' },
            phaseId: 'phase-3',
            createdAt: '2025-03-16',
            updatedAt: '2025-03-16'
          },
          {
            id: 'task-9',
            title: 'Backend API Development',
            description: 'Develop RESTful APIs for mobile app',
            status: 'not-started',
            priority: 'high',
            dueDate: '2025-04-30',
            assignee: { id: '5', name: 'Lisa Anderson', email: 'lisa@company.com', role: 'Backend Developer', department: 'Engineering', avatar: 'LA' },
            phaseId: 'phase-3',
            createdAt: '2025-03-16',
            updatedAt: '2025-03-16'
          },
          {
            id: 'task-10',
            title: 'Database Design & Implementation',
            description: 'Design and implement database schema',
            status: 'not-started',
            priority: 'medium',
            dueDate: '2025-04-10',
            assignee: { id: '5', name: 'Lisa Anderson', email: 'lisa@company.com', role: 'Backend Developer', department: 'Engineering', avatar: 'LA' },
            phaseId: 'phase-3',
            createdAt: '2025-03-16',
            updatedAt: '2025-03-16'
          }
        ]
      },
      {
        id: 'phase-4',
        title: 'Testing & Quality Assurance',
        description: 'Comprehensive testing, bug fixes, and quality assurance',
        startDate: '2025-06-01',
        endDate: '2025-06-30',
        status: 'not-started',
        projectId: id || '1',
        assignees: ['James Wilson', 'Lisa Anderson'],
        tasks: [
          {
            id: 'task-11',
            title: 'Unit Testing',
            description: 'Write and execute unit tests for all components',
            status: 'not-started',
            priority: 'high',
            dueDate: '2025-06-10',
            assignee: { id: '4', name: 'James Wilson', email: 'james@company.com', role: 'QA Engineer', department: 'Quality', avatar: 'JW' },
            phaseId: 'phase-4',
            createdAt: '2025-06-01',
            updatedAt: '2025-06-01'
          },
          {
            id: 'task-12',
            title: 'Integration Testing',
            description: 'Test integration between frontend and backend',
            status: 'not-started',
            priority: 'high',
            dueDate: '2025-06-20',
            assignee: { id: '4', name: 'James Wilson', email: 'james@company.com', role: 'QA Engineer', department: 'Quality', avatar: 'JW' },
            phaseId: 'phase-4',
            createdAt: '2025-06-01',
            updatedAt: '2025-06-01'
          }
        ]
      }
    ]
  }

  // Mark mock data as referenced to satisfy TS noUnusedLocals without affecting runtime
  void _initialProject

  // Remove older duplicate loader that overwrote dates with blanks

  // Map UI status to API enum
  const toApiStatus = (s: string): 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | undefined => {
    switch (s) {
      case 'not-started': return 'NOT_STARTED'
      case 'in-progress': return 'IN_PROGRESS'
      case 'completed': return 'COMPLETED'
      case 'on-hold': return 'ON_HOLD'
      default: return undefined
    }
  }

  // Task management functions
  const updateTaskStatus = (phaseId: string, taskId: string, newStatus: string) => {
    if (!project) return

    setProject(prevProject => {
      if (!prevProject) return null

      const updatedProject = {
        ...prevProject,
        phases: prevProject.phases.map(phase => {
          if (phase.id === phaseId) {
            return {
              ...phase,
              tasks: phase.tasks.map(task => {
                if (task.id === taskId) {
                  return {
                    ...task,
                    status: newStatus as 'not-started' | 'in-progress' | 'completed' | 'on-hold',
                    updatedAt: new Date().toISOString()
                  }
                }
                return task
              })
            }
          }
          return phase
        })
      }

      // Recalculate project progress based on task completion
      const newProgress = calculateProjectProgress(convertPhasesForProgress(updatedProject.phases))
      
      return {
        ...updatedProject,
        progress: newProgress
      }
    })

    // Persist status change to backend (fire-and-forget)
    ;(async () => {
      try {
        const apiStatus = toApiStatus(newStatus)
        if (!apiStatus) return
        const base = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000'
        const res = await fetch(`${base}/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: apiStatus })
        })
        if (!res.ok) {
          // On failure, reload to sync actual state
          await reloadProject()
        }
      } catch (e) {
        console.error('Failed to persist task status', e)
      }
    })()
  }

  const toggleTaskCompletion = (phaseId: string, taskId: string) => {
    if (!project) return

    const phase = project.phases.find(p => p.id === phaseId)
    if (!phase) return

    const task = phase.tasks.find(t => t.id === taskId)
    if (!task) return

    const newStatus = task.status === 'completed' ? 'in-progress' : 'completed'
    updateTaskStatus(phaseId, taskId, newStatus)
  }

  // Phase management functions
  const handleAddPhase = () => {
    setIsAddPhaseModalOpen(true)
    setPhaseData({
      title: '',
      description: '',
      startDate: '',
      endDate: ''
    })
  }

  // removed local-only handlePhaseSubmit; using submitAddPhase to persist to backend

  // Task management functions
  const handleAddTask = (phaseId: string) => {
    setSelectedPhaseForTask(phaseId)
    setIsAddTaskModalOpen(true)
    setTaskData({
      title: '',
      description: '',
      priority: 'medium',
      startDate: '',
      dueDate: '',
      assigneeIds: []
    })
  }

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project || !selectedPhaseForTask || !taskData.title.trim()) return

    try {
      const base = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000'
      const payload = {
        title: taskData.title.trim(),
        description: taskData.description || '',
        startDate: taskData.startDate ? new Date(taskData.startDate).toISOString() : undefined,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : undefined,
        status: 'NOT_STARTED',
        assigneeUserIds: taskData.assigneeIds || [],
      }
      const res = await fetch(`${base}/projects/${id}/phases/${selectedPhaseForTask}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || `Failed to create task: ${res.status}`)
      }
      await reloadProject()
      setIsAddTaskModalOpen(false)
      setSelectedPhaseForTask(null)
      setTaskData({ title: '', description: '', priority: 'medium', startDate: '', dueDate: '', assigneeIds: [] })
    } catch (err: any) {
      console.error('Failed to create task', err)
      alert(err?.message || 'Failed to create task')
    }
  }

  // Gantt chart handlers
  const handleTaskClick = (task: any) => {
    const phase = project?.phases.find(p => p.id === task.phaseId)
    const foundTask = phase?.tasks.find(t => t.id === task.id.replace('task-', ''))
    if (foundTask) {
      setEditingTask(foundTask)
      setIsEditTaskModalOpen(true)
    }
  }

  const handlePhaseClick = (phase: any) => {
    const foundPhase = project?.phases.find(p => p.id === phase.id)
    if (foundPhase) {
      setEditingPhase(foundPhase)
      setIsEditPhaseModalOpen(true)
    }
  }

  const handleTaskEdit = (task: any) => {
    setEditingTask(task)
    setIsEditTaskModalOpen(true)
  }

  const handlePhaseEdit = (phase: any) => {
    setEditingPhase(phase)
    setIsEditPhaseModalOpen(true)
  }

  const handleSaveTask = (updatedTask: any) => {
    setProject(prev => {
      if (!prev) return null
      
      const updatedProject = {
        ...prev,
        phases: prev.phases.map(phase => ({
          ...phase,
          tasks: phase.tasks.map(task => 
            task.id === updatedTask.id ? { ...task, ...updatedTask } : task
          )
        }))
      }

      // Recalculate project progress based on task completion
      const newProgress = calculateProjectProgress(convertPhasesForProgress(updatedProject.phases))
      
      return {
        ...updatedProject,
        progress: newProgress
      }
    })
  }

  const handleSavePhase = async (updatedPhase: any) => {
    try {
      if (!id || !updatedPhase?.id) return
      const base = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000'
      const payload: any = {
        name: updatedPhase.title,
        description: updatedPhase.description ?? null,
        startDate: updatedPhase.startDate ? new Date(updatedPhase.startDate).toISOString() : null,
        endDate: updatedPhase.endDate ? new Date(updatedPhase.endDate).toISOString() : null,
      }
      const res = await fetch(`${base}/projects/${id}/phases/${updatedPhase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      await reloadProject()
      setIsEditPhaseModalOpen(false)
      setEditingPhase(null)
    } catch (e) {
      console.error('Failed to save phase', e)
      // Fallback: update local state so user sees change even if backend failed
      setProject(prev => {
        if (!prev) return prev
        const updatedProject = {
          ...prev,
          phases: prev.phases.map(phase =>
            phase.id === updatedPhase.id ? { ...phase, ...updatedPhase } : phase
          )
        }
        const newProgress = calculateProjectProgress(convertPhasesForProgress(updatedProject.phases))
        return { ...updatedProject, progress: newProgress }
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'badge-success'
      case 'in-progress':
        return 'badge-info'
      case 'on-hold':
        return 'badge-warning'
      case 'not-started':
        return 'badge-info'
      case 'planning':
        return 'badge-info'
      case 'active':
        return 'badge-success'
      default:
        return 'badge-info'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'badge-danger'
      case 'high':
        return 'badge-warning'
      case 'medium':
        return 'badge-warning'
      case 'low':
        return 'badge-success'
      default:
        return 'badge-info'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'in-progress':
        return <Play className="h-4 w-4" />
      case 'on-hold':
        return <Pause className="h-4 w-4" />
      case 'not-started':
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const calculatePhaseProgress = (phase: Phase) => {
    const total = phase.tasks.length || 0
    if (total === 0) return 0
    const completedTasks = phase.tasks.filter(task => task.status === 'completed').length
    return Math.round((completedTasks / total) * 100)
  }

  const calculateDaysActive = (startDate: string) => {
    if (!startDate) return 0
    const start = new Date(startDate)
    const today = new Date()
    const diffTime = today.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  // Helper to render phase duration with sensible fallbacks
  const getDurationLabel = (phase: Phase) => {
    const s = phase.startDate
    const e = phase.endDate
    if (s && e) return `${formatDate(s)} - ${formatDate(e)}`
    if (s) return `Start: ${formatDate(s)}`
    if (e) return `Due: ${formatDate(e)}`
    return 'No dates'
  }


  const getOverdueTasks = (phase: Phase) => {
    const today = new Date()
    return phase.tasks.filter(task => {
      const dueDate = new Date(task.dueDate)
      return dueDate < today && task.status !== 'completed'
    }).length
  }

  const filteredTasks = (phase: Phase) => {
    let tasks = phase.tasks

    if (taskFilter !== 'all') {
      tasks = tasks.filter(task => task.status === taskFilter)
    }

    if (taskSort === 'deadline') {
      tasks = tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    } else if (taskSort === 'priority') {
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }
      tasks = tasks.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
    }

    return tasks
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  const allTasks = project.phases.flatMap(phase => phase.tasks)
  const totalTasks = allTasks.length
  const completedTasks = allTasks.filter(task => task.status === 'completed').length

  return (
    <div className="p-6">
      {/* Back Button */}
      <div className="mb-6 flex items-center justify-between">
        <Link 
          to="/projects" 
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
        >
          <HiArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <List className="h-4 w-4" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'gantt'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Gantt View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Project Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{project.title}</h1>
              <span className={`badge ${getStatusColor(project.status)}`}>
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </span>
              <span className={`badge ${getPriorityColor(project.priority)}`}>
                {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)} Priority
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">{project.description}</p>
            
            {/* Project Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {(() => {
                      const start = project.startDate
                      const end = project.endDate
                      if (start && end) return `${formatDate(start)} - ${formatDate(end)}`
                      if (start) return `Start: ${formatDate(start)}`
                      if (end) return `Due: ${formatDate(end)}`
                      return 'No due date'
                    })()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Progress</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{project.progress}%</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Team Members</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{project.team.length}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tasks Completed</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{completedTasks}/{totalTasks}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{project.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-primary-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${project.progress}%` }}
            ></div>
          </div>
        </div>

        {/* Team Members */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team Members</h3>
          <div className="flex flex-wrap gap-3">
            {project.team.map((member) => (
              <div key={member.id} className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {member.avatar}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt Chart Section */}
      {viewMode === 'gantt' && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Project Timeline</h2>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Click on phases or tasks to edit them
            </div>
          </div>
          
          <GanttChart
            phases={project.phases.map(phase => ({
              id: phase.id,
              name: phase.title,
              startDate: phase.startDate,
              endDate: phase.endDate,
              tasks: phase.tasks.map(task => ({
                id: task.id,
                name: task.title,
                start: task.dueDate ? new Date(new Date(task.dueDate).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                end: task.dueDate || new Date().toISOString().split('T')[0],
                progress: task.status === 'completed' ? 100 : task.status === 'in-progress' ? 50 : 0,
                phaseId: phase.id,
                assignees: task.assignees && task.assignees.length > 0
                  ? task.assignees.map(a => a.name)
                  : (task.assignee ? [task.assignee.name] : []),
                status: task.status,
                description: task.description
              }))
            }))}
            onTaskClick={handleTaskClick}
            onPhaseClick={handlePhaseClick}
            onTaskEdit={handleTaskEdit}
            onPhaseEdit={handlePhaseEdit}
          />
        </div>
      )}

      {/* Phases Section */}
      {viewMode === 'list' && (
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Project Phases</h2>
          <div className="flex items-center space-x-4">
            {project.status !== 'completed' && isExecutive && (
              <button 
                onClick={markProjectCompleted}
                disabled={isCompleting}
                className="btn-secondary inline-flex items-center"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isCompleting ? 'Marking...' : 'Mark as Completed'}
              </button>
            )}
            <button 
              onClick={handleAddPhase}
              className="btn-primary inline-flex items-center"
            >
              <HiPlus className="h-4 w-4 mr-2" />
              Add Phase
            </button>
          </div>
        </div>

        {project.phases.map((phase) => {
          const phaseProgress = calculatePhaseProgress(phase)
          const daysActive = calculateDaysActive(phase.startDate)
          const overdueTasks = getOverdueTasks(phase)
          const isExpanded = selectedPhase === phase.id

          return (
            <div key={phase.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Phase Header */}
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                onClick={() => setSelectedPhase(isExpanded ? null : phase.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{phase.title}</h3>
                      <span className={`badge ${getStatusColor(phase.status)}`}>
                        {getStatusIcon(phase.status)}
                        <span className="ml-1">{phase.status.charAt(0).toUpperCase() + phase.status.slice(1)}</span>
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handlePhaseEdit(phase)
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                        title="Edit Phase"
                      >
                        <HiDotsVertical className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{phase.description}</p>
                    
                    {/* Phase Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-2">
                        <CalendarDays className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Duration</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {getDurationLabel(phase)}
                          </p>
                          </div>
                        </div>
                      
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Progress</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{phaseProgress}%</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Days Active</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{daysActive}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Overdue Tasks</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{overdueTasks}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Tasks</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {phase.tasks.filter(t => t.status === 'completed').length}/{phase.tasks.length}
                      </p>
                    </div>
                    <HiChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Phase Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Phase Progress</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{phaseProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${phaseProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Phase Tasks (Expandable) */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                  {/* Task Filters */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <select
                          value={taskFilter}
                          onChange={(e) => setTaskFilter(e.target.value)}
                          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="all">All Tasks</option>
                          <option value="not-started">Not Started</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="on-hold">On Hold</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <ArrowUpDown className="h-4 w-4 text-gray-400" />
                        <select
                          value={taskSort}
                          onChange={(e) => setTaskSort(e.target.value)}
                          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="deadline">Sort by Deadline</option>
                          <option value="priority">Sort by Priority</option>
                        </select>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleAddTask(phase.id)}
                      className="btn-primary inline-flex items-center text-sm"
                    >
                      <HiPlus className="h-4 w-4 mr-2" />
                      Add Task
                    </button>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-3">
                    {filteredTasks(phase).map((task) => (
                      <Link 
                        key={task.id} 
                        to={`/projects/${id}/tasks/${task.id}`}
                        state={{
                          task: {
                            id: task.id,
                            title: task.title,
                            description: task.description,
                            status: task.status,
                            priority: task.priority,
                            dueDate: task.dueDate,
                            projectId: id,
                            assignees: task.assignees && task.assignees.length > 0 
                              ? task.assignees.map(a => a.name) 
                              : (task.assignee ? [task.assignee.name] : []),
                            isDone: task.status === 'completed',
                            createdAt: task.createdAt,
                            updatedAt: task.updatedAt,
                            progress: task.status === 'completed' ? 100 : task.status === 'in-progress' ? 65 : 0,
                            phaseId: phase.id
                          },
                          projectName: project?.title || 'Project',
                          phaseName: phase.title
                        }}
                        className="block bg-gray-50 dark:bg-gray-700 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">{task.title}</h4>
                              <span className={`badge ${getStatusColor(task.status)}`}>
                                {getStatusIcon(task.status)}
                                <span className="ml-1">{task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ')}</span>
                              </span>
                              <span className={`badge ${getPriorityColor(task.priority)}`}>
                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>{
                                  task.assignees && task.assignees.length > 0
                                    ? task.assignees.map(a => a.name).join(', ')
                                    : (task.assignee?.name || 'Unassigned')
                                }</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <CalendarDays className="h-3 w-3" />
                                <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3" onClick={(e) => e.preventDefault()}>
                            {/* Status Dropdown */}
                            <select
                              value={task.status}
                              onChange={(e) => {
                                e.stopPropagation()
                                updateTaskStatus(phase.id, task.id, e.target.value)
                              }}
                              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="not-started">Not Started</option>
                              <option value="in-progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="on-hold">On Hold</option>
                            </select>
                            
                            {/* Completion Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                toggleTaskCompletion(phase.id, task.id)
                              }}
                              className={`p-2 rounded-lg transition-colors duration-200 ${
                                task.status === 'completed'
                                  ? 'text-green-600 bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/30'
                                  : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-primary-600'
                              }`}
                              title={task.status === 'completed' ? 'Mark as In Progress' : 'Mark as Completed'}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            
                            {/* More Options */}
                            <button 
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleTaskEdit(task)
                              }}
                              className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
                              title="Edit Task"
                            >
                              <HiDotsVertical className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        </div>
      )}

      {/* Add Phase Modal */}
      {isAddPhaseModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Phase</h3>
              <button
                onClick={() => setIsAddPhaseModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                <HiX className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); submitAddPhase(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phase Title *
                </label>
                <input
                  type="text"
                  value={phaseData.title}
                  onChange={(e) => setPhaseData({ ...phaseData, title: e.target.value })}
                  className="input-field"
                  placeholder="Enter phase title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={phaseData.description}
                  onChange={(e) => setPhaseData({ ...phaseData, description: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="Enter phase description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={phaseData.startDate}
                    onChange={(e) => setPhaseData({ ...phaseData, startDate: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={phaseData.endDate}
                    onChange={(e) => setPhaseData({ ...phaseData, endDate: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddPhaseModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Add Phase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isAddTaskModalOpen && selectedPhaseForTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Task</h3>
              <button
                onClick={() => setIsAddTaskModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                <HiX className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={taskData.title}
                  onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                  className="input-field"
                  placeholder="Enter task title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={taskData.description}
                  onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="Enter task description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={taskData.startDate}
                    onChange={(e) => setTaskData({ ...taskData, startDate: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskData.dueDate}
                    onChange={(e) => setTaskData({ ...taskData, dueDate: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={taskData.priority}
                  onChange={(e) => setTaskData({ ...taskData, priority: e.target.value })}
                  className="input-field"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assign to (optional)
                </label>
                <select
                  value={taskData.assigneeIds[0] || ''}
                  onChange={(e) => {
                    const val = e.currentTarget.value
                    setTaskData({ ...taskData, assigneeIds: val ? [val] : [] })
                  }}
                  className="input-field"
                >
                  <option value="">Unassigned</option>
                  {project?.team.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Choose one member or leave as Unassigned.</p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Phase Modal */}
      <EditPhaseModal
        isOpen={isEditPhaseModalOpen}
        onClose={() => {
          setIsEditPhaseModalOpen(false)
          setEditingPhase(null)
        }}
        phase={editingPhase}
        onSave={handleSavePhase}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={isEditTaskModalOpen}
        onClose={() => {
          setIsEditTaskModalOpen(false)
          setEditingTask(null)
        }}
        task={editingTask}
        onSave={handleSaveTask}
      />
    </div>
  )
}

export default ProjectDetail
