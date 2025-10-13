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
  CheckSquare,
  UserCog,
  FileText,
  ClipboardList,
  Settings,
  CheckCircle,
  Calendar,
  Receipt
} from 'lucide-react'

const Sidebar: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

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
      roles: ['director', 'manager', 'member'],
      description: 'Project portfolio'
    },
    { 
      name: 'Completed Projects', 
      href: '/completed-projects', 
      icon: CheckCircle, 
      roles: ['director', 'manager', 'member'],
      description: 'Finished projects'
    },
    { 
      name: 'Tasks', 
      href: '/tasks', 
      icon: CheckSquare, 
      roles: ['director', 'manager', 'member'],
      description: 'Task management'
    },
    { 
      name: 'Calendar', 
      href: '/calendar', 
      icon: Calendar, 
      roles: ['director', 'manager', 'member'],
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
      name: 'Documents', 
      href: '/documents', 
      icon: FileText, 
      roles: ['director', 'manager', 'member'],
      description: 'Document library'
    },
    { 
      name: 'Reviews', 
      href: '/reviews', 
      icon: ClipboardList, 
      roles: ['director', 'manager', 'member'],
      description: 'Review & feedback'
    },
    { 
      name: 'Profile', 
      href: '/profile', 
      icon: Settings, 
      roles: ['director', 'manager', 'member'],
      description: 'Account settings'
    },
  ]

  const filteredNavigation = navigation.filter(item => 
    user?.role && item.roles.includes(user.role)
  )

  return (
    <div className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-56">
        <div className="flex flex-col flex-grow bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-lg">

          {/* User Info */}
              <div 
                className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                onClick={() => navigate('/profile')}
              >
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
              <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
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
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
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
