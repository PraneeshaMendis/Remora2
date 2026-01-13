import React, { createContext, useContext, useState, useEffect } from 'react'
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

  useEffect(() => {
    // Hydrate from real session first (JWT), fallback to saved mock user
    const init = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (token) {
          const me = await apiGet('/api/users/me')
          if (me) {
            const role = String(me.role || '').toLowerCase()
            const mappedRole: User['role'] =
              role === 'admin' ? 'admin' :
              role === 'director' ? 'director' :
              role === 'manager' ? 'manager' :
              role === 'consultant' ? 'consultant' :
              role === 'lead' ? 'lead' :
              role === 'client' ? 'client' : 'member'
            const hydrated: User = {
              id: String(me.id),
              email: String(me.email || ''),
              name: String(me.name || ''),
              role: mappedRole,
              department: String(me.department || ''),
              isActive: true,
              avatar: String(me.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase(),
              lastActive: new Date().toISOString(),
              isSuperAdmin: !!me.isSuperAdmin,
            }
            setUser(hydrated)
            localStorage.setItem('user', JSON.stringify(hydrated))
            // Ensure x-user-id is available for dev header flows
            localStorage.setItem('userId', hydrated.id)
            return
          }
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
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await apiJson('/api/auth/login', 'POST', { email, password })
      if (res?.token) {
        localStorage.setItem('authToken', res.token)
      }
      // hydrate from /me
      const me = await apiGet('/api/users/me')
      const role = String(me.role || '').toLowerCase()
      const mappedRole: User['role'] =
        role === 'admin' ? 'admin' :
        role === 'director' ? 'director' :
        role === 'manager' ? 'manager' :
        role === 'consultant' ? 'consultant' :
        role === 'lead' ? 'lead' :
        role === 'client' ? 'client' : 'member'
      const hydrated: User = {
        id: String(me.id),
        email: String(me.email || ''),
        name: String(me.name || ''),
        role: mappedRole,
        department: String(me.department || ''),
        isActive: true,
        avatar: String(me.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase(),
        lastActive: new Date().toISOString(),
        isSuperAdmin: !!me.isSuperAdmin,
      }
      setUser(hydrated)
      localStorage.setItem('user', JSON.stringify(hydrated))
      // Also set userId for APIs that use x-user-id in dev
      localStorage.setItem('userId', hydrated.id)
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
