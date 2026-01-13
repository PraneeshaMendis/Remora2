import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { authRequired } from '../middleware/auth-required.ts'
import { isSuperAdminByUserId } from '../middleware/super-admin.ts'
import crypto from 'crypto'
import { loginRateLimiter } from '../middleware/security.ts'
import { getSuperAdminEmail } from '../utils/settings.ts'
import { emailEnabled, renderVerifyEmail, renderInviteEmail, renderPasswordResetEmail, sendMail } from '../utils/mailer.ts'

const prisma = new PrismaClient()
const db: any = prisma
const router = Router()

const strongPassword = z.string().min(8).regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must include letters and numbers')
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(4) })
const registerSchema = z.object({ name: z.string().min(1), email: z.string().email(), password: strongPassword, roleId: z.string(), departmentId: z.string() })
const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: strongPassword,
  desiredDepartmentId: z.string(),
  intendedRoleId: z.string().optional(),
  managerName: z.string().optional(),
  billable: z.coerce.boolean().optional(),
})
const setPasswordSchema = z.object({ email: z.string().email(), password: strongPassword })

function sign(userId: string) {
  const secret = process.env.JWT_SECRET || 'dev-secret'
  return jwt.sign({ sub: userId }, secret, { expiresIn: '15m' })
}

function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

async function createToken(userId: string, type: 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'REFRESH', ttlSeconds: number) {
  const raw = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(raw)
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
  await db.authToken.create({ data: { userId, type: type as any, tokenHash, expiresAt } })
  return { raw, expiresAt }
}

async function consumeToken(type: 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'REFRESH', raw: string) {
  const tokenHash = hashToken(raw)
  const rec = await db.authToken.findFirst({ where: { tokenHash, type: type as any, usedAt: null, expiresAt: { gt: new Date() } } })
  if (!rec) return null
  await db.authToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } })
  return rec
}

// SECURE LOGIN: verify password; no auto-create except super admin from env
router.post('/login', loginRateLimiter(), async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { email, password } = parsed.data
  const lower = email.toLowerCase()
  let user: any = null
  try {
    user = await prisma.user.findUnique({ where: { email: lower } })
    const adminEmail = (await getSuperAdminEmail()).toLowerCase()
    const adminEnvPass = String(process.env.SUPERADMIN_PASSWORD || '')
    const isSuperAttempt = !!adminEmail && lower === adminEmail

    // Super admin: allow env password; provision account if missing
    if (isSuperAttempt && adminEnvPass && password === adminEnvPass) {
      const role = await prisma.appRole.findFirst({ where: { name: { equals: 'Director', mode: 'insensitive' } } }) || await prisma.appRole.create({ data: { name: 'Director' } })
      const dept = await prisma.department.findFirst({ where: { name: { equals: 'Executive Department', mode: 'insensitive' } } }) || await prisma.department.create({ data: { name: 'Executive Department' } })
      if (!user) {
        const hash = await bcrypt.hash(adminEnvPass, 10)
        user = await prisma.user.create({ data: ({ name: 'Admin', email: lower, roleId: role.id, departmentId: dept.id, isActive: true, emailVerifiedAt: new Date(), passwordHash: hash } as any) })
      } else if (!user.passwordHash) {
        const hash = await bcrypt.hash(adminEnvPass, 10)
        user = await prisma.user.update({ where: { id: user.id }, data: ({ passwordHash: hash, isActive: true, emailVerifiedAt: user.emailVerifiedAt || new Date() } as any) })
      }
    } else {
      // Normal user: must exist, be active and verified, not locked, and password must match
      if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' })
      if (user.lockedUntil && user.lockedUntil > new Date()) return res.status(403).json({ error: 'Account temporarily locked. Try again later.' })
      const ok = await bcrypt.compare(password, user.passwordHash)
      if (!ok) {
        const attempts = (user.failedLoginAttempts || 0) + 1
        const lock = attempts >= 5 ? { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) } : {}
        await prisma.user.update({ where: { id: user.id }, data: ({ failedLoginAttempts: attempts, ...lock } as any) })
        return res.status(401).json({ error: 'Invalid credentials' })
      }
      if (!user.isActive || !user.emailVerifiedAt) return res.status(403).json({ error: 'Account not verified or inactive' })
      // Reset attempts on success
      user = await prisma.user.update({ where: { id: user.id }, data: ({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } as any) })
    }
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'Login failed' })
  }

  const token = sign(user.id)
  // In dev, also drop an xuid cookie to resist any local token decode hiccups
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production'
  const allowDevHeaders = (process.env.ALLOW_DEV_HEADERS || '').toLowerCase() === 'true'
  if (allowDevHeaders) {
    res.cookie('xuid', user.id, { httpOnly: true, sameSite: 'lax', secure: isProd })
  }
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
})

