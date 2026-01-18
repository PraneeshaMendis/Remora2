import React, { useEffect, useMemo, useState } from 'react'
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  LayoutGrid,
  Globe2,
  SlidersHorizontal,
  RefreshCw,
  Link2,
  Mail,
  Upload,
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Trash2
} from 'lucide-react'
import EventModal from '../components/modals/EventModal'
import CountrySelect from '../components/CountrySelect'
import { useAuth } from '../contexts/AuthContext'
import { listReviewers } from '../services/usersAPI'
import { createCalendarEvent, deleteCalendarEvent, listCalendarEvents, updateCalendarEvent } from '../services/calendarEventsAPI'

// Types
interface CalendarEvent {
  id: string
  title: string
  description: string
  type: 'task' | 'meeting' | 'reminder' | 'personal' | 'outsourced'
  startTime: string
  endTime: string
  date: string
  priority: 'high' | 'medium' | 'low'
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  assignee?: string
  assigneeId?: string
  project?: string
  platform?: 'teams' | 'zoom' | 'google-meet' | 'physical'
  meetingLink?: string
  attendees?: string[]
  isRecurring?: boolean
  recurrenceType?: 'daily' | 'weekly' | 'monthly'
  createdBy: string
  createdAt: string
  createdById?: string
  userId?: string
  isAssigned?: boolean
  // New: origin info (which calendar/source)
  sourceName?: string
  sourceType?: CalendarSourceType | 'local' | 'assigned'
  sourceColor?: string
}

interface DayEvents {
  [date: string]: CalendarEvent[]
}

// External calendar source
type CalendarSourceType = 'google' | 'outlook' | 'ics-upload' | 'ics-url' | 'holidays'
interface CalendarSource {
  id: string
  type: CalendarSourceType
  name: string
  color: string
  enabled: boolean
  // For ICS URL sources
  url?: string
  // Parsed events from this source
  events: CalendarEvent[]
  lastSyncAt?: string
}

