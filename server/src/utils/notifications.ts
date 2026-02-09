import { prisma } from '../prisma.ts'
import { emailEnabled, sendMail } from './mailer.ts'

type NotificationInput = {
  userId: string
  type: string
  title: string
  message: string
  targetUrl?: string | null
}

const EXCLUDED_EMAIL_TYPES = new Set(['INVOICE_APPROVAL'])
const INVOICE_PATH_RE = /(^|\/)invoices?(\/|$|\?)/i

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function toAbsoluteClientUrl(targetUrl?: string | null) {
  const raw = String(targetUrl || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  const base = String(process.env.FRONTEND_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '')
  const path = raw.startsWith('/') ? raw : `/${raw}`
  return `${base}${path}`
}

function shouldSendEmail(n: NotificationInput) {
  const type = String(n.type || '').trim().toUpperCase()
  if (!type) return false
  if (EXCLUDED_EMAIL_TYPES.has(type)) return false
  if (INVOICE_PATH_RE.test(String(n.targetUrl || ''))) return false
  return true
}

function renderNotificationEmail(input: { title: string; message: string; targetUrl?: string | null; userName?: string | null }) {
  const title = input.title || 'New notification'
  const message = input.message || 'You have a new update.'
  const userName = (input.userName || '').trim()
  const actionUrl = toAbsoluteClientUrl(input.targetUrl)
  const safeTitle = escapeHtml(title)
  const safeMessage = escapeHtml(message)
  const safeUser = userName ? escapeHtml(userName) : ''
  const appName = escapeHtml(String(process.env.MAIL_FROM_NAME || 'Gen4 Labs'))
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:auto;padding:24px;background:#f8fafc">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <div style="padding:20px 24px;background:#0f172a;color:#ffffff">
          <div style="font-size:16px;font-weight:700">${appName}</div>
          <div style="font-size:12px;opacity:.9;margin-top:6px">Notification</div>
        </div>
        <div style="padding:24px;color:#0f172a">
          <h2 style="margin:0 0 10px 0;font-size:20px;line-height:28px">${safeTitle}</h2>
          ${safeUser ? `<p style="margin:0 0 8px 0;color:#334155;font-size:14px">Hi ${safeUser},</p>` : ''}
          <p style="margin:0 0 16px 0;color:#334155;font-size:14px;line-height:22px">${safeMessage}</p>
          ${actionUrl ? `<a href="${actionUrl}" target="_blank" rel="noopener" style="display:inline-block;background:#2563eb;color:#ffffff;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:600">Open Notification</a>` : ''}
          ${actionUrl ? `<p style="margin:14px 0 0 0;color:#64748b;font-size:12px;word-break:break-all">If the button does not work, use: <a href="${actionUrl}" style="color:#2563eb">${actionUrl}</a></p>` : ''}
        </div>
      </div>
    </div>
  `
  const textParts = [title, message]
  if (actionUrl) textParts.push(`Open: ${actionUrl}`)
  return { subject: title, html, text: textParts.join('\n\n') }
}

async function sendNotificationEmails(notifications: NotificationInput[]) {
  if (!emailEnabled()) return
  const emailable = notifications.filter(shouldSendEmail)
  if (emailable.length === 0) return

  const userIds = Array.from(new Set(emailable.map(n => n.userId).filter(Boolean)))
  if (userIds.length === 0) return

  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isActive: true },
    select: { id: true, email: true, name: true },
  })
  const userById = new Map(users.map(u => [u.id, u]))

  await Promise.allSettled(
    emailable.map(async (n) => {
      const user = userById.get(n.userId)
      if (!user?.email) return
      const payload = renderNotificationEmail({
        title: n.title,
        message: n.message,
        targetUrl: n.targetUrl,
        userName: user.name,
      })
      await sendMail(user.email, payload.subject, payload.html, payload.text)
    }),
  )
}

export async function createNotifications(notifications: NotificationInput[]) {
  if (!notifications || notifications.length === 0) return
  const deduped = new Map<string, NotificationInput>()
  for (const n of notifications) {
    if (!n?.userId) continue
    const key = `${n.userId}:${n.type}:${n.title}:${n.message}:${n.targetUrl || ''}`
    if (!deduped.has(key)) deduped.set(key, n)
  }
  const data = Array.from(deduped.values()).map(n => ({
    userId: n.userId,
    type: n.type as any,
    title: n.title,
    message: n.message,
    targetUrl: n.targetUrl || null,
  }))
  if (data.length === 0) return
  await prisma.notification.createMany({ data })
  try {
    await sendNotificationEmails(Array.from(deduped.values()))
  } catch {}
}