// Public sign-up: create pending user, send verification; still inactive until approval
router.post('/signup', loginRateLimiter(), async (req, res) => {
  const body = signupSchema.parse(req.body || {})
  const email = body.email.trim().toLowerCase()
  const hash = await bcrypt.hash(body.password, 10)
  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already registered' })
    const role = await prisma.appRole.findFirst({ where: { name: { equals: 'Client', mode: 'insensitive' } } }) || await prisma.appRole.create({ data: { name: 'Client' } })
    const dept = await prisma.department.findUnique({ where: { id: body.desiredDepartmentId } })
    if (!dept) return res.status(400).json({ error: 'Invalid department' })
    const user = await prisma.user.create({ data: ({
      name: body.name,
      email,
      roleId: role.id,
      departmentId: dept.id,
      passwordHash: hash,
      isActive: false,
      requestedDepartmentId: body.desiredDepartmentId,
      intendedRoleId: body.intendedRoleId || null,
      billable: !!body.billable,
    } as any) })
    const db: any = prisma
    await db.approvalRequest.create({ data: ({ userId: user.id, requestedDepartmentId: body.desiredDepartmentId, requestedRoleId: body.intendedRoleId || null, billable: !!body.billable, referredBy: null, managerName: body.managerName || null } as any) })
    // Send verification email token
    const { raw } = await createToken(user.id, 'EMAIL_VERIFY', 24 * 3600)
    const clientBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173'
    const verifyUrl = `${clientBase}/invite/accept?token=${encodeURIComponent(raw)}`
    if (emailEnabled()) {
      const { subject, html } = renderVerifyEmail(verifyUrl)
      await sendMail(user.email, subject, html)
    }
    return res.status(201).json({ ok: true, ...(emailEnabled() ? {} : { verifyUrl }), userId: user.id })
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'Failed to sign up' })
  }
})

// Optional: create a user with password
router.post('/register', loginRateLimiter(), async (req, res) => {
  // Only super admin can register users (unless explicitly allowed by OPEN_LOGIN in dev)
  const auth = req.header('authorization') || ''
  if (!auth.toLowerCase().startsWith('bearer ')) return res.status(401).json({ error: 'Authentication required' })
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret'
    const payload = jwt.verify(auth.slice(7), secret) as any
    const ok = await isSuperAdminByUserId(String(payload?.sub || ''))
    if (!ok) return res.status(403).json({ error: 'Admin only' })
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { name, email, password, roleId, departmentId } = parsed.data
  const hash = await bcrypt.hash(password, 10)
  try {
    const adminEmail = (await getSuperAdminEmail()).toLowerCase()
    if (email.toLowerCase() === adminEmail) {
      return res.status(400).json({ error: 'Cannot create another super admin' })
    }
    const user = await prisma.user.create({ data: ({ name, email: email.toLowerCase(), roleId, departmentId, passwordHash: hash, isActive: true } as any) })
    // Issue email verification token (invite)
    const { raw } = await createToken(user.id, 'EMAIL_VERIFY', 24 * 3600)
    const clientBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173'
    const verifyUrl = `${clientBase}/invite/accept?token=${encodeURIComponent(raw)}`
    if (emailEnabled()) {
      const { subject, html } = renderInviteEmail(verifyUrl, user.name)
      await sendMail(user.email, subject, html)
    }
    res.status(201).json({ ok: true, user: { id: user.id, name: user.name, email: user.email }, ...(emailEnabled() ? {} : { verifyUrl }) })
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'Failed to register' })
  }
})

