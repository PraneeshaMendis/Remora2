import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { requireSuperAdmin } from '../middleware/super-admin.ts'
import crypto from 'crypto'
import { emailEnabled, renderInviteEmail, sendMail } from '../utils/mailer.ts'
import { prisma } from '../prisma.ts'

const router = Router()

// Create or resolve role/department by name (case-insensitive)
async function ensureRole(name: string) {
  const found = await prisma.appRole.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
  if (found) return found
  return prisma.appRole.create({ data: { name } })
}
async function ensureDepartment(name: string) {
  const found = await prisma.department.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
  if (found) return found
  return prisma.department.create({ data: { name } })
}

// Protect all admin endpoints
router.use(requireSuperAdmin)

// Admin register user without needing role/department IDs
router.post('/register-user', async (req, res) => {
  const body = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    roleName: z.string().min(1),
    departmentName: z.string().min(1),
    verify: z.coerce.boolean().optional().default(true),
    active: z.coerce.boolean().optional().default(true),
  }).parse(req.body || {})

  try {
    // Prevent creating another super-admin account by email
    const adminEmail = String(process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase()
    if (body.email.trim().toLowerCase() === adminEmail) {
      return res.status(400).json({ error: 'Cannot create another super admin' })
    }
    const [role, dept] = await Promise.all([
      ensureRole(body.roleName),
      ensureDepartment(body.departmentName),
    ])
    const hash = await bcrypt.hash(body.password, 10)
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        roleId: role.id,
        departmentId: dept.id,
        passwordHash: hash,
        isActive: body.active,
        emailVerifiedAt: body.verify ? new Date() : null,
      },
    })
    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: role.name,
      department: dept.name,
      isActive: user.isActive,
      verified: !!user.emailVerifiedAt,
    })
  } catch (e: any) {
    if (e?.code === 'P2002') return res.status(409).json({ error: 'Email already exists' })
    res.status(400).json({ error: e?.message || 'Failed to register user' })
  }
})

// Convenience: list roles and departments (names only)
router.get('/catalog', async (_req, res) => {
  const [roles, depts] = await Promise.all([
    prisma.appRole.findMany({ orderBy: { name: 'asc' } }),
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
  ])
  res.json({ roles: roles.map(r => r.name), departments: depts.map(d => d.name) })
})

export default router

// Invite a user by email: creates the user (approved/active), sends invite email to set password & verify
router.post('/invite-user', async (req, res) => {
  const body = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    roleName: z.string().min(1).optional(),
    departmentName: z.string().min(1),
  }).parse(req.body || {})
  try {
    // Resolve or create role/department
    const role = body.roleName
      ? await ensureRole(body.roleName)
      : (await prisma.appRole.findFirst({ where: { name: { equals: 'Client', mode: 'insensitive' } } })) || await ensureRole('Client')
    const dept = await ensureDepartment(body.departmentName)
    const email = body.email.toLowerCase()
    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({ data: ({
        name: body.name,
        email,
        roleId: (role as any).id,
        departmentId: dept.id,
        isActive: true,
        emailVerifiedAt: null,
      } as any) })
    }
    // Approve immediately
    await prisma.approvalRequest.upsert({
      where: { userId: user.id },
      update: { status: 'APPROVED', decidedById: (req as any).userId, decidedAt: new Date() },
      create: { userId: user.id, status: 'APPROVED', decidedById: (req as any).userId, decidedAt: new Date(), requestedDepartmentId: dept.id, requestedRoleId: (role as any).id },
    })
    // Create email verification token and send invite
    const raw = await createVerifyToken(user.id, 24 * 3600)
    // Fallback to our local helper
    const clientBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173'
    const verifyUrl = `${clientBase}/invite/accept?token=${encodeURIComponent(raw)}`
    if (emailEnabled()) {
      const { subject, html } = renderInviteEmail(verifyUrl, user.name, (role as any)?.name, dept.name)
      await sendMail(user.email, subject, html)
    }
    res.status(201).json({ ok: true, id: user.id, email: user.email, ...(emailEnabled() ? {} : { verifyUrl }) })
  } catch (e: any) {
    if (e?.code === 'P2002') return res.status(409).json({ error: 'Email already exists' })
    res.status(400).json({ error: e?.message || 'Failed to invite user' })
  }
})

// Dangerous: purge all users except super admin. Attempts deletion; if constrained, deactivate and scrub.
router.post('/purge-non-admin-users', async (_req, res) => {
  const adminEmail = String(process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase()
  if (!adminEmail) return res.status(500).json({ error: 'SUPERADMIN_EMAIL not configured' })
  try {
    const survivor = await prisma.user.findFirst({ where: { email: adminEmail } })
    let deleted = 0
    let scrubbed = 0
    const others = await prisma.user.findMany({ where: { NOT: { email: adminEmail } } })
    for (const u of others) {
      try {
        await prisma.user.delete({ where: { id: u.id } })
        deleted++
      } catch {
        // FKs present; scrub instead
        const newEmail = `archived+${u.id}@example.com`
        await prisma.user.update({ where: { id: u.id }, data: { isActive: false, email: newEmail, name: 'Archived User', passwordHash: null } as any })
        scrubbed++
      }
    }
    res.json({ ok: true, kept: survivor ? 1 : 0, deleted, scrubbed })
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to purge users' })
  }
})
function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}
async function createVerifyToken(userId: string, ttlSeconds: number) {
  const raw = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(raw)
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
  await prisma.authToken.create({ data: { userId, type: 'EMAIL_VERIFY' as any, tokenHash, expiresAt } })
  return raw
}
