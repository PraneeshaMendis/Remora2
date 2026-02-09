import { Router, Request, Response } from 'express'
import axios from 'axios'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '../prisma.ts'
import { createNotifications } from '../utils/notifications.ts'

const router = Router()

function baseUrl(req: Request) {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol
  const host = req.get('host')
  return `${proto}://${host}`
}

function clientBaseUrl(req: Request) {
  const envBase = process.env.FRONTEND_BASE_URL || process.env.APP_BASE_URL
  if (envBase) return String(envBase).replace(/\/+$/, '')
  const origin = req.get('origin')
  if (origin) return origin.replace(/\/+$/, '')
  // Fallback to typical dev port for Vite
  const api = baseUrl(req)
  try {
    const u = new URL(api)
    return `${u.protocol}//${u.hostname}:5173`
  } catch {
    return 'http://localhost:5173'
  }
}

// --- Encryption helpers for storing sensitive secrets (ICS URLs) ---
// Uses AES-256-GCM with key derived from CALENDAR_ENC_KEY
function getEncKey(): Buffer {
  const raw = process.env.CALENDAR_ENC_KEY || process.env.JWT_SECRET || 'dev-secret'
  // derive 32-byte key
  return crypto.createHash('sha256').update(String(raw)).digest()
}
function encrypt(text: string): string {
  const key = getEncKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(Buffer.from(String(text), 'utf8')), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}
function decrypt(payload: string): string {
  try {
    const buf = Buffer.from(String(payload), 'base64')
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const data = buf.subarray(28)
    const key = getEncKey()
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(data), decipher.final()])
    return dec.toString('utf8')
  } catch {
    return ''
  }
}

function normalizeIcsUrl(u: string): string {
  if (!u) return ''
  let s = String(u).trim()
  if (s.toLowerCase().startsWith('webcal://')) s = 'https://' + s.slice(9)
  if (s.toLowerCase().startsWith('webcals://')) s = 'https://' + s.slice(10)
  return s
}

// Short-lived OAuth state storage
async function createOAuthStateRecord(userId: string, provider: 'GOOGLE' | 'MICROSOFT') {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  return prisma.calendarOAuthState.create({ data: { userId, provider: provider as any, expiresAt, nextPath: '/calendar' } })
}
async function consumeOAuthStateRecord(id?: string | null) {
  if (!id) return null
  const rec = await prisma.calendarOAuthState.findUnique({ where: { id } })
  if (!rec) return null
  if (rec.expiresAt && rec.expiresAt.getTime() < Date.now()) {
    await prisma.calendarOAuthState.delete({ where: { id: rec.id } })
    return null
  }
  await prisma.calendarOAuthState.delete({ where: { id: rec.id } })
  return rec
}

// Authenticated session initiators to obtain redirect URLs (headers available)
router.post('/google/session', async (req: Request, res: Response) => {
  const userId = await resolveUserId(req)
  if (!userId) return res.status(401).json({ error: 'Login required' })
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl(req)}/api/calendar/google/callback`
  if (!clientId) return res.status(500).json({ error: 'Missing GOOGLE_CLIENT_ID' })
  const st = await createOAuthStateRecord(userId, 'GOOGLE')
  const scope = ['openid','email','profile','https://www.googleapis.com/auth/calendar.readonly'].join(' ')
  const state = Buffer.from(JSON.stringify({ sid: st.id, next: '/calendar' }), 'utf8').toString('base64url')
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scope)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  res.json({ redirectUrl: url.toString() })
})

// --- Google OAuth ---
router.get('/google/connect', async (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl(req)}/api/calendar/google/callback`
  const scope = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/calendar.readonly',
  ].join(' ')
  if (!clientId) return res.status(500).send('Missing GOOGLE_CLIENT_ID')
  // Accept uid via query (since Authorization headers aren't sent on redirects)
  const uid = (req.query.uid as string) || ''
  const userId = (req as any).userId || uid || ''
  const state = Buffer.from(JSON.stringify({ userId, next: '/calendar' }), 'utf8').toString('base64url')
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scope)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  res.redirect(url.toString())
})

router.get('/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string
  const stateRaw = (req.query.state as string) || ''
  let state: any = {}
  try { state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8')) } catch {}
  let userId: string | null = null
  if (state?.sid) {
    const rec = await consumeOAuthStateRecord(state.sid)
    userId = rec?.userId || null
  } else {
    const resolved = await resolveUserId(req)
    userId = resolved || state?.userId || (req.query.uid as string) || null
  }
  if (!code) return res.status(400).send('Missing code')
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl(req)}/api/calendar/google/callback`
  if (!clientId || !clientSecret) return res.status(500).send('Missing Google client credentials')
  try {
    if (!userId) return res.status(401).send('No user context; please log in and retry')
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    const { access_token, refresh_token, expires_in, id_token, scope } = tokenRes.data || {}

    // Extract email from id_token if present
    let email = ''
    if (id_token) {
      try {
        const payload = JSON.parse(Buffer.from(String(id_token).split('.')[1], 'base64').toString('utf8'))
        email = String(payload?.email || '')
      } catch {}
    }
    // Fallback: call userinfo
    if (!email && access_token) {
      try {
        const uinfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${access_token}` } })
        email = String(uinfo.data?.email || '')
      } catch {}
    }
    const now = Date.now()
    const expiresAt = expires_in ? new Date(now + Number(expires_in) * 1000) : null
    // Verify user exists
    const exists = await prisma.user.findUnique({ where: { id: userId } })
    if (!exists) return res.status(400).send('User not found; ensure you are logged in')
    await prisma.calendarAccount.upsert({
      where: { userId_provider_email: { userId, provider: 'GOOGLE', email: email || 'unknown' } as any },
      update: { accessToken: access_token, refreshToken: refresh_token || '', expiresAt: expiresAt as any, scope },
      create: { id: undefined as any, userId, provider: 'GOOGLE' as any, email: email || 'unknown', accessToken: access_token, refreshToken: refresh_token || '', expiresAt: expiresAt as any, scope },
    })
    const nextPath = state?.next || '/calendar'
    const clientBase = clientBaseUrl(req)
    res.redirect(`${clientBase}${nextPath}`)
  } catch (e: any) {
    res.status(400).send(e?.response?.data || e?.message || 'Google OAuth failed')
  }
})

