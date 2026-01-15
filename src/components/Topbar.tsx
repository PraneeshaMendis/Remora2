import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import { useTheme } from '../contexts/ThemeContext.tsx'
import { getImpersonationStatus, stopImpersonation } from '../services/adminAPI.ts'
import CyberLabsLogo from './CyberLabsLogo.tsx'

const Topbar: React.FC = () => {
  const { user, logout } = useAuth()
  const [impersonation, setImpersonation] = useState<{ active: boolean; user?: { id: string; name: string; email: string } } | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    ;(async () => {
      try {
        const st = await getImpersonationStatus()
        setImpersonation(st)
      } catch {}
    })()
  }, [])
  const { theme, toggleTheme } = useTheme()

  return (
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - brand on mobile, spacer on desktop */}
          <div className="flex items-center lg:hidden">
            <CyberLabsLogo size={28} />
          </div>
          <div className="hidden lg:block lg:w-56" aria-hidden="true"></div>

          {/* Center - Search */}
          <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search projects, tasks, or people..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Right side - Theme toggle, impersonation badge and user menu */}
          <div className="flex items-center space-x-4">
            {impersonation?.active && impersonation.user && (
              <div className="flex items-center gap-2 rounded-full px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 border border-yellow-300 dark:border-yellow-700">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10z"/>
                </svg>
                <span className="text-xs">Viewing as: {impersonation.user.name}</span>
                <button
                  className="text-xs underline"
                  onClick={async () => { try { await stopImpersonation(); window.location.reload() } catch {} }}
                >Stop</button>
              </div>
            )}
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {/* User info */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.name}
                </p>
                <div className="flex items-center gap-2 justify-end">
                  {/* Show role label for non-admin roles only */}
                  {user?.role && user.role !== 'admin' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {user.role}
                    </p>
                  )}
                  {/* For super admin, show a single badge (no duplicate text) */}
                  {user?.role === 'admin' && (
                    <span className="badge badge-info" title="Super Admin">
                      Super Admin
                    </span>
                  )}
                </div>
              </div>
              
              {/* User avatar */}
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center hover:opacity-90 transition-opacity"
                aria-label="Open profile"
              >
                <span className="text-sm font-medium text-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </button>

              {/* Logout button */}
              <button
                onClick={logout}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
                title="Sign out"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Topbar
