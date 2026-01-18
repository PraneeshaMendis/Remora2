import { apiGet, apiJson } from './api'

export type CalendarEventPayload = {
  userId?: string
  title: string
  description?: string
  type?: 'task' | 'meeting' | 'reminder' | 'personal' | 'outsourced'
  date: string
  startTime: string
  endTime: string
  priority?: 'high' | 'medium' | 'low'
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  project?: string
  meetingLink?: string
  platform?: 'teams' | 'zoom' | 'google-meet' | 'physical'
  attendees?: string[]
  isRecurring?: boolean
  recurrenceType?: 'daily' | 'weekly' | 'monthly'
}

export function listCalendarEvents(userId?: string) {
  const qs = userId ? `?userId=${encodeURIComponent(userId)}` : ''
  return apiGet(`/api/calendar/events${qs}`)
}

export function createCalendarEvent(payload: CalendarEventPayload) {
  return apiJson('/api/calendar/events', 'POST', payload)
}

export function updateCalendarEvent(id: string, payload: Partial<CalendarEventPayload>) {
  return apiJson(`/api/calendar/events/${id}`, 'PATCH', payload)
}

export function deleteCalendarEvent(id: string) {
  return apiJson(`/api/calendar/events/${id}`, 'DELETE')
}
