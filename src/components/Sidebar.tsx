import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import { 
  HiChevronRight
} from 'react-icons/hi'
import { 
  BarChart3,
  FolderOpen,
  UserCog,
  FileText,
  Calendar,
  Receipt,
  CheckCircle,
  Archive,
  Shield,
  Wallet,
  ClipboardList,
  SlidersHorizontal,
  Gauge
} from 'lucide-react'
import CyberLabsLogo from './CyberLabsLogo.tsx'
import SidebarLogoScene from './SidebarLogoScene.tsx'

const Sidebar: React.FC = () => {
  const { user } = useAuth()
  const [showLogoScene, setShowLogoScene] = React.useState(false)
  const [logoExpanded, setLogoExpanded] = React.useState(false)
  const logoHeight = 48
  const profileName = user?.name || 'Profile'
  const profileInitials = user?.avatar || profileName.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'U'

  const navigationGroups = [
    {
      label: 'Insights',
      items: [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: BarChart3,
          roles: ['director'],
          description: 'Executive overview',
        },
        {
          name: 'KPI Tracker',
          href: '/kpi-tracker',
          icon: Gauge,
          roles: ['director', 'manager'],
          description: 'Document quality KPI',
        },
        {
          name: 'Calendar',
          href: '/calendar',
          icon: Calendar,
          roles: ['admin', 'director', 'manager', 'member', 'client', 'consultant', 'lead'],
          description: 'Schedule & events',
        },
      ],
    },
    {
      label: 'Operations',
      items: [
        {
          name: 'Projects',
          href: '/projects',
          icon: FolderOpen,
          roles: ['director', 'manager', 'member', 'client', 'consultant', 'lead'],
          description: 'Project portfolio',
        },
        {
          name: 'Completed Projects',
          href: '/completed-projects',
          icon: CheckCircle,
          roles: ['director', 'manager', 'member', 'client', 'consultant', 'lead'],
          description: 'Finished projects',
        },
        {
          name: 'Project Dump',
          href: '/project-dump',
          icon: Archive,
          roles: ['director', 'manager', 'member', 'client', 'consultant', 'lead'],
          description: 'Removed projects',
        },
        {
          name: 'Deliverables',
          href: '/deliverables',
          icon: FileText,
          roles: ['director', 'manager', 'member', 'client', 'consultant', 'lead'],
          description: 'Client deliverables',
        },
        {
          name: 'Documents Log',
          href: '/documents',
          icon: FileText,
          roles: ['director', 'manager', 'member', 'client', 'consultant', 'lead'],
          description: 'Document library',
        },
        {
          name: 'Meeting Logger',
          href: '/meeting-logger',
          icon: ClipboardList,
          roles: ['director', 'manager', 'member', 'client', 'consultant', 'lead'],
          description: 'Notes & effort',
        },
      ],
    },
    {
      label: 'Financials',
      items: [
        {
          name: 'Project Costing',
          href: '/project-costing',
          icon: Receipt,
          roles: ['director', 'manager'],
          description: 'Costing & adjustments',
        },
        {
          name: 'Budget Config',
          href: '/budget-config',
          icon: Wallet,
          roles: ['director', 'manager'],
          description: 'Project budget view',
        },
        {
          name: 'Slips & Invoices',
          href: '/slips-invoices',
          icon: Receipt,
          roles: ['director', 'manager'],
          description: 'Financial tracking',
        },
      ],
    },
    {
      label: 'Administration',
      items: [
        {
          name: 'User Management',
          href: '/users',
          icon: UserCog,
          roles: ['director', 'manager'],
          description: 'Team & permissions',
        },
        {
          name: 'Register User',
          href: '/admin/register-user',
          icon: UserCog,
          roles: ['director', 'manager'],
          description: 'Create new user accounts',
        },
        {
          name: 'Permissions',
          href: '/admin/permissions',
          icon: Shield,
          roles: ['admin', 'director'],
          description: 'RBAC management',
        },
      ],
    },
  ]

  const isExecutive = String(user?.department || '').trim().toLowerCase() === 'executive department'
  const isAdmin = user?.role === 'admin' || !!user?.isSuperAdmin || isExecutive
  const canSee = (item: { roles: string[] }) => {
    if (isAdmin) return true
    return user?.role ? item.roles.includes(user.role) : false
  }
  const filteredGroups = navigationGroups
    .map(group => ({
      ...group,
      items: group.items.filter(canSee),
    }))
    .filter(group => group.items.length > 0)
  const mobileNavItems = [
    ...filteredGroups.flatMap(group => group.items),
    {
      name: 'Profile',
      href: '/profile',
      icon: SlidersHorizontal,
      description: 'Account settings',
    },
  ]

  const sidebarWidth = showLogoScene ? (logoExpanded ? 'w-96' : 'w-80') : 'w-72'
  const logoHeightClass = showLogoScene ? (logoExpanded ? 'h-44' : 'h-32') : ''

  return (
    <>
      <div className="hidden lg:flex lg:flex-shrink-0 lg:h-screen lg:sticky lg:top-0">
        <div className={`flex flex-col h-screen p-3 transition-all duration-300 ${sidebarWidth}`}>
          <div className="flex flex-col flex-1 sidebar-surface sidebar-card shadow-lg overflow-hidden">

            {/* Brand */}
            <div className="px-4 pt-6 pb-5 border-b border-[hsl(var(--sidebar-border))]">
              <div className="flex items-center justify-center">
                {showLogoScene ? (
                  <button
                    type="button"
                    className={`sidebar-logo-shell logo-static logo-clean w-full ${logoHeightClass} flex items-center justify-center transition-all duration-300`}
                    aria-label={logoExpanded ? 'Show logo' : 'Expand moonwalk'}
                    onClick={() => {
                      if (!logoExpanded) {
                        setLogoExpanded(true)
                        return
                      }
                      setLogoExpanded(false)
                      setShowLogoScene(false)
                    }}
                  >
                    <SidebarLogoScene className="w-full h-full pointer-events-none" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="sidebar-logo-shell"
                    aria-label="Show moonwalk"
                    onClick={() => {
                      setLogoExpanded(false)
                      setShowLogoScene(true)
                    }}
                  >
                    <CyberLabsLogo
                      size={logoHeight}
                      className="sidebar-logo-img shrink-0"
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto no-scrollbar">
              {filteredGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <div className="px-4 pt-1 text-[11px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const IconComponent = item.icon
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                          `group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                            isActive
                              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg transform scale-105'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white hover:shadow-md hover:transform hover:scale-102'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className={`p-1.5 rounded-lg mr-3 transition-colors duration-200 ${
                              isActive
                                ? 'bg-white/20'
                                : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/20'
                            }`}>
                              <IconComponent className={`h-4 w-4 ${
                                isActive
                                  ? 'text-white'
                                  : 'text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{item.name}</div>
                              <div className={`text-xs ${
                                isActive
                                  ? 'text-white/80'
                                  : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                              }`}>
                                {item.description}
                              </div>
                            </div>
                            {isActive && (
                              <HiChevronRight className="h-4 w-4 text-white/80" />
                            )}
                          </>
                        )}
                      </NavLink>
                    )
                  })}
                </div>
              ))}
            </nav>

            {/* Footer */}
            <div className="px-3 pb-3 border-t border-[hsl(var(--sidebar-border))]">
              <NavLink
                to="/profile"
                className="group mt-3 flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-3 text-left shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-black/40 dark:hover:bg-black/60"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/70 bg-slate-100 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-100">
                      {profileInitials}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-black/60" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {profileName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">View Profile</div>
                  </div>
                </div>
                <SlidersHorizontal className="h-4 w-4 text-slate-400 transition group-hover:text-slate-600 dark:group-hover:text-slate-300" />
              </NavLink>
            </div>

            {/* Version/online footer removed */}
          </div>
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-slate-950/95 lg:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.45rem)' }}
      >
        <div className="overflow-x-auto no-scrollbar px-2 pt-2">
          <nav className="flex w-max min-w-full gap-2">
            {mobileNavItems.map((item) => {
              const IconComponent = item.icon
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    `group flex min-w-[92px] shrink-0 flex-col items-center justify-center rounded-xl px-3 py-2 text-[11px] font-medium transition ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <IconComponent className={`h-4 w-4 ${
                        isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700 dark:text-slate-300 dark:group-hover:text-white'
                      }`} />
                      <span className="mt-1 whitespace-nowrap">{item.name}</span>
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>
    </>
  )
}

export default Sidebar
