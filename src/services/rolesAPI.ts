import { apiGet, apiJson } from './api'

export function listRoles() {
  return apiGet('/api/roles')
}

export function createRole(name: string) {
  return apiJson('/api/roles', 'POST', { name })
}

export function updateRole(id: string, name: string) {
  return apiJson(`/api/roles/${id}`, 'PATCH', { name })
}

export function deleteRole(id: string, opts?: { force?: boolean; toRoleId?: string }) {
  const params = new URLSearchParams()
  if (opts?.force) params.set('force', 'true')
  if (opts?.toRoleId) params.set('toRoleId', opts.toRoleId)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiJson(`/api/roles/${id}${qs}`, 'DELETE')
}