// Helper function to format date as YYYY-MM-DD without timezone issues
const formatDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const CalendarDashboard: React.FC = () => {
  const { user } = useAuth()
  const isExecutive = String(user?.department || '').trim().toLowerCase() === 'executive department' || String(user?.role || '').trim().toLowerCase() === 'admin'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarScope, setCalendarScope] = useState<'mine' | 'team'>('mine')
  const [employees, setEmployees] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  // Local events represent events you create in-app
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>([])
  // External connected sources (google/outlook/ics). Now loaded per-user from backend.
  const [sources, setSources] = useState<CalendarSource[]>([])
  // Combined events from local + enabled sources
  const events: CalendarEvent[] = useMemo(() => {
    const ext = sources
      .filter(s => s.enabled && (calendarScope === 'mine' || s.type === 'holidays'))
      .flatMap(s => s.events || [])
    const localDecorated = localEvents.map(ev => ({
      ...ev,
      sourceName: ev.sourceName || 'My Calendar',
      sourceType: ev.sourceType || 'local',
      sourceColor: ev.sourceColor || '#6b7280', // gray-500
    }))
    return [...localDecorated, ...ext]
  }, [localEvents, sources, calendarScope])
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [isDayEventsModalOpen, setIsDayEventsModalOpen] = useState(false)
  const [selectedDayDate, setSelectedDayDate] = useState<string>('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [newIcsUrl, setNewIcsUrl] = useState('')
  const [newIcsName, setNewIcsName] = useState('')
  const [showAddIcs, setShowAddIcs] = useState(false)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const syncedOnce = React.useRef<Set<string>>(new Set())
  // Holidays toggle + country code (persisted per user)
  const [showHolidays, setShowHolidays] = useState<boolean>(() => {
    try {
      const uid = user?.id || 'guest'
      const v = localStorage.getItem(`calendar.showHolidays.${uid}`)
      return v ? v === 'true' : true
    } catch { return true }
  })
  const [holidayCountry, setHolidayCountry] = useState<string>(() => {
    try {
      const uid = user?.id || 'guest'
      return localStorage.getItem(`calendar.holidayCountry.${uid}`) || 'LK'
    } catch { return 'LK' }
  })

  useEffect(() => {
    if (!isExecutive) {
      setCalendarScope('mine')
    }
  }, [isExecutive])

  // Extract a clean http(s) URL from user input (handles pasted error blobs)
  const sanitizeUrlInput = (s: string): string | null => {
    try {
      const match = s.match(/https?:\/\/\S+/)
      const candidate = match ? match[0] : s.trim()
      const u = new URL(candidate)
      if (!/^https?:$/i.test(u.protocol)) return null
      return u.toString()
    } catch {
      return null
    }
  }

  // Include auth headers (x-user-id / bearer) for backend per-user routes
  const authHeaders = (): Record<string, string> => {
    try {
      let uid = localStorage.getItem('userId')
      if (!uid) {
        const raw = localStorage.getItem('user')
        if (raw) {
          try { uid = String(JSON.parse(raw)?.id || '') } catch {}
        }
      }
      const token = localStorage.getItem('authToken')
      return {
        ...(uid ? { 'x-user-id': uid } : {}),
        ...(token ? { 'authorization': `Bearer ${token}` } : {}),
      }
    } catch { return {} }
  }

  // Remove URLs from descriptions to avoid duplicating Join links in UI
  const stripUrls = (s: string): string => {
    try {
      const removed = String(s || '').replace(/https?:\/\/\S+/g, '')
      // Tidy whitespace and excessive blank lines
      return removed
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    } catch {
      return String(s || '')
    }
  }

  // Load in-app events (and employees for executive view)
  useEffect(() => {
    let active = true
    const load = async () => {
      if (!user?.id) return
      if (isExecutive) {
        try {
          const list = await listReviewers()
          const people = Array.isArray(list) ? list : (list?.items || [])
          const mapped = people.map((u: any) => ({ id: String(u.id), name: String(u.name || u.email || 'User'), email: String(u.email || '') }))
          if (active) {
            setEmployees(mapped)
            if (!selectedUserId && mapped.length > 0) {
              setSelectedUserId(mapped[0].id)
            }
          }
        } catch {}
      }

      const targetId = isExecutive && calendarScope === 'team' ? selectedUserId : undefined
      if (isExecutive && calendarScope === 'team' && !targetId) return
      try {
        const events = await listCalendarEvents(targetId || undefined)
        if (active) {
          setLocalEvents(Array.isArray(events) ? events : [])
        }
      } catch {
        if (active) setLocalEvents([])
      }
    }
    load()
    return () => { active = false }
  }, [user?.id, isExecutive, calendarScope, selectedUserId])
  // Persisted by backend; no localStorage write
  // Persist holidays prefs per user
  useEffect(() => {
    try { const uid = user?.id || 'guest'; localStorage.setItem(`calendar.showHolidays.${uid}`, String(showHolidays)) } catch {}
  }, [showHolidays, user?.id])
  useEffect(() => {
    try { const uid = user?.id || 'guest'; localStorage.setItem(`calendar.holidayCountry.${uid}`, holidayCountry) } catch {}
  }, [holidayCountry, user?.id])

  useEffect(() => {
    setSelectedDate('')
    setSelectedDayEvents([])
  }, [calendarScope, selectedUserId])

  // Detect linked accounts and per-user ICS sources from backend
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        // Reset sources when user changes to avoid leaking prior user's state
        setSources([])
        syncedOnce.current = new Set()
        const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000'
        const res = await fetch(`${String(base).replace(/\/+$/, '')}/api/calendar/accounts`, { headers: { 'Content-Type': 'application/json', ...authHeaders() }, cache: 'no-store' })
        if (!res.ok) return
        const accounts = await res.json()
        if (!Array.isArray(accounts)) return
        // Map accounts to placeholder sources if not present
        setSources(prev => {
          const next = [...prev]
          const has = (type: CalendarSourceType) => next.some(s => s.type === type)
          for (const a of accounts) {
            const type: CalendarSourceType = String(a.provider).toLowerCase() === 'microsoft' ? 'outlook' : 'google'
            if (!has(type)) {
              next.push({
                id: `${type}-${Date.now()}`,
                type,
                name: type === 'google' ? (a.email ? `Google (${a.email})` : 'Google Calendar') : (a.email ? `Outlook (${a.email})` : 'Outlook Calendar'),
                color: type === 'google' ? '#3b82f6' : '#2563eb',
                enabled: true,
                events: [],
                lastSyncAt: a.updatedAt,
              })
            }
          }
          return next
        })
        // Load per-user ICS URL sources from backend
        const res2 = await fetch(`${String(base).replace(/\/+$/, '')}/api/calendar/sources`, { headers: { ...authHeaders() }, cache: 'no-store' })
        if (res2.ok) {
          const list = await res2.json()
          if (Array.isArray(list)) {
            setSources(prev => {
              const next = [...prev]
              for (const s of list) {
                if (!next.find(n => n.id === s.id)) {
                  next.push({ id: s.id, type: 'ics-url', name: s.name, color: s.color || '#10b981', enabled: !!s.enabled, url: s.url, events: [], lastSyncAt: s.updatedAt })
                }
              }
              // Ensure holidays source is present when toggle is on
              if (showHolidays && !next.find(n => n.type === 'holidays')) {
                next.push({ id: 'holidays', type: 'holidays', name: 'Public Holidays', color: '#ef4444', enabled: true, events: [] })
              }
              return next
            })
          }
        }
        // If there were no sources at all (no accounts/ICS), still inject holidays when enabled
        setSources(prev => {
          if (!showHolidays) return prev
          const exists = prev.some(s => s.type === 'holidays')
          return exists ? prev : [...prev, { id: 'holidays', type: 'holidays', name: 'Public Holidays', color: '#ef4444', enabled: true, events: [] }]
        })
      } catch {}
    }
    loadAccounts()
  }, [user?.id, showHolidays])

  // Helper: fetch events for a single source (without UI spinners)
  const fetchEventsForSource = async (src: CalendarSource) => {
    try {
      const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000'
      if (src.type === 'ics-url') {
        const res = await fetch(`${String(base).replace(/\/+$/, '')}/api/calendar/sources/${src.id}/events`, { headers: { ...authHeaders() }, cache: 'no-store' })
        if (!res.ok) return null
        const events = await res.json()
        return (events || []).map((ev: any) => ({ ...ev, sourceName: src.name, sourceType: src.type, sourceColor: src.color }))
      }
      if (src.type === 'google') {
        const res = await fetch(`${String(base).replace(/\/+$/, '')}/api/calendar/google/events`, { headers: { ...authHeaders(), 'Cache-Control': 'no-cache' } })
        if (!res.ok) return null
        const list = await res.json()
        const detectPlatform = (url: string): CalendarEvent['platform'] | undefined => {
          const u = (url || '').toLowerCase()
          if (u.includes('zoom.us')) return 'zoom'
          if (u.includes('meet.google.com')) return 'google-meet'
          if (u.includes('teams.microsoft')) return 'teams'
          return undefined
        }
        const extractLink = (ev: any): string | undefined => {
          const hangout = ev.hangoutLink
          const conf = ev.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri
          const loc = typeof ev.location === 'string' && /https?:\/\//i.test(ev.location) ? ev.location : undefined
          const descLink = typeof ev.description === 'string' ? (ev.description.match(/https?:\/\/\S+/)?.[0]) : undefined
          return conf || hangout || loc || descLink
        }
        return Array.isArray(list) ? list.map((ev: any) => {
          const startStr = String(ev.start?.dateTime || ev.start?.date || '')
          const endStr = String(ev.end?.dateTime || ev.end?.date || '')
          const date = startStr.slice(0, 10)
          const startTime = startStr.length > 10 ? startStr.slice(11, 16) : '00:00'
          const endTime = endStr.length > 10 ? endStr.slice(11, 16) : startTime
          const link = extractLink(ev)
          const platform = link ? detectPlatform(link) : undefined
          const attendees: string[] = Array.isArray(ev.attendees) ? ev.attendees.map((a: any) => a.displayName || a.email || '').filter(Boolean) : []
          const isAllDay = !!ev.start?.date && !ev.start?.dateTime
          const type: CalendarEvent['type'] = link ? 'meeting' : (isAllDay ? 'reminder' : 'task')
          return ({ id: String(ev.id || `g-${Math.random()}`), title: String(ev.summary || ev.title || '(No title)'), description: stripUrls(String(ev.description || '')), type, startTime, endTime, date, priority: 'medium', status: 'scheduled', platform, meetingLink: link, attendees, createdBy: String(ev.organizer?.displayName || ev.organizer?.email || 'Google'), createdAt: new Date().toISOString(), sourceName: src.name, sourceType: src.type, sourceColor: src.color })
        }) : []
      }
      if (src.type === 'outlook') {
        const res = await fetch(`${String(base).replace(/\/+$/, '')}/api/calendar/microsoft/events`, { headers: { ...authHeaders(), 'Cache-Control': 'no-cache' } })
        if (!res.ok) return null
        const list = await res.json()
        const detectPlatformMs = (ev: any): CalendarEvent['platform'] | undefined => {
          const prov = String(ev.onlineMeetingProvider || '').toLowerCase()
          if (prov.includes('teams')) return 'teams'
          const link = String(ev.onlineMeeting?.joinUrl || ev.onlineMeetingUrl || '').toLowerCase()
          if (link.includes('teams.microsoft')) return 'teams'
          if (link.includes('zoom.us')) return 'zoom'
          if (link.includes('meet.google.com')) return 'google-meet'
          return undefined
        }
        const extractLinkMs = (ev: any): string | undefined => ev.onlineMeeting?.joinUrl || ev.onlineMeetingUrl || undefined
        return Array.isArray(list) ? list.map((ev: any) => {
          const startStr = String(ev.start?.dateTime || '')
          const endStr = String(ev.end?.dateTime || '')
          const date = startStr.slice(0, 10)
          const startTime = startStr.length > 10 ? startStr.slice(11, 16) : '00:00'
          const endTime = endStr.length > 10 ? endStr.slice(11, 16) : startTime
          const link = extractLinkMs(ev)
          const platform = detectPlatformMs(ev)
          const attendees: string[] = Array.isArray(ev.attendees) ? ev.attendees.map((a: any) => a.emailAddress?.name || a.emailAddress?.address || '').filter(Boolean) : []
          const type: CalendarEvent['type'] = link ? 'meeting' : 'task'
          return ({ id: String(ev.id || `o-${Math.random()}`), title: String(ev.subject || ev.title || '(No title)'), description: stripUrls(String(ev.bodyPreview || '')), type, startTime, endTime, date, priority: 'medium', status: 'scheduled', platform, meetingLink: link, attendees, createdBy: String(ev.organizer?.emailAddress?.name || 'Outlook'), createdAt: new Date().toISOString(), sourceName: src.name, sourceType: src.type, sourceColor: src.color })
        }) : []
      }
      if (src.type === 'holidays') {
        const year = currentDate.getFullYear()
        const endpoint = holidayCountry.toUpperCase() === 'LK'
          ? `/api/calendar/public/lk-holidays?year=${year}`
          : `/api/calendar/holidays?country=${encodeURIComponent(holidayCountry)}&year=${year}`
        const res = await fetch(`${String(base).replace(/\/+$/, '')}${endpoint}`, { headers: { ...authHeaders(), 'Cache-Control': 'no-cache' } })
        if (!res.ok) return null
        const list = await res.json()
        return Array.isArray(list) ? list.map((h: any) => ({
          id: String(h.id || `holiday-${Math.random()}`),
          title: String(h.title || h.name || 'Public Holiday'),
          description: String(h.description || 'Public holiday'),
          type: 'reminder' as const,
          startTime: String(h.startTime || '00:00'),
          endTime: String(h.endTime || '23:59'),
          date: String(h.date || '').slice(0,10),
          priority: 'low' as const,
          status: 'scheduled' as const,
          createdBy: 'Public Holidays',
          createdAt: new Date().toISOString(),
          sourceName: src.name,
          sourceType: src.type,
          sourceColor: src.color,
        })) : []
      }
      return null
    } catch {
      return null
    }
  }

  // Ensure a Holidays source exists when enabled; remove when disabled
  useEffect(() => {
    if (showHolidays) {
      setSources(prev => prev.some(s => s.type === 'holidays')
        ? prev
        : [...prev, { id: 'holidays', type: 'holidays', name: 'Public Holidays', color: '#ef4444', enabled: true, events: [] }])
    } else {
      setSources(prev => prev.filter(s => s.type !== 'holidays'))
    }
  }, [showHolidays])

  // Re-fetch holidays when toggled on and month/country changes
  useEffect(() => {
    if (!showHolidays) return
    const src = sources.find(s => s.type === 'holidays' && s.enabled)
    if (!src) return
    ;(async () => {
      const evs = await fetchEventsForSource(src)
      if (evs) {
        setSources(prev => prev.map(s => s.id === src.id ? { ...s, events: evs, lastSyncAt: new Date().toISOString() } : s))
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHolidays, holidayCountry, currentDate])

  // Auto-sync new/unsynced sources on load or whenever sources list changes
  useEffect(() => {
    if (!sources || sources.length === 0) return
    const pending = sources.filter(s => s.enabled && (!s.events || s.events.length === 0) && !syncedOnce.current.has(s.id))
    if (pending.length === 0) return
    ;(async () => {
      for (const src of pending) {
        const evs = await fetchEventsForSource(src)
        if (evs) {
          setSources(prev => prev.map(s => s.id === src.id ? { ...s, events: evs, lastSyncAt: new Date().toISOString() } : s))
        }
        syncedOnce.current.add(src.id)
      }
    })()
  }, [sources])

  // Periodic auto-refresh (every 10 minutes)
  useEffect(() => {
    if (!sources || sources.length === 0) return
    const interval = setInterval(async () => {
      const enabled = sources.filter(s => s.enabled)
      for (const src of enabled) {
        const evs = await fetchEventsForSource(src)
        if (evs) {
          setSources(prev => prev.map(s => s.id === src.id ? { ...s, events: evs, lastSyncAt: new Date().toISOString() } : s))
        }
      }
    }, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [sources])

  // Get today's date in YYYY-MM-DD format
  const today = formatDateString(new Date())
  
  // Get today's events
  const todayEvents = events.filter(event => event.date === today)

  // Group events by date
  const eventsByDate: DayEvents = events.reduce((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = []
    }
    acc[event.date].push(event)
    return acc
  }, {} as DayEvents)

  useEffect(() => {
    if (selectedDate) {
      setSelectedDayEvents(eventsByDate[selectedDate] || [])
    }
  }, [eventsByDate, selectedDate])

  // Calendar navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  // Get calendar days for current month
  const getCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    const mondayOffset = (firstDay.getDay() + 6) % 7
    startDate.setDate(startDate.getDate() - mondayOffset)
    
    const days = []
    const current = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      const day = new Date(current)
      // Only include days that are in the current month
      if (day.getMonth() === month) {
        days.push(day)
      } else {
        // Add null for days not in current month
        days.push(null)
      }
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  // Handle date click
  const handleDateClick = (date: Date) => {
    const dateString = formatDateString(date)
    const dayEvents = eventsByDate[dateString] || []
    
    setSelectedDate(dateString)
    setSelectedDayEvents(dayEvents)
    
    // If date has events, show day events modal, otherwise open event creation modal
    if (dayEvents.length > 0) {
      setSelectedDayDate(dateString)
      setIsDayEventsModalOpen(true)
    } else {
      setEditingEvent(null)
      setIsEventModalOpen(true)
    }
  }

  // Handle event creation
  const handleCreateEvent = (date: string) => {
    if (isExecutive && calendarScope === 'team' && !selectedUserId) {
      alert('Select a team member to assign an event.')
      return
    }
    setSelectedDate(date)
    setEditingEvent(null)
    setIsEventModalOpen(true)
  }

  // Handle event edit
  const handleEditEvent = (event: CalendarEvent) => {
    if (event.sourceType && event.sourceType !== 'local' && event.sourceType !== 'assigned') return
    setEditingEvent(event)
    setIsEventModalOpen(true)
  }

  // Handle event save
  const handleSaveEvent = async (eventData: CalendarEvent) => {
    try {
      const targetUserId = isExecutive && calendarScope === 'team'
        ? (eventData.assigneeId || selectedUserId)
        : undefined
      const payload = {
        userId: targetUserId || undefined,
        title: eventData.title,
        description: eventData.description,
        type: eventData.type,
        date: eventData.date,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        priority: eventData.priority,
        status: eventData.status,
        project: eventData.project,
        meetingLink: eventData.meetingLink,
        platform: eventData.platform,
        attendees: eventData.attendees,
        isRecurring: eventData.isRecurring,
        recurrenceType: eventData.recurrenceType,
      }
      if (editingEvent) {
        const updated = await updateCalendarEvent(eventData.id, payload)
        const mapped = updated as CalendarEvent
        setLocalEvents(prev => prev.map(event => event.id === mapped.id ? mapped : event))
        setSelectedDayEvents(prev => prev.map(event => event.id === mapped.id ? mapped : event))
      } else {
        const created = await createCalendarEvent(payload)
        const mapped = created as CalendarEvent
        setLocalEvents(prev => [...prev, mapped])
        if (mapped.date === selectedDate) {
          setSelectedDayEvents(prev => [...prev, mapped])
        }
      }
    } catch (error) {
      console.error('Failed to save event:', error)
      alert('Failed to save event')
    }
  }

  // Handle event delete
  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteCalendarEvent(eventId)
      setLocalEvents(prev => prev.filter(event => event.id !== eventId))
      setSelectedDayEvents(prev => prev.filter(event => event.id !== eventId))
    } catch (error) {
      console.error('Failed to delete event:', error)
      alert('Failed to delete event')
    }
  }

  // Get event type color
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'task': return 'bg-emerald-500 text-white border-emerald-400'
      case 'meeting': return 'bg-sky-500 text-white border-sky-400'
      case 'reminder': return 'bg-fuchsia-500 text-white border-fuchsia-400'
      case 'personal': return 'bg-amber-400 text-amber-950 border-amber-300'
      case 'outsourced': return 'bg-orange-500 text-white border-orange-400'
      default: return 'bg-slate-600 text-white border-slate-500'
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-rose-500 text-white border-rose-400'
      case 'medium': return 'bg-amber-400 text-amber-950 border-amber-300'
      case 'low': return 'bg-emerald-500 text-white border-emerald-400'
      default: return 'bg-slate-600 text-white border-slate-500'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'in-progress': return <Clock className="h-4 w-4 text-blue-600" />
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-600" />
      default: return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getAssignedClass = (event: CalendarEvent) => {
    return event.isAssigned
      ? 'ring-1 ring-blue-500/40 bg-blue-50/40 dark:bg-blue-900/15'
      : ''
  }

  const getSourceIcon = (type: CalendarSourceType) => {
    switch (type) {
      case 'google':
        return Mail
      case 'outlook':
        return Mail
      case 'ics-url':
        return Link2
      case 'ics-upload':
        return Upload
      case 'holidays':
        return Globe2
      default:
        return Calendar
    }
  }

  // Filter events
  const filteredTodayEvents = filterType === 'all' 
    ? todayEvents 
    : todayEvents.filter(event => event.type === filterType)

  const filteredSelectedDayEvents = filterType === 'all' 
    ? selectedDayEvents 
    : selectedDayEvents.filter(event => event.type === filterType)

  const canAddEvent = !(isExecutive && calendarScope === 'team' && !selectedUserId)
  const addEventLabel = isExecutive && calendarScope === 'team' ? 'Assign Event' : 'Add Event'

  // --- Calendar sync helpers ---
  const parseICalDate = (val: string): { date: string; time: string } => {
    // Handles formats like 20250120, 20250120T130000Z, 20250120T130000
    const m = String(val).trim()
    const datePart = m.slice(0, 8)
    const year = Number(datePart.slice(0, 4))
    const month = Number(datePart.slice(4, 6))
    const day = Number(datePart.slice(6, 8))
    let hours = 0, minutes = 0
    if (m.length >= 15 && m[8] === 'T') {
      hours = Number(m.slice(9, 11))
      minutes = Number(m.slice(11, 13))
    }
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    return { date, time }
  }

  const parseICS = (text: string, sourceName: string): CalendarEvent[] => {
    // Unfold lines (join lines that start with space)
    const rawLines = text.split(/\r?\n/)
    const lines: string[] = []
    for (let i = 0; i < rawLines.length; i++) {
      const l = rawLines[i]
      if (l.startsWith(' ') && lines.length > 0) {
        lines[lines.length - 1] += l.slice(1)
      } else {
        lines.push(l)
      }
    }
    const events: CalendarEvent[] = []
    let cursor: Record<string, string> | null = null
    for (const l of lines) {
      if (l.startsWith('BEGIN:VEVENT')) { cursor = {} }
      else if (l.startsWith('END:VEVENT')) {
        if (cursor) {
          const uid = cursor['UID'] || Math.random().toString(36).slice(2)
          const summary = cursor['SUMMARY'] || '(No title)'
          const descRaw = (cursor['DESCRIPTION'] || '').replace(/\\n/g, '\n')
          const dtstart = cursor['DTSTART'] || cursor['DTSTART;VALUE=DATE'] || ''
          const dtend = cursor['DTEND'] || cursor['DTEND;VALUE=DATE'] || ''
          const st = dtstart ? parseICalDate(dtstart) : { date: formatDateString(new Date()), time: '00:00' }
          const et = dtend ? parseICalDate(dtend) : st
          const location = cursor['LOCATION'] || ''
          const urlProp = cursor['URL'] || ''
          // Collect URLs from URL/DESCRIPTION/LOCATION and prefer meeting providers
          const all = `${urlProp}\n${descRaw}\n${location}`
          const urls = (all.match(/https?:\/\/\S+/g) || []) as string[]
          const pick = (...preds: ((u: string) => boolean)[]) => urls.find(u => preds.some(p => p(u.toLowerCase())))
          const firstUrl = pick(u => u.includes('teams.microsoft'), u => u.includes('zoom.us'), u => u.includes('meet.google.com')) || urls[0]
          const detectPlatform = (u?: string): CalendarEvent['platform'] | undefined => {
            const s = String(u || '').toLowerCase()
            if (s.includes('aka.ms/jointeams')) return 'teams'
            if (s.includes('teams.microsoft')) return 'teams'
            if (s.includes('zoom.us')) return 'zoom'
            if (s.includes('meet.google.com')) return 'google-meet'
            return undefined
          }
          const hasTime = !!(dtstart && !/VALUE=DATE/i.test(dtstart))
          const isAllDay = !hasTime
          const inferredType: CalendarEvent['type'] = firstUrl ? 'meeting' : (isAllDay ? 'reminder' : 'task')
          events.push({
            id: `ics-${uid}`,
            title: summary,
            description: stripUrls(descRaw),
            type: inferredType,
            startTime: st.time || '00:00',
            endTime: et.time || st.time || '00:00',
            date: st.date,
            priority: 'medium',
            status: 'scheduled',
            assignee: '',
            project: sourceName,
            platform: detectPlatform(firstUrl),
            meetingLink: firstUrl,
            attendees: [],
            isRecurring: undefined,
            recurrenceType: undefined,
            createdBy: sourceName,
            createdAt: new Date().toISOString(),
          })
        }
        cursor = null
      } else if (cursor) {
        const idx = l.indexOf(':')
        if (idx > 0) {
          const key = l.slice(0, idx).split(';')[0].toUpperCase()
          const value = l.slice(idx + 1)
          cursor[key] = value
        }
      }
    }
    return events
  }

  const addIcsUrlSource = async () => {
    if (!newIcsUrl.trim() || !newIcsName.trim()) return
    setIsSyncing(true)
    setErrorBanner(null)
    try {
      const cleaned = sanitizeUrlInput(newIcsUrl)
      if (!cleaned) {
        setErrorBanner('Please paste a valid ICS link (must start with http/https).')
        setIsSyncing(false)
        return
      }
      const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000'
      // Persist source for current user (URL never stored on client; sent once to server)
      const create = await fetch(`${String(base).replace(/\/+$/, '')}/api/calendar/sources`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ name: newIcsName, url: cleaned, color: '#10b981' }) })
      if (!create.ok) throw new Error(await create.text())
      const created = await create.json()
      // After creation, fetch events from server-side endpoint
      const evRes = await fetch(`${String(base).replace(/\/+$/, '')}/api/calendar/sources/${created.id}/events`, { headers: { ...authHeaders() }, cache: 'no-store' })
      const events = evRes.ok ? await evRes.json() : []
      const src: CalendarSource = { id: created.id, type: 'ics-url', name: created.name, color: created.color || '#10b981', enabled: !!created.enabled, url: cleaned, events: (events || []).map((e: any) => ({ ...e, sourceName: created.name, sourceType: 'ics-url', sourceColor: created.color || '#10b981' })), lastSyncAt: new Date().toISOString() }
      setSources(prev => [...prev, src])
      setNewIcsUrl('')
      setNewIcsName('')
      setShowAddIcs(false)
    } catch (e: any) {
      setErrorBanner(e?.message || 'Unable to add ICS URL (CORS may block direct fetch). Consider uploading .ics file or enabling a server proxy.')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleIcsUpload = async (file: File) => {
    setIsSyncing(true)
    setErrorBanner(null)
    try {
      const text = await file.text()
      const parsed = parseICS(text, file.name)
      const src: CalendarSource = {
        id: `ics-upload-${Date.now()}`,
        type: 'ics-upload',
        name: file.name.replace(/\.ics$/i, ''),
        color: '#8b5cf6',
        enabled: true,
        events: parsed.map(ev => ({ ...ev, sourceName: file.name.replace(/\.ics$/i, ''), sourceType: 'ics-upload', sourceColor: '#8b5cf6' })),
        lastSyncAt: new Date().toISOString(),
      }
      setSources(prev => [...prev, src])
    } catch (e: any) {
      setErrorBanner(e?.message || 'Failed to parse ICS file')
    } finally {
      setIsSyncing(false)
    }
  }

  const syncSource = async (src: CalendarSource) => {
    setIsSyncing(true)
    setErrorBanner(null)
    try {
      if (src.type === 'ics-url') {
        const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000'
        const res = await fetch(`${String(base).replace(/\/+$/, '')}/api/calendar/sources/${src.id}/events`, { headers: { ...authHeaders() }, cache: 'no-store' })
        if (!res.ok) throw new Error(await res.text())
        const events = await res.json()
        const parsed = (events || []).map((ev: any) => ({ ...ev, sourceName: src.name, sourceType: src.type, sourceColor: src.color }))
        setSources(prev => prev.map(s => s.id === src.id ? { ...s, events: parsed, lastSyncAt: new Date().toISOString() } : s))
      } else if (src.type === 'google') {
        // Expect backend endpoint: GET /api/calendar/google/events
        const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000'
        const res = await fetch(`${String(base).replace(/\/+$/, '')}/api/calendar/google/events`, { headers: { 'Cache-Control': 'no-cache', ...authHeaders() } })
        if (!res.ok) throw new Error('Google calendar sync endpoint not available. See setup notes below.')
        const list = await res.json()
        const detectPlatform = (url: string): CalendarEvent['platform'] | undefined => {
          const u = (url || '').toLowerCase()
          if (u.includes('zoom.us')) return 'zoom'
          if (u.includes('meet.google.com')) return 'google-meet'
          if (u.includes('teams.microsoft')) return 'teams'
          return undefined
        }
        const extractLink = (ev: any): string | undefined => {
          const hangout = ev.hangoutLink
          const conf = ev.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri
          const loc = typeof ev.location === 'string' && /https?:\/\//i.test(ev.location) ? ev.location : undefined
          const descLink = typeof ev.description === 'string' ? (ev.description.match(/https?:\/\/\S+/)?.[0]) : undefined
          return conf || hangout || loc || descLink
        }
        const parsed: CalendarEvent[] = Array.isArray(list) ? list.map((ev: any) => {
          const startStr = String(ev.start?.dateTime || ev.start?.date || '')
          const endStr = String(ev.end?.dateTime || ev.end?.date || '')
          const date = startStr.slice(0, 10)
          const startTime = startStr.length > 10 ? startStr.slice(11, 16) : '00:00'
          const endTime = endStr.length > 10 ? endStr.slice(11, 16) : startTime
          const link = extractLink(ev)
          const platform = link ? detectPlatform(link) : undefined
          const attendees: string[] = Array.isArray(ev.attendees) ? ev.attendees.map((a: any) => a.displayName || a.email || '').filter(Boolean) : []
          // If there's a meeting link, treat as meeting; otherwise keep as task/reminder based on allDay/date
          const isAllDay = !!ev.start?.date && !ev.start?.dateTime
          const type: CalendarEvent['type'] = link ? 'meeting' : (isAllDay ? 'reminder' : 'task')
          return ({
            id: String(ev.id || `g-${Math.random()}`),
            title: String(ev.summary || ev.title || '(No title)'),
            description: stripUrls(String(ev.description || '')),
            type,
            startTime,
            endTime,
            date,
            priority: 'medium',
            status: 'scheduled',
            platform,
            meetingLink: link,
            attendees,
            createdBy: String(ev.organizer?.displayName || ev.organizer?.email || 'Google'),
            createdAt: new Date().toISOString(),
            sourceName: src.name,
            sourceType: src.type,
            sourceColor: src.color,
          })
        }) : []
        setSources(prev => prev.map(s => s.id === src.id ? { ...s, events: parsed, lastSyncAt: new Date().toISOString() } : s))
      } else if (src.type === 'outlook') {
        // Expect backend endpoint: GET /api/calendar/microsoft/events
        const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000'
        const res = await fetch(`${String(base).replace(/\/+$/, '')}/api/calendar/microsoft/events`, { headers: { 'Cache-Control': 'no-cache', ...authHeaders() } })
        if (!res.ok) throw new Error('Outlook calendar sync endpoint not available. See setup notes below.')
        const list = await res.json()
        const detectPlatformMs = (ev: any): CalendarEvent['platform'] | undefined => {
          const prov = String(ev.onlineMeetingProvider || '').toLowerCase()
          if (prov.includes('teams')) return 'teams'
          const link = String(ev.onlineMeeting?.joinUrl || ev.onlineMeetingUrl || '').toLowerCase()
          if (link.includes('teams.microsoft')) return 'teams'
          if (link.includes('zoom.us')) return 'zoom'
          if (link.includes('meet.google.com')) return 'google-meet'
          return undefined
        }
        const extractLinkMs = (ev: any): string | undefined => {
          return ev.onlineMeeting?.joinUrl || ev.onlineMeetingUrl || undefined
        }
        const parsed: CalendarEvent[] = Array.isArray(list) ? list.map((ev: any) => {
          const startStr = String(ev.start?.dateTime || '')
          const endStr = String(ev.end?.dateTime || '')
          const date = startStr.slice(0, 10)
          const startTime = startStr.length > 10 ? startStr.slice(11, 16) : '00:00'
          const endTime = endStr.length > 10 ? endStr.slice(11, 16) : startTime
          const link = extractLinkMs(ev)
          const platform = detectPlatformMs(ev)
          const attendees: string[] = Array.isArray(ev.attendees) ? ev.attendees.map((a: any) => a.emailAddress?.name || a.emailAddress?.address || '').filter(Boolean) : []
          const type: CalendarEvent['type'] = link ? 'meeting' : 'task'
          return ({
            id: String(ev.id || `o-${Math.random()}`),
            title: String(ev.subject || ev.title || '(No title)'),
            description: stripUrls(String(ev.bodyPreview || '')),
            type,
            startTime,
            endTime,
            date,
            priority: 'medium',
            status: 'scheduled',
            platform,
            meetingLink: link,
            attendees,
            createdBy: String(ev.organizer?.emailAddress?.name || 'Outlook'),
            createdAt: new Date().toISOString(),
            sourceName: src.name,
            sourceType: src.type,
            sourceColor: src.color,
          })
        }) : []
        setSources(prev => prev.map(s => s.id === src.id ? { ...s, events: parsed, lastSyncAt: new Date().toISOString() } : s))
      } else if (src.type === 'holidays') {
        const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000'
        const year = currentDate.getFullYear()
        const endpoint = holidayCountry.toUpperCase() === 'LK'
          ? `/api/calendar/public/lk-holidays?year=${year}`
          : `/api/calendar/holidays?country=${encodeURIComponent(holidayCountry)}&year=${year}`
        const res = await fetch(`${String(base).replace(/\/+$/, '')}${endpoint}`, { headers: { ...authHeaders(), 'Cache-Control': 'no-cache' } })
        if (!res.ok) throw new Error(await res.text())
        const list = await res.json()
        const parsed: CalendarEvent[] = Array.isArray(list) ? list.map((h: any) => ({
          id: String(h.id || `holiday-${Math.random()}`),
          title: String(h.title || h.name || 'Public Holiday'),
          description: String(h.description || 'Public holiday'),
          type: 'reminder',
          startTime: String(h.startTime || '00:00'),
          endTime: String(h.endTime || '23:59'),
          date: String(h.date || '').slice(0,10),
          priority: 'low',
          status: 'scheduled',
          createdBy: 'Public Holidays',
          createdAt: new Date().toISOString(),
          sourceName: src.name,
          sourceType: src.type,
          sourceColor: src.color,
        })) : []
        setSources(prev => prev.map(s => s.id === src.id ? { ...s, events: parsed, lastSyncAt: new Date().toISOString() } : s))
      }
    } catch (e: any) {
      setErrorBanner(e?.message || 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  // Provider connection now redirects to backend OAuth endpoints; placeholder removed

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <div className="bg-white dark:bg-black/60 shadow-sm border-b border-gray-200 dark:border-white/10">
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] items-center">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar Dashboard</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Manage schedules and connected calendars</p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              {isExecutive ? (
                <div className="flex items-center rounded-full bg-gray-100 dark:bg-black/40 p-1 border border-gray-200/70 dark:border-white/10">
                  <button
                    onClick={() => setCalendarScope('mine')}
                    className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors ${
                      calendarScope === 'mine'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-black/50'
                    }`}
                  >
                    My Calendar
                  </button>
                  <button
                    onClick={() => setCalendarScope('team')}
                    className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors ${
                      calendarScope === 'team'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-black/50'
                    }`}
                  >
                    Team View
                  </button>
                </div>
              ) : (
                <span className="px-4 py-2 text-xs font-semibold rounded-full border border-gray-200/70 dark:border-white/10 bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-300">
                  My Calendar
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              {isSyncing && (
                <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">Syncing...</span>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-gray-200/70 dark:border-white/10 bg-gray-100 dark:bg-black/40 px-3 py-2">
                <Globe2 className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Holidays</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showHolidays}
                  onClick={() => setShowHolidays(v => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    showHolidays ? 'bg-emerald-500' : 'bg-gray-400/60 dark:bg-gray-600/60'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showHolidays ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {showHolidays && (
                <CountrySelect value={holidayCountry} onChange={(code) => setHolidayCountry(code.toUpperCase())} />
              )}

              <div className="flex items-center gap-2 rounded-full border border-gray-200/70 dark:border-white/10 bg-gray-100 dark:bg-black/40 px-3 py-2">
                <SlidersHorizontal className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-transparent text-sm font-medium text-gray-900 dark:text-white focus:outline-none"
                >
                  <option value="all">All Events</option>
                  <option value="task">Tasks</option>
                  <option value="meeting">Meetings</option>
                  <option value="reminder">Reminders</option>
                  <option value="personal">Personal</option>
                  <option value="outsourced">Outsourced</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isSyncing && (
                <span className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">Syncing...</span>
              )}
              <button
                onClick={() => handleCreateEvent(today)}
                disabled={!canAddEvent}
                className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>{addEventLabel}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {isExecutive && calendarScope === 'team' && (
          <div className="bg-white dark:bg-black/60 rounded-xl shadow-sm border border-gray-200 dark:border-white/10 mb-6">
            <div className="p-6 border-b border-gray-200 dark:border-white/10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Calendar</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Select a team member to view and assign events.</p>
            </div>
            <div className="p-6">
              {employees.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No team members available.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {employees.map(member => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedUserId(member.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedUserId === member.id
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-black/50'
                      }`}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* Connected Calendars */}
        {calendarScope === 'mine' && (
        <div className="bg-white dark:bg-black/60 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 mb-6">
          <div className="p-6 border-b border-gray-200 dark:border-white/10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Connected Calendars</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage your synced external calendars and holiday feeds.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={async () => {
                    const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000'
                    try {
                      const res = await fetch(`${String(base).replace(/\/+$/, '')}/api/calendar/google/session`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() } })
                      if (!res.ok) throw new Error(await res.text())
                      const data = await res.json()
                      window.location.href = data.redirectUrl
                    } catch (e) { alert('Failed to start Google OAuth. Please ensure you are logged in.') }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-black/50 border border-gray-200/70 dark:border-white/10 rounded-full hover:bg-gray-200/80 dark:hover:bg-black/40 transition-colors"
                  title="Connect Google Calendar (requires backend OAuth setup)"
                >
                  <Mail className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  Connect Google
                </button>
                <button
                  onClick={async () => {
                    const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000'
                    try {
                      const res = await fetch(`${String(base).replace(/\/+$/, '')}/api/calendar/microsoft/session`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() } })
                      if (!res.ok) throw new Error(await res.text())
                      const data = await res.json()
                      window.location.href = data.redirectUrl
                    } catch (e) { alert('Failed to start Microsoft OAuth. Please ensure you are logged in.') }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-black/50 border border-gray-200/70 dark:border-white/10 rounded-full hover:bg-gray-200/80 dark:hover:bg-black/40 transition-colors"
                  title="Connect Outlook Calendar (requires backend OAuth setup)"
                >
                  <Mail className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  Connect Outlook
                </button>
                <button
                  onClick={() => setShowAddIcs(v => !v)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-black/50 border border-gray-200/70 dark:border-white/10 rounded-full hover:bg-gray-200/80 dark:hover:bg-black/40 transition-colors"
                >
                  <Link2 className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  {showAddIcs ? 'Cancel' : 'Add ICS URL'}
                </button>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-black/50 border border-gray-200/70 dark:border-white/10 rounded-full hover:bg-gray-200/80 dark:hover:bg-black/40 transition-colors cursor-pointer">
                  <Upload className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  Upload .ics
                  <input type="file" accept=".ics,text/calendar" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleIcsUpload(f)
                    e.currentTarget.value = ''
                  }} />
                </label>
              </div>
            </div>
          </div>
          {errorBanner && (
            <div className="px-6 py-3 text-sm text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300 border-b border-red-200 dark:border-red-800">{errorBanner}</div>
          )}
          {showAddIcs && (
            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex flex-wrap items-center gap-3">
              <input
                value={newIcsName}
                onChange={(e) => setNewIcsName(e.target.value)}
                placeholder="Calendar name"
                className="flex-1 min-w-[200px] px-4 py-2 rounded-full border border-gray-200/70 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white"
              />
              <input
                value={newIcsUrl}
                onChange={(e) => setNewIcsUrl(e.target.value)}
                placeholder="https://... (ICS feed URL)"
                className="flex-[2] min-w-[240px] px-4 py-2 rounded-full border border-gray-200/70 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white"
              />
              <button
                onClick={addIcsUrlSource}
                disabled={isSyncing || !newIcsUrl.trim() || !newIcsName.trim()}
                className="px-5 py-2 bg-blue-600 text-white rounded-full disabled:opacity-50"
              >
                Add
              </button>
            </div>
          )}
          <div className="p-6">
            {sources.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">No calendars connected. Connect Google/Outlook (requires backend), or add an ICS URL or upload an .ics file.</p>
            ) : (
              <div className="space-y-3">
                {sources.map(src => {
                  const SourceIcon = getSourceIcon(src.type)
                  const typeLabel = String(src.type || '').replace('-', ' ').toUpperCase()
                  const syncedLabel = src.lastSyncAt ? `Synced ${new Date(src.lastSyncAt).toLocaleString()}` : 'Not synced yet'
                  return (
                    <div
                      key={src.id}
                      className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-gray-50 dark:bg-black/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-white dark:bg-black/60 border border-gray-200/70 dark:border-white/10 flex items-center justify-center">
                          <SourceIcon className="h-5 w-5" style={{ color: src.color }} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{src.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{typeLabel} - {syncedLabel}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => syncSource(src)}
                          className="p-2 rounded-full border border-gray-200/70 dark:border-white/10 bg-white dark:bg-black/50 hover:bg-gray-100 dark:hover:bg-black/40 transition-colors"
                          title="Sync"
                        >
                          <RefreshCw className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                        </button>
                        <button
                          onClick={async () => {
                            if (src.type === 'ics-url') {
                              try {
                                const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000'
                                await fetch(`${String(base).replace(/\/+$/, '')}/api/calendar/sources/${src.id}`, { method: 'DELETE', headers: { ...authHeaders() } })
                              } catch {}
                            }
                            setSources(prev => prev.filter(s => s.id !== src.id))
                          }}
                          className="p-2 rounded-full border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-300" />
                        </button>
                        <div className="flex items-center gap-2 rounded-full border border-gray-200/70 dark:border-white/10 bg-white dark:bg-black/50 px-3 py-1.5">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {src.enabled ? 'Shown' : 'Hidden'}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={src.enabled}
                            onClick={async () => {
                              const checked = !src.enabled
                              setSources(prev => prev.map(s => s.id === src.id ? { ...s, enabled: checked } : s))
                              if (src.type === 'ics-url') {
                                try {
                                  const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000'
                                  await fetch(`${String(base).replace(/\/+$/, '')}/api/calendar/sources/${src.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ enabled: checked }) })
                                } catch {}
                              }
                            }}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              src.enabled ? 'bg-emerald-500' : 'bg-gray-400/60 dark:bg-gray-600/60'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                src.enabled ? 'translate-x-4' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 text-xs text-gray-500 dark:text-gray-400">
            To enable Google/Outlook login and live sync, set up backend OAuth routes:
            GET /api/calendar/google/events, GET /api/calendar/microsoft/events and corresponding connect/login flows. I can add these server routes if you want.
          </div>
        </div>
        )}
        {/* Calendar - Full Width */}
        <div className="bg-white dark:bg-black/60 rounded-xl shadow-sm border border-gray-200 dark:border-white/10 mb-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-black/40 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-black/40 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-black/40 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-6">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {getCalendarDays().map((day, index) => {
                // Handle null days (not in current month)
                if (day === null) {
                  return (
                    <div
                      key={index}
                      className="min-h-[140px] p-3 border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/40"
                    >
                      {/* Empty box for days not in current month */}
                    </div>
                  )
                }

                const dayString = formatDateString(day)
                const dayEvents = eventsByDate[dayString] || []
                const isToday = dayString === today
                const isSelected = dayString === selectedDate

                return (
                  <div
                    key={index}
                    className={`
                      min-h-[140px] p-3 border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-50 dark:hover:bg-black/40 hover:shadow-md transition-all duration-200 group
                      ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''}
                      ${isSelected ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-500' : ''}
                    `}
                    onClick={() => handleDateClick(day)}
                    title="Click to create event"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-lg font-semibold ${isToday ? 'text-white' : ''}`}>
                        {isToday ? (
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            {day.getDate()}
                          </div>
                        ) : (
                          day.getDate()
                        )}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCreateEvent(dayString)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-full transition-all duration-200 hover:scale-110"
                        title="Add event to this date"
                      >
                        <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </button>
                    </div>
                    
                    {/* Day Events */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 4).map(event => (
                        <div
                          key={event.id}
                          className={`text-xs px-3 py-1.5 rounded-full border shadow-sm ${getEventTypeColor(event.type)} cursor-pointer transition-shadow hover:shadow-md ${event.isAssigned ? 'ring-1 ring-blue-500/40' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditEvent(event)
                          }}
                        >
                          <div className="flex items-center space-x-1">
                            <span className="text-xs font-medium">{event.startTime}</span>
                            <span className="truncate">{event.title}</span>
                          </div>
                        </div>
                      ))}
                      {dayEvents.length > 4 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          +{dayEvents.length - 4} more
                        </div>
                      )}
                    </div>
                    
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="p-6 border-t border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Tasks</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-sky-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Meetings</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-fuchsia-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Reminders</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Outsourcing</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Assigned</span>
              </div>
            </div>
          </div>
        </div>

        {/* Events Section Below Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Events */}
          <div className="bg-white dark:bg-black/60 rounded-xl shadow-sm border border-gray-200 dark:border-white/10">
            <div className="p-6 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Today's Events</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {todayEvents.length} events scheduled
              </p>
            </div>
            
            <div className="p-6">
              {filteredTodayEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No events today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTodayEvents.map(event => (
                    <div
                      key={event.id}
                      className={`p-4 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-black/40 cursor-pointer transition-colors ${getAssignedClass(event)}`}
                      onClick={() => handleEditEvent(event)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-3 py-1.5 text-sm rounded-full border shadow-sm ${getEventTypeColor(event.type)}`}>
                              {event.type}
                            </span>
                            {event.isAssigned && (
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-600/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                Assigned
                              </span>
                            )}
                            <span className={`px-3 py-1.5 text-sm rounded-full border shadow-sm ${getPriorityColor(event.priority)}`}>
                              {event.priority}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {event.startTime} - {event.endTime}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">{event.title}</h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-2 break-words whitespace-pre-wrap">{event.description}</p>
                          {event.project && (
                            <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                              <Users className="h-4 w-4" />
                              <span>{event.project}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(event.status)}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteEvent(event.id)
                            }}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Day Events */}
          <div className="bg-white dark:bg-black/60 rounded-xl shadow-sm border border-gray-200 dark:border-white/10">
            <div className="p-6 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'Select a Date'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedDate ? `${selectedDayEvents.length} events scheduled` : 'Click on a date to view events'}
              </p>
            </div>
            
            <div className="p-6">
              {!selectedDate ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Click on a date to view events</p>
                </div>
              ) : filteredSelectedDayEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No events on this day</p>
                  <button
                    onClick={() => handleCreateEvent(selectedDate)}
                    disabled={!canAddEvent}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addEventLabel}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSelectedDayEvents.map(event => (
                    <div
                      key={event.id}
                      className={`p-4 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-black/40 cursor-pointer transition-colors ${getAssignedClass(event)}`}
                      onClick={() => handleEditEvent(event)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-3 py-1.5 text-sm rounded-full border shadow-sm ${getEventTypeColor(event.type)}`}>
                              {event.type}
                            </span>
                            {event.isAssigned && (
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-600/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                Assigned
                              </span>
                            )}
                            <span className={`px-3 py-1.5 text-sm rounded-full border shadow-sm ${getPriorityColor(event.priority)}`}>
                              {event.priority}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {event.startTime} - {event.endTime}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">{event.title}</h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-2 break-words whitespace-pre-wrap">{event.description}</p>
                          {event.project && (
                            <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                              <Users className="h-4 w-4" />
                              <span>{event.project}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(event.status)}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteEvent(event.id)
                            }}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false)
          setEditingEvent(null)
        }}
        event={editingEvent}
        selectedDate={selectedDate}
        onSave={handleSaveEvent}
        assigneeOptions={isExecutive ? employees.map(e => ({ id: e.id, name: e.name })) : undefined}
        defaultAssigneeId={isExecutive && calendarScope === 'team' ? selectedUserId : undefined}
      />

      {/* Day Events Modal */}
      {isDayEventsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-black/60 rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Date(selectedDayDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setIsDayEventsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Events List */}
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {selectedDayEvents.map(event => (
                  <div
                    key={event.id}
                    className={`bg-gray-50 dark:bg-black/50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-black/40 transition-colors ${getAssignedClass(event)}`}
                    onClick={() => {
                      setIsDayEventsModalOpen(false)
                      handleEditEvent(event)
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Event Type Indicator */}
                      <div className={`w-3 h-3 rounded-full mt-1 ${
                        event.type === 'task' ? 'bg-emerald-500' :
                        event.type === 'meeting' ? 'bg-sky-500' :
                        event.type === 'reminder' ? 'bg-fuchsia-500' :
                        event.type === 'personal' ? 'bg-amber-400' :
                        'bg-orange-500'
                      }`} />
                      
                      <div className="flex-1 min-w-0">
                        {/* Event Type and Priority Badges */}
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border shadow-sm ${getEventTypeColor(event.type)}`}>
                            {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                          </span>
                          {event.isAssigned && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-600/10 text-blue-700 dark:text-blue-300 rounded border border-blue-500/30">
                              Assigned
                            </span>
                          )}
                          {event.priority === 'high' && (
                            <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border shadow-sm ${getPriorityColor(event.priority)}`}>
                              High Priority
                            </span>
                          )}
                        </div>
                        
                        {/* Event Title */}
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {event.title}
                        </h3>
                        
                        {/* Event Description */}
                        {event.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 break-words whitespace-pre-wrap">
                            {event.description}
                          </p>
                        )}
                        
                        {/* Event Time */}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {event.startTime} - {event.endTime}
                        </p>
                        {/* Source indicator */}
                        <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: event.sourceColor || '#9ca3af' }} />
                          <span>From {event.sourceName || 'My Calendar'}</span>
                        </div>
                        
                        {/* Meeting Platform and Join Button */}
                        {event.type === 'meeting' && (
                          <div className="mt-3">
                            {event.platform && (
                              <div className="flex items-center space-x-2 mb-2">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {event.platform === 'teams' ? 'Teams' :
                                   event.platform === 'zoom' ? 'Zoom' :
                                   event.platform === 'google-meet' ? 'Google Meet' :
                                   'Physical'}
                                </span>
                              </div>
                            )}

                            {/* Join Button for Online Meetings (platform-specific or generic) */}
                            {event.meetingLink && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(event.meetingLink, '_blank')
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                <span>
                                  {event.platform === 'teams' ? 'Join via Teams' :
                                   event.platform === 'zoom' ? 'Join via Zoom' :
                                   event.platform === 'google-meet' ? 'Join via Google Meet' :
                                   'Open Meeting'}
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Event Button */}
            <div className="p-6 border-t border-gray-200 dark:border-white/10">
              <button
                onClick={() => {
                  setIsDayEventsModalOpen(false)
                  setSelectedDate(selectedDayDate)
                  setEditingEvent(null)
                  setIsEventModalOpen(true)
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Another Event</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarDashboard
