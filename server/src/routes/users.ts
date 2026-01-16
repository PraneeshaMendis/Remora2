import { Router } from 'express'
import { z } from 'zod'
import { requireSuperAdmin } from '../middleware/super-admin.ts'
import { authRequired } from '../middleware/auth-required.ts'
import { getSuperAdminEmail } from '../utils/settings.ts'
import { isSuperAdminByUserId } from '../middleware/super-admin.ts'
import { prisma } from '../prisma.ts'

const router = Router()

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  roleId: z.string().optional(),
  departmentId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

router.get('/', requireSuperAdmin, async (req, res) => {
  const parsed = paginationSchema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { page, limit, search, roleId, departmentId, isActive } = parsed.data
  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search.toLowerCase(), mode: 'insensitive' } },
    ]
  }
  if (roleId) where.roleId = roleId
  if (departmentId) where.departmentId = departmentId
  if (isActive !== undefined) where.isActive = isActive

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { role: { select: { name: true } }, department: { select: { name: true } } },
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])
  const items = rows.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isActive: u.isActive,
    verified: !!(u as any).emailVerifiedAt,
    roleId: (u as any).roleId,
    departmentId: (u as any).departmentId,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    role: (u as any).role?.name?.toLowerCase?.() || '',
    department: (u as any).department?.name || '',
  }))
  res.json({ total, page, limit, items })
})

// Lightweight reviewer list for document assignment (any authenticated user)
router.get('/reviewers', authRequired, async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    include: { role: { select: { name: true } }, department: { select: { name: true } } },
    orderBy: [{ name: 'asc' }],
  })
  res.json(users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u as any).role?.name || '',
    department: (u as any).department?.name || '',
  })))
})

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  roleId: z.string(),
  departmentId: z.string(),
  isActive: z.boolean().optional(),
})

router.post('/', requireSuperAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { name, email, roleId, departmentId, isActive } = parsed.data
  try {
    const user = await prisma.user.create({
      data: { name, email: email.trim().toLowerCase(), roleId, departmentId, isActive: isActive ?? true },
    })
    res.status(201).json(user)
  } catch (e: any) {
    if (e.code === 'P2002' && e.meta?.target?.includes('email')) {
      return res.status(409).json({ error: 'Email already exists' })
    }
    res.status(400).json({ error: e?.message || 'Failed to create user' })
  }
})

// Current user profile based on x-user-id header
// Current user profile with dev-friendly fallbacks
router.get('/me', async (req, res) => {
  const auth = String(req.header('authorization') || '')
  const allowDevHeaders = (process.env.ALLOW_DEV_HEADERS || '').toLowerCase() === 'true'
  let userId = (req as any).userId as string | null
  let u: any = null

  try {
    // If a bearer token is present but invalid, attempt dev cookie fallback when allowed
    const hasBearer = auth.toLowerCase().startsWith('bearer ')
    if (hasBearer && !userId && allowDevHeaders) {
      const fromCookie = (req as any).cookies?.xuid || ''
      if (fromCookie) userId = String(fromCookie)
    }
    if (userId) {
      u = await prisma.user.findUnique({ where: { id: userId }, include: { role: true, department: true } })
    }
    // Fallback by email header (dev convenience) only when dev headers are allowed and no bearer is present
    if (!u && allowDevHeaders && !hasBearer) {
      const email = String(req.header('x-email') || req.query.email || '').toLowerCase()
      if (email) {
        u = await prisma.user.findUnique({ where: { email }, include: { role: true, department: true } })
      }
    }
    // Last resort: pick the first user in DB only in dev header mode and without bearer
    if (!u && allowDevHeaders && !hasBearer) {
      u = await prisma.user.findFirst({ include: { role: true, department: true }, orderBy: { createdAt: 'asc' } })
    }
    // Auto-provision a default admin only if the database is empty
    if (!u) {
      const userCount = await prisma.user.count()
      if (userCount === 0) {
        const role = await prisma.appRole.findFirst({}) || await prisma.appRole.create({ data: { name: 'Director' } })
        const dept = await prisma.department.findFirst({}) || await prisma.department.create({ data: { name: 'Executive Department' } })
        u = await prisma.user.create({ data: ({ name: 'Admin', email: 'admin@company.com', roleId: role.id, departmentId: dept.id, isActive: true, emailVerifiedAt: new Date() } as any), include: { role: true, department: true } })
      } else {
        return res.status(401).json({ error: 'Unauthorized' })
      }
    }

    // Resolve super-admin flag by id or email
    const superById = await isSuperAdminByUserId(userId)
    const adminEmail = (await getSuperAdminEmail()).toLowerCase()
    const isSuper = superById || (!!adminEmail && String(u?.email || '').toLowerCase() === adminEmail)

    const me = {
      id: u.id,
      name: u.name,
      email: u.email,
      isActive: u.isActive,
      role: isSuper ? 'admin' : ((u as any).role?.name?.toLowerCase?.() || ''),
      department: (u as any).department?.name || '',
      lastActive: new Date().toISOString(),
      isSuperAdmin: isSuper,
    }
    res.json(me)
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to resolve current user' })
  }
})

