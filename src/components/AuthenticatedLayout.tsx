import React from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import Topbar from './Topbar.tsx'
import Sidebar from './Sidebar.tsx'
import ChatBotWidget from './ChatBotWidget.tsx'

const AuthenticatedLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background app-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-background app-bg">
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <div className="px-4 pt-4">
            <div className="flex justify-end mb-3">
              <Topbar />
            </div>
            <div className="max-w-6xl mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      <ChatBotWidget />
    </div>
  )
}

export default AuthenticatedLayout