// Bootstrap an Admin account quickly in dev mode targeting SUPERADMIN_EMAIL
router.post('/bootstrap-admin', async (_req, res) => {
  const allowBootstrap = (process.env.ALLOW_ADMIN_BOOTSTRAP || process.env.ENABLE_DEV_AUTH || '').toLowerCase() === 'true'
  if (!allowBootstrap) return res.status(403).json({ error: 'Forbidden' })
  const adminEmail = (await getSuperAdminEmail()).toLowerCase()
  const name = 'Admin'
  // Ensure role/department
  const role = await prisma.appRole.findFirst({ where: { name: { equals: 'Director', mode: 'insensitive' } } }) || await prisma.appRole.create({ data: { name: 'Director' } })
  const dept = await prisma.department.findFirst({ where: { name: { equals: 'Executive Department', mode: 'insensitive' } } }) || await prisma.department.create({ data: { name: 'Executive Department' } })
  let user = await prisma.user.findUnique({ where: { email: adminEmail } })
  const adminEnvPass = String(process.env.SUPERADMIN_PASSWORD || '')
  if (!user) {
    const passHash = adminEnvPass ? await bcrypt.hash(adminEnvPass, 10) : null
    user = await prisma.user.create({ data: ({ name, email: adminEmail, roleId: role.id, departmentId: dept.id, isActive: true, emailVerifiedAt: new Date(), ...(passHash ? { passwordHash: passHash } : {}) } as any) })
  } else if (adminEnvPass && !user.passwordHash) {
    // If password not set yet, initialize from env for convenience
    const passHash = await bcrypt.hash(adminEnvPass, 10)
    user = await prisma.user.update({ where: { id: user.id }, data: ({ passwordHash: passHash } as any) })
  }
  const token = sign(user.id)
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production'
  const allowDevHeaders = (process.env.ALLOW_DEV_HEADERS || '').toLowerCase() === 'true'
  if (allowDevHeaders) {
    res.cookie('xuid', user.id, { httpOnly: true, sameSite: 'lax', secure: isProd })
  }
  res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email }, token })
})

// Dev utility: set password for an existing user by email
router.post('/set-password', loginRateLimiter(), async (req, res) => {
  // Restrict in production: self-service or admin only
  const parsed = setPasswordSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { email, password } = parsed.data
  const hash = await bcrypt.hash(password, 10)
  try {
    const prod = (process.env.NODE_ENV || '').toLowerCase() === 'production'
    if (prod) {
      const auth = req.header('authorization') || ''
      if (!auth.toLowerCase().startsWith('bearer ')) return res.status(401).json({ error: 'Authentication required' })
      const secret = process.env.JWT_SECRET || 'dev-secret'
      try {
        const payload = jwt.verify(auth.slice(7), secret) as any
        const me = await prisma.user.findUnique({ where: { id: String(payload?.sub || '') }, include: { role: true } })
        const r = String((me as any)?.role?.name || '').toLowerCase()
        const isRoleAdmin = ['director','manager'].includes(r)
        const isSuper = await isSuperAdminByUserId(String(payload?.sub || ''))
        if (!(isRoleAdmin || isSuper) && String(me?.email || '').toLowerCase() !== email.toLowerCase()) {
          return res.status(403).json({ error: 'Only admins or the same user can change password' })
        }
      } catch {
        return res.status(401).json({ error: 'Invalid token' })
      }
    }
    const user = await prisma.user.update({ where: { email: email.toLowerCase() }, data: ({ passwordHash: hash } as any) })
    res.json({ ok: true, id: user.id })
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'Failed to set password' })
  }
})

// Public self-service registration (defaults to Client role if present)
router.post('/public-register', loginRateLimiter(), async (req, res) => {
  const allowPublic = (process.env.PUBLIC_REGISTRATION || '').toLowerCase() === 'true'
  if (!allowPublic) return res.status(403).json({ error: 'Public registration is disabled' })
  const body = z.object({ name: z.string().min(1), email: z.string().email(), password: strongPassword }).parse(req.body || {})
  const email = body.email.trim().toLowerCase()
  const hash = await bcrypt.hash(body.password, 10)
  try {
    const clientRole = await prisma.appRole.findFirst({ where: { name: { equals: 'Client', mode: 'insensitive' } } })
    const anyDept = await prisma.department.findFirst({})
    if (!clientRole || !anyDept) return res.status(500).json({ error: 'Server not configured for public registration' })
    const user = await prisma.user.create({ data: ({ name: body.name, email, roleId: clientRole.id, departmentId: anyDept.id, passwordHash: hash, isActive: false } as any) })
    const { raw } = await createToken(user.id, 'EMAIL_VERIFY', 24 * 3600)
    const clientBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173'
    const verifyUrl = `${clientBase}/invite/accept?token=${encodeURIComponent(raw)}`
    if (emailEnabled()) {
      const { subject, html } = renderVerifyEmail(verifyUrl)
      await sendMail(user.email, subject, html)
    }
    res.status(201).json({ ok: true, message: 'Check your email to verify your account', ...(emailEnabled() ? {} : { verifyUrl }) })
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email already exists' })
    res.status(400).json({ error: e?.message || 'Failed to register' })
  }
})

