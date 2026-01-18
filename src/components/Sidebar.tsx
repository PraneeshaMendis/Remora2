import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import { 
  HiChevronRight
} from 'react-icons/hi'
import { 
  BarChart3,
  Users,
  FolderOpen,
  UserCog,
  FileText,
  Settings,
  CheckCircle,
  Calendar,
  Receipt,
  Shield
} from 'lucide-react'
import CyberLabsLogo from './CyberLabsLogo.tsx'
import SidebarLogoScene from './SidebarLogoScene.tsx'

const Sidebar: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showLogoScene, setShowLogoScene] = React.useState(false)
  const [logoExpanded, setLogoExpanded] = React.useState(false)
  const logoHeight = 48

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: BarChart3, 
      roles: ['director'],
      description: 'Executive overview'
    },
    { 
      name: 'Manager Dashboard', 
      href: '/manager-dashboard', 
      icon: Users, 
      roles: ['manager', 'director'],
      description: 'Team management'
    },
    { 
      name: 'Projects', 
      href: '/projects', 
      icon: FolderOpen, 
      roles: ['director', 'manager', 'member', 'client', 'consultant', 'lead'],
      description: 'Project portfolio'
    },
    { 
      name: 'Completed Projects', 
      href: '/completed-projects', 
      icon: CheckCircle, 
      roles: ['director', 'manager', 'member', 'client', 'consultant', 'lead'],
      description: 'Finished projects'
    },
    { 
      name: 'Calendar', 
      href: '/calendar', 
      icon: Calendar, 
      roles: ['admin', 'director', 'manager', 'member', 'client', 'consultant', 'lead'],
      description: 'Schedule & events'
    },
    { 
      name: 'Slips & Invoices', 
      href: '/slips-invoices', 
      icon: Receipt, 
      roles: ['director', 'manager'],
      description: 'Financial tracking'
    },
    { 
      name: 'User Management', 
      href: '/users', 
      icon: UserCog, 
      roles: ['director', 'manager'],
      description: 'Team & permissions'
    },
    { 
      name: 'Pending Approvals', 
      href: '/admin/approvals', 
      icon: Users, 
      roles: ['admin', 'director', 'manager', 'lead'],
      description: 'Approve new users'
    },
    { 
      name: 'Permissions', 
      href: '/admin/permissions', 
      icon: Shield, 
      roles: ['admin', 'director'],
      description: 'RBAC management'
    },
    { 
      name: 'Register User', 
      href: '/admin/register-user', 
      icon: UserCog, 
      roles: ['director', 'manager'],
      description: 'Create new user accounts'
    },
    { 
      name: 'Documents', 
      href: '/documents', 
      icon: FileText, 
      roles: ['director', 'manager', 'member', 'client', 'consultant', 'lead'],
      description: 'Document library'
    },
    { 
      name: 'Profile', 
      href: '/profile', 
      icon: Settings, 
      roles: ['director', 'manager', 'member', 'client', 'consultant', 'lead'],
      description: 'Account settings'
    },
  ]

  const isAdmin = user?.role === 'admin'
  const filteredNavigation = navigation.filter(item => {
    if (isAdmin) return true
    return user?.role ? item.roles.includes(user.role) : false
  })

  const sidebarWidth = showLogoScene ? (logoExpanded ? 'w-96' : 'w-80') : 'w-72'
  const logoHeightClass = showLogoScene ? (logoExpanded ? 'h-44' : 'h-32') : ''

  return (
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
              <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto no-scrollbar">
            {filteredNavigation.map((item) => {
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
          </nav>

          {/* Footer */}
              <div className="px-4 py-3 border-t border-[hsl(var(--sidebar-border))]">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Version 1.0.0
              </div>
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