router.get('/:id', requireSuperAdmin, async (req, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { role: true, department: true },
  })
  if (!u) return res.status(404).json({ error: 'Not found' })
  const user = {
    id: u.id,
    name: u.name,
    email: u.email,
    isActive: u.isActive,
    verified: !!(u as any).emailVerifiedAt,
    roleId: (u as any).roleId,
    departmentId: (u as any).departmentId,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    role: (u as any).role?.name?.toLowerCase?.() || '',
    department: (u as any).department?.name || '',
  }
  res.json(user)
})

const updateUserSchema = createUserSchema.partial()
router.patch('/:id', requireSuperAdmin, async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const data = { ...parsed.data } as any
  if (data.email) data.email = data.email.trim().toLowerCase()
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data })
    res.json(user)
  } catch (e: any) {
    if (e.code === 'P2002' && e.meta?.target?.includes('email')) {
      return res.status(409).json({ error: 'Email already exists' })
    }
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found' })
    res.status(400).json({ error: e?.message || 'Failed to update user' })
  }
})

router.delete('/:id', requireSuperAdmin, async (req, res) => {
  const id = String(req.params.id)
  const hard = String(req.query.hard || req.query.force || '').toLowerCase() === 'true'
  try {
    const u = await prisma.user.findUnique({ where: { id } })
    if (!u) return res.status(404).json({ error: 'Not found' })
    const adminEmail = String(process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase()
    if (adminEmail && String(u.email).toLowerCase() === adminEmail) {
      return res.status(403).json({ error: 'Cannot delete super admin user' })
    }

    if (hard) {
      // Deep cleanup then delete
      const adminUser = await prisma.user.findFirst({ where: { email: adminEmail } })
      if (!adminUser) return res.status(500).json({ error: 'Super admin user not found' })
      await prisma.$transaction(async (tx) => {
        // Remove memberships (will also detach task assignees via join)
        await tx.projectMembership.deleteMany({ where: { userId: id } })
        // Delete logs and notifications
        await tx.timeLog.deleteMany({ where: { userId: id } })
        await tx.notification.deleteMany({ where: { userId: id } })
        // Auth tokens
        await tx.authToken.deleteMany({ where: { userId: id } })
        // Calendar related
        await tx.calendarOAuthState.deleteMany({ where: { userId: id } })
        await tx.calendarSource.deleteMany({ where: { userId: id } })
        await tx.calendarAccount.deleteMany({ where: { userId: id } })
        // Documents: reassign creator to admin, clear reviewer
        await tx.document.updateMany({ where: { reviewerId: id }, data: { reviewerId: null } })
        await tx.document.updateMany({ where: { createdById: id }, data: { createdById: adminUser.id } })
        // History events: reassign creator
        await tx.historyEvent.updateMany({ where: { createdById: id }, data: { createdById: adminUser.id } })
        // Comments: reassign author
        await tx.comment.updateMany({ where: { authorId: id }, data: { authorId: adminUser.id } })
        // Projects: clear owner if this user
        await tx.project.updateMany({ where: { ownerId: id }, data: { ownerId: null } })
        // Impersonation sessions involving this user
        try {
          const db: any = tx as any
          await db.impersonationSession.deleteMany({ where: { OR: [{ userId: id }, { adminId: id }] } })
        } catch {}
        // Finally delete the user (AuthTokens cascade)
        await tx.user.delete({ where: { id } })
      })
      return res.status(204).end()
    }

    // Try simple delete; on FK failure, scrub
    try {
      await prisma.user.delete({ where: { id } })
      return res.status(204).end()
    } catch (e: any) {
      if (e?.code === 'P2003' || e?.code === 'P2014' || String(e?.message || '').toLowerCase().includes('foreign key')) {
        const newEmail = `archived+${id}@example.com`
        await prisma.user.update({ where: { id }, data: ({ isActive: false, email: newEmail, name: 'Archived User', passwordHash: null } as any) })
        return res.status(200).json({ ok: true, scrubbed: true })
      }
      throw e
    }
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Not found' })
    return res.status(400).json({ error: e?.message || 'Failed to delete user' })
  }
})

export default router
