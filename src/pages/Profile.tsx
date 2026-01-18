import React, { useState, useEffect } from 'react'
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
    const loadUserData = async () => {
      if (!user?.id) return

      setIsLoading(true)
      try {
        // Get aggregated data for the user
        const userData = dataAggregator.aggregateUserData(user.id, user)
        setAggregatedData(userData)

        // Calculate KPI scores
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
        setKpiData(calculatedKPI)
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [user?.id, timeWindow])

  // Use real data when available, fallback to mock data
  const profileData = {
    name: aggregatedData?.user.name || user?.name || 'John Doe',
    email: aggregatedData?.user.email || user?.email || 'john.doe@company.com',
    role: aggregatedData?.user.role || user?.role || 'Manager',
    department: aggregatedData?.user.department || user?.department || 'Engineering',
    profilePicture: null,
    currentProjects: aggregatedData?.projects.map(project => ({
      id: project.id,
      name: project.name,
      link: `/projects/${project.id}`
    })) || [
      { id: '1', name: 'Mobile App Redesign', link: '/projects/1' },
      { id: '2', name: 'Backend API Development', link: '/projects/2' },
      { id: '3', name: 'Security Audit', link: '/projects/3' }
    ],
    totalHoursThisMonth: aggregatedData?.totalHoursThisMonth || 168,
    totalHoursAllTime: aggregatedData?.totalHoursAllTime || 2048,
    performanceScore: kpiData?.overall || 87.5
  }

  // Use calculated KPI data when available, fallback to mock data
  const displayKpiData: KPIData = kpiData || {
    delivery: 82.3,
    reliability: 89.1,
    collaboration: 76.8,
    quality: 84.2,
    initiative: 91.5,
    efficiency: 88.7,
    overall: 85.2,
    grade: 'B+'
  }

  const contributionData = {
    projectsInvolved: aggregatedData?.projectsInvolved || 12,
    phasesContributed: aggregatedData?.phasesContributed || 8,
    totalHoursWorked: aggregatedData?.totalHoursAllTime || 2048,
    averageHoursPerWeek: aggregatedData?.averageHoursPerWeek || 42.5,
    contributionShare: aggregatedData?.projects.map(project => ({
      project: project.name,
      percentage: Math.round((project.loggedHours / aggregatedData.totalHoursAllTime) * 100)
    })) || [
      { project: 'Mobile App Redesign', percentage: 35 },
      { project: 'Backend API', percentage: 28 },
      { project: 'Security Audit', percentage: 22 },
      { project: 'Other Projects', percentage: 15 }
    ]
  }

  const taskPerformance = {
    onTimeContribution: aggregatedData?.onTimeContribution || 78.5,
    delayedContribution: aggregatedData?.delayedContribution || 18.2,
    overdueTasksCount: aggregatedData?.overdueTasksCount || 3,
    performanceBreakdown: [
      { 
        status: 'On-time', 
        count: Math.round((aggregatedData?.onTimeContribution || 78.5) / 100 * (aggregatedData?.tasks.length || 60)),
        color: 'bg-green-500' 
      },
      { 
        status: 'Late', 
        count: Math.round((aggregatedData?.delayedContribution || 18.2) / 100 * (aggregatedData?.tasks.length || 60)),
        color: 'bg-yellow-500' 
      },
      { 
        status: 'Overdue', 
        count: aggregatedData?.overdueTasksCount || 3,
        color: 'bg-red-500' 
      }
    ]
  }

  const collaborationMetrics = {
    commentsAdded: aggregatedData?.commentsAdded || 156,
    commentsPerWeek: aggregatedData?.commentsPerWeek || 12.8,
    documentsShared: aggregatedData?.documentsShared || 23,
    documentsReviewed: aggregatedData?.documentsReviewed || 18,
    documentFlow: aggregatedData?.documents.slice(0, 3).map(doc => ({
      from: aggregatedData.user.name,
      to: 'Team Member',
      project: aggregatedData.projects.find(p => p.id === doc.projectId)?.name || 'Project',
      type: (doc.type || doc.fileType).toUpperCase()
    })) || [
      { from: 'Sarah Johnson', to: 'John Doe', project: 'Mobile App', type: 'Design Review' },
      { from: 'John Doe', to: 'Mike Chen', project: 'Backend API', type: 'Code Review' },
      { from: 'John Doe', to: 'Emily Davis', project: 'Security Audit', type: 'Security Report' }
    ]
  }

  const efficiencyMetrics = {
    totalAllocatedHours: aggregatedData?.projects.reduce((sum, p) => sum + p.allocatedHours, 0) || 240,
    totalLoggedHours: aggregatedData?.totalHoursAllTime || 2048,
    timeSaved: aggregatedData?.timeSaved || 192,
    earlyCompletions: aggregatedData?.earlyCompletions || 8,
    averageTimeSaved: aggregatedData?.averageTimeSaved || 12.5,
    efficiencyBreakdown: aggregatedData?.projects
      .filter(project => project.status === 'completed') // Only completed projects
      .map(project => {
        const projectTimeLogs = aggregatedData.timeLogs.filter(log => log.projectId === project.id)
        const loggedHours = projectTimeLogs.reduce((sum, log) => sum + log.hours, 0)
        const saved = Math.max(0, project.allocatedHours - loggedHours)
        const efficiency = project.allocatedHours > 0 ? Math.round((project.allocatedHours / loggedHours) * 100) : 100
        
        return {
          project: project.name,
          allocated: project.allocatedHours,
          logged: loggedHours,
          saved: saved,
          efficiency: efficiency
        }
      }) || [
      { project: 'Mobile App Redesign', allocated: 60, logged: 45, saved: 15, efficiency: 125 },
      { project: 'Backend API', allocated: 40, logged: 28, saved: 12, efficiency: 130 },
      { project: 'Security Audit', allocated: 30, logged: 28, saved: 2, efficiency: 107 },
      { project: 'Other Projects', allocated: 110, logged: 95, saved: 15, efficiency: 116 }
    ]
  }

  const projectPerformance: ProjectPerformance[] = [
    {
      id: '1',
      name: 'TECH-2025-008 (Penetration Testing)',
      duration: 'Jan 15 - Mar 30',
      hoursLogged: 32,
      contributionPercent: 28,
      phasesContributed: '1/2',
      onTimeContribution: 92,
      comments: 7,
      docsUploaded: 3,
      docsReviewed: 2,
      status: 'on-time'
    },
    {
      id: '2',
      name: 'MOBILE-2025-003 (App Redesign)',
      duration: 'Feb 1 - Apr 15',
      hoursLogged: 45,
      contributionPercent: 35,
      phasesContributed: '2/3',
      onTimeContribution: 85,
      comments: 12,
      docsUploaded: 5,
      docsReviewed: 3,
      status: 'on-time'
    },
    {
      id: '3',
      name: 'API-2025-001 (Backend Development)',
      duration: 'Dec 1 - Feb 28',
      hoursLogged: 28,
      contributionPercent: 22,
      phasesContributed: '1/1',
      onTimeContribution: 78,
      comments: 4,
      docsUploaded: 2,
      docsReviewed: 1,
      status: 'late'
    }
  ]

  const dailyData = [
    { day: 'Mon', hours: 8, comments: 3, docs: 1 },
    { day: 'Tue', hours: 7.5, comments: 2, docs: 0 },
    { day: 'Wed', hours: 6, comments: 5, docs: 2 },
    { day: 'Thu', hours: 8.5, comments: 1, docs: 1 },
    { day: 'Fri', hours: 7, comments: 4, docs: 0 },
    { day: 'Sat', hours: 6.5, comments: 2, docs: 1 },
    { day: 'Sun', hours: 8, comments: 3, docs: 2 }
  ]

  const weeklyData = [
    { week: 'Week 1', hours: 32, comments: 12, docs: 2 },
    { week: 'Week 2', hours: 38, comments: 17, docs: 3 },
    { week: 'Week 3', hours: 42, comments: 15, docs: 3 },
    { week: 'Week 4', hours: 36, comments: 21, docs: 6 },
    { week: 'Week 5', hours: 20, comments: 16, docs: 2 },
    { week: 'Week 6', hours: 33, comments: 14, docs: 2 },
    { week: 'Week 7', hours: 38, comments: 18, docs: 3 },
    { week: 'Week 8', hours: 40, comments: 16, docs: 3 }
  ]

  const monthlyData = [
    { month: 'Jan', hours: 168, comments: 78, docs: 15 },
    { month: 'Feb', hours: 152, comments: 65, docs: 12 },
    { month: 'Mar', hours: 176, comments: 82, docs: 18 },
    { month: 'Apr', hours: 160, comments: 71, docs: 14 }
  ]

  const timeAllocation: TimeAllocation[] = [
    { project: 'Mobile App Redesign', hours: 45, percentage: 35, color: 'bg-blue-500' },
    { project: 'Backend API', hours: 36, percentage: 28, color: 'bg-green-500' },
    { project: 'Security Audit', hours: 28, percentage: 22, color: 'bg-purple-500' },
    { project: 'Other Projects', hours: 19, percentage: 15, color: 'bg-orange-500' }
  ]

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
                    <li>• Tasks: Completion rates, on-time delivery, priority weighting</li>
                    <li>• Projects: Milestone hit rates, role-based contributions</li>
                    <li>• Daily Logs: Consistency, depth, attachment rates</li>
                    <li>• Reviews: First-pass approval rates, participation</li>
                    <li>• Documents: Upload rates, turnaround times</li>
                    <li>• Activity Feed: Comments, cross-project interactions</li>
                    <li>• Time Allocation: Allocated vs. actual hours, early completion bonuses</li>
                    <li>• User Role: Department and role-specific weighting</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Role Weights (Manager)</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Delivery: 20%</div>
                    <div>Reliability: 25%</div>
                    <div>Collaboration: 20%</div>
                    <div>Quality: 20%</div>
                    <div>Initiative: 10%</div>
                    <div>Efficiency: 5%</div>
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
                      <span>Quality (Approval + Turnaround):</span>
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
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">88.7%</div>
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