import { API_BASE } from './api'

export async function gmailStatus() {
  const res = await fetch(`${API_BASE}/api/gmail/status`, { headers: { 'x-user-id': localStorage.getItem('userId') || '' } })
  if (!res.ok) return { connected: false }
  return res.json()
}

export async function startGmailSession() {
  const res = await fetch(`${API_BASE}/api/gmail/google/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-id': localStorage.getItem('userId') || '' },
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data?.redirectUrl as string
}

export async function sendInvoiceEmail(payload: { to: string; subject: string; html?: string; text?: string }) {
  const res = await fetch(`${API_BASE}/api/gmail/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-id': localStorage.getItem('userId') || '' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function pullBankCreditsFromGmail() {
  const res = await fetch(`${API_BASE}/api/gmail/bank-credits`, { headers: { 'x-user-id': localStorage.getItem('userId') || '' } })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