// Verify email with token
router.post('/verify-email', async (req, res) => {
  const token = String((req.body?.token || req.query.token || '') as string)
  if (!token) return res.status(400).json({ error: 'Missing token' })
  const rec = await consumeToken('EMAIL_VERIFY', token)
  if (!rec) return res.status(400).json({ error: 'Invalid or expired token' })
  await prisma.user.update({ where: { id: rec.userId }, data: ({ emailVerifiedAt: new Date() } as any) })
  res.json({ ok: true })
})

// Peek invite details without consuming the token
router.get('/invite-info', async (req, res) => {
  try {
    const token = String(req.query.token || '')
    if (!token) return res.status(400).json({ valid: false, status: 'invalid' })
    const tokenHash = hashToken(token)
    const rec = await db.authToken.findFirst({ where: { tokenHash, type: 'EMAIL_VERIFY' as any } })
    if (!rec) return res.json({ valid: false, status: 'invalid' })
    if (rec.usedAt) return res.json({ valid: false, status: 'used' })
    if (rec.expiresAt <= new Date()) return res.json({ valid: false, status: 'expired' })
    const user = await prisma.user.findUnique({ where: { id: rec.userId }, include: { role: true, department: true } })
    if (!user) return res.json({ valid: false, status: 'invalid' })
    return res.json({
      valid: true,
      status: 'ok',
      data: { email: user.email, name: user.name, role: (user as any).role?.name, department: (user as any).department?.name },
    })
  } catch (e: any) {
    return res.status(400).json({ valid: false, status: 'invalid', error: e?.message })
  }
})

// Accept invitation: verify email and set initial password in one step
router.post('/accept-invite', loginRateLimiter(), async (req, res) => {
  const body = z.object({ token: z.string().min(16), password: strongPassword.optional(), name: z.string().min(1).optional(), phone: z.string().optional() }).parse(req.body || {})
  const rec = await consumeToken('EMAIL_VERIFY', body.token)
  if (!rec) return res.status(400).json({ error: 'Invalid or expired token' })
  const data: any = { emailVerifiedAt: new Date() }
  if (body.password) {
    data.passwordHash = await bcrypt.hash(body.password, 10)
  }
  if (body.name) data.name = body.name
  if (typeof body.phone === 'string') data.phone = body.phone
  await prisma.user.update({ where: { id: rec.userId }, data })
  res.json({ ok: true })
})

// Request password reset
router.post('/request-password-reset', loginRateLimiter(), async (req, res) => {
  const email = String(req.body?.email || '').toLowerCase()
  if (!email) return res.status(400).json({ error: 'Email required' })
  const user = await prisma.user.findUnique({ where: { email } })
  // Always respond 200 to prevent enumeration
  if (user) {
    const { raw } = await createToken(user.id, 'PASSWORD_RESET', 3600)
    const clientBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173'
    const resetUrl = `${clientBase}/reset-password?token=${encodeURIComponent(raw)}`
    if (emailEnabled()) {
      const { subject, html } = renderPasswordResetEmail(resetUrl, user.name)
      await sendMail(user.email, subject, html)
    } else {
      console.log('Password reset link (dev):', resetUrl)
    }
  }
  res.json({ ok: true })
})

router.post('/reset-password', loginRateLimiter(), async (req, res) => {
  const body = z.object({ token: z.string().min(16), password: strongPassword }).parse(req.body || {})
  const rec = await consumeToken('PASSWORD_RESET', body.token)
  if (!rec) return res.status(400).json({ error: 'Invalid or expired token' })
  const hash = await bcrypt.hash(body.password, 10)
  await prisma.user.update({ where: { id: rec.userId }, data: ({ passwordHash: hash } as any) })
  res.json({ ok: true })
})