async function ensureGoogleToken(account: any, clientId: string, clientSecret: string) {
  if (!account?.refreshToken) return account
  const now = new Date()
  if (account.expiresAt && new Date(account.expiresAt) > new Date(now.getTime() + 60_000)) return account
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: account.refreshToken,
  })
  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  const { access_token, expires_in } = tokenRes.data || {}
  const expiresAt = expires_in ? new Date(Date.now() + Number(expires_in) * 1000) : null
  const updated = await prisma.calendarAccount.update({ where: { id: account.id }, data: { accessToken: access_token, expiresAt } })
  return updated
}

router.get('/google/events', async (req: Request, res: Response) => {
  const requesterId = await resolveUserId(req)
  if (!requesterId) return res.status(401).json({ error: 'x-user-id or Bearer token required' })
  const target = await resolveTargetUserId(req, requesterId)
  if (!target.targetId) return res.status(target.status || 400).json({ error: target.error || 'Invalid target user' })
  const userId = target.targetId
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return res.status(500).json({ error: 'Missing Google client credentials' })
  const account = await prisma.calendarAccount.findFirst({ where: { userId, provider: 'GOOGLE' as any } })
  if (!account) return res.status(200).json([])
  try {
    const acc = await ensureGoogleToken(account, clientId, clientSecret)
    const now = new Date()
    const timeMin = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString()
    const timeMax = new Date(now.getTime() + 90 * 24 * 3600 * 1000).toISOString()
    const eventsRes = await axios.get('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      headers: { Authorization: `Bearer ${acc.accessToken}` },
      params: { maxResults: 2500, singleEvents: true, orderBy: 'startTime', timeMin, timeMax },
    })
    res.json(Array.isArray(eventsRes.data?.items) ? eventsRes.data.items : [])
  } catch (e: any) {
    res.status(400).json({ error: e?.response?.data || e?.message || 'Failed to fetch Google events' })
  }
})

// --- Microsoft OAuth (MS Graph) ---
router.post('/microsoft/session', async (req: Request, res: Response) => {
  const userId = await resolveUserId(req)
  if (!userId) return res.status(401).json({ error: 'Login required' })
  const clientId = process.env.MS_CLIENT_ID
  const tenant = process.env.MS_TENANT || 'common'
  const redirectUri = process.env.MS_REDIRECT_URI || `${baseUrl(req)}/api/calendar/microsoft/callback`
  if (!clientId) return res.status(500).json({ error: 'Missing MS_CLIENT_ID' })
  const st = await createOAuthStateRecord(userId, 'MICROSOFT')
  const state = Buffer.from(JSON.stringify({ sid: st.id, next: '/calendar' }), 'utf8').toString('base64url')
  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_mode', 'query')
  url.searchParams.set('scope', ['offline_access', 'User.Read', 'Calendars.Read'].join(' '))
  url.searchParams.set('state', state)
  res.json({ redirectUrl: url.toString() })
})
router.get('/microsoft/connect', async (req: Request, res: Response) => {
  const clientId = process.env.MS_CLIENT_ID
  const tenant = process.env.MS_TENANT || 'common'
  const redirectUri = process.env.MS_REDIRECT_URI || `${baseUrl(req)}/api/calendar/microsoft/callback`
  if (!clientId) return res.status(500).send('Missing MS_CLIENT_ID')
  const uid = (req.query.uid as string) || ''
  const userId = (req as any).userId || uid || ''
  const state = Buffer.from(JSON.stringify({ userId, next: '/calendar' }), 'utf8').toString('base64url')
  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_mode', 'query')
  url.searchParams.set('scope', ['offline_access', 'User.Read', 'Calendars.Read'].join(' '))
  url.searchParams.set('state', state)
  res.redirect(url.toString())
})

