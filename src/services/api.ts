// Normalize API base to avoid ":4000" (missing protocol/host) issues
const RAW_BASE: string | undefined = (import.meta as any)?.env?.VITE_API_BASE_URL
let API_BASE = RAW_BASE || 'http://localhost:4000'
if (API_BASE.startsWith(':')) {
  API_BASE = `${window.location.protocol}//${window.location.hostname}${API_BASE}`
} else if (!/^https?:\/\//i.test(API_BASE)) {
  API_BASE = `http://${API_BASE}`
}
API_BASE = API_BASE.replace(/\/+$/, '')

function buildUrl(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}

async function handle(res: Response) {
  if (!res.ok) throw new Error(await res.text())
  if (res.status === 204) return null
  return res.json()
}

export function apiGet(path: string) {
  const url = new URL(buildUrl(path))
  // Bust caches that can lead to 304 without body
  url.searchParams.set('_ts', Date.now().toString())
  const uid = localStorage.getItem('userId')
  const token = localStorage.getItem('authToken')
  const allowDev = (import.meta as any).env?.VITE_ALLOW_DEV_HEADERS === 'true'
  return fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store', ...(token ? { 'authorization': `Bearer ${token}` } : {}), ...(!token && allowDev && uid ? { 'x-user-id': uid } : {}) },
    cache: 'no-store',
    credentials: 'include',
  }).then(handle)
}

export function apiJson(path: string, method: string, body?: any) {
  const url = new URL(buildUrl(path))
  url.searchParams.set('_ts', Date.now().toString())
  const uid = localStorage.getItem('userId')
  const token = localStorage.getItem('authToken')
  const allowDev = (import.meta as any).env?.VITE_ALLOW_DEV_HEADERS === 'true'
  return fetch(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store', ...(token ? { 'authorization': `Bearer ${token}` } : {}), ...(!token && allowDev && uid ? { 'x-user-id': uid } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    credentials: 'include',
  }).then(handle)
}

export { API_BASE }

// Compatibility shim for existing services expecting `request` helper
export async function request(path: string, options: RequestInit = {}) {
  const { method = 'GET', headers, body } = options
  const url = new URL(buildUrl(path))
  url.searchParams.set('_ts', Date.now().toString())
  const res = await fetch(url.toString(), {
    ...options,
    method,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store', ...(headers || {}) },
    cache: 'no-store',
    credentials: 'include',
    body: typeof body === 'string' || body === undefined ? body : JSON.stringify(body),
  })
  return handle(res)
}
