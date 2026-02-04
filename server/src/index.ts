import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
// Load env from the correct place whether running from repo root or server dir
(() => {
  const candidates = [
    path.resolve(process.cwd(), 'server/.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env'),
  ]
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) { dotenv.config({ path: p }); break }
    } catch {}
  }
})()
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { prisma } from './prisma.ts'
import { helmetMiddleware, buildCorsOptions, loginRateLimiter } from './middleware/security.ts'
import projectsRouter from './routes/projects.ts'
import tasksRouter from './routes/tasks.ts'
import timelogsRouter from './routes/timelogs.ts'
import usersRouter from './routes/users.ts'
import departmentsRouter from './routes/departments.ts'
import rolesRouter from './routes/roles.ts'
import authRouter from './routes/auth.ts'
import approvalsRouter from './routes/approvals.ts'
import calendarRouter from './routes/calendar.ts'
import gmailRouter from './routes/gmail.ts'
import invoicesRouter from './routes/invoices.ts'
import receiptsRouter from './routes/receipts.ts'
import additionalCostsRouter from './routes/additional-costs.ts'
import bankCreditsRouter from './routes/bank-credits.ts'
import documentsRouter from './routes/documents.ts'
import notificationsRouter from './routes/notifications.ts'
import adminRouter from './routes/admin.ts'
import settingsRouter from './routes/settings.ts'
import speechRouter from './routes/speech.ts'
import chatbotRouter from './routes/chatbot.ts'
import meetingLogsRouter from './routes/meeting-logs.ts'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(helmetMiddleware())
app.use(cors(buildCorsOptions()))
import cookieParser from 'cookie-parser'
app.use(cookieParser())
app.use(express.json())
app.use(morgan('dev'))
// Serve uploaded files
// Serve uploaded files with no-store to avoid stale caching during reviews
app.use(
  '/uploads',
  express.static(path.resolve(process.cwd(), 'uploads'), {
    etag: false,
    lastModified: false,
    maxAge: 0,
    cacheControl: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store')
    },
  }),
)

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) })
  }
})

// Auth middleware: JWT first; dev-only fallbacks behind env flags
app.use(async (req, _res, next) => {
  const auth = req.header('authorization') || ''
  let userId: string | null = null
  let adminId: string | null = null
  if (auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7)
    try {
      const secret = process.env.JWT_SECRET || 'dev-secret'
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const jwt = require('jsonwebtoken')
      const payload = jwt.verify(token, secret) as any
      userId = payload?.sub || null
      adminId = userId
    } catch {}
  }
  // Dev helper: allow x-user-id header or xuid cookie when explicitly enabled
  const allowDevHeaders = (process.env.ALLOW_DEV_HEADERS || '').toLowerCase() === 'true'
  if (!userId && allowDevHeaders) {
    const fromHeader = req.header('x-user-id') || ''
    const fromCookie = (req as any).cookies?.xuid || ''
    userId = fromHeader || fromCookie || null
  }

  ;(req as any).userId = userId
  // Attach hydrated user for role checks when available
  // Skip eager load in dev; routes look up user as needed
  next()
})

app.use('/projects', projectsRouter)
app.use('/tasks', tasksRouter)
app.use('/timelogs', timelogsRouter)
// New admin data APIs
app.use('/api/users', usersRouter)
app.use('/api/departments', departmentsRouter)
app.use('/api/roles', rolesRouter)
app.use('/auth', authRouter)
// Provide /api/auth as an alias for auth endpoints to match other API prefixes
app.use('/api/auth', authRouter)
// Approvals
app.use('/api/approvals', approvalsRouter)
// Calendars (Google/Microsoft OAuth + events)
app.use('/api/calendar', calendarRouter)
// Gmail integration for Slips & Invoices
app.use('/api/gmail', gmailRouter)
app.use('/api/receipts', receiptsRouter)
app.use('/api/additional-costs', additionalCostsRouter)
app.use('/api/bank-credits', bankCreditsRouter)
// Invoices
app.use('/invoices', invoicesRouter)
// Documents
app.use('/api/documents', documentsRouter)
// Admin helper endpoints
app.use('/api/admin', adminRouter)
// System settings
app.use('/api/settings', settingsRouter)
// Speech-to-Text proxy
app.use('/api/speech', speechRouter)
// Chatbot proxy (RapidAPI)
app.use('/api/chatbot', loginRateLimiter(), chatbotRouter)
// Notifications
app.use('/api/notifications', notificationsRouter)
// Meeting logs
app.use('/api/meeting-logs', meetingLogsRouter)

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`API listening on :${port}`)
})
