import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, DollarSign, Users, TrendingUp, Clock } from 'lucide-react'
import { apiGet, apiJson } from '../services/api'
import { getProjects } from '../services/projectsAPI'

type ProjectSummary = {
  id: string
  title: string
  status?: string
  allocatedHours?: number
  usedHours?: number
  leftHours?: number
}

type RawTimeLog = {
  id: string
  userId: string
  userName?: string | null
  durationMins: number
  description: string
  startedAt?: string
  createdAt?: string
  phaseId?: string
  hourlyRate?: number | null
}

type ProjectMember = {
  id: string
  name: string
  email: string
  roleLabel: string
  costRate: number
}

type AdditionalCost = {
  id: string
  projectId: string
  phaseId?: string | null
  taskId?: string | null
  userId: string
  userName?: string | null
  category: string
  customCategory?: string | null
  amount: number
  note?: string | null
  spentAt: string
}

const DEFAULT_ROLE_RATES: Record<string, number> = {
  DIRECTOR: 150,
  MANAGER: 120,
  CONSULTANT: 140,
  LEAD: 110,
  ENGINEER: 90,
  OPS: 70,
  CLIENT: 0,
  MEMBER: 80,
}

const formatTitleCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())

const formatCurrency = (value: number, decimals = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)

const formatDate = (value?: string | null) => {
  if (!value) return ''
  const ts = Date.parse(value)
  if (Number.isNaN(ts)) return value
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const getInitials = (name: string) => {
  const cleaned = String(name || '').trim()
  if (!cleaned) return 'U'
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const BudgetConfig: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projectDetail, setProjectDetail] = useState<any | null>(null)
  const [timeLogs, setTimeLogs] = useState<RawTimeLog[]>([])
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>([])
  const [rateOverrides, setRateOverrides] = useState<Record<string, string>>({})
  const [selectedPhaseId, setSelectedPhaseId] = useState('all')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [isLoadingProject, setIsLoadingProject] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const [hoveredCost, setHoveredCost] = useState<{
    label: string
    value: number
    color: string
  } | null>(null)

  useEffect(() => {
    let active = true
    const loadProjects = async () => {
      setIsLoadingProjects(true)
      setLoadError(null)
      try {
        const list = await getProjects()
        const mapped = (list || []).map((item: any) => ({
          id: String(item?.id || ''),
          title: String(item?.title || item?.name || ''),
          status: String(item?.status || ''),
          allocatedHours: Number(item?.allocatedHours || 0),
          usedHours: Number(item?.usedHours || 0),
          leftHours: Number(item?.leftHours || 0),
        }))
        if (!active) return
        setProjects(mapped.filter(p => p.id))
        if (!selectedProjectId && mapped.length > 0) {
          setSelectedProjectId(mapped[0].id)
        }
      } catch (error) {
        console.error('Failed to load projects', error)
        if (active) setLoadError('Failed to load projects.')
      } finally {
        if (active) setIsLoadingProjects(false)
      }
    }

    loadProjects()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    const loadProjectDetail = async () => {
      if (!selectedProjectId) return
      setIsLoadingProject(true)
      setLoadError(null)
      setProjectDetail(null)
      setTimeLogs([])
      setAdditionalCosts([])
      setSelectedPhaseId('all')
      try {
        const detail = await apiGet(`/projects/${selectedProjectId}`)
        if (!active) return
        setProjectDetail(detail)

        const phases = Array.isArray(detail?.phases) ? detail.phases : []
        const tasks = phases.flatMap((phase: any) => (Array.isArray(phase?.tasks) ? phase.tasks : []))
        const taskPhaseMap = new Map<string, string>()
        tasks.forEach((task: any) => {
          const taskId = String(task?.id || '')
          if (!taskId) return
          taskPhaseMap.set(taskId, String(task?.phaseId || ''))
        })
        const taskIds = tasks.map((task: any) => String(task?.id || '')).filter(Boolean)

        if (taskIds.length === 0) {
          if (active) setTimeLogs([])
        } else {
          const logsByTask = await Promise.all(
            taskIds.map((taskId: string) => apiGet(`/timelogs/tasks/${taskId}/timelogs`).catch(() => []))
          )
          const flattened = logsByTask.flat().map((log: any) => ({
            id: String(log?.id || ''),
            userId: String(log?.userId || ''),
            userName: String(log?.userName || log?.user?.name || ''),
            durationMins: Number(log?.durationMins || 0),
            hourlyRate: typeof log?.hourlyRate === 'number' ? log.hourlyRate : null,
            description: String(log?.description || ''),
            startedAt: String(log?.startedAt || log?.createdAt || ''),
            createdAt: String(log?.createdAt || log?.startedAt || ''),
            phaseId: taskPhaseMap.get(String(log?.taskId || '')) || '',
          }))
          if (active) setTimeLogs(flattened)
        }

        const costList = await apiGet(`/api/additional-costs?projectId=${encodeURIComponent(selectedProjectId)}`).catch(() => [])
        if (active) setAdditionalCosts(Array.isArray(costList) ? costList : [])

      } catch (error) {
        console.error('Failed to load project budget data', error)
        if (active) setLoadError('Failed to load project budget data.')
      } finally {
        if (active) setIsLoadingProject(false)
      }
    }

    loadProjectDetail()
    return () => {
      active = false
    }
  }, [selectedProjectId])

  useEffect(() => {
    if (!isDropdownOpen) return
    const handler = (event: MouseEvent) => {
      if (!dropdownRef.current) return
      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
    }
  }, [isDropdownOpen])

  useEffect(() => {
    setRateOverrides({})
  }, [selectedProjectId, selectedPhaseId])

  const selectedProject = useMemo(() => {
    return projects.find(project => project.id === selectedProjectId) || projectDetail
  }, [projects, selectedProjectId, projectDetail])

  const projectPhases = useMemo<Array<{ id: string; name: string }>>(() => {
    const phases = Array.isArray(projectDetail?.phases) ? projectDetail.phases : []
    return phases
      .map((phase: any) => ({
        id: String(phase?.id || ''),
        name: String(phase?.name || ''),
      }))
      .filter((phase: { id: string; name: string }) => phase.id && phase.name)
  }, [projectDetail])

  const memberMap = useMemo(() => {
    const map = new Map<string, ProjectMember>()
    const memberships = Array.isArray(projectDetail?.memberships) ? projectDetail.memberships : []

    memberships.forEach((membership: any) => {
      const user = membership?.user
      if (!user?.id) return
      const roleKey = String(membership?.role || '').toUpperCase()
      const roleLabel = roleKey ? formatTitleCase(roleKey) : 'Member'
      const userRate = typeof user.costRate === 'number' ? user.costRate : null
      const fallbackRate = DEFAULT_ROLE_RATES[roleKey] ?? DEFAULT_ROLE_RATES.MEMBER
      map.set(String(user.id), {
        id: String(user.id),
        name: String(user.name || 'Unknown'),
        email: String(user.email || ''),
        roleLabel,
        costRate: userRate && userRate > 0 ? userRate : fallbackRate,
      })
    })

    timeLogs.forEach(log => {
      if (!log.userId || map.has(log.userId)) return
      const fallbackRate = DEFAULT_ROLE_RATES.MEMBER
      map.set(log.userId, {
        id: log.userId,
        name: log.userName || 'Unknown',
        email: '',
        roleLabel: 'Contributor',
        costRate: fallbackRate,
      })
    })

    return map
  }, [projectDetail, timeLogs])

  const getEffectiveRate = (memberId: string, fallbackRate: number) => {
    const override = rateOverrides[memberId]
    if (override !== undefined && override !== '') {
      const parsed = Number(override)
      if (!Number.isNaN(parsed)) return parsed
    }
    return fallbackRate
  }

  const saveRate = async (memberId: string, value: string, baseRate: number) => {
    if (value === '') {
      setRateOverrides(prev => {
        const next = { ...prev }
        delete next[memberId]
        return next
      })
      return
    }
    const parsed = Number(value)
    if (Number.isNaN(parsed) || parsed < 0) return
    if (parsed === baseRate) return
    try {
      await apiJson(`/api/users/${memberId}`, 'PATCH', { costRate: parsed })
      setProjectDetail((prev: any) => {
        if (!prev) return prev
        const memberships = Array.isArray(prev.memberships) ? prev.memberships : []
        const updated = memberships.map((membership: any) => {
          const user = membership?.user
          if (!user || String(user.id) !== memberId) return membership
          return { ...membership, user: { ...user, costRate: parsed } }
        })
        return { ...prev, memberships: updated }
      })
      setRateOverrides(prev => {
        const next = { ...prev }
        delete next[memberId]
        return next
      })
    } catch (error) {
      console.error('Failed to update hourly rate', error)
    }
  }

  const filteredLogs = useMemo(() => {
    if (selectedPhaseId === 'all') return timeLogs
    return timeLogs.filter(log => log.phaseId === selectedPhaseId)
  }, [timeLogs, selectedPhaseId])

  const displayLogs = useMemo(() => {
    return filteredLogs
      .map(log => {
        const member = memberMap.get(log.userId)
        const hours = Math.round(((log.durationMins || 0) / 60 + Number.EPSILON) * 10) / 10
        const logRate = typeof (log as any)?.hourlyRate === 'number' ? (log as any).hourlyRate : undefined
        const rate = getEffectiveRate(log.userId, logRate ?? member?.costRate ?? DEFAULT_ROLE_RATES.MEMBER)
        return {
          ...log,
          userName: member?.name || log.userName || 'Unknown',
          roleLabel: member?.roleLabel || 'Contributor',
          hours,
          cost: hours * rate,
        }
      })
      .sort((a, b) => {
        const aTime = Date.parse(a.startedAt || '')
        const bTime = Date.parse(b.startedAt || '')
        return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
      })
  }, [filteredLogs, memberMap, rateOverrides])

  const laborByUser = useMemo(() => {
    const map = new Map<string, { hours: number; cost: number }>()
    displayLogs.forEach(log => {
      const current = map.get(log.userId) || { hours: 0, cost: 0 }
      current.hours += log.hours
      current.cost += log.cost
      map.set(log.userId, current)
    })
    return map
  }, [displayLogs])

  const projectAdditionalCosts = useMemo(() => {
    if (!selectedProjectId) return []
    return additionalCosts.filter(cost => cost.projectId === selectedProjectId && Number(cost.amount || 0) > 0)
  }, [additionalCosts, selectedProjectId])

  const phaseAdditionalCosts = useMemo(() => {
    if (selectedPhaseId === 'all') return projectAdditionalCosts
    return projectAdditionalCosts.filter(cost => cost.phaseId === selectedPhaseId)
  }, [projectAdditionalCosts, selectedPhaseId])

  const additionalByUser = useMemo(() => {
    const map = new Map<string, number>()
    phaseAdditionalCosts.forEach(cost => {
      const amount = Number(cost.amount || 0)
      if (amount <= 0) return
      const uid = String(cost.userId || '')
      if (!uid) return
      map.set(uid, (map.get(uid) || 0) + amount)
    })
    return map
  }, [phaseAdditionalCosts])

  const teamCosts = useMemo(() => {
    return Array.from(memberMap.values()).map(member => {
      const labor = laborByUser.get(member.id)?.cost || 0
      const additional = additionalByUser.get(member.id) || 0
      return {
        name: member.name,
        labor,
        additional,
      }
    })
  }, [memberMap, laborByUser, additionalByUser])

  const laborCost = useMemo(() => {
    return Array.from(laborByUser.values()).reduce((sum, item) => sum + item.cost, 0)
  }, [laborByUser])

  const hoursLogged = useMemo(() => {
    return Array.from(laborByUser.values()).reduce((sum, item) => sum + item.hours, 0)
  }, [laborByUser])

  const additionalCost = useMemo(() => {
    return phaseAdditionalCosts.reduce((sum, cost) => sum + Number(cost.amount || 0), 0)
  }, [phaseAdditionalCosts])

  const totalBudget = laborCost + additionalCost

  const laborPercent = totalBudget ? Math.round((laborCost / totalBudget) * 100) : 0
  const additionalPercent = totalBudget ? 100 - laborPercent : 0
  const laborColor = '#0b7dff'
  const additionalColor = '#f59e0b'
  const donutGap = 4
  const donutRadius = 42
  const donutStroke = 14
  const donutCircumference = 2 * Math.PI * donutRadius
  const laborRatio = totalBudget ? laborCost / totalBudget : 0
  const laborArc = Math.max(donutCircumference * laborRatio - donutGap, 0)
  const additionalArc = Math.max(donutCircumference - laborArc - donutGap, 0)

  const maxBarValue = Math.max(
    ...teamCosts.map(member => Math.max(member.labor, member.additional)),
    1
  )

  const yTicks = useMemo(() => {
    const tickCount = 5
    const stepBase = maxBarValue / (tickCount - 1)
    const step = Math.max(Math.ceil(stepBase / 50) * 50, 50)
    const top = step * (tickCount - 1)
    return Array.from({ length: tickCount }, (_, idx) => top - idx * step)
  }, [maxBarValue])

  const chartMax = yTicks[0] || maxBarValue

  const teamBreakdown = useMemo(() => {
    return Array.from(memberMap.values()).map(member => {
      const labor = laborByUser.get(member.id)?.cost || 0
      const hours = laborByUser.get(member.id)?.hours || 0
      const additional = additionalByUser.get(member.id) || 0
      const total = labor + additional
      const baseRate = member.costRate
      const rate = getEffectiveRate(member.id, baseRate)
      return {
        id: member.id,
        initials: getInitials(member.name),
        name: member.name,
        role: member.roleLabel,
        hours: `${Math.round((hours + Number.EPSILON) * 10) / 10}h`,
        hoursValue: Math.round((hours + Number.EPSILON) * 10) / 10,
        rate,
        labor: formatCurrency(labor, 0),
        laborValue: labor,
        additional: formatCurrency(additional, 0),
        additionalValue: additional,
        total: formatCurrency(total, 0),
        totalValue: total,
        baseRate,
      }
    })
  }, [memberMap, laborByUser, additionalByUser, rateOverrides])

  const additionalCostItems = useMemo(() => {
    return phaseAdditionalCosts.map(cost => {
      const category = cost.category?.toLowerCase() === 'other' && cost.customCategory
        ? cost.customCategory
        : formatTitleCase(cost.category || 'Other')
      const subtitle = [
        cost.userName,
        formatDate(cost.spentAt),
        cost.note,
      ]
        .filter(Boolean)
        .join(' - ')
      return {
        id: cost.id,
        title: category || 'Additional Cost',
        subtitle,
        amount: formatCurrency(Number(cost.amount || 0), 2),
      }
    })
  }, [phaseAdditionalCosts])

  const statCards = [
    {
      label: 'Total Budget',
      value: formatCurrency(totalBudget, 0),
      icon: DollarSign,
      accent: 'bg-emerald-500/15 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400',
    },
    {
      label: 'Labor Cost',
      value: formatCurrency(laborCost, 0),
      icon: Users,
      accent: 'bg-sky-500/15 text-sky-500 dark:bg-sky-500/20 dark:text-sky-400',
    },
    {
      label: 'Additional',
      value: formatCurrency(additionalCost, 0),
      icon: TrendingUp,
      accent: 'bg-amber-500/15 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400',
    },
    {
      label: 'Hours Logged',
      value: `${Math.round((hoursLogged + Number.EPSILON) * 10) / 10}h`,
      icon: Clock,
      accent: 'bg-indigo-500/15 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400',
    },
  ]

  const cardBase = 'rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-black/60 shadow-soft'

  const statusLabel = selectedProject?.status
    ? formatTitleCase(String(selectedProject.status))
    : 'Planning'

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Project Budget
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Budget Config</h1>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {statusLabel}
            </span>
          </div>
          <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Track costs and budget per project
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="space-y-1 relative" ref={dropdownRef}>
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Select Project
            </div>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(prev => !prev)}
              className="flex w-64 items-center justify-between gap-3 rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm dark:border-white/10 dark:bg-black/50 dark:text-slate-100"
            >
              <span className="truncate">
                {selectedProject?.title || 'Select a project'}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>
            {isDropdownOpen && (
              <div className="absolute z-20 mt-2 w-72 rounded-2xl border border-slate-200/70 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-black/90">
                {projects.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-500">No projects found.</div>
                ) : (
                  projects.map(project => (
                    <button
                      type="button"
                      key={project.id}
                      onClick={() => {
                        setSelectedProjectId(project.id)
                        setIsDropdownOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                        project.id === selectedProjectId
                          ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
                      }`}
                    >
                      <span className="truncate">{project.title}</span>
                      {project.status ? (
                        <span className="text-xs text-slate-400">
                          {formatTitleCase(String(project.status))}
                        </span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Phase
            </div>
            <select
              value={selectedPhaseId}
              onChange={event => setSelectedPhaseId(event.target.value)}
              className="h-11 w-56 rounded-full border border-slate-200/70 bg-white/80 px-4 text-sm font-semibold text-slate-800 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-400 dark:border-white/10 dark:bg-black/50 dark:text-slate-100"
              disabled={projectPhases.length === 0}
            >
              <option value="all">All Phases</option>
              {projectPhases.map((phase: { id: string; name: string }) => (
                <option key={phase.id} value={phase.id}>
                  {phase.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className={`${cardBase} p-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {card.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                    {isLoadingProjects || isLoadingProject ? '...' : card.value}
                  </div>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${card.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${cardBase} p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Cost Distribution</h2>
            <div className="text-xs text-slate-500 dark:text-slate-400">Labor vs Additional</div>
          </div>
          <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="relative w-48 aspect-square">
              <svg viewBox="0 0 120 120" className="h-full w-full">
                <g transform="rotate(-90 60 60)">
                  <circle
                    cx="60"
                    cy="60"
                    r={donutRadius}
                    fill="none"
                    stroke="rgba(148,163,184,0.18)"
                    strokeWidth={donutStroke}
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={donutRadius}
                    fill="none"
                    stroke={laborColor}
                    strokeWidth={donutStroke}
                    strokeLinecap="round"
                    strokeDasharray={`${laborArc} ${donutCircumference - laborArc}`}
                    onMouseEnter={() => setHoveredCost({ label: 'Labor', value: laborCost, color: laborColor })}
                    onMouseLeave={() => setHoveredCost(null)}
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={donutRadius}
                    fill="none"
                    stroke={additionalColor}
                    strokeWidth={donutStroke}
                    strokeLinecap="round"
                    strokeDasharray={`${additionalArc} ${donutCircumference - additionalArc}`}
                    strokeDashoffset={-(laborArc + donutGap)}
                    onMouseEnter={() => setHoveredCost({ label: 'Additional', value: additionalCost, color: additionalColor })}
                    onMouseLeave={() => setHoveredCost(null)}
                  />
                </g>
                <circle cx="60" cy="60" r={donutRadius - donutStroke} fill="white" className="dark:fill-black/80" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {hoveredCost ? hoveredCost.label : 'Total'}
                  </div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">
                    {hoveredCost ? formatCurrency(hoveredCost.value, 0) : formatCurrency(totalBudget, 0)}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: laborColor }} />
                <span>Labor</span>
                <span className="ml-auto font-semibold text-slate-900 dark:text-white">{formatCurrency(laborCost, 0)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: additionalColor }} />
                <span>Additional</span>
                <span className="ml-auto font-semibold text-slate-900 dark:text-white">{formatCurrency(additionalCost, 0)}</span>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 text-xs text-slate-500 dark:border-white/10 dark:bg-black/40 dark:text-slate-300">
                Labor accounts for {laborPercent}% of the budget while additional costs represent {additionalPercent}%.
              </div>
            </div>
          </div>
        </div>

        <div className={`${cardBase} p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Cost per Team Member</h2>
          </div>

          <div className="mt-6">
            <div className="flex">
              <div className="flex h-52 flex-col justify-between text-xs text-slate-500 dark:text-slate-400">
                {yTicks.map(value => (
                  <span key={value} className="pr-3 text-right">
                    ${value}
                  </span>
                ))}
              </div>
              <div className="relative h-52 flex-1">
                <div className="absolute inset-0 flex flex-col justify-between">
                  {yTicks.map((value, index) => (
                    <div
                      key={value}
                      className={`h-px ${index === yTicks.length - 1 ? 'bg-slate-200/70 dark:bg-white/10' : 'bg-slate-200/40 dark:bg-white/5'}`}
                    />
                  ))}
                </div>
                <div className="absolute inset-y-0 left-0 w-px bg-slate-200/70 dark:bg-white/10" />
                <div className="relative z-10 flex h-full items-end justify-around gap-6 pl-6 pr-2">
                  {teamCosts.map(member => {
                    const laborHeight = (member.labor / chartMax) * 100
                    const additionalHeight = (member.additional / chartMax) * 100
                    return (
                      <div key={member.name} className="flex flex-col items-center gap-3">
                        <div className="flex h-40 items-end gap-2">
                          <div className="group relative flex h-full items-end">
                            <div
                              className="w-6"
                              style={{ height: `${laborHeight}%`, backgroundColor: laborColor }}
                            />
                            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-1 text-[11px] text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                              {formatCurrency(member.labor, 0)}
                            </div>
                          </div>
                          <div className="group relative flex h-full items-end">
                            <div
                              className="w-6"
                              style={{ height: `${additionalHeight}%`, backgroundColor: additionalColor }}
                            />
                            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-1 text-[11px] text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                              {formatCurrency(member.additional, 0)}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{member.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: laborColor }} />
                Labor
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: additionalColor }} />
                Additional
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={`${cardBase} p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Team Member Cost Breakdown</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Labor and additional spend by contributor</p>
          </div>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="pb-3">Member</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Hours</th>
                <th className="pb-3">Hourly Rate</th>
                <th className="pb-3">Labor Cost</th>
                <th className="pb-3">Additional</th>
                <th className="pb-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
              {teamBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-slate-500">
                    {isLoadingProject ? 'Loading team data...' : 'No team data yet.'}
                  </td>
                </tr>
              ) : (
                teamBreakdown.map(member => (
                  <tr key={member.name} className="text-slate-700 dark:text-slate-200">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/80 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                          {member.initials}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{member.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{member.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-slate-500 dark:text-slate-400">{member.role}</td>
                    <td className="py-4 font-semibold text-slate-900 dark:text-white">{member.hours}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={rateOverrides[member.id] !== undefined ? rateOverrides[member.id] : member.baseRate.toString()}
                          onChange={event => {
                            const value = event.target.value
                            setRateOverrides(prev => {
                              const next = { ...prev, [member.id]: value }
                              return next
                            })
                          }}
                          onBlur={event => {
                            saveRate(member.id, event.target.value, member.baseRate)
                          }}
                          onKeyDown={event => {
                            if (event.key === 'Enter') {
                              event.currentTarget.blur()
                            }
                          }}
                          className="h-9 w-24 rounded-xl border border-slate-200/70 bg-white/80 px-2 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-400 dark:border-white/10 dark:bg-black/40 dark:text-slate-100"
                        />
                        <span className="text-xs text-slate-400">/hr</span>
                      </div>
                    </td>
                    <td className="py-4">{member.labor}</td>
                    <td className="py-4">{member.additional}</td>
                    <td className="py-4 text-right font-semibold text-slate-900 dark:text-white">{member.total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${cardBase} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Time Logs</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Track hours per team member</p>
            </div>
            <button className="btn-outline btn-sm">Log Hours</button>
          </div>
          <div className="mt-6 space-y-4">
            {displayLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200/70 p-6 text-center text-sm text-slate-500 dark:border-white/10">
                {isLoadingProject ? 'Loading time logs...' : 'No time logs yet for this project.'}
              </div>
            ) : (
              displayLogs.map(log => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-black/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/80 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                      {getInitials(log.userName || 'U')}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{log.userName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{log.roleLabel}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(log.startedAt) || 'Unknown date'} - {log.description || 'Time log'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{log.hours}h</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{formatCurrency(log.cost, 2)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`${cardBase} p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Additional Costs</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Transport, food, equipment, etc.</p>
            </div>
            <button className="btn-outline btn-sm">Add Cost</button>
          </div>
          <div className="mt-6 space-y-4">
            {additionalCostItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200/70 p-6 text-center text-sm text-slate-500 dark:border-white/10">
                {isLoadingProject ? 'Loading additional costs...' : 'No additional costs yet.'}
              </div>
            ) : (
              additionalCostItems.map(cost => (
                <div
                  key={cost.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-black/40"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{cost.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{cost.subtitle}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{cost.amount}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BudgetConfig
