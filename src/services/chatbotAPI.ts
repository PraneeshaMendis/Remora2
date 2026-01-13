import { API_BASE } from './api'

export async function sendChatMessage(message: string): Promise<{ reply: string }> {
  const url = `${API_BASE}/api/chatbot/send`
  const uid = localStorage.getItem('userId')
  const token = localStorage.getItem('authToken')
  const headers: Record<string,string> = {
    'Content-Type': 'application/json',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(!token && uid ? { 'x-user-id': uid } : {}),
  }
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ message }) })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return { reply: String(data?.reply || '') }
}