router.get('/microsoft/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string
  const stateRaw = (req.query.state as string) || ''
  let state: any = {}
  try { state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8')) } catch {}
  let userId: string | null = null
  if (state?.sid) {
    const rec = await consumeOAuthStateRecord(state.sid)
    userId = rec?.userId || null
  } else {
    const resolved = await resolveUserId(req)
    userId = resolved || state?.userId || (req.query.uid as string) || null
  }
  if (!code) return res.status(400).send('Missing code')
  const clientId = process.env.MS_CLIENT_ID
  const clientSecret = process.env.MS_CLIENT_SECRET
  const tenant = process.env.MS_TENANT || 'common'
  const redirectUri = process.env.MS_REDIRECT_URI || `${baseUrl(req)}/api/calendar/microsoft/callback`
  if (!clientId || !clientSecret) return res.status(500).send('Missing Microsoft client credentials')
  try {
    const tokenRes = await axios.post(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      scope: ['offline_access', 'User.Read', 'Calendars.Read'].join(' '),
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    const { access_token, refresh_token, expires_in } = tokenRes.data || {}

    // Get user email
    let email = ''
    try {
      const meRes = await axios.get('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${access_token}` } })
      email = String(meRes.data?.mail || meRes.data?.userPrincipalName || '')
    } catch {}
    const expiresAt = expires_in ? new Date(Date.now() + Number(expires_in) * 1000) : null
    if (!userId) return res.status(401).send('No user context; please log in and retry')
    const exists = await prisma.user.findUnique({ where: { id: userId } })
    if (!exists) return res.status(400).send('User not found; ensure you are logged in')
    await prisma.calendarAccount.upsert({
      where: { userId_provider_email: { userId, provider: 'MICROSOFT', email: email || 'unknown' } as any },
      update: { accessToken: access_token, refreshToken: refresh_token || '', expiresAt: expiresAt as any, scope: 'User.Read Calendars.Read offline_access' },
      create: { id: undefined as any, userId, provider: 'MICROSOFT' as any, email: email || 'unknown', accessToken: access_token, refreshToken: refresh_token || '', expiresAt: expiresAt as any, scope: 'User.Read Calendars.Read offline_access' },
    })
    const nextPath = state?.next || '/calendar'
    const clientBase = clientBaseUrl(req)
    res.redirect(`${clientBase}${nextPath}`)
  } catch (e: any) {
    res.status(400).send(e?.response?.data || e?.message || 'Microsoft OAuth failed')
  }
})

async function ensureMsToken(account: any, tenant: string, clientId: string, clientSecret: string) {
  if (!account?.refreshToken) return account
  const now = new Date()
  if (account.expiresAt && new Date(account.expiresAt) > new Date(now.getTime() + 60_000)) return account
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: account.refreshToken,
    scope: 'offline_access User.Read Calendars.Read',
  })
  const tokenRes = await axios.post(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  const { access_token, expires_in } = tokenRes.data || {}
  const expiresAt = expires_in ? new Date(Date.now() + Number(expires_in) * 1000) : null
  const updated = await prisma.calendarAccount.update({ where: { id: account.id }, data: { accessToken: access_token, expiresAt } })
  return updated
}

router.get('/microsoft/events', async (req: Request, res: Response) => {
  const requesterId = await resolveUserId(req)
  if (!requesterId) return res.status(401).json({ error: 'x-user-id or Bearer token required' })
  const target = await resolveTargetUserId(req, requesterId)
  if (!target.targetId) return res.status(target.status || 400).json({ error: target.error || 'Invalid target user' })
  const userId = target.targetId
  const clientId = process.env.MS_CLIENT_ID
  const clientSecret = process.env.MS_CLIENT_SECRET
  const tenant = process.env.MS_TENANT || 'common'
  if (!clientId || !clientSecret) return res.status(500).json({ error: 'Missing Microsoft client credentials' })
  const account = await prisma.calendarAccount.findFirst({ where: { userId, provider: 'MICROSOFT' as any } })
  if (!account) return res.status(200).json([])
  try {
    const acc = await ensureMsToken(account, tenant, clientId, clientSecret)
    // Pull events window: past 30 days to next 90 days
    const start = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    const end = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString()
    const eventsRes = await axios.get('https://graph.microsoft.com/v1.0/me/calendarView', {
      headers: { Authorization: `Bearer ${acc.accessToken}` },
      params: { startDateTime: start, endDateTime: end, '$top': 1000, '$orderby': 'start/dateTime' },
    })
    res.json(Array.isArray(eventsRes.data?.value) ? eventsRes.data.value : [])
  } catch (e: any) {
    res.status(400).json({ error: e?.response?.data || e?.message || 'Failed to fetch Microsoft events' })
  }
})

// Resolve an effective userId from token, header, or DEV_USER_ID, ensuring it exists
async function resolveUserId(req: Request): Promise<string | null> {
  const primary = (req as any).userId as string | null
  if (primary) {
    const u = await prisma.user.findUnique({ where: { id: primary } })
    if (u) return primary
  }
  const headerId = req.header('x-user-id') || null
  if (headerId) {
    const u = await prisma.user.findUnique({ where: { id: headerId } })
    if (u) return headerId
  }
  const dev = process.env.DEV_USER_ID || null
  if (dev) {
    const u = await prisma.user.findUnique({ where: { id: dev } })
    if (u) return dev
  }
  return null
}

async function isExecutiveMember(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { department: true, role: true },
  })
  if (!user) return false
  const dept = String(user.department?.name || '').trim().toLowerCase()
  if (dept === 'executive department') return true
  const role = String(user.role?.name || '').trim().toLowerCase()
  return role === 'admin'
}

async function resolveTargetUserId(req: Request, requesterId: string): Promise<{ targetId: string | null; status?: number; error?: string }> {
  const requested = String(req.query.userId || '').trim()
  if (!requested || requested === requesterId) {
    return { targetId: requesterId }
  }
  const allowed = await isExecutiveMember(requesterId)
  if (!allowed) {
    return { targetId: null, status: 403, error: 'Executive access required' }
  }
  const exists = await prisma.user.findUnique({ where: { id: requested } })
  if (!exists) {
    return { targetId: null, status: 404, error: 'User not found' }
  }
  return { targetId: requested }
}

