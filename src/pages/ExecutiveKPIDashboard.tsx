import React, { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import {
  HiChartBar,
  HiDocumentText,
  HiLink,
  HiOutlineCalendar,
  HiSparkles,
  HiStar,
  HiUsers,
} from 'react-icons/hi'
import { listAllDocuments } from '../services/documentsAPI'
import { getProjectsWithPhases } from '../services/projectsAPI'
import { listReviewers } from '../services/usersAPI'
import { API_BASE } from '../services/api'

type StarRating = 1 | 2 | 3 | 4 | 5

interface UserProfile {
  id: string
  name: string
  department: string
  avatar?: string
}

interface Project {
  id: string
  name: string
}

interface DocumentEntry {
  id: string
  documentName: string
  userId: string
  projectId: string
  starRating: StarRating | null
  dateShared: string // YYYY-MM-DD
  documentUrl: string | null
}

interface RankedUser {
  user: UserProfile
  documentCount: number
  averageKpi: number | null
}

interface ProjectKpiRow {
  project: Project
  documentCount: number
  averageKpi: number | null
}

interface TrendPoint {
  date: string
  label: string
  kpi: number
}

const toKpiScore = (stars: number) => Math.round((stars / 5) * 100)

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'U'

const scoreTone = (score: number | null) => {
  if (score === null) return 'text-slate-400'
  if (score >= 85) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 70) return 'text-sky-600 dark:text-sky-400'
  if (score >= 55) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

const qualityLabel = (score: number) => {
  if (score >= 90) return 'Exceptional'
  if (score >= 80) return 'Strong'
  if (score >= 70) return 'Stable'
  if (score >= 55) return 'Developing'
  return 'Needs Attention'
}

const normalizeDateOnly = (raw: unknown): string | null => {
  const value = String(raw || '').trim()
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const ts = Date.parse(value)
  if (Number.isNaN(ts)) return null
  return new Date(ts).toISOString().slice(0, 10)
}

const extractStarRating = (doc: any): StarRating | null => {
  const direct = Number(doc?.reviewScore)
  if (Number.isFinite(direct) && direct >= 1 && direct <= 5) {
    return Math.round(direct) as StarRating
  }

  const comment = String(doc?.reviewComment || '').trim()
  const match = comment.match(/rating:\s*(\d)\s*\/\s*5/i)
  if (match) {
    const parsed = Number(match[1])
    if (parsed >= 1 && parsed <= 5) return parsed as StarRating
  }

  return null
}

const resolveDocumentName = (doc: any): string => {
  const explicit = String(doc?.name || '').trim()
  if (explicit) return explicit
  const filePath = String(doc?.filePath || doc?.fileUrl || '').trim()
  if (filePath) {
    const base = filePath.split('/').pop() || filePath
    const stripped = base.match(/^\d{10,14}-[a-z0-9]{4,12}-(.+)$/i)
    return stripped ? stripped[1] : base
  }
  return 'Untitled Document'
}

const resolveDocumentUrl = (doc: any): string | null => {
  const external = String(doc?.externalLink || '').trim()
  if (external) return external

  const fileUrl = String(doc?.fileUrl || '').trim()
  if (fileUrl) {
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl
    return `${API_BASE}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`
  }

  const filePath = String(doc?.filePath || '').trim()
  if (filePath) {
    const normalizedPath = filePath.replace(/^\/+/, '')
    const withUploadsPrefix = normalizedPath.startsWith('uploads/')
      ? normalizedPath
      : `uploads/${normalizedPath}`
    return `${API_BASE}/${withUploadsPrefix}`
  }

  return null
}

const ExecutiveKPIDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [documents, setDocuments] = useState<DocumentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [userFilter, setUserFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setLoadError('')

    ;(async () => {
      const [docsResult, usersResult, projectsResult] = await Promise.allSettled([
        listAllDocuments(),
        listReviewers(),
        getProjectsWithPhases(),
      ])

      if (!active) return

      if (docsResult.status !== 'fulfilled') {
        setUsers([])
        setProjects([])
        setDocuments([])
        setLoadError('Unable to load KPI data right now. Please try again.')
        setLoading(false)
        return
      }

      const docsRows = Array.isArray(docsResult.value) ? docsResult.value : []
      const reviewerRows = usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)
        ? usersResult.value
        : []
      const projectRows = projectsResult.status === 'fulfilled' && Array.isArray(projectsResult.value)
        ? projectsResult.value
        : []

      const userMap = new Map<string, UserProfile>()
      reviewerRows.forEach((row: any) => {
        const id = String(row?.id || '').trim()
        if (!id) return
        const name = String(row?.name || row?.email || 'Unknown User')
        userMap.set(id, {
          id,
          name,
          department: String(row?.department || 'Unassigned'),
          avatar: initialsFor(name),
        })
      })

      const projectMap = new Map<string, Project>()
      projectRows.forEach((row: any) => {
        const id = String(row?.id || '').trim()
        if (!id) return
        projectMap.set(id, {
          id,
          name: String(row?.name || row?.title || 'Unknown Project'),
        })
      })

      const entries: DocumentEntry[] = []

      docsRows.forEach((row: any, index: number) => {
        const starRating = extractStarRating(row)

        const userId = String(row?.createdBy?.id || row?.createdById || '').trim()
        if (!userId) return

        const projectIdRaw = String(row?.projectId || '').trim()
        const projectId = projectIdRaw || '__unknown_project__'
        const dateShared = normalizeDateOnly(row?.sentToClientAt || row?.createdAt || row?.uploadedAt)
        if (!dateShared) return

        const creatorName = String(row?.createdBy?.name || row?.createdBy?.email || 'Unknown User')
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            id: userId,
            name: creatorName,
            department: 'Unassigned',
            avatar: initialsFor(creatorName),
          })
        }

        if (!projectMap.has(projectId)) {
          const projectName = String(row?.projectName || 'Unknown Project')
          projectMap.set(projectId, { id: projectId, name: projectName })
        }

        entries.push({
          id: String(row?.id || `doc-${index}`),
          documentName: resolveDocumentName(row),
          userId,
          projectId,
          starRating,
          dateShared,
          documentUrl: resolveDocumentUrl(row),
        })
      })

      setUsers([...userMap.values()].sort((a, b) => a.name.localeCompare(b.name)))
      setProjects([...projectMap.values()].sort((a, b) => a.name.localeCompare(b.name)))
      setDocuments(entries)

      if (usersResult.status === 'rejected' || projectsResult.status === 'rejected') {
        setLoadError('Loaded KPI documents, but some user/project references could not be fully resolved.')
      } else {
        setLoadError('')
      }

      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [])

  const usersById = useMemo(
    () => Object.fromEntries(users.map(user => [user.id, user])) as Record<string, UserProfile>,
    [users],
  )

  const projectsById = useMemo(
    () => Object.fromEntries(projects.map(project => [project.id, project])) as Record<string, Project>,
    [projects],
  )

  const effectiveStart = startDate && endDate && startDate > endDate ? endDate : startDate
  const effectiveEnd = startDate && endDate && startDate > endDate ? startDate : endDate

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesUser = userFilter === 'all' || doc.userId === userFilter
      const matchesProject = projectFilter === 'all' || doc.projectId === projectFilter
      const matchesStart = !effectiveStart || doc.dateShared >= effectiveStart
      const matchesEnd = !effectiveEnd || doc.dateShared <= effectiveEnd
      return matchesUser && matchesProject && matchesStart && matchesEnd
    })
  }, [documents, userFilter, projectFilter, effectiveStart, effectiveEnd])

  const ratedFilteredDocuments = useMemo(
    () => filteredDocuments.filter(doc => doc.starRating !== null),
    [filteredDocuments],
  )

  const averageKpi = useMemo(() => {
    if (!ratedFilteredDocuments.length) return null
    const total = ratedFilteredDocuments.reduce((sum, doc) => sum + toKpiScore(doc.starRating as number), 0)
    return total / ratedFilteredDocuments.length
  }, [ratedFilteredDocuments])

  const rankedUsers = useMemo<RankedUser[]>(() => {
    const grouped = new Map<string, { count: number; ratedCount: number; total: number }>()
    users.forEach(user => grouped.set(user.id, { count: 0, ratedCount: 0, total: 0 }))

    filteredDocuments.forEach(doc => {
      const current = grouped.get(doc.userId) || { count: 0, ratedCount: 0, total: 0 }
      current.count += 1
      if (doc.starRating !== null) {
        current.ratedCount += 1
        current.total += toKpiScore(doc.starRating)
      }
      grouped.set(doc.userId, current)
    })

    return users
      .map(user => {
        const stats = grouped.get(user.id) || { count: 0, ratedCount: 0, total: 0 }
        return {
          user,
          documentCount: stats.count,
          averageKpi: stats.ratedCount ? stats.total / stats.ratedCount : null,
        }
      })
      .sort((a, b) => {
        if (a.averageKpi === null && b.averageKpi === null) return a.user.name.localeCompare(b.user.name)
        if (a.averageKpi === null) return 1
        if (b.averageKpi === null) return -1
        return b.averageKpi - a.averageKpi
      })
  }, [users, filteredDocuments])

  const selectedUserProjects = useMemo<ProjectKpiRow[]>(() => {
    if (userFilter === 'all') return []

    const grouped = new Map<string, { count: number; ratedCount: number; total: number }>()
    filteredDocuments.forEach(doc => {
      const current = grouped.get(doc.projectId) || { count: 0, ratedCount: 0, total: 0 }
      current.count += 1
      if (doc.starRating !== null) {
        current.ratedCount += 1
        current.total += toKpiScore(doc.starRating)
      }
      grouped.set(doc.projectId, current)
    })

    return [...grouped.entries()]
      .map(([projectId, stats]) => ({
        project: projectsById[projectId] || { id: projectId, name: 'Unknown Project' },
        documentCount: stats.count,
        averageKpi: stats.ratedCount ? stats.total / stats.ratedCount : null,
      }))
      .sort((a, b) => {
        if (a.averageKpi === null && b.averageKpi === null) return a.project.name.localeCompare(b.project.name)
        if (a.averageKpi === null) return 1
        if (b.averageKpi === null) return -1
        return b.averageKpi - a.averageKpi
      })
  }, [filteredDocuments, userFilter, projectsById])

  const documentAuditRows = useMemo(() => {
    if (userFilter === 'all' || projectFilter === 'all') return []
    return [...filteredDocuments].sort((a, b) => b.dateShared.localeCompare(a.dateShared))
  }, [filteredDocuments, userFilter, projectFilter])

  const trendData = useMemo<TrendPoint[]>(() => {
    const grouped = new Map<string, { total: number; count: number }>()

    ratedFilteredDocuments.forEach(doc => {
      const current = grouped.get(doc.dateShared) || { total: 0, count: 0 }
      current.total += toKpiScore(doc.starRating as number)
      current.count += 1
      grouped.set(doc.dateShared, current)
    })

    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        label: new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: '2-digit' }),
        kpi: Number((stats.total / stats.count).toFixed(1)),
      }))
  }, [ratedFilteredDocuments])

  const activeUserCount = new Set(filteredDocuments.map(doc => doc.userId)).size
  const activeProjectCount = new Set(filteredDocuments.map(doc => doc.projectId)).size
  const selectedUser = userFilter === 'all' ? null : usersById[userFilter]
  const selectedProject = projectFilter === 'all' ? null : projectsById[projectFilter]

  const summaryText = useMemo(() => {
    if (userFilter === 'all') {
      const topUser = rankedUsers.find(row => row.averageKpi !== null)
      if (!topUser) return 'No document quality activity found for the current selection.'

      return `${topUser.user.name} is the top performer with a ${Math.round(topUser.averageKpi || 0)} KPI score across ${topUser.documentCount} document${topUser.documentCount === 1 ? '' : 's'}.`
    }

    const userDocs = filteredDocuments
    if (!userDocs.length) {
      return `${selectedUser?.name || 'Selected user'} has no document quality records in this range.`
    }
    if (averageKpi === null) {
      return `${selectedUser?.name || 'Selected user'} shared ${userDocs.length} document${userDocs.length === 1 ? '' : 's'} in this range, but none are rated yet.`
    }

    const projectPhrase = selectedProject ? `within ${selectedProject.name}` : 'across all projects'
    return `${selectedUser?.name || 'Selected user'} is maintaining ${Math.round(averageKpi)}% ${projectPhrase}, rated as ${qualityLabel(averageKpi).toLowerCase()} quality performance.`
  }, [userFilter, rankedUsers, filteredDocuments, averageKpi, selectedUser, selectedProject])

  const tier =
    userFilter === 'all'
      ? 'ranking'
      : projectFilter === 'all'
        ? 'project-breakdown'
        : 'document-audit'

  const dateFromText = effectiveStart ? formatDate(effectiveStart) : 'All time'
  const dateToText = effectiveEnd ? formatDate(effectiveEnd) : 'All time'

  const cardBase = 'rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-soft dark:border-white/10 dark:bg-black/60'

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">KPI Tracker</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Monitor employee document quality performance with KPI scoring, ranking, and trend analytics.
        </p>
      </header>

      {loadError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {loadError}
        </div>
      )}

      <section className={`${cardBase} p-4`}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_220px_180px_180px_auto]">
          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">User</span>
            <select
              value={userFilter}
              onChange={event => setUserFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200/60 dark:border-white/10 dark:bg-black/40 dark:text-slate-200 dark:focus:border-primary-300 dark:focus:ring-primary-500/30"
            >
              <option value="all">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Project</span>
            <select
              value={projectFilter}
              onChange={event => setProjectFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200/60 dark:border-white/10 dark:bg-black/40 dark:text-slate-200 dark:focus:border-primary-300 dark:focus:ring-primary-500/30"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={event => setStartDate(event.target.value)}
              className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200/60 dark:border-white/10 dark:bg-black/40 dark:text-slate-200 dark:focus:border-primary-300 dark:focus:ring-primary-500/30"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={event => setEndDate(event.target.value)}
              className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200/60 dark:border-white/10 dark:bg-black/40 dark:text-slate-200 dark:focus:border-primary-300 dark:focus:ring-primary-500/30"
            />
          </label>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setStartDate('')
                setEndDate('')
              }}
              className="h-[42px] rounded-xl border border-slate-200/80 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100/80 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Clear Dates
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className={cardBase}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Average KPI Score</div>
              <div className={`mt-2 text-2xl font-semibold ${scoreTone(averageKpi)}`}>
                {loading ? '—' : averageKpi === null ? '—' : `${Math.round(averageKpi)}/100`}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
              <HiChartBar className="h-5 w-5" />
            </div>
          </div>
        </article>

        <article className={cardBase}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Total Documents</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {loading ? '—' : filteredDocuments.length}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
              <HiDocumentText className="h-5 w-5" />
            </div>
          </div>
        </article>

        <article className={cardBase}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Active Users</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{loading ? '—' : activeUserCount}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
              <HiUsers className="h-5 w-5" />
            </div>
          </div>
        </article>

        <article className={cardBase}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Active Projects</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{loading ? '—' : activeProjectCount}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
              <HiOutlineCalendar className="h-5 w-5" />
            </div>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <article className={`${cardBase} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-3 dark:border-white/10">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {tier === 'ranking'
                  ? 'User Performance Ranking'
                  : tier === 'project-breakdown'
                    ? `${selectedUser?.name || 'User'} Project Breakdown`
                    : `${selectedUser?.name || 'User'} Document Audit`}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {tier === 'ranking'
                  ? 'Ranked by average 0-100 KPI score for the selected filters.'
                  : tier === 'project-breakdown'
                    ? 'Average KPI per project for the selected user.'
                    : 'Individual document quality scores for the selected user and project.'}
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-white/10">
            {tier === 'ranking' ? (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:bg-black/40 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Documents</th>
                    <th className="px-4 py-3">KPI Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 bg-white dark:divide-white/10 dark:bg-black/60">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Loading KPI data...
                      </td>
                    </tr>
                  ) : rankedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No data in this filter window.
                      </td>
                    </tr>
                  ) : (
                    rankedUsers.map((row, index) => (
                      <tr key={row.user.id} className="hover:bg-slate-50/80 dark:hover:bg-black/40">
                        <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">#{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                              {row.user.avatar || initialsFor(row.user.name)}
                            </span>
                            <span className="font-medium text-slate-900 dark:text-white">{row.user.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.user.department}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.documentCount}</td>
                        <td className={`px-4 py-3 font-semibold ${scoreTone(row.averageKpi)}`}>
                          {row.averageKpi === null ? '—' : `${Math.round(row.averageKpi)}/100`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : tier === 'project-breakdown' ? (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:bg-black/40 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Documents</th>
                    <th className="px-4 py-3">Average KPI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 bg-white dark:divide-white/10 dark:bg-black/60">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Loading KPI data...
                      </td>
                    </tr>
                  ) : selectedUserProjects.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No projects found for this user in the current date range.
                      </td>
                    </tr>
                  ) : (
                    selectedUserProjects.map(row => (
                      <tr key={row.project.id} className="hover:bg-slate-50/80 dark:hover:bg-black/40">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{row.project.name}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.documentCount}</td>
                        <td className={`px-4 py-3 font-semibold ${scoreTone(row.averageKpi)}`}>
                          {row.averageKpi === null ? '—' : `${Math.round(row.averageKpi)}/100`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:bg-black/40 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Link</th>
                    <th className="px-4 py-3">Date Shared</th>
                    <th className="px-4 py-3">Stars</th>
                    <th className="px-4 py-3">KPI Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 bg-white dark:divide-white/10 dark:bg-black/60">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Loading KPI data...
                      </td>
                    </tr>
                  ) : documentAuditRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No documents found for this user and project in the current date range.
                      </td>
                    </tr>
                  ) : (
                    documentAuditRows.map(doc => {
                      const score = doc.starRating !== null ? toKpiScore(doc.starRating) : null
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-black/40">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{doc.documentName}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {doc.documentUrl ? (
                              <a
                                href={doc.documentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200"
                              >
                                <HiLink className="h-4 w-4" />
                                Open
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatDate(doc.dateShared)}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {doc.starRating !== null ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                                <HiStar className="h-3.5 w-3.5" />
                                {doc.starRating}/5
                              </span>
                            ) : (
                              <span className="text-slate-400">Not rated</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 font-semibold ${scoreTone(score)}`}>
                            {score === null ? '—' : `${score}/100`}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </article>

        <aside className="space-y-4">
          <article className={cardBase}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Quality Trend</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">KPI over time</span>
            </div>
            <div className="h-64">
              {loading ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300/80 text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">
                  Loading trend data...
                </div>
              ) : trendData.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300/80 text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">
                  No trend data for current filters.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="kpiGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.38} />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value: number) => [`${Math.round(value)}/100`, 'KPI Score']}
                      labelFormatter={(label: string) => `Date: ${label}`}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid rgba(148, 163, 184, 0.35)',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="kpi"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      fill="url(#kpiGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className={cardBase}>
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/15 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-300">
                <HiSparkles className="h-4 w-4" />
              </span>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Executive Summary</h3>
            </div>
            <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{loading ? 'Loading summary...' : summaryText}</p>
            <div className="mt-4 space-y-2 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-[0.16em]">From</span>
                <span className="font-semibold">{dateFromText}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-[0.16em]">To</span>
                <span className="font-semibold">{dateToText}</span>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </div>
  )
}

export default ExecutiveKPIDashboard