// Validate password reset token without consuming it
router.get('/reset-password/validate', async (req, res) => {
  const token = String(req.query.token || '')
  if (!token) return res.status(400).json({ valid: false, status: 'invalid' })
  try {
    const tokenHash = hashToken(token)
    const rec = await db.authToken.findFirst({ where: { tokenHash, type: 'PASSWORD_RESET' as any } })
    if (!rec) return res.json({ valid: false, status: 'invalid' })
    if (rec.usedAt) return res.json({ valid: false, status: 'used' })
    if (rec.expiresAt <= new Date()) return res.json({ valid: false, status: 'expired' })
    return res.json({ valid: true, status: 'ok' })
  } catch (e: any) {
    return res.status(400).json({ valid: false, status: 'invalid', error: e?.message })
  }
})

// Refresh access token using refresh cookie
router.post('/refresh', async (req, res) => {
  const raw = (req.cookies?.rt || req.body?.refreshToken || '') as string
  if (!raw) return res.status(401).json({ error: 'Missing refresh token' })
  const rec = await consumeToken('REFRESH', raw)
  if (!rec) return res.status(401).json({ error: 'Invalid or expired refresh token' })
  const token = sign(rec.userId)
  const { raw: newRt, expiresAt } = await createToken(rec.userId, 'REFRESH', 30 * 24 * 3600)
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production'
  res.cookie('rt', newRt, { httpOnly: true, secure: isProd, sameSite: 'lax', expires: expiresAt })
  res.json({ token })
})

router.post('/logout', async (req, res) => {
  const raw = (req.cookies?.rt || req.body?.refreshToken || '') as string
  if (raw) {
    const tokenHash = hashToken(raw)
    await db.authToken.deleteMany({ where: { tokenHash, type: 'REFRESH' as any } })
  }
  res.clearCookie('rt')
  res.json({ ok: true })
})

// --- DEV UTILITIES (guarded) ---
const DEV_AUTH = ((process.env.ENABLE_DEV_AUTH || '').toLowerCase() === 'true') || ((process.env.NODE_ENV || '').toLowerCase() !== 'production')
if (DEV_AUTH) {
  // Mark a user as verified
  router.post('/dev/verify-email', async (req, res) => {
    const email = String(req.body?.email || '').toLowerCase()
    if (!email) return res.status(400).json({ error: 'Email required' })
    try {
      const u = await prisma.user.update({ where: { email }, data: ({ emailVerifiedAt: new Date(), isActive: true } as any) })
      return res.json({ ok: true, id: u.id })
    } catch (e: any) {
      return res.status(400).json({ error: e?.message || 'Failed to verify' })
    }
  })
  // Set a password without requiring auth
  router.post('/dev/set-password', async (req, res) => {
    const email = String(req.body?.email || '').toLowerCase()
    const password = String(req.body?.password || '')
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const hash = await bcrypt.hash(password, 10)
    try {
      const u = await prisma.user.update({ where: { email }, data: ({ passwordHash: hash } as any) })
      return res.json({ ok: true, id: u.id })
    } catch (e: any) {
      return res.status(400).json({ error: e?.message || 'Failed to set password' })
    }
  })

  // Impersonate a user (sets a dev cookie that middleware reads)
  router.post('/dev/impersonate', async (req, res) => {
    const { userId, email } = req.body || {}
    let id = String(userId || '')
    try {
      if (!id && email) {
        const u = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } })
        if (!u) return res.status(404).json({ error: 'User not found' })
        id = u.id
      }
      if (!id) return res.status(400).json({ error: 'userId or email required' })
      // Ensure exists
      const u = await prisma.user.findUnique({ where: { id } })
      if (!u) return res.status(404).json({ error: 'User not found' })
      const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production'
      res.cookie('xuid', id, { httpOnly: true, sameSite: 'lax', secure: isProd })
      return res.json({ ok: true, id })
    } catch (e: any) {
      return res.status(400).json({ error: e?.message || 'Failed to impersonate' })
    }
  })

  // Clear impersonation
  router.post('/dev/clear-impersonate', async (_req, res) => {
    res.clearCookie('xuid')
    res.json({ ok: true })
  })
}

export default router
