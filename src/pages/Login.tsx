import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError('Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* REMORA Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-3">
              {/* Logo Icon */}
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-700 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">R</span>
                </div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-700 opacity-20 blur-sm"></div>
              </div>
              
              {/* Logo Text */}
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">REMORA</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">BY PRANEESHA MENDIS</span>
              </div>
            </div>
          </div>
          
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Sign in
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your credentials to access your dashboard
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field mt-1"
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field mt-1"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex justify-center py-3"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              onClick={() => navigate('/forgot-password')}
            >
              Forgot password?
            </button>
            <button
              type="button"
              className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              onClick={() => navigate('/signup')}
            >
              Create an account
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login
