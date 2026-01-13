import { apiGet, apiJson } from './api'

export function listDepartments() {
  return apiGet('/api/departments')
}

export function createDepartment(name: string) {
  return apiJson('/api/departments', 'POST', { name })
}

export function updateDepartment(id: string, name: string) {
  return apiJson(`/api/departments/${id}`, 'PATCH', { name })
}

export function deleteDepartment(id: string, opts?: { force?: boolean; toDeptId?: string }) {
  const params = new URLSearchParams()
  if (opts?.force) params.set('force', 'true')
  if (opts?.toDeptId) params.set('toDeptId', opts.toDeptId)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiJson(`/api/departments/${id}${qs}`, 'DELETE')
}