function formatLocalDate(value: Date | string): string {
  const dt = value instanceof Date ? value : new Date(value)
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

function formatLocalTime(value: Date | string): string {
  const dt = value instanceof Date ? value : new Date(value)
  return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`
}

function mapEventForClient(ev: any) {
  const startAt = new Date(ev.startAt)
  const endAt = new Date(ev.endAt)
  const date = formatLocalDate(startAt)
  const startTime = formatLocalTime(startAt)
  const endTime = formatLocalTime(endAt)
  const isAssigned = ev.createdById !== ev.userId
  const platform = ev.platform
    ? String(ev.platform).toLowerCase().replace('_', '-') 
    : undefined
  return {
    id: ev.id,
    title: ev.title,
    description: ev.description || '',
    type: String(ev.type).toLowerCase(),
    startTime,
    endTime,
    date,
    priority: String(ev.priority).toLowerCase(),
    status: String(ev.status).toLowerCase().replace('_', '-'),
    assignee: ev.user?.name || undefined,
    assigneeId: ev.userId,
    project: ev.project || undefined,
    projectId: ev.projectId || undefined,
    phase: ev.phase || undefined,
    phaseId: ev.phaseId || undefined,
    task: ev.task || undefined,
    taskId: ev.taskId || undefined,
    platform,
    meetingLink: ev.meetingLink || undefined,
    attendees: Array.isArray(ev.attendees) ? ev.attendees : [],
    isRecurring: !!ev.isRecurring,
    recurrenceType: ev.recurrenceType ? String(ev.recurrenceType).toLowerCase() : undefined,
    createdBy: ev.createdBy?.name || '',
    createdAt: ev.createdAt,
    sourceName: isAssigned ? 'Executive Assignment' : 'My Calendar',
    sourceType: isAssigned ? 'assigned' : 'local',
    sourceColor: isAssigned ? '#2563eb' : '#6b7280',
    createdById: ev.createdById,
    userId: ev.userId,
    isAssigned,
  }
}

function normalizeEventLinkId(value: unknown): string | null {
  const v = String(value ?? '').trim()
  return v ? v : null
}

type EventLinkContext = {
  projectId: string | null
  project: string | null
  phaseId: string | null
  phase: string | null
  taskId: string | null
  task: string | null
}

async function resolveEventLinkContext(input: {
  projectId?: unknown
  phaseId?: unknown
  taskId?: unknown
  project?: unknown
}): Promise<EventLinkContext> {
  let projectId = normalizeEventLinkId(input.projectId)
  let phaseId = normalizeEventLinkId(input.phaseId)
  let taskId = normalizeEventLinkId(input.taskId)
  const projectLabel = normalizeEventLinkId(input.project)

  if (taskId) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { phase: { include: { project: true } } },
    })
    if (!task) throw new Error('Invalid taskId')
    taskId = task.id
    phaseId = task.phaseId
    projectId = task.phase.projectId
    return {
      projectId,
      project: task.phase.project.title || null,
      phaseId,
      phase: task.phase.name || null,
      taskId,
      task: task.title || null,
    }
  }

  if (phaseId) {
    const phase = await prisma.phase.findUnique({
      where: { id: phaseId },
      include: { project: true },
    })
    if (!phase) throw new Error('Invalid phaseId')
    if (projectId && projectId !== phase.projectId) {
      throw new Error('phaseId does not belong to projectId')
    }
    projectId = phase.projectId
    return {
      projectId,
      project: phase.project.title || null,
      phaseId: phase.id,
      phase: phase.name || null,
      taskId: null,
      task: null,
    }
  }

  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, title: true },
    })
    if (!project) throw new Error('Invalid projectId')
    return {
      projectId: project.id,
      project: project.title || null,
      phaseId: null,
      phase: null,
      taskId: null,
      task: null,
    }
  }

  return {
    projectId: null,
    project: projectLabel || null,
    phaseId: null,
    phase: null,
    taskId: null,
    task: null,
  }
}

const eventSchema = z.object({
  userId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['task', 'meeting', 'reminder', 'personal', 'outsourced']).optional().default('task'),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']).optional().default('scheduled'),
  project: z.union([z.string(), z.null()]).optional(),
  projectId: z.union([z.string(), z.null()]).optional(),
  phaseId: z.union([z.string(), z.null()]).optional(),
  taskId: z.union([z.string(), z.null()]).optional(),
  meetingLink: z.string().optional(),
  platform: z.enum(['teams', 'zoom', 'google-meet', 'physical']).optional(),
  attendees: z.array(z.string()).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceType: z.enum(['daily', 'weekly', 'monthly']).optional(),
})

const toDateTime = (date: string, time: string) => {
  const normalizedDate = String(date).slice(0, 10)
  const dt = new Date(`${normalizedDate}T${time}`)
  return dt
}

// Minimal real project -> phase -> task tree for calendar event linking
router.get('/project-tree', async (req: Request, res: Response) => {
  const requesterId = await resolveUserId(req)
  if (!requesterId) return res.status(401).json({ error: 'Login required' })
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      phases: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          tasks: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, title: true },
          },
        },
      },
    },
  })

  res.json(
    projects.map((p) => ({
      id: p.id,
      name: p.title,
      phases: (p.phases || []).map((ph) => ({
        id: ph.id,
        name: ph.name,
        tasks: (ph.tasks || []).map((t) => ({ id: t.id, name: t.title })),
      })),
    })),
  )
})

// Local events (in-app) per user
router.get('/events', async (req: Request, res: Response) => {
  const requesterId = await resolveUserId(req)
  if (!requesterId) return res.status(401).json({ error: 'Login required' })
  const targetId = String(req.query.userId || requesterId)
  if (targetId !== requesterId) {
    const allowed = await isExecutiveMember(requesterId)
    if (!allowed) return res.status(403).json({ error: 'Executive access required' })
  }
  const events = await prisma.calendarEvent.findMany({
    where: { userId: targetId },
    orderBy: { startAt: 'asc' },
    include: { user: { select: { name: true } }, createdBy: { select: { name: true } } },
  })
  res.json(events.map(mapEventForClient))
})

router.post('/events', async (req: Request, res: Response) => {
  const requesterId = await resolveUserId(req)
  if (!requesterId) return res.status(401).json({ error: 'Login required' })
  const parsed = eventSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const data = parsed.data
  const targetId = data.userId || requesterId
  if (targetId !== requesterId) {
    const allowed = await isExecutiveMember(requesterId)
    if (!allowed) return res.status(403).json({ error: 'Executive access required' })
  }
  const startAt = toDateTime(data.date, data.startTime)
  const endAt = toDateTime(data.date, data.endTime)
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return res.status(400).json({ error: 'Invalid date/time' })
  }
  if (endAt <= startAt) {
    return res.status(400).json({ error: 'End time must be after start time' })
  }
  try {
    const links = await resolveEventLinkContext({
      projectId: data.projectId,
      phaseId: data.phaseId,
      taskId: data.taskId,
      project: data.project,
    })

    const created = await prisma.calendarEvent.create({
      data: {
        userId: targetId,
        createdById: requesterId,
        title: data.title,
        description: data.description || '',
        type: data.type.toUpperCase() as any,
        startAt,
        endAt,
        priority: data.priority.toUpperCase() as any,
        status: data.status.toUpperCase().replace('-', '_') as any,
        project: links.project || undefined,
        projectId: links.projectId || undefined,
        phase: links.phase || undefined,
        phaseId: links.phaseId || undefined,
        task: links.task || undefined,
        taskId: links.taskId || undefined,
        meetingLink: data.meetingLink || undefined,
        platform: data.platform ? data.platform.toUpperCase().replace('-', '_') as any : undefined,
        attendees: data.attendees || [],
        isRecurring: !!data.isRecurring,
        recurrenceType: data.recurrenceType ? data.recurrenceType.toUpperCase() as any : undefined,
      },
      include: { user: { select: { name: true } }, createdBy: { select: { name: true } } },
    })

    if (targetId !== requesterId) {
      const creator = created.createdBy?.name || 'Executive'
      try {
        await createNotifications([{
          userId: targetId,
          type: 'CALENDAR_EVENT',
          title: 'New calendar event',
          message: `${creator} assigned "${created.title}" on ${formatLocalDate(created.startAt)} ${formatLocalTime(created.startAt)}.`,
          targetUrl: '/calendar',
        }])
      } catch {}
    }

    res.status(201).json(mapEventForClient(created))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to create event' })
  }
})

router.patch('/events/:id', async (req: Request, res: Response) => {
  const requesterId = await resolveUserId(req)
  if (!requesterId) return res.status(401).json({ error: 'Login required' })
  const eventId = req.params.id
  const parsed = eventSchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const existing = await prisma.calendarEvent.findUnique({ where: { id: eventId } })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const isExec = await isExecutiveMember(requesterId)
  if (existing.userId !== requesterId && existing.createdById !== requesterId && !isExec) {
    return res.status(403).json({ error: 'Not allowed' })
  }

  const data = parsed.data
  let startAt = existing.startAt
  let endAt = existing.endAt
  if (data.date || data.startTime) {
    const date = data.date || formatLocalDate(existing.startAt)
    const time = data.startTime || formatLocalTime(existing.startAt)
    startAt = toDateTime(date, time)
  }
  if (data.date || data.endTime) {
    const date = data.date || formatLocalDate(existing.endAt)
    const time = data.endTime || formatLocalTime(existing.endAt)
    endAt = toDateTime(date, time)
  }
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return res.status(400).json({ error: 'Invalid date/time' })
  }
  if (endAt <= startAt) {
    return res.status(400).json({ error: 'End time must be after start time' })
  }

  try {
    const hasProjectLabel = Object.prototype.hasOwnProperty.call(data, 'project')
    const hasProjectId = Object.prototype.hasOwnProperty.call(data, 'projectId')
    const hasPhaseId = Object.prototype.hasOwnProperty.call(data, 'phaseId')
    const hasTaskId = Object.prototype.hasOwnProperty.call(data, 'taskId')
    const linksTouched = hasProjectLabel || hasProjectId || hasPhaseId || hasTaskId
    const links = linksTouched
      ? await resolveEventLinkContext({
          projectId: data.projectId,
          phaseId: data.phaseId,
          taskId: data.taskId,
          project: data.project,
        })
      : null

    const updateData: any = {
      title: data.title ?? undefined,
      description: data.description ?? undefined,
      type: data.type ? data.type.toUpperCase() as any : undefined,
      startAt,
      endAt,
      priority: data.priority ? data.priority.toUpperCase() as any : undefined,
      status: data.status ? data.status.toUpperCase().replace('-', '_') as any : undefined,
      meetingLink: data.meetingLink ?? undefined,
      platform: data.platform ? data.platform.toUpperCase().replace('-', '_') as any : undefined,
      attendees: data.attendees ?? undefined,
      isRecurring: data.isRecurring ?? undefined,
      recurrenceType: data.recurrenceType ? data.recurrenceType.toUpperCase() as any : undefined,
    }
    if (linksTouched && links) {
      updateData.project = links.project
      updateData.projectId = links.projectId
      updateData.phase = links.phase
      updateData.phaseId = links.phaseId
      updateData.task = links.task
      updateData.taskId = links.taskId
    }

    const updated = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: updateData,
      include: { user: { select: { name: true } }, createdBy: { select: { name: true } } },
    })
    res.json(mapEventForClient(updated))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to update event' })
  }
})

router.delete('/events/:id', async (req: Request, res: Response) => {
  const requesterId = await resolveUserId(req)
  if (!requesterId) return res.status(401).json({ error: 'Login required' })
  const eventId = req.params.id
  const existing = await prisma.calendarEvent.findUnique({ where: { id: eventId } })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const isExec = await isExecutiveMember(requesterId)
  if (existing.userId !== requesterId && existing.createdById !== requesterId && !isExec) {
    return res.status(403).json({ error: 'Not allowed' })
  }
  await prisma.calendarEvent.delete({ where: { id: eventId } })
  res.status(204).end()
})

// List linked calendar accounts for the current user
router.get('/accounts', async (req: Request, res: Response) => {
  const requesterId = await resolveUserId(req)
  if (!requesterId) return res.status(401).json({ error: 'User not found; ensure you are logged in or DEV_USER_ID is valid.' })
  const target = await resolveTargetUserId(req, requesterId)
  if (!target.targetId) return res.status(target.status || 400).json({ error: target.error || 'Invalid target user' })
  const userId = target.targetId
  const accts = await prisma.calendarAccount.findMany({
    where: { userId },
    select: { id: true, provider: true, email: true, updatedAt: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(accts)
})

// --- Per-user ICS URL sources (persisted) ---
router.get('/sources', async (req: Request, res: Response) => {
  const requesterId = await resolveUserId(req)
  if (!requesterId) return res.status(401).json({ error: 'User not found; ensure you are logged in or DEV_USER_ID is valid.' })
  const target = await resolveTargetUserId(req, requesterId)
  if (!target.targetId) return res.status(target.status || 400).json({ error: target.error || 'Invalid target user' })
  const userId = target.targetId
  const sources = await prisma.calendarSource.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  // Never expose URL to client
  res.json(sources.map(s => ({ id: s.id, type: s.type, name: s.name, color: s.color, enabled: s.enabled, createdAt: s.createdAt, updatedAt: s.updatedAt })))
})

router.post('/sources', async (req: Request, res: Response) => {
  const userId = await resolveUserId(req)
  if (!userId) return res.status(401).json({ error: 'User not found; ensure you are logged in or DEV_USER_ID is valid.' })
  const { name, url, color, enabled } = req.body || {}
  if (!name || !url) return res.status(400).json({ error: 'name and url are required' })
  try {
    const normalized = normalizeIcsUrl(String(url))
    if (!/^https?:\/\//i.test(normalized)) return res.status(400).json({ error: 'Invalid ICS URL (must start with http/https or webcal/webcals)' })
    const created = await prisma.calendarSource.create({
      data: { userId, type: 'ICS_URL' as any, name, url: encrypt(normalized), color: color || '#10b981', enabled: enabled ?? true },
    })
    res.status(201).json({ id: created.id, type: created.type, name: created.name, color: created.color, enabled: created.enabled, createdAt: created.createdAt, updatedAt: created.updatedAt })
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to create source' })
  }
})

router.patch('/sources/:id', async (req: Request, res: Response) => {
  const userId = await resolveUserId(req)
  if (!userId) return res.status(401).json({ error: 'User not found; ensure you are logged in or DEV_USER_ID is valid.' })
  const id = req.params.id
  const { name, url, color, enabled } = req.body || {}
  try {
    // Ensure ownership
    const src = await prisma.calendarSource.findUnique({ where: { id } })
    if (!src || src.userId !== userId) return res.status(404).json({ error: 'Not found' })
    const data: any = {}
    if (name !== undefined) data.name = name
    if (color !== undefined) data.color = color
    if (enabled !== undefined) data.enabled = enabled
    if (url !== undefined) {
      const normalized = normalizeIcsUrl(String(url))
      if (!/^https?:\/\//i.test(normalized)) return res.status(400).json({ error: 'Invalid ICS URL (must start with http/https or webcal/webcals)' })
      data.url = encrypt(normalized)
    }
    const updated = await prisma.calendarSource.update({ where: { id }, data })
    res.json({ id: updated.id, type: updated.type, name: updated.name, color: updated.color, enabled: updated.enabled, createdAt: updated.createdAt, updatedAt: updated.updatedAt })
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to update source' })
  }
})

router.delete('/sources/:id', async (req: Request, res: Response) => {
  const userId = await resolveUserId(req)
  if (!userId) return res.status(401).json({ error: 'User not found; ensure you are logged in or DEV_USER_ID is valid.' })
  const id = req.params.id
  try {
    const src = await prisma.calendarSource.findUnique({ where: { id } })
    if (!src || src.userId !== userId) return res.status(404).json({ error: 'Not found' })
    await prisma.calendarSource.delete({ where: { id } })
    res.status(204).end()
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to delete source' })
  }
})

// Fetch and parse events for a given ICS source (server-side fetch; never expose URL)
router.get('/sources/:id/events', async (req: Request, res: Response) => {
  const requesterId = await resolveUserId(req)
  if (!requesterId) return res.status(401).json({ error: 'User not found; ensure you are logged in or DEV_USER_ID is valid.' })
  const target = await resolveTargetUserId(req, requesterId)
  if (!target.targetId) return res.status(target.status || 400).json({ error: target.error || 'Invalid target user' })
  const userId = target.targetId
  const id = req.params.id
  const src = await prisma.calendarSource.findUnique({ where: { id } })
  if (!src || src.userId !== userId) return res.status(404).json({ error: 'Not found' })
  try {
    const icsUrl = normalizeIcsUrl(decrypt(src.url))
    if (!/^https?:\/\//i.test(icsUrl)) return res.status(400).json({ error: 'Invalid or undecryptable ICS URL' })
    const r = await axios.get(icsUrl, { responseType: 'text', timeout: 15000, headers: { 'User-Agent': 'ProjectHubCalendar/1.0' } })
    const text = String(r.data || '')
    const targetTimeZone = String(req.query.tz || '').trim() || undefined
    const events = parseICS(text, src.name, targetTimeZone)
    res.json(events)
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to load ICS events' })
  }
})

export default router

// Lightweight ICS proxy to avoid browser CORS when fetching external calendars
router.get('/ics', async (req: Request, res: Response) => {
  try {
    const url = String(req.query.url || req.query.u || '')
    if (!url) return res.status(400).send('Missing url')
    const parsed = new URL(url)
    if (!/^https?:$/i.test(parsed.protocol)) return res.status(400).send('Only http/https supported')

    const r = await axios.get(url, { responseType: 'text', timeout: 15000, headers: { 'User-Agent': 'ProjectHubCalendar/1.0' } })
    // Force text/calendar so the client can parse
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.status(200).send(typeof r.data === 'string' ? r.data : String(r.data || ''))
  } catch (e: any) {
    res.status(400).send(e?.response?.statusText || e?.message || 'Failed to fetch ICS')
  }
})

// --- Public ICS sources (available to all users; no auth required) ---
// Sri Lanka public holidays (Google ICS). Can be overridden via env.
const LK_HOLIDAYS_ICS_URL_DEFAULT = 'https://calendar.google.com/calendar/ical/en.lk%23holiday%40group.v.calendar.google.com/public/basic.ics'
const LK_HOLIDAYS_CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
let lkHolidaysCache: { events: any[]; fetchedAt: number } | null = null

router.get('/public/lk-holidays', async (req: Request, res: Response) => {
  try {
    const now = Date.now()
    const url = normalizeIcsUrl(process.env.CALENDAR_LK_HOLIDAYS_ICS_URL || LK_HOLIDAYS_ICS_URL_DEFAULT)
    if (!/^https?:\/\//i.test(url)) return res.status(500).json({ error: 'Invalid LK holidays ICS URL' })

    // Serve from cache when fresh
    if (lkHolidaysCache && (now - lkHolidaysCache.fetchedAt) < LK_HOLIDAYS_CACHE_TTL_MS) {
      const filtered = filterByYear(lkHolidaysCache.events, req.query.year as string)
      return res.json(filtered)
    }

    const r = await axios.get(url, { responseType: 'text', timeout: 20000, headers: { 'User-Agent': 'ProjectHubCalendar/1.0' } })
    const text = String(r.data || '')
    const events = parseICS(text, 'Sri Lanka Public Holidays')
    lkHolidaysCache = { events, fetchedAt: now }
    const filtered = filterByYear(events, req.query.year as string)
    res.json(filtered)
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to load LK holidays ICS' })
  }
})

function filterByYear(events: any[], year?: string | null) {
  const y = String(year || '').trim()
  if (!y || !/^\d{4}$/.test(y)) return events
  return (events || []).filter(ev => String(ev?.date || '').startsWith(`${y}-`))
}

// Public holidays provider: prefers RapidAPI when configured, otherwise falls back to HolidayAPI.com
router.get('/holidays', async (req: Request, res: Response) => {
  try {
    const country = String(req.query.country || process.env.HOLIDAY_DEFAULT_COUNTRY || 'US').toUpperCase()
    const year = Number(req.query.year || new Date().getFullYear())
    const month = req.query.month ? Number(req.query.month) : undefined

    // Prefer RapidAPI if both key and host are provided
    const rapidKey = process.env.RAPIDAPI_KEY || ''
    const rapidHost = process.env.RAPIDAPI_HOLIDAYS_HOST || ''
    if (rapidKey && rapidHost) {
      try {
        // Nager.Date via RapidAPI: GET /PublicHolidays/{year}/{country}
        const url = new URL(`https://${rapidHost}/PublicHolidays/${year}/${country}`)
        const r = await axios.get(url.toString(), {
          timeout: 15000,
          headers: { 'X-RapidAPI-Key': rapidKey, 'X-RapidAPI-Host': rapidHost },
        })
        const items: any[] = Array.isArray(r.data) ? r.data : []
        const filtered = (month && month >= 1 && month <= 12)
          ? items.filter((h: any) => {
              const d = String(h?.date || '').slice(0, 10)
              const m = Number(d.slice(5, 7))
              return m === month
            })
          : items
        const events = filtered.map((h: any) => {
          const date = String(h?.date || '').slice(0, 10)
          const name = String(h?.localName || h?.name || 'Public Holiday')
          const types = Array.isArray(h?.types) ? h.types.join(', ') : (h?.type || 'Public holiday')
          return {
            id: `holiday-${country}-${date}-${(name).replace(/\s+/g,'-').toLowerCase()}`,
            title: name,
            description: types,
            type: 'reminder',
            startTime: '00:00',
            endTime: '23:59',
            date,
            priority: 'low',
            status: 'scheduled',
            createdBy: 'Public Holidays',
            createdAt: new Date().toISOString(),
          }
        })
        return res.json(events)
      } catch (err) {
        // Fallback to Nager.Date official API if RapidAPI call fails (subscription/limits)
        try {
          const url2 = new URL(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`)
          const r2 = await axios.get(url2.toString(), { timeout: 15000 })
          const items: any[] = Array.isArray(r2.data) ? r2.data : []
          const filtered = (month && month >= 1 && month <= 12)
            ? items.filter((h: any) => {
                const d = String(h?.date || '').slice(0, 10)
                const m = Number(d.slice(5, 7))
                return m === month
              })
            : items
          const events = filtered.map((h: any) => ({
            id: `holiday-${country}-${String(h.date).slice(0,10)}-${String(h.localName || h.name).replace(/\s+/g,'-').toLowerCase()}`,
            title: String(h.localName || h.name || 'Public Holiday'),
            description: Array.isArray(h.types) ? h.types.join(', ') : (h.type || 'Public holiday'),
            type: 'reminder',
            startTime: '00:00',
            endTime: '23:59',
            date: String(h.date).slice(0,10),
            priority: 'low',
            status: 'scheduled',
            createdBy: 'Public Holidays',
            createdAt: new Date().toISOString(),
          }))
          return res.json(events)
        } catch {}
      }
    }

    // Fallback: HolidayAPI.com (requires HOLIDAY_API_KEY)
    const key = process.env.HOLIDAY_API_KEY || ''
    if (!key) {
      // As a final fallback when no keys are configured at all, try Nager.Date official API directly
      try {
        const url2 = new URL(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`)
        const r2 = await axios.get(url2.toString(), { timeout: 15000 })
        const items: any[] = Array.isArray(r2.data) ? r2.data : []
        const filtered = (month && month >= 1 && month <= 12)
          ? items.filter((h: any) => {
              const d = String(h?.date || '').slice(0, 10)
              const m = Number(d.slice(5, 7))
              return m === month
            })
          : items
        const events = filtered.map((h: any) => ({
          id: `holiday-${country}-${String(h.date).slice(0,10)}-${String(h.localName || h.name).replace(/\s+/g,'-').toLowerCase()}`,
          title: String(h.localName || h.name || 'Public Holiday'),
          description: Array.isArray(h.types) ? h.types.join(', ') : (h.type || 'Public holiday'),
          type: 'reminder',
          startTime: '00:00',
          endTime: '23:59',
          date: String(h.date).slice(0,10),
          priority: 'low',
          status: 'scheduled',
          createdBy: 'Public Holidays',
          createdAt: new Date().toISOString(),
        }))
        return res.json(events)
      } catch {}
      return res.status(200).json([])
    }
    const language = String(req.query.language || 'en')
    const url = new URL('https://holidayapi.com/v1/holidays')
    url.searchParams.set('key', key)
    url.searchParams.set('country', country)
    url.searchParams.set('year', String(year))
    url.searchParams.set('public', 'true')
    url.searchParams.set('language', language)
    if (month && month >= 1 && month <= 12) url.searchParams.set('month', String(month))
    const r = await axios.get(url.toString(), { timeout: 15000 })
    const items: any[] = Array.isArray(r.data?.holidays) ? r.data.holidays : []
    const events = items.map((h: any) => {
      const date = String(h?.date || '').slice(0, 10)
      const name = String(h?.name || 'Public Holiday')
      return {
        id: `holiday-${country}-${date}-${(h?.uuid || name).replace(/\s+/g,'-').toLowerCase()}`,
        title: name,
        description: String(h?.type?.join?.(', ') || 'Public holiday'),
        type: 'reminder',
        startTime: '00:00',
        endTime: '23:59',
        date,
        priority: 'low',
        status: 'scheduled',
        createdBy: 'HolidayAPI',
        createdAt: new Date().toISOString(),
      }
    })
    return res.json(events)
  } catch (e: any) {
    res.status(400).json({ error: e?.response?.data || e?.message || 'Failed to load holidays' })
  }
})

