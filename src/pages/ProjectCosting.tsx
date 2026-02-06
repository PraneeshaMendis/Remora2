import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Users, TrendingUp, Clock, Plus, Receipt, SlidersHorizontal, Trash2, Shield } from 'lucide-react'
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

type ProjectMember = {
  id: string
  name: string
  email: string
  roleLabel: string
  costRate: number
}

type ExpenseItem = {
  id: string
  label: string
  amount: string
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

const ProjectCosting: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projectDetail, setProjectDetail] = useState<any | null>(null)
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([])
  const [rateOverrides, setRateOverrides] = useState<Record<string, string>>({})
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [isLoadingProject, setIsLoadingProject] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [memberHours, setMemberHours] = useState<Record<string, string>>({})
  const [industrySensitivity, setIndustrySensitivity] = useState<'standard' | 'high' | 'critical'>('standard')
  const [projectUrgency, setProjectUrgency] = useState(1)
  const [contingencyPct, setContingencyPct] = useState(15)
  const [profitPct, setProfitPct] = useState(15)
  const [taxPct, setTaxPct] = useState(15)

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
      try {
        const detail = await apiGet(`/projects/${selectedProjectId}`)
        if (!active) return
        setProjectDetail(detail)
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
  }, [selectedProjectId])

  useEffect(() => {
    if (!selectedProjectId) {
      setIndustrySensitivity('standard')
      setProjectUrgency(1)
      setContingencyPct(15)
      setProfitPct(15)
      setTaxPct(15)
      return
    }
    try {
      const raw = localStorage.getItem(`projectCosting.settings.${selectedProjectId}`)
      if (!raw) {
        setIndustrySensitivity('standard')
        setProjectUrgency(1)
        setContingencyPct(15)
        setProfitPct(15)
        setTaxPct(15)
        return
      }
      const parsed = JSON.parse(raw || '{}') as Partial<{
        industrySensitivity: 'standard' | 'high' | 'critical'
        projectUrgency: number
        contingencyPct: number
        profitPct: number
        taxPct: number
      }>
      setIndustrySensitivity(parsed.industrySensitivity || 'standard')
      setProjectUrgency(
        typeof parsed.projectUrgency === 'number' && !Number.isNaN(parsed.projectUrgency)
          ? parsed.projectUrgency
          : 1
      )
      setContingencyPct(
        typeof parsed.contingencyPct === 'number' && !Number.isNaN(parsed.contingencyPct)
          ? parsed.contingencyPct
          : 15
      )
      setProfitPct(
        typeof parsed.profitPct === 'number' && !Number.isNaN(parsed.profitPct)
          ? parsed.profitPct
          : 15
      )
      setTaxPct(
        typeof parsed.taxPct === 'number' && !Number.isNaN(parsed.taxPct)
          ? parsed.taxPct
          : 15
      )
    } catch {
      setIndustrySensitivity('standard')
      setProjectUrgency(1)
      setContingencyPct(15)
      setProfitPct(15)
      setTaxPct(15)
    }
  }, [selectedProjectId])

  useEffect(() => {
    if (!selectedProjectId) return
    try {
      localStorage.setItem(
        `projectCosting.settings.${selectedProjectId}`,
        JSON.stringify({
          industrySensitivity,
          projectUrgency,
          contingencyPct,
          profitPct,
          taxPct,
        })
      )
    } catch {}
  }, [selectedProjectId, industrySensitivity, projectUrgency, contingencyPct, profitPct, taxPct])

  useEffect(() => {
    if (!selectedProjectId) {
      setMemberHours({})
      return
    }
    try {
      const raw = localStorage.getItem(`projectCosting.hours.${selectedProjectId}`)
      const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {}
      setMemberHours(parsed && typeof parsed === 'object' ? parsed : {})
    } catch {
      setMemberHours({})
    }
  }, [selectedProjectId])

  useEffect(() => {
    if (!selectedProjectId) return
    try {
      localStorage.setItem(`projectCosting.hours.${selectedProjectId}`, JSON.stringify(memberHours))
    } catch {}
  }, [memberHours, selectedProjectId])

  useEffect(() => {
    if (!selectedProjectId) {
      setExpenseItems([])
      return
    }
    try {
      const raw = localStorage.getItem(`projectCosting.expenses.${selectedProjectId}`)
      const parsed = raw ? (JSON.parse(raw) as ExpenseItem[]) : []
      setExpenseItems(Array.isArray(parsed) ? parsed : [])
    } catch {
      setExpenseItems([])
    }
  }, [selectedProjectId])

  useEffect(() => {
    if (!selectedProjectId) return
    try {
      localStorage.setItem(`projectCosting.expenses.${selectedProjectId}`, JSON.stringify(expenseItems))
    } catch {}
  }, [expenseItems, selectedProjectId])

  const selectedProject = useMemo(() => {
    return projects.find(project => project.id === selectedProjectId) || projectDetail
  }, [projects, selectedProjectId, projectDetail])

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

    return map
  }, [projectDetail])

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

  const addExpenseItem = () => {
    const id = `expense-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setExpenseItems(prev => [...prev, { id, label: '', amount: '' }])
  }

  const updateExpenseItem = (id: string, patch: Partial<ExpenseItem>) => {
    setExpenseItems(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeExpenseItem = (id: string) => {
    setExpenseItems(prev => prev.filter(item => item.id !== id))
  }

  const getMemberHoursValue = (memberId: string) => {
    const raw = memberHours[memberId]
    const parsed = Number(raw)
    if (Number.isNaN(parsed) || parsed < 0) return 0
    return parsed
  }

  const updateMemberHours = (memberId: string, value: string) => {
    setMemberHours(prev => ({ ...prev, [memberId]: value }))
  }

  const expenseTotal = useMemo(() => {
    return expenseItems.reduce((sum, item) => {
      const value = Number(item.amount)
      if (Number.isNaN(value) || value <= 0) return sum
      return sum + value
    }, 0)
  }, [expenseItems])

  const teamCosts = useMemo(() => {
    return Array.from(memberMap.values()).map(member => {
      const baseRate = member.costRate
      const rate = getEffectiveRate(member.id, baseRate)
      const hoursValue = Math.round((getMemberHoursValue(member.id) + Number.EPSILON) * 10) / 10
      const labor = hoursValue * rate
      return {
        name: member.name,
        labor,
      }
    })
  }, [memberMap, memberHours, rateOverrides])

  const laborCost = useMemo(() => {
    return teamCosts.reduce((sum, item) => sum + item.labor, 0)
  }, [teamCosts])

  const totalHours = useMemo(() => {
    return Array.from(memberMap.values()).reduce((sum, member) => {
      const hoursValue = Math.round((getMemberHoursValue(member.id) + Number.EPSILON) * 10) / 10
      return sum + hoursValue
    }, 0)
  }, [memberMap, memberHours])

  const baseCost = laborCost + expenseTotal
  const industryMultiplier =
    industrySensitivity === 'standard' ? 1 : industrySensitivity === 'high' ? 1.15 : 1.3
  const urgencyMultiplier = Math.max(1, Math.min(projectUrgency, 2))
  const riskMultiplier = Math.round(industryMultiplier * urgencyMultiplier * 100) / 100
  const riskAdjustment = baseCost * (riskMultiplier - 1)
  const contingencyAmount = (baseCost + riskAdjustment) * (contingencyPct / 100)
  const profitAmount = (baseCost + riskAdjustment + contingencyAmount) * (profitPct / 100)
  const preTaxTotal = baseCost + riskAdjustment + contingencyAmount + profitAmount
  const taxAmount = preTaxTotal * (taxPct / 100)
  const totalInvestment = preTaxTotal + taxAmount

  const laborColor = '#0b7dff'
  const expenseColor = '#f59e0b'
  const riskColor = '#6366f1'
  const contingencyColor = '#22c55e'
  const profitColor = '#14b8a6'
  const taxColor = '#ef4444'
  const donutGap = 4
  const donutRadius = 42
  const donutStroke = 14
  const donutCircumference = 2 * Math.PI * donutRadius

  const distributionSegments = useMemo(() => {
    const total = totalInvestment
    const items = [
      { key: 'labor', label: 'Labor', value: laborCost, color: laborColor },
      { key: 'expenses', label: 'Expenses', value: expenseTotal, color: expenseColor },
      { key: 'risk', label: 'Risk Adjustment', value: Math.max(0, riskAdjustment), color: riskColor },
      { key: 'contingency', label: 'Contingency', value: contingencyAmount, color: contingencyColor },
      { key: 'profit', label: 'Profit', value: profitAmount, color: profitColor },
      { key: 'tax', label: 'Tax', value: taxAmount, color: taxColor },
    ]
      .filter(item => item.value > 0)
      .map(item => ({
        ...item,
        percent: total ? Math.round((item.value / total) * 100) : 0,
      }))
    return items
  }, [
    totalInvestment,
    laborCost,
    expenseTotal,
    riskAdjustment,
    contingencyAmount,
    profitAmount,
    taxAmount,
  ])

  const donutSegments = useMemo(() => {
    if (!distributionSegments.length || totalInvestment <= 0) return []
    const gapSize = donutGap
    const totalGap = gapSize * distributionSegments.length
    const available = Math.max(donutCircumference - totalGap, 0)
    let offset = 0
    return distributionSegments.map(segment => {
      const arc = available * (segment.value / totalInvestment)
      const dasharray = `${arc} ${donutCircumference - arc}`
      const dashoffset = -offset
      offset += arc + gapSize
      return { ...segment, dasharray, dashoffset }
    })
  }, [distributionSegments, totalInvestment, donutCircumference, donutGap])

  const distributionSummary = useMemo(() => {
    if (totalInvestment <= 0 || distributionSegments.length === 0) {
      return 'No costs added yet.'
    }
    const ranked = [...distributionSegments].sort((a, b) => b.value - a.value)
    if (ranked.length === 1) {
      return `${ranked[0].label} accounts for ${ranked[0].percent}% of total investment.`
    }
    return `${ranked[0].label} accounts for ${ranked[0].percent}% and ${ranked[1].label.toLowerCase()} for ${ranked[1].percent}% of total investment.`
  }, [distributionSegments, totalInvestment])

  const maxBarValue = Math.max(
    ...teamCosts.map(member => member.labor),
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
      const baseRate = member.costRate
      const rate = getEffectiveRate(member.id, baseRate)
      const hours = Math.round((getMemberHoursValue(member.id) + Number.EPSILON) * 10) / 10
      const labor = hours * rate
      const total = labor
      return {
        id: member.id,
        initials: getInitials(member.name),
        name: member.name,
        role: member.roleLabel,
        hours: `${hours}h`,
        hoursValue: hours,
        rate,
        labor: formatCurrency(labor, 0),
        laborValue: labor,
        total: formatCurrency(total, 0),
        totalValue: total,
        baseRate,
      }
    })
  }, [memberMap, memberHours, rateOverrides])

  const statCards = [
    {
      label: 'Labor Cost',
      value: formatCurrency(laborCost, 0),
      icon: Users,
      accent: 'bg-sky-500/15 text-sky-500 dark:bg-sky-500/20 dark:text-sky-400',
    },
    {
      label: 'Other Expenses',
      value: formatCurrency(expenseTotal, 0),
      icon: TrendingUp,
      accent: 'bg-amber-500/15 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400',
    },
    {
      label: 'Total Hours',
      value: `${Math.round((totalHours + Number.EPSILON) * 10) / 10}h`,
      icon: Clock,
      accent: 'bg-indigo-500/15 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400',
    },
  ]

  const cardBase = 'rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-black/60 shadow-soft'

  const statusLabel = selectedProject?.status
    ? formatTitleCase(String(selectedProject.status))
    : 'Planning'

  const industryOptions = [
    { key: 'standard', label: 'Standard', multiplier: 1 },
    { key: 'high', label: 'High', multiplier: 1.15 },
    { key: 'critical', label: 'Critical', multiplier: 1.3 },
  ] as const

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Project Costing
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Project Costing</h1>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {statusLabel}
            </span>
          </div>
          <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Track project investment and variable adjustments
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

      <div className="grid grid-cols-1 gap-6">
        <div className={`${cardBase} p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Cost Distribution</h2>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Investment Mix</div>
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
                  {donutSegments.map(segment => (
                    <circle
                      key={segment.key}
                      cx="60"
                      cy="60"
                      r={donutRadius}
                      fill="none"
                      stroke={segment.color}
                      strokeWidth={donutStroke}
                      strokeLinecap="round"
                      strokeDasharray={segment.dasharray}
                      strokeDashoffset={segment.dashoffset}
                      onMouseEnter={() => setHoveredCost({ label: segment.label, value: segment.value, color: segment.color })}
                      onMouseLeave={() => setHoveredCost(null)}
                    />
                  ))}
                </g>
                <circle cx="60" cy="60" r={donutRadius - donutStroke} fill="white" className="dark:fill-black/80" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {hoveredCost ? hoveredCost.label : 'Total'}
                  </div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">
                    {hoveredCost ? formatCurrency(hoveredCost.value, 0) : formatCurrency(totalInvestment, 0)}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
              {distributionSegments.map(segment => (
                <div key={segment.key} className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span>{segment.label}</span>
                  <span className="ml-auto font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(segment.value, 0)}
                  </span>
                </div>
              ))}
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 text-xs text-slate-500 dark:border-white/10 dark:bg-black/40 dark:text-slate-300">
                {distributionSummary}
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
                    return (
                      <div key={member.name} className="flex flex-col items-center gap-3">
                        <div className="flex h-40 items-end">
                          <div className="group relative flex h-full items-end">
                            <div
                              className="w-8"
                              style={{ height: `${laborHeight}%`, backgroundColor: laborColor }}
                            />
                            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-1 text-[11px] text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                              {formatCurrency(member.labor, 0)}
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
            </div>
          </div>
        </div>
      </div>

      <div className={`${cardBase} p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Team Member Cost Breakdown</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Labor spend by contributor</p>
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
                <th className="pb-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
              {teamBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
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
                    <td className="py-4">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={memberHours[member.id] ?? '0'}
                        onChange={event => updateMemberHours(member.id, event.target.value)}
                        className="h-9 w-24 rounded-xl border border-slate-200/70 bg-white/80 px-2 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-400 dark:border-white/10 dark:bg-black/40 dark:text-slate-100"
                      />
                    </td>
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
                    <td className="py-4 text-right font-semibold text-slate-900 dark:text-white">{member.total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className={`${cardBase} p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Expenses & Licenses</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Add tooling, SaaS, travel, or compliance fees.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={addExpenseItem}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>
          <div className="mt-6 space-y-3">
            {expenseItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200/70 p-6 text-center text-sm text-slate-500 dark:border-white/10">
                No expenses added yet.
              </div>
            ) : (
              expenseItems.map(item => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-black/40"
                >
                  <input
                    type="text"
                    value={item.label}
                    onChange={event => updateExpenseItem(item.id, { label: event.target.value })}
                    placeholder="Expense name"
                    className="min-w-[200px] flex-1 bg-transparent text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-black/40">
                      <span className="text-xs text-slate-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.amount}
                        onChange={event => updateExpenseItem(item.id, { amount: event.target.value })}
                        className="w-24 bg-transparent text-sm text-slate-700 focus:outline-none dark:text-slate-100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExpenseItem(item.id)}
                      className="text-slate-400 hover:text-rose-500"
                      aria-label="Remove expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>Total expenses</span>
            <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(expenseTotal, 0)}</span>
          </div>
        </div>

        <div className={`${cardBase} p-6`}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Variable Adjustments</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Tune risk, urgency, contingency, and tax.</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Industry Sensitivity</div>
              {industryOptions.map(option => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setIndustrySensitivity(option.key)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    industrySensitivity === option.key
                      ? 'border-primary-400 bg-primary-50/70 text-primary-700 dark:border-primary-400/60 dark:bg-primary-500/10 dark:text-primary-300'
                      : 'border-slate-200/70 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5'
                  }`}
                >
                  <span>{option.label}</span>
                  <span className="text-xs text-slate-400">{option.multiplier.toFixed(2)}x</span>
                </button>
              ))}
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <span>Project Urgency</span>
                  <span className="text-xs text-slate-500">{projectUrgency.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="2"
                  step="0.05"
                  value={projectUrgency}
                  onChange={event => setProjectUrgency(Number(event.target.value))}
                  className="w-full accent-primary-500"
                />
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400">
                  <span>Normal (1.0x)</span>
                  <span>Emergency (2.0x)</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contingency (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={contingencyPct}
                    onChange={event => setContingencyPct(Math.max(0, Number(event.target.value) || 0))}
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm font-semibold text-slate-800 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-400 dark:border-white/10 dark:bg-black/50 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profit (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={profitPct}
                    onChange={event => setProfitPct(Math.max(0, Number(event.target.value) || 0))}
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm font-semibold text-slate-800 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-400 dark:border-white/10 dark:bg-black/50 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tax / VAT (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={taxPct}
                    onChange={event => setTaxPct(Math.max(0, Number(event.target.value) || 0))}
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-sm font-semibold text-slate-800 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-400 dark:border-white/10 dark:bg-black/50 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 text-white shadow-[0_30px_70px_rgba(15,23,42,0.35)]">
        <div className="absolute right-6 top-6 text-white/10">
          <Shield className="h-16 w-16" />
        </div>
        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Total Project Revenue</div>
        <div className="mt-3 text-4xl font-semibold">{formatCurrency(totalInvestment, 2)}</div>
        <div className="mt-6 space-y-3 border-t border-white/10 pt-4 text-sm text-slate-200">
          <div className="flex items-center justify-between">
            <span>Direct Labor</span>
            <span className="font-semibold">{formatCurrency(laborCost, 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tooling & Licenses</span>
            <span className="font-semibold">{formatCurrency(expenseTotal, 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Risk Adjustment (x{riskMultiplier.toFixed(2)})</span>
            <span className="font-semibold">
              {riskAdjustment >= 0 ? `+${formatCurrency(riskAdjustment, 0)}` : formatCurrency(riskAdjustment, 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Buffer & Contingency</span>
            <span className="font-semibold">{formatCurrency(contingencyAmount, 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Profit ({profitPct}%)</span>
            <span className="font-semibold">{formatCurrency(profitAmount, 0)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tax ({taxPct}%)</span>
            <span className="font-semibold">{formatCurrency(taxAmount, 2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectCosting
