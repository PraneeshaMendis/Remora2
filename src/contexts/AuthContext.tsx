import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  name: string
  role: 'director' | 'manager' | 'member'
  department: string
  isActive: boolean
  avatar?: string
  lastActive: string
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
    // Check for existing session
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock user data based on email
      let mockUser: User
      
      if (email.includes('director')) {
        mockUser = {
          id: 'director-1',
          email,
          name: 'Director',
          role: 'director',
          department: 'Executive',
          isActive: true,
          avatar: 'D',
          lastActive: new Date().toISOString()
        }
      } else if (email.includes('manager')) {
        mockUser = {
          id: 'manager-1',
          email,
          name: 'Manager',
          role: 'manager',
          department: 'Engineering',
          isActive: true,
          avatar: 'M',
          lastActive: new Date().toISOString()
        }
      } else {
        mockUser = {
          id: 'member-1',
          email,
          name: email.split('@')[0],
          role: 'member',
          department: 'Engineering',
          isActive: true,
          avatar: email.split('@')[0].charAt(0).toUpperCase(),
          lastActive: new Date().toISOString()
        }
      }
      
      // Validate password (basic check)
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }
      
      setUser(mockUser)
      localStorage.setItem('user', JSON.stringify(mockUser))
    } catch (error) {
      throw new Error('Invalid credentials')
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
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
