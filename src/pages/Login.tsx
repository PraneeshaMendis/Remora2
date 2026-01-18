import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import LoginScene from '../components/LoginScene'

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
    <div className="relative min-h-screen overflow-hidden bg-black">
      <LoginScene />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90" />
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center">
              <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl border border-white/10 bg-black shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
                <img
                  src="/cyber-labs-icon.svg"
                  alt="Cyber Labs"
                  className="w-10 h-10"
                />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Cyber Labs</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Sign in</h2>
              <p className="mt-2 text-sm text-gray-400">Secure access to your workspace</p>
            </div>
          </div>

          <div className="relative rounded-3xl bg-gradient-to-br from-white/10 via-white/5 to-transparent p-[1px]">
            <div className="rounded-3xl border border-white/10 bg-[#0b0b0b] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.65)]">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300">
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
                      className="input-field mt-1 bg-black/60 border-white/10 text-white placeholder-gray-500 focus:ring-blue-500/40"
                      placeholder="name@cyberlabs.com"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300">
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
                      className="input-field mt-1 bg-black/60 border-white/10 text-white placeholder-gray-500 focus:ring-blue-500/40"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-3 rounded-2xl bg-white text-black font-semibold shadow-[0_16px_30px_rgba(0,0,0,0.35)] transition hover:bg-white/90 disabled:opacity-60"
                  >
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-400">
                  <button
                    type="button"
                    className="hover:text-white transition-colors"
                    onClick={() => navigate('/forgot-password')}
                  >
                    Forgot password?
                  </button>
                  <button
                    type="button"
                    className="hover:text-white transition-colors"
                    onClick={() => navigate('/signup')}
                  >
                    Create an account
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
