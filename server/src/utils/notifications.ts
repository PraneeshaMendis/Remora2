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

function getBrandAssetBaseUrl() {
  return String(process.env.FRONTEND_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '')
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
  const safeActionHref = actionUrl ? encodeURI(actionUrl) : ''
  const safeActionUrl = actionUrl ? escapeHtml(actionUrl) : ''
  const assetBase = getBrandAssetBaseUrl()
  const logoUrl = `${assetBase}/cyber3.svg?v=20260210`
  const greetingText = safeUser ? `Hi ${safeUser},` : 'Hi,'
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
@media only screen and (max-width: 600px) {
  .main-card {
    width: 92% !important;
  }

  .card-padding {
    padding: 28px !important;
  }

  .heading {
    font-size: 22px !important;
  }

  .text {
    font-size: 15px !important;
  }

  .logo {
    width: 160px !important;
  }

  .button {
    width: 100% !important;
    text-align: center !important;
  }
}
</style>
</head>

<body style="
margin:0;
padding:0;
background:#FFFFFF;
font-family:-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:40px 15px;">

<table class="main-card" width="600" cellpadding="0" cellspacing="0"
style="
max-width:600px;
background:#ffffff;
border-radius:18px;
overflow:hidden;
box-shadow:0 25px 70px rgba(0,0,0,0.45);
">

<tr>
<td style="
background: linear-gradient(135deg,#0B1A2B,#1E3A8A);
padding:36px;
text-align:center;
">

<img class="logo"
src="${logoUrl}"
width="200"
alt="Cyber Labs"
style="display:block;margin:auto;">

<div style="
color:#C7D2FE;
font-size:13px;
letter-spacing:1.4px;
margin-top:12px;
">
CYBER LABS SECURE PLATFORM
</div>

</td>
</tr>

<tr>
<td class="card-padding" style="padding:40px;">

<div class="heading" style="
font-size:26px;
font-weight:700;
color:#0F172A;
margin-bottom:18px;
">
${safeTitle}
</div>

<div class="text" style="
font-size:16px;
color:#334155;
line-height:1.6;
margin-bottom:12px;
">
${greetingText}
</div>

<div class="text" style="
font-size:16px;
color:#334155;
line-height:1.6;
margin-bottom:30px;
">
${safeMessage}
</div>

${safeActionHref ? `<table cellpadding="0" cellspacing="0">
<tr>
<td class="button" style="
background: linear-gradient(135deg,#4F7BFF,#8B5CF6);
padding:14px 28px;
border-radius:12px;
box-shadow:0 10px 30px rgba(79,123,255,0.35);
">

<a href="${safeActionHref}"
target="_blank"
rel="noopener"
style="
color:white;
font-weight:600;
font-size:16px;
text-decoration:none;
display:inline-block;
">
Open Notification &rarr;
</a>

</td>
</tr>
</table>` : ''}

</td>
</tr>

${safeActionHref ? `<tr>
<td style="
background:#F1F5F9;
padding:22px;
text-align:center;
font-size:13px;
color:#64748B;
">

If the button doesn't work, open this link:<br>

<span style="color:#4F7BFF;word-break:break-all;">
${safeActionUrl}
</span>

</td>
</tr>` : ''}

</table>
</td>
</tr>
</table>

</body>
</html>`
  const textParts = [
    title,
    safeUser ? `Hi ${userName},` : '',
    message,
  ].filter(Boolean)
  if (actionUrl) {
    textParts.push(`Open Notification: ${actionUrl}`)
    textParts.push(`If the button doesn't work, use: ${actionUrl}`)
  }
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