// --- Minimal ICS parser (shared logic with frontend, sanitized) ---
function parseICS(text: string, sourceName: string, targetTimeZone?: string) {
  const rawLines = text.split(/\r?\n/)
  const lines: string[] = []
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i]
    if (l.startsWith(' ') && lines.length > 0) lines[lines.length - 1] += l.slice(1)
    else lines.push(l)
  }
  const out: any[] = []
  let cursor: Record<string, string> | null = null
  for (const l of lines) {
    if (l.startsWith('BEGIN:VEVENT')) cursor = {}
    else if (l.startsWith('END:VEVENT')) {
      if (cursor) {
        const uid = cursor['UID'] || Math.random().toString(36).slice(2)
        const summary = cursor['SUMMARY'] || '(No title)'
        const descRaw = (cursor['DESCRIPTION'] || '').replace(/\\n/g, '\n')
        const dtstart = cursor['DTSTART'] || ''
        const dtend = cursor['DTEND'] || ''
        const dtstartTz = cursor['DTSTART_TZID'] || ''
        const dtendTz = cursor['DTEND_TZID'] || dtstartTz
        const dtstartValue = cursor['DTSTART_VALUE'] || ''
        const dtendValue = cursor['DTEND_VALUE'] || dtstartValue
        const st = parseIcsDate(dtstart, { tzid: dtstartTz, valueType: dtstartValue, targetTimeZone })
        const et = parseIcsDate(dtend || dtstart, { tzid: dtendTz, valueType: dtendValue, targetTimeZone })
        const location = cursor['LOCATION'] || ''
        const urlProp = cursor['URL'] || ''
        const all = `${urlProp}\n${descRaw}\n${location}`
        const urls = (all.match(/https?:\/\/\S+/g) || []) as string[]
        const firstUrl = urls.find(u => u.toLowerCase().includes('teams.microsoft'))
          || urls.find(u => u.toLowerCase().includes('zoom.us'))
          || urls.find(u => u.toLowerCase().includes('meet.google.com'))
          || urls[0]
        const platform = detectPlatform(firstUrl)
        const isAllDay = st.isDateOnly
        const type = firstUrl ? 'meeting' : (isAllDay ? 'reminder' : 'task')
        out.push({
          id: `ics-${uid}`,
          title: summary,
          description: stripUrls(descRaw),
          type,
          startTime: st.time,
          endTime: et.time || st.time,
          date: st.date,
          priority: 'medium',
          status: 'scheduled',
          platform,
          meetingLink: firstUrl,
          attendees: [],
          createdBy: sourceName,
          createdAt: new Date().toISOString(),
        })
      }
      cursor = null
    } else if (cursor) {
      const prop = parseIcsProperty(l)
      if (prop) {
        const { name, value, params } = prop
        cursor[name] = value
        if (name === 'DTSTART' || name === 'DTEND') {
          if (params.TZID) cursor[`${name}_TZID`] = params.TZID
          if (params.VALUE) cursor[`${name}_VALUE`] = params.VALUE
        }
      }
    }
  }
  return out
}

