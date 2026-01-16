import { API_BASE } from './api'

export type ReviewStatus = 'approved' | 'rejected' | 'needs-changes' | 'in-review'

function authHeaders() {
  const uid = localStorage.getItem('userId') || ''
  const token = localStorage.getItem('authToken') || ''
  return {
    ...(uid ? { 'x-user-id': uid } : {}),
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  }
}

export async function uploadDocuments(
  params: {
    projectId: string
    phaseId: string
    reviewerId: string
    taskId?: string | null
    status?: 'draft' | 'in-review'
    name?: string
    externalLink?: string
  },
  files: File[],
) {
  const fd = new FormData()
  fd.set('projectId', params.projectId)
  fd.set('phaseId', params.phaseId)
  fd.set('reviewerId', params.reviewerId)
  if (params.taskId) fd.set('taskId', params.taskId)
  if (params.status) fd.set('status', params.status)
  if (params.name) fd.set('name', params.name)
  if (params.externalLink) fd.set('externalLink', params.externalLink)
  for (const f of files) fd.append('files', f)

  const res = await fetch(`${API_BASE}/api/documents/upload?_ts=${Date.now()}`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: fd,
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listInbox() {
  const res = await fetch(`${API_BASE}/api/documents/inbox?_ts=${Date.now()}`, { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listSent() {
  const res = await fetch(`${API_BASE}/api/documents/sent?_ts=${Date.now()}`, { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getDocument(id: string) {
  const res = await fetch(`${API_BASE}/api/documents/${id}?_ts=${Date.now()}`, { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function reviewDocument(id: string, status: ReviewStatus, reviewComment?: string) {
  const res = await fetch(`${API_BASE}/api/documents/${id}/review?_ts=${Date.now()}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status, reviewComment }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
