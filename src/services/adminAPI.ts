import { apiJson, apiGet } from './api'

export function getAdminCatalog() {
  return Promise.all([
    apiGet('/api/roles').catch(() => []),
    apiGet('/api/departments').catch(() => []),
  ]).then(([roles, departments]) => ({
    roles: (roles || []).map((r: any) => String(r?.name || r)).filter(Boolean),
    departments: (departments || []).map((d: any) => String(d?.name || d)).filter(Boolean),
  }))
}

export function registerUserByAdmin(body: { name: string; email: string; password: string; roleName: string; departmentName: string; verify?: boolean; active?: boolean }) {
  return apiJson('/api/admin/register-user', 'POST', body)
}

export function inviteUser(body: { name: string; email: string; roleName?: string; departmentName: string }) {
  return apiJson('/api/admin/invite-user', 'POST', body)
}

export function purgeNonAdminUsers() {
  return apiJson('/api/admin/purge-non-admin-users', 'POST')
}

// Approvals API
export function listPendingApprovals() {
  return apiGet('/api/approvals/pending')
}

export function approveUser(userId: string, body: { departmentId: string; roleId: string; active?: boolean; billable?: boolean; billRate?: number; costRate?: number; utilizationTarget?: number; skills?: string[]; managerId?: string }) {
  return apiJson(`/api/approvals/${userId}/approve`, 'POST', body)
}

export function rejectUser(userId: string, reason: string) {
  return apiJson(`/api/approvals/${userId}/reject`, 'POST', { reason })
}