function parseIcsProperty(line: string): { name: string; value: string; params: Record<string, string> } | null {
  const idx = line.indexOf(':')
  if (idx <= 0) return null
  const left = line.slice(0, idx)
  const value = line.slice(idx + 1)
  const parts = left.split(';')
  const name = parts[0].toUpperCase()
  const params: Record<string, string> = {}
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i]
    const eq = p.indexOf('=')
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1)
  }
  return { name, value, params }
}

function parseIcsDate(
  val: string,
  opts: { tzid?: string; valueType?: string; targetTimeZone?: string } = {}
): { date: string; time: string; isDateOnly: boolean } {
  const m = String(val || '').trim()
  const datePart = m.slice(0, 8)
  const year = Number(datePart.slice(0, 4))
  const month = Number(datePart.slice(4, 6))
  const day = Number(datePart.slice(6, 8))
  const hasTime = m.length >= 15 && m[8] === 'T'
  const isDateOnly = String(opts.valueType || '').toUpperCase() === 'DATE' || (!hasTime && m.length >= 8)
  if (!hasTime || isDateOnly) {
    return { date: `${pad2(year)}-${pad2(month)}-${pad2(day)}`, time: '00:00', isDateOnly: true }
  }
  const hour = Number(m.slice(9, 11))
  const minute = Number(m.slice(11, 13))
  const second = Number(m.slice(13, 15))
  const isUtc = m.endsWith('Z')
  const targetTz = normalizeTimeZone(opts.targetTimeZone)
  const sourceTz = normalizeTimeZone(opts.tzid)
  const fallback = { date: `${pad2(year)}-${pad2(month)}-${pad2(day)}`, time: `${pad2(hour)}:${pad2(minute)}`, isDateOnly: false }
  if (!targetTz) return fallback
  try {
    let instant: Date
    if (isUtc) {
      instant = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
    } else if (sourceTz) {
      instant = zonedTimeToUtc({ year, month, day, hour, minute, second }, sourceTz)
    } else {
      // Floating time: assume it's already in the viewer's timezone
      return fallback
    }
    const formatted = formatDateInTimeZone(instant, targetTz)
    return { ...formatted, isDateOnly: false }
  } catch {
    return fallback
  }
}

