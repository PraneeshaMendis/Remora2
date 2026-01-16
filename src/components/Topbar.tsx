import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import { useTheme } from '../contexts/ThemeContext.tsx'
import { getImpersonationStatus, stopImpersonation } from '../services/adminAPI.ts'

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
    <div className="flex items-center justify-end gap-4">
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

      <div className="flex items-center gap-3">
        {user?.role === 'admin' && (
          <span className="badge badge-info" title="Super Admin">
            Super Admin
          </span>
        )}
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
  )
}

export default Topbar
