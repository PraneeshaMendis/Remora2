import { apiGet, apiJson } from './api'

export function listUsers(params: { page?: number; limit?: number; search?: string; roleId?: string; departmentId?: string; isActive?: boolean } = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.search) query.set('search', params.search)
  if (params.roleId) query.set('roleId', params.roleId)
  if (params.departmentId) query.set('departmentId', params.departmentId)
  if (typeof params.isActive === 'boolean') query.set('isActive', String(params.isActive))
  const qs = query.toString()
  return apiGet(`/api/users${qs ? `?${qs}` : ''}`)
}

export function getUser(id: string) {
  return apiGet(`/api/users/${id}`)
}

export function getCurrentUser() {
  return apiGet('/api/users/me')
}

export function createUser(body: { name: string; email: string; roleId: string; departmentId: string; isActive?: boolean }) {
  return apiJson('/api/users', 'POST', body)
}

export function updateUser(id: string, body: Partial<{ name: string; email: string; roleId: string; departmentId: string; isActive: boolean }>) {
  return apiJson(`/api/users/${id}`, 'PATCH', body)
}

export function deleteUser(id: string, hard = false) {
  const qs = hard ? '?hard=true' : ''
  return apiJson(`/api/users/${id}${qs}`, 'DELETE')
}