function formatDateInTimeZone(date: Date, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  return { date: `${map.year}-${map.month}-${map.day}`, time: `${map.hour}:${map.minute}` }
}

function zonedTimeToUtc(
  parts: { year: number; month: number; day: number; hour: number; minute: number; second: number },
  timeZone: string
): Date {
  const utcGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second))
  const offsetMinutes = getTimeZoneOffsetMinutes(timeZone, utcGuess)
  return new Date(utcGuess.getTime() - offsetMinutes * 60000)
}

function getTimeZoneOffsetMinutes(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const map: Record<string, number> = {}
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = Number(p.value)
  }
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second)
  return (asUtc - date.getTime()) / 60000
}

function normalizeTimeZone(tz?: string): string | null {
  const v = String(tz || '').trim()
  if (!v) return null
  if (v.toUpperCase() === 'UTC' || v.toUpperCase() === 'GMT') return 'UTC'
  return v
}

function pad2(n: number): string {
  return String(n || 0).padStart(2, '0')
}
function stripUrls(s: string): string {
  return String(s || '').replace(/https?:\/\/\S+/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}
function detectPlatform(u?: string) {
  const s = String(u || '').toLowerCase()
  if (s.includes('aka.ms/jointeams')) return 'teams'
  if (s.includes('teams.microsoft')) return 'teams'
  if (s.includes('zoom.us')) return 'zoom'
  if (s.includes('meet.google.com')) return 'google-meet'
  return undefined
}
