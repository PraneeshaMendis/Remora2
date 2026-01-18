import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import { useTheme } from '../contexts/ThemeContext.tsx'
import { getImpersonationStatus, stopImpersonation } from '../services/adminAPI.ts'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notificationsAPI'
import type { NotificationItem } from '../types'
import { toast } from '../hooks/use-toast'

const Topbar: React.FC = () => {
  const { user, logout } = useAuth()
  const [impersonation, setImpersonation] = useState<{ active: boolean; user?: { id: string; name: string; email: string } } | null>(null)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const lastSeenAtRef = useRef<string | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const panelRef = useRef<HTMLDivElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const st = await getImpersonationStatus()
        setImpersonation(st)
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (!user?.id) return
    let active = true

    const updateLastSeen = (items: NotificationItem[]) => {
      if (!items.length) return
      const latest = items.reduce((max, item) => {
        const t = new Date(item.createdAt).getTime()
        return Number.isNaN(t) ? max : Math.max(max, t)
      }, lastSeenAtRef.current ? new Date(lastSeenAtRef.current).getTime() : 0)
      if (latest > 0) lastSeenAtRef.current = new Date(latest).toISOString()
    }

    const announceNotifications = (items: NotificationItem[]) => {
      if (!items.length) return
      playNotificationSound()
      if (items.length === 1) {
        toast({ title: items[0].title, description: items[0].message })
        return
      }
      toast({ title: 'New notifications', description: `You have ${items.length} new updates.` })
    }

    const mergeNotifications = (items: NotificationItem[], announce: boolean) => {
      if (!items.length) return
      const fresh = items.filter(item => !seenIdsRef.current.has(item.id))
      items.forEach(item => seenIdsRef.current.add(item.id))
      setNotifications(prev => {
        const map = new Map(prev.map(item => [item.id, item]))
        items.forEach(item => map.set(item.id, item))
        return Array.from(map.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 20)
      })
      updateLastSeen(items)
      if (announce && fresh.length) announceNotifications(fresh)
    }

    const loadInitial = async () => {
      try {
        const res = await listNotifications({ limit: 20 })
        if (!active) return
        setUnreadCount(res?.unreadCount || 0)
        const items = Array.isArray(res?.items) ? res.items : []
        mergeNotifications(items, false)
      } catch {}
    }

    const poll = async () => {
      try {
        const since = lastSeenAtRef.current || undefined
        const res = await listNotifications({ since })
        if (!active) return
        setUnreadCount(res?.unreadCount || 0)
        const items = Array.isArray(res?.items) ? res.items : []
        if (items.length) mergeNotifications(items, true)
      } catch {}
    }

    loadInitial()
    const timer = window.setInterval(poll, 15000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [user?.id])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = audioCtxRef.current || new AudioCtx()
      audioCtxRef.current = ctx
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.35)
    } catch {}
  }

  const formatRelativeTime = (iso: string) => {
    const ts = new Date(iso).getTime()
    if (Number.isNaN(ts)) return ''
    const diff = Date.now() - ts
    if (diff < 60_000) return 'Just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return new Date(iso).toLocaleDateString()
  }

  const handleNotificationClick = async (item: NotificationItem) => {
    try {
      if (!item.read) {
        await markNotificationRead(item.id)
        setNotifications(prev => prev.map(n => (n.id === item.id ? { ...n, read: true } : n)))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch {}
    if (item.targetUrl) {
      navigate(item.targetUrl)
    }
    setNotificationsOpen(false)
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {}
  }

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
      <div ref={panelRef} className="relative">
        <button
          type="button"
          onClick={() => setNotificationsOpen(open => !open)}
          className="relative p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
          title="Notifications"
          aria-label="Notifications"
        >
          <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {notificationsOpen && (
          <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/95 dark:bg-black shadow-xl backdrop-blur z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/70 dark:border-white/10">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary-600 dark:text-primary-300 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[380px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No notifications yet.</div>
              ) : (
                notifications.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNotificationClick(item)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                      item.read ? 'opacity-80' : 'bg-blue-50/40 dark:bg-primary-900/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 h-2 w-2 rounded-full ${item.read ? 'bg-gray-400/50' : 'bg-primary-500'}`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">{item.message}</div>
                        <div className="text-[11px] text-gray-400 mt-1">{formatRelativeTime(item.createdAt)}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

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
