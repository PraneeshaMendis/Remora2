import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext.tsx'
import { 
  HiInformationCircle, 
  HiClock,
  HiCheckCircle,
  HiExclamationCircle,
  HiX
} from 'react-icons/hi'
import { 
  Download,
  Edit3,
  Camera,
  X
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { createKPICalculator, KPICalculationResult } from '../services/kpiCalculator'
import { dataAggregator, AggregatedUserData } from '../services/dataAggregator'

interface KPIData {
  delivery: number
  reliability: number
  collaboration: number
  quality: number
  initiative: number
  efficiency: number
  overall: number
  grade: string
}

interface ProjectPerformance {
  id: string
  name: string
  duration: string
  hoursLogged: number
  contributionPercent: number
  phasesContributed: string
  onTimeContribution: number
  comments: number
  docsUploaded: number
  docsReviewed: number
  status: 'on-time' | 'late' | 'overdue'
}


interface TimeAllocation {
  project: string
  hours: number
  percentage: number
  color: string
}

const TIME_ALLOCATION_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-emerald-500', 'bg-pink-500']

const roundValue = (value: number) => Math.round((value + Number.EPSILON) * 10) / 10

const toTimestamp = (value?: string) => {
  const ts = Date.parse(String(value || ''))
  return Number.isNaN(ts) ? null : ts
}

const toDateKey = (value?: string) => {
  const ts = toTimestamp(value)
  if (ts === null) return null
  return new Date(ts).toISOString().slice(0, 10)
}

const formatProjectDuration = (startDate?: string, dueDate?: string) => {
  const startTs = toTimestamp(startDate)
  const endTs = toTimestamp(dueDate)
  if (startTs !== null && endTs !== null) {
    const start = new Date(startTs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const end = new Date(endTs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return `${start} - ${end}`
  }
  if (startTs !== null) {
    return `From ${new Date(startTs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
  }
  if (endTs !== null) {
    return `Until ${new Date(endTs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
  }
  return 'Date not set'
}

const Profile: React.FC = () => {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: user?.name || '',
    profilePicture: null as File | null
  })
  const [timeView, setTimeView] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [showKPIDetails, setShowKPIDetails] = useState(false)
  const [timeWindow, setTimeWindow] = useState<'30days' | '90days' | 'ytd'>('30days')
  const [aggregatedData, setAggregatedData] = useState<AggregatedUserData | null>(null)
  const [kpiData, setKpiData] = useState<KPICalculationResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load and calculate real data
  useEffect(() => {
    let active = true

    const loadUserData = async () => {
      if (!user?.id) {
        if (active) setIsLoading(false)
        return
      }

      if (active) setIsLoading(true)
      try {
        const userData = await dataAggregator.aggregateUserDataFromApi(user.id, user)
        if (!active) return
        setAggregatedData(userData)

        const calculator = createKPICalculator(
          userData.user,
          userData.tasks,
          userData.projects,
          userData.timeLogs,
          userData.comments,
          userData.documents,
          timeWindow
        )

        const calculatedKPI = calculator.calculateKPI()
        if (active) setKpiData(calculatedKPI)
      } catch (error) {
        console.error('Error loading user data:', error)
        if (!active) return
        const fallbackData = dataAggregator.aggregateUserData(user.id, user)
        setAggregatedData(fallbackData)
        const fallbackCalculator = createKPICalculator(
          fallbackData.user,
          fallbackData.tasks,
          fallbackData.projects,
          fallbackData.timeLogs,
          fallbackData.comments,
          fallbackData.documents,
          timeWindow
        )
        setKpiData(fallbackCalculator.calculateKPI())
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadUserData()
    return () => {
      active = false
    }
  }, [user?.id, timeWindow])

  const projectHoursById = useMemo(() => {
    const map = new Map<string, number>()
    if (!aggregatedData) return map
    aggregatedData.timeLogs.forEach(log => {
      const projectId = String(log.projectId || '')
      if (!projectId) return
      map.set(projectId, (map.get(projectId) || 0) + Number(log.hours || 0))
    })
    return map
  }, [aggregatedData])

  const profileData = {
    name: aggregatedData?.user.name || user?.name || 'Profile',
    email: aggregatedData?.user.email || user?.email || '',
    role: aggregatedData?.user.role || user?.role || 'member',
    department: aggregatedData?.user.department || user?.department || '',
    profilePicture: null,
    currentProjects: (aggregatedData?.projects || []).map(project => ({
      id: project.id,
      name: project.name,
      link: `/projects/${project.id}`
    })),
    totalHoursThisMonth: aggregatedData?.totalHoursThisMonth ?? 0,
    totalHoursAllTime: aggregatedData?.totalHoursAllTime ?? 0,
    performanceScore: kpiData?.overall ?? 0
  }

  const displayKpiData: KPIData = kpiData || {
    delivery: 0,
    reliability: 0,
    collaboration: 0,
    quality: 0,
    initiative: 0,
    efficiency: 0,
    overall: 0,
    grade: 'N/A'
  }

  const contributionShare = useMemo(() => {
    const totalHours = aggregatedData?.totalHoursAllTime || 0
    if (!aggregatedData || totalHours <= 0) return []
    return aggregatedData.projects
      .map(project => {
        const hours = projectHoursById.get(project.id) || 0
        return {
          project: project.name,
          percentage: Math.min(100, Math.round((hours / totalHours) * 100)),
        }
      })
      .filter(item => item.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage)
  }, [aggregatedData, projectHoursById])

  const contributionData = {
    projectsInvolved: aggregatedData?.projectsInvolved ?? 0,
    phasesContributed: aggregatedData?.phasesContributed ?? 0,
    totalHoursWorked: aggregatedData?.totalHoursAllTime ?? 0,
    averageHoursPerWeek: aggregatedData?.averageHoursPerWeek ?? 0,
    contributionShare
  }

  const totalTaskCount = aggregatedData?.tasks.length || 0
  const taskPerformance = {
    onTimeContribution: aggregatedData?.onTimeContribution ?? 0,
    delayedContribution: aggregatedData?.delayedContribution ?? 0,
    overdueTasksCount: aggregatedData?.overdueTasksCount ?? 0,
    performanceBreakdown: [
      {
        status: 'On-time',
        count: Math.round(((aggregatedData?.onTimeContribution ?? 0) / 100) * totalTaskCount),
        color: 'bg-green-500'
      },
      {
        status: 'Late',
        count: Math.round(((aggregatedData?.delayedContribution ?? 0) / 100) * totalTaskCount),
        color: 'bg-yellow-500'
      },
      {
        status: 'Overdue',
        count: aggregatedData?.overdueTasksCount ?? 0,
        color: 'bg-red-500'
      }
    ]
  }

  const collaborationMetrics = {
    commentsAdded: aggregatedData?.commentsAdded ?? 0,
    commentsPerWeek: aggregatedData?.commentsPerWeek ?? 0,
    documentsShared: aggregatedData?.documentsShared ?? 0,
    documentsReviewed: aggregatedData?.documentsReviewed ?? 0,
    documentFlow: (aggregatedData?.documents || [])
      .slice()
      .sort((a, b) => (toTimestamp(b.uploadedAt) || 0) - (toTimestamp(a.uploadedAt) || 0))
      .slice(0, 3)
      .map(doc => ({
        from: aggregatedData?.user.name || user?.name || 'User',
        to: doc.reviewerId ? 'Reviewer' : 'Team',
        project: aggregatedData?.projects.find(p => p.id === doc.projectId)?.name || 'Project',
        type: (doc.type || doc.fileType || 'Document').toUpperCase()
      }))
  }

  const efficiencyMetrics = {
    totalAllocatedHours: aggregatedData?.projects.reduce((sum, p) => sum + p.allocatedHours, 0) ?? 0,
    totalLoggedHours: aggregatedData?.totalHoursAllTime ?? 0,
    timeSaved: aggregatedData?.timeSaved ?? 0,
    earlyCompletions: aggregatedData?.earlyCompletions ?? 0,
    averageTimeSaved: aggregatedData?.averageTimeSaved ?? 0,
    efficiencyBreakdown: (aggregatedData?.projects || [])
      .filter(project => project.status === 'completed')
      .map(project => {
        const loggedHours = roundValue(projectHoursById.get(project.id) || 0)
        const saved = Math.max(0, project.allocatedHours - loggedHours)
        const efficiency = project.allocatedHours > 0 && loggedHours > 0
          ? Math.round((project.allocatedHours / loggedHours) * 100)
          : 100

        return {
          project: project.name,
          allocated: project.allocatedHours,
          logged: loggedHours,
          saved: saved,
          efficiency
        }
      })
  }

  const projectPerformance: ProjectPerformance[] = useMemo(() => {
    if (!aggregatedData) return []
    const totalHours = aggregatedData.totalHoursAllTime || 0
    const now = Date.now()

    return aggregatedData.projects
      .map((project) => {
        const projectTasks = aggregatedData.tasks.filter(task => task.projectId === project.id)
        const projectTaskIds = new Set(projectTasks.map(task => task.id))
        const projectComments = aggregatedData.comments.filter(comment => {
          return comment.projectId === project.id || projectTaskIds.has(comment.taskId)
        })
        const projectDocs = aggregatedData.documents.filter(doc => doc.projectId === project.id)
        const hoursLogged = roundValue(projectHoursById.get(project.id) || 0)
        const contributionPercent = totalHours > 0
          ? Math.min(100, Math.round((hoursLogged / totalHours) * 100))
          : 0
        const contributedPhases = new Set(projectTasks.map(task => task.phaseId).filter(Boolean)).size
        const totalPhases = Math.max(1, project.phases.length || contributedPhases || 1)

        const completedTasks = projectTasks.filter(task => task.status === 'completed' || task.status === 'done')
        const onTimeCount = completedTasks.filter(task => {
          const dueTs = toTimestamp(task.dueDate)
          const completedTs = toTimestamp(task.completedAt || task.updatedAt)
          return dueTs !== null && completedTs !== null && completedTs <= dueTs
        }).length
        const onTimeContribution = completedTasks.length
          ? Math.round((onTimeCount / completedTasks.length) * 100)
          : 0

        const hasOverdue = projectTasks.some(task => {
          const dueTs = toTimestamp(task.dueDate)
          if (dueTs === null) return false
          const isCompleted = task.status === 'completed' || task.status === 'done'
          return !isCompleted && dueTs < now
        })

        const status: ProjectPerformance['status'] = hasOverdue
          ? 'overdue'
          : onTimeContribution >= 80
            ? 'on-time'
            : 'late'

        const reviewedDocs = projectDocs.filter(doc => {
          return Boolean(doc.reviewedAt) || ['approved', 'rejected', 'needs-changes'].includes(doc.status)
        }).length

        return {
          id: project.id,
          name: project.name,
          duration: formatProjectDuration(project.startDate, project.dueDate),
          hoursLogged,
          contributionPercent,
          phasesContributed: `${contributedPhases}/${totalPhases}`,
          onTimeContribution,
          comments: projectComments.length,
          docsUploaded: projectDocs.length,
          docsReviewed: reviewedDocs,
          status,
        }
      })
      .sort((a, b) => b.hoursLogged - a.hoursLogged)
  }, [aggregatedData, projectHoursById])

  const activityData = useMemo(() => {
    if (!aggregatedData) {
      return { daily: [], weekly: [], monthly: [] } as {
        daily: Array<{ day: string; hours: number; comments: number; docs: number }>
        weekly: Array<{ week: string; hours: number; comments: number; docs: number }>
        monthly: Array<{ month: string; hours: number; comments: number; docs: number }>
      }
    }

    const hoursByDay = new Map<string, number>()
    const commentsByDay = new Map<string, number>()
    const docsByDay = new Map<string, number>()

    aggregatedData.timeLogs.forEach(log => {
      const key = toDateKey(log.loggedAt || log.createdAt)
      if (!key) return
      hoursByDay.set(key, (hoursByDay.get(key) || 0) + Number(log.hours || 0))
    })
    aggregatedData.comments.forEach(comment => {
      const key = toDateKey(comment.createdAt)
      if (!key) return
      commentsByDay.set(key, (commentsByDay.get(key) || 0) + 1)
    })
    aggregatedData.documents.forEach(doc => {
      const key = toDateKey(doc.uploadedAt || doc.dateSubmitted)
      if (!key) return
      docsByDay.set(key, (docsByDay.get(key) || 0) + 1)
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daily = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (6 - index))
      const key = date.toISOString().slice(0, 10)
      return {
        day: date.toLocaleDateString(undefined, { weekday: 'short' }),
        hours: roundValue(hoursByDay.get(key) || 0),
        comments: commentsByDay.get(key) || 0,
        docs: docsByDay.get(key) || 0,
      }
    })

    const trailing56 = Array.from({ length: 56 }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (55 - index))
      const key = date.toISOString().slice(0, 10)
      return {
        hours: hoursByDay.get(key) || 0,
        comments: commentsByDay.get(key) || 0,
        docs: docsByDay.get(key) || 0,
      }
    })

    const weekly = Array.from({ length: 8 }, (_, index) => {
      const chunk = trailing56.slice(index * 7, index * 7 + 7)
      return {
        week: `Week ${index + 1}`,
        hours: roundValue(chunk.reduce((sum, item) => sum + item.hours, 0)),
        comments: chunk.reduce((sum, item) => sum + item.comments, 0),
        docs: chunk.reduce((sum, item) => sum + item.docs, 0),
      }
    })

    const monthHours = new Map<string, number>()
    const monthComments = new Map<string, number>()
    const monthDocs = new Map<string, number>()
    const getMonthKey = (value?: string) => {
      const ts = toTimestamp(value)
      if (ts === null) return null
      const date = new Date(ts)
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    }

    aggregatedData.timeLogs.forEach(log => {
      const key = getMonthKey(log.loggedAt || log.createdAt)
      if (!key) return
      monthHours.set(key, (monthHours.get(key) || 0) + Number(log.hours || 0))
    })
    aggregatedData.comments.forEach(comment => {
      const key = getMonthKey(comment.createdAt)
      if (!key) return
      monthComments.set(key, (monthComments.get(key) || 0) + 1)
    })
    aggregatedData.documents.forEach(doc => {
      const key = getMonthKey(doc.uploadedAt || doc.dateSubmitted)
      if (!key) return
      monthDocs.set(key, (monthDocs.get(key) || 0) + 1)
    })

    const monthly = Array.from({ length: 4 }, (_, index) => {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (3 - index), 1))
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
      return {
        month: date.toLocaleDateString(undefined, { month: 'short' }),
        hours: roundValue(monthHours.get(key) || 0),
        comments: monthComments.get(key) || 0,
        docs: monthDocs.get(key) || 0,
      }
    })

    return { daily, weekly, monthly }
  }, [aggregatedData])

  const dailyData = activityData.daily
  const weeklyData = activityData.weekly
  const monthlyData = activityData.monthly

  const timeAllocation: TimeAllocation[] = useMemo(() => {
    if (!aggregatedData) return []
    const totalHours = aggregatedData.totalHoursAllTime || 0
    if (totalHours <= 0) return []

    return aggregatedData.projects
      .map((project, index) => {
        const hours = roundValue(projectHoursById.get(project.id) || 0)
        if (hours <= 0) return null
        return {
          project: project.name,
          hours,
          percentage: Math.min(100, Math.round((hours / totalHours) * 100)),
          color: TIME_ALLOCATION_COLORS[index % TIME_ALLOCATION_COLORS.length],
        } as TimeAllocation
      })
      .filter((item): item is TimeAllocation => item !== null)
      .sort((a, b) => b.hours - a.hours)
  }, [aggregatedData, projectHoursById])

  const getGradeColor = (grade: string) => {
    switch (grade.charAt(0)) {
      case 'A': return 'text-green-600 dark:text-green-400'
      case 'B': return 'text-blue-600 dark:text-blue-400'
      case 'C': return 'text-yellow-600 dark:text-yellow-400'
      case 'D': return 'text-orange-600 dark:text-orange-400'
      case 'F': return 'text-red-600 dark:text-red-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-time': return 'badge-success'
      case 'late': return 'badge-warning'
      case 'overdue': return 'badge-danger'
      default: return 'badge-info'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on-time': return <HiCheckCircle className="h-4 w-4 text-green-500" />
      case 'late': return <HiExclamationCircle className="h-4 w-4 text-yellow-500" />
      case 'overdue': return <HiX className="h-4 w-4 text-red-500" />
      default: return <HiClock className="h-4 w-4 text-blue-500" />
    }
  }

  const handleEditProfile = () => {
    setIsEditing(true)
    setEditData({ name: profileData.name, profilePicture: null })
  }

  const handleSaveProfile = () => {
    // In a real app, this would save to the backend
    console.log('Saving profile:', editData)
    setIsEditing(false)
  }

  const handleDownloadReport = () => {
    const csvContent = [
      ['Profile Report', ''],
      ['Name', profileData.name],
      ['Email', profileData.email],
      ['Role', profileData.role],
      ['Department', profileData.department],
      [''],
      ['KPI Scores', ''],
      ['Overall Score', displayKpiData.overall],
      ['Grade', displayKpiData.grade],
      ['Delivery', displayKpiData.delivery],
      ['Reliability', displayKpiData.reliability],
      ['Collaboration', displayKpiData.collaboration],
      ['Quality', displayKpiData.quality],
      ['Initiative', displayKpiData.initiative],
      [''],
      ['Performance Metrics', ''],
      ['Total Hours (All Time)', profileData.totalHoursAllTime],
      ['Total Hours (This Month)', profileData.totalHoursThisMonth],
      ['Projects Involved', contributionData.projectsInvolved],
      ['Phases Contributed', contributionData.phasesContributed],
      ['On-Time Contribution %', taskPerformance.onTimeContribution],
      ['Comments Added', collaborationMetrics.commentsAdded],
      ['Documents Shared', collaborationMetrics.documentsShared],
      ['Documents Reviewed', collaborationMetrics.documentsReviewed]
    ]

    const csv = csvContent.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${profileData.name}-profile-report.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditData({ ...editData, profilePicture: e.target.files[0] })
    }
  }

  const getCurrentData = () => {
    switch (timeView) {
      case 'daily': return dailyData;
      case 'monthly': return monthlyData;
      default: return weeklyData;
    }
  }

  const getLabel = () => {
    switch (timeView) {
      case 'daily': return 'Daily Activity Timeline';
      case 'monthly': return 'Monthly Activity Timeline';
      default: return 'Weekly Activity Timeline';
    }
  }

  const getDataKey = () => {
    switch (timeView) {
      case 'daily': return 'day';
      case 'monthly': return 'month';
      default: return 'week';
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="card dark:bg-black/60 dark:border-white/10">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading profile data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="card dark:bg-black/60 dark:border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {profileData.name.charAt(0).toUpperCase()}
              </div>
              {isEditing && (
                <label className="absolute bottom-0 right-0 bg-white dark:bg-black/60 rounded-full p-2 shadow-lg cursor-pointer border-2 border-primary-500">
                  <Camera className="h-4 w-4 text-primary-600" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="input-field text-2xl font-bold"
                  />
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Email: {profileData.email} (cannot be changed)
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{profileData.name}</h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400 capitalize">{profileData.role}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{profileData.email}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{profileData.department}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="btn-primary"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEditProfile}
                  className="btn-secondary inline-flex items-center"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
                <button
                  onClick={handleDownloadReport}
                  className="btn-primary inline-flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </button>
              </>
            )}
          </div>
        </div>

        {/* Current Projects */}
        <div className="border-t border-gray-200 dark:border-white/10 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Projects Assigned</h3>
          {profileData.currentProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {profileData.currentProjects.map((project) => (
                <a
                  key={project.id}
                  href={project.link}
                  className="block p-4 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-black/40 transition-colors"
                >
                  <h4 className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400">
                    {project.name}
                  </h4>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No current project assignments found.</p>
          )}
        </div>

        {/* Hours and Performance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Hours Logged (This Month)</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{profileData.totalHoursThisMonth}h</p>
          </div>
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Hours Logged (All Time)</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{profileData.totalHoursAllTime}h</p>
          </div>
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Performance Score</h4>
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{profileData.performanceScore}%</p>
          </div>
        </div>
      </div>

      {/* KPI Score Section */}
      <div className="card dark:bg-black/60 dark:border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">KPI Score</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowKPIDetails(!showKPIDetails)}
              className="btn-secondary inline-flex items-center"
            >
              <HiInformationCircle className="h-4 w-4 mr-2" />
              How Calculated
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Window:</span>
              <select 
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value as '30days' | '90days' | 'ytd')}
                className="input-field text-sm py-1"
              >
                <option value="30days">30 days</option>
                <option value="90days">90 days</option>
                <option value="ytd">YTD</option>
              </select>
            </div>
          </div>
        </div>

        {/* KPI Ring and Scores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* KPI Ring */}
          <div className="flex flex-col items-center">
            <div className="relative w-48 h-48 mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - displayKpiData.overall / 100)}`}
                  className="text-primary-600 dark:text-primary-400"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={`text-4xl font-bold ${getGradeColor(displayKpiData.grade)}`}>
                    {displayKpiData.overall}
                  </div>
                  <div className={`text-lg font-semibold ${getGradeColor(displayKpiData.grade)}`}>
                    {displayKpiData.grade}
                  </div>
              </div>
            </div>
          </div>

          {/* KPI Breakdown */}
          <div className="space-y-4">
            {[
              { name: 'Delivery', score: displayKpiData.delivery, color: 'bg-blue-500' },
              { name: 'Reliability', score: displayKpiData.reliability, color: 'bg-green-500' },
              { name: 'Collaboration', score: displayKpiData.collaboration, color: 'bg-purple-500' },
              { name: 'Quality', score: displayKpiData.quality, color: 'bg-yellow-500' },
              { name: 'Initiative', score: displayKpiData.initiative, color: 'bg-orange-500' },
              { name: 'Efficiency', score: displayKpiData.efficiency, color: 'bg-emerald-500' }
            ].map((kpi) => (
              <div key={kpi.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{kpi.name}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{kpi.score}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-black/50 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${kpi.color}`}
                    style={{ width: `${kpi.score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KPI Details Modal */}
        {showKPIDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-black/60 rounded-2xl p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">KPI Calculation Details</h3>
                <button
                  onClick={() => setShowKPIDetails(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-black/40 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Data Sources</h4>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li>• Projects and Tasks: Assignment, deadlines, and completion timelines</li>
                    <li>• Time Logs: Real logged hours from task activity</li>
                    <li>• Comments: Contribution volume across assigned work</li>
                    <li>• Documents: Uploaded files and reviewer feedback</li>
                    <li>• KPI Rule: Overall KPI equals document quality rating (review score) normalized to 100</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">KPI Scoring</h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div>Document quality rating scale: 1 to 5</div>
                    <div>KPI score conversion: (Average Rating / 5) x 100</div>
                    <div>Rating source: `reviewScore` or `Rating: X/5` in reviewer notes</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Current Scores</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Delivery (On-time + Throughput):</span>
                      <span className="font-medium">{displayKpiData.delivery}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reliability (Overdue + Freshness):</span>
                      <span className="font-medium">{displayKpiData.reliability}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Collaboration (Comments + Docs):</span>
                      <span className="font-medium">{displayKpiData.collaboration}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quality (Reviewer Rating):</span>
                      <span className="font-medium">{displayKpiData.quality}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Initiative (Logs + Self-started):</span>
                      <span className="font-medium">{displayKpiData.initiative}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Efficiency (Time Saved + Early Completion):</span>
                      <span className="font-medium">{displayKpiData.efficiency}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contribution Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card dark:bg-black/60 dark:border-white/10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">High-level Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Projects Involved</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{contributionData.projectsInvolved}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Phases Contributed</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{contributionData.phasesContributed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Hours Worked</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{contributionData.totalHoursWorked}h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Average Hours per Week</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{contributionData.averageHoursPerWeek}h</span>
            </div>
          </div>
        </div>

        <div className="card dark:bg-black/60 dark:border-white/10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Time Distribution</h3>
          <div className="space-y-3">
            {timeAllocation.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.project}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.hours}h ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-black/50 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task & Deadline Performance */}
      <div className="card dark:bg-black/60 dark:border-white/10">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Task & Deadline Performance</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">On-Time Contribution %</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{taskPerformance.onTimeContribution}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Delayed Contribution %</span>
                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{taskPerformance.delayedContribution}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Overdue Tasks Count</span>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">{taskPerformance.overdueTasksCount}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Performance Breakdown</h4>
            <div className="space-y-2">
              {taskPerformance.performanceBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{item.status}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Collaboration Metrics */}
      <div className="card dark:bg-black/60 dark:border-white/10">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Collaboration Metrics</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Comments Added</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{collaborationMetrics.commentsAdded}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Per Week</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{collaborationMetrics.commentsPerWeek}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Documents Shared</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{collaborationMetrics.documentsShared}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Documents Reviewed</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{collaborationMetrics.documentsReviewed}</span>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Document Flow</h4>
            <div className="space-y-2">
              {collaborationMetrics.documentFlow.map((flow, index) => (
                <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                  <div className="font-medium">{flow.from} → {flow.to}</div>
                  <div className="text-gray-500">{flow.project} - {flow.type}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Efficiency Metrics */}
      <div className="card dark:bg-black/60 dark:border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Efficiency Metrics</h3>
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
            Only calculated for completed projects
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{efficiencyMetrics.timeSaved}h</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Time Saved</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">8% efficiency gain</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{efficiencyMetrics.earlyCompletions}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Early Completions</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">Projects finished early</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{efficiencyMetrics.averageTimeSaved}h</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Avg Time Saved</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">Per project</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{displayKpiData.efficiency}%</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Efficiency Score</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">KPI Component</div>
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Project Efficiency Breakdown</h4>
          <div className="space-y-3">
            {efficiencyMetrics.efficiencyBreakdown.map((project, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-black/50 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{project.project}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Allocated: {project.allocated}h | Logged: {project.logged}h | Saved: {project.saved}h
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{project.efficiency}%</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Efficiency</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project-wise Performance Breakdown */}
      <div className="card dark:bg-black/60 dark:border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project-wise Performance Breakdown</h3>
          <button className="btn-secondary text-sm">View All Projects</button>
        </div>
        <div className="space-y-4">
          {projectPerformance.map((project) => (
            <div key={project.id} className="border border-gray-200 dark:border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{project.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{project.duration}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(project.status)}
                  <span className={`badge ${getStatusColor(project.status)}`}>
                    {project.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{project.hoursLogged}h</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Hours Logged</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{project.contributionPercent}%</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Contribution</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{project.phasesContributed}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Phases</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{project.onTimeContribution}%</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">On-Time</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{project.comments}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Comments</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{project.docsUploaded}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Docs Uploaded</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{project.docsReviewed}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Docs Reviewed</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time Tracking Insights */}
      <div className="card dark:bg-black/60 dark:border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{getLabel()}</h3>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                timeView === 'daily'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-black/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-black/40'
              }`}
              onClick={() => setTimeView('daily')}
            >
              Daily
            </button>
            <button
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                timeView === 'weekly'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-black/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-black/40'
              }`}
              onClick={() => setTimeView('weekly')}
            >
              Weekly
            </button>
            <button
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                timeView === 'monthly'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-black/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-black/40'
              }`}
              onClick={() => setTimeView('monthly')}
            >
              Monthly
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getCurrentData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey={getDataKey()} 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Bar dataKey="hours" fill="hsl(220 70% 55%)" name="Hours Worked" />
                <Bar dataKey="comments" fill="hsl(270 60% 65%)" name="Comments" />
                <Bar dataKey="docs" fill="hsl(142 71% 45%)" name="Documents" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
