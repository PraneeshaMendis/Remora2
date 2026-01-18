import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { apiGet, apiJson } from '../services/api'

interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'director' | 'manager' | 'member' | 'consultant' | 'lead' | 'client'
  department: string
  isActive: boolean
  avatar?: string
  lastActive: string
  isSuperAdmin?: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const mapMeToUser = (me: any): User => {
  const role = String(me.role || '').toLowerCase()
  const mappedRole: User['role'] =
    role === 'admin' ? 'admin' :
    role === 'director' ? 'director' :
    role === 'manager' ? 'manager' :
    role === 'consultant' ? 'consultant' :
    role === 'lead' ? 'lead' :
    role === 'client' ? 'client' : 'member'
  const name = String(me.name || '')
  const initials = (name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  return {
    id: String(me.id),
    email: String(me.email || ''),
    name,
    role: mappedRole,
    department: String(me.department || ''),
    isActive: true,
    avatar: initials,
    lastActive: new Date().toISOString(),
    isSuperAdmin: !!me.isSuperAdmin,
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshInFlight = useRef(false)
  const lastRefreshAt = useRef(0)

  const persistUser = useCallback((hydrated: User) => {
    setUser(hydrated)
    localStorage.setItem('user', JSON.stringify(hydrated))
    // Ensure x-user-id is available for dev header flows
    localStorage.setItem('userId', hydrated.id)
  }, [])

  const refreshSession = useCallback(async (force = false) => {
    const token = localStorage.getItem('authToken')
    const savedUser = localStorage.getItem('user')
    if (!token && !savedUser) return false
    if (refreshInFlight.current) return false
    const now = Date.now()
    if (!force && now - lastRefreshAt.current < 20000) return false
    lastRefreshAt.current = now
    refreshInFlight.current = true
    const hadToken = !!token

    try {
      let me: any = null
      if (token) {
        try {
          me = await apiGet('/api/users/me')
        } catch {
          me = null
        }
      }

      if (!me) {
        try {
          const refreshed = await apiJson('/api/auth/refresh', 'POST')
          if (refreshed?.token) {
            localStorage.setItem('authToken', refreshed.token)
          }
        } catch {
          // Ignore and fall through to a final /me attempt
        }
        try {
          me = await apiGet('/api/users/me')
        } catch {
          me = null
        }
      }

      if (me) {
        persistUser(mapMeToUser(me))
        return true
      }

      if (hadToken) {
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        localStorage.removeItem('userId')
        setUser(null)
      }
      return false
    } finally {
      refreshInFlight.current = false
    }
  }, [persistUser])

  useEffect(() => {
    // Hydrate from real session first (JWT), fallback to saved mock user
    const init = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (token) {
          const ok = await refreshSession(true)
          if (ok) return
        }
        const savedUser = localStorage.getItem('user')
        if (savedUser) {
          setUser(JSON.parse(savedUser))
        }
      } catch (err) {
        // If token was present but invalid/expired, clear it and force login
        const hadToken = !!localStorage.getItem('authToken')
        if (hadToken) {
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
          localStorage.removeItem('userId')
          setUser(null)
        } else {
          const savedUser = localStorage.getItem('user')
          if (savedUser) setUser(JSON.parse(savedUser))
        }
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [refreshSession])

  useEffect(() => {
    if (isLoading) return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshSession()
      }
    }
    const handleFocus = () => {
      refreshSession()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isLoading, refreshSession])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await apiJson('/api/auth/login', 'POST', { email, password })
      if (res?.token) {
        localStorage.setItem('authToken', res.token)
      }
      // hydrate from /me
      const me = await apiGet('/api/users/me')
      const hydrated = mapMeToUser(me)
      persistUser(hydrated)
    } catch (error) {
      throw new Error('Invalid credentials')
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('authToken')
    localStorage.removeItem('userId')
  }

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  )
}
