import { apiGet, apiJson } from './api'
import type { NotificationItem } from '../types'

export type NotificationsResponse = {
  items: NotificationItem[]
  unreadCount: number
}

export function listNotifications(params?: { limit?: number; since?: string; unread?: boolean }) {
  const search = new URLSearchParams()
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.since) search.set('since', params.since)
  if (params?.unread) search.set('unread', 'true')
  const qs = search.toString()
  return apiGet(`/api/notifications${qs ? `?${qs}` : ''}`) as Promise<NotificationsResponse>
}

export function markNotificationRead(id: string) {
  return apiJson(`/api/notifications/${id}/read`, 'PATCH')
}

export function markAllNotificationsRead() {
  return apiJson('/api/notifications/read-all', 'POST')
}
