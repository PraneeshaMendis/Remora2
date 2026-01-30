import React, { useState } from 'react'
import { ChevronDown, DollarSign, Users, TrendingUp, Clock } from 'lucide-react'

const BudgetConfig: React.FC = () => {
  const project = {
    name: 'Mobile App Redesign',
    status: 'In Progress',
  }

  const laborCost = 2515
  const additionalCost = 545
  const totalBudget = 3060
  const hoursLogged = 28

  const laborPercent = Math.round((laborCost / totalBudget) * 100)
  const additionalPercent = 100 - laborPercent
  const laborColor = '#0b7dff'
  const additionalColor = '#f59e0b'
  const donutGap = 4
  const laborRatio = laborCost / totalBudget
  const donutRadius = 42
  const donutStroke = 14
  const donutCircumference = 2 * Math.PI * donutRadius
  const laborArc = Math.max(donutCircumference * laborRatio - donutGap, 0)
  const additionalArc = Math.max(donutCircumference - laborArc - donutGap, 0)

  const [hoveredCost, setHoveredCost] = useState<{
    label: string
    value: number
    color: string
  } | null>(null)

  const statCards = [
    {
      label: 'Total Budget',
      value: `$${totalBudget.toLocaleString()}`,
      icon: DollarSign,
      accent: 'bg-emerald-500/15 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400',
    },
    {
      label: 'Labor Cost',
      value: `$${laborCost.toLocaleString()}`,
      icon: Users,
      accent: 'bg-sky-500/15 text-sky-500 dark:bg-sky-500/20 dark:text-sky-400',
    },
    {
      label: 'Additional',
      value: `$${additionalCost.toLocaleString()}`,
      icon: TrendingUp,
      accent: 'bg-amber-500/15 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400',
    },
    {
      label: 'Hours Logged',
      value: `${hoursLogged}h`,
      icon: Clock,
      accent: 'bg-indigo-500/15 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400',
    },
  ]

  const teamCosts = [
    { name: 'Sarah', labor: 1400, additional: 120 },
    { name: 'Alex', labor: 320, additional: 0 },
    { name: 'Mike', labor: 525, additional: 0 },
    { name: 'Emily', labor: 270, additional: 0 },
  ]

  const maxLaborCost = Math.max(...teamCosts.map(member => member.labor), 1)
  const yTicks = [1400, 1050, 700, 350, 0]

  const teamBreakdown = [
    {
      initials: 'SC',
      name: 'Sarah Chen',
      role: 'Senior Developer',
      hours: '14h',
      labor: '$1,400',
      additional: '$120',
      total: '$1,520',
    },
    {
      initials: 'AJ',
      name: 'Alex Johnson',
      role: 'Designer',
      hours: '4h',
      labor: '$320',
      additional: '$0',
      total: '$320',
    },
    {
      initials: 'MP',
      name: 'Mike Peters',
      role: 'Developer',
      hours: '7h',
      labor: '$525',
      additional: '$0',
      total: '$525',
    },
    {
      initials: 'ED',
      name: 'Emily Davis',
      role: 'Project Manager',
      hours: '3h',
      labor: '$270',
      additional: '$0',
      total: '$270',
    },
  ]

  const timeLogs = [
    {
      initials: 'SC',
      name: 'Sarah Chen',
      role: 'Senior Developer',
      date: 'Jan 28, 2026',
      detail: 'Feature implementation',
      hours: '8h',
      amount: '$800.00',
    },
    {
      initials: 'SC',
      name: 'Sarah Chen',
      role: 'Senior Developer',
      date: 'Jan 27, 2026',
      detail: 'Code review',
      hours: '6h',
      amount: '$600.00',
    },
    {
      initials: 'AJ',
      name: 'Alex Johnson',
      role: 'Designer',
      date: 'Jan 28, 2026',
      detail: 'UI mockups',
      hours: '4h',
      amount: '$320.00',
    },
    {
      initials: 'MP',
      name: 'Mike Peters',
      role: 'Developer',
      date: 'Jan 28, 2026',
      detail: 'Backend work',
      hours: '7h',
      amount: '$525.00',
    },
    {
      initials: 'ED',
      name: 'Emily Davis',
      role: 'Project Manager',
      date: 'Jan 27, 2026',
      detail: 'Sprint planning',
      hours: '3h',
      amount: '$270.00',
    },
  ]

  const additionalCosts = [
    {
      title: 'Transport',
      subtitle: 'Jan 28, 2026 - Client meeting travel',
      amount: '$75.00',
    },
    {
      title: 'Food & Meals',
      subtitle: 'Sarah Chen - Jan 27, 2026 - Team lunch',
      amount: '$120.00',
    },
    {
      title: 'Equipment',
      subtitle: 'Jan 25, 2026 - Monitor for testing',
      amount: '$350.00',
    },
  ]

  const cardBase = 'rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-black/60 shadow-soft'

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
              {project.status}
            </span>
          </div>
          <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Track costs and budget per project
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="h-11 w-64 rounded-full border border-slate-200/70 bg-white/80 px-4 pr-10 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-400 dark:border-white/10 dark:bg-black/50 dark:text-slate-200"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-200/70 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-white/10 dark:bg-black/60 dark:text-slate-300">
              K
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Select Project
            </div>
            <button
              type="button"
              className="flex items-center justify-between gap-3 rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm dark:border-white/10 dark:bg-black/50 dark:text-slate-100"
            >
              <span>{project.name}</span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

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
                    {card.value}
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
                    {hoveredCost ? `$${hoveredCost.value.toLocaleString()}` : `$${totalBudget.toLocaleString()}`}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: laborColor }} />
                <span>Labor</span>
                <span className="ml-auto font-semibold text-slate-900 dark:text-white">${laborCost.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: additionalColor }} />
                <span>Additional</span>
                <span className="ml-auto font-semibold text-slate-900 dark:text-white">${additionalCost.toLocaleString()}</span>
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
                    const laborHeight = (member.labor / maxLaborCost) * 100
                    const additionalHeight = (member.additional / maxLaborCost) * 100
                    return (
                      <div key={member.name} className="flex flex-col items-center gap-3">
                        <div className="flex h-40 items-end gap-2">
                          <div className="group relative flex h-full items-end">
                            <div
                              className="w-6"
                              style={{ height: `${laborHeight}%`, backgroundColor: laborColor }}
                            />
                            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-1 text-[11px] text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                              ${member.labor.toLocaleString()}
                            </div>
                          </div>
                          <div className="group relative flex h-full items-end">
                            <div
                              className="w-6"
                              style={{ height: `${additionalHeight}%`, backgroundColor: additionalColor }}
                            />
                            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-1 text-[11px] text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                              ${member.additional.toLocaleString()}
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
                <th className="pb-3">Labor Cost</th>
                <th className="pb-3">Additional</th>
                <th className="pb-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
              {teamBreakdown.map(member => (
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
                  <td className="py-4">{member.labor}</td>
                  <td className="py-4">{member.additional}</td>
                  <td className="py-4 text-right font-semibold text-slate-900 dark:text-white">{member.total}</td>
                </tr>
              ))}
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
            {timeLogs.map(log => (
              <div
                key={`${log.name}-${log.date}-${log.detail}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-black/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/80 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                    {log.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{log.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{log.role}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {log.date} - {log.detail}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{log.hours}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{log.amount}</div>
                </div>
              </div>
            ))}
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
            {additionalCosts.map(cost => (
              <div
                key={cost.title}
                className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-black/40"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{cost.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{cost.subtitle}</div>
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{cost.amount}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BudgetConfig
