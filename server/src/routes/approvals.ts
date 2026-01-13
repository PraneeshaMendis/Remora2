import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireSuperAdmin } from '../middleware/super-admin.ts'
import { emailEnabled, renderApprovedEmail, sendMail } from '../utils/mailer.ts'

const prisma = new PrismaClient()
const router = Router()

async function isSuperAdmin(userId: string | null) {
  if (!userId) return false
  const adminEmail = String(process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase()
  if (!adminEmail) return false
  const u = await prisma.user.findUnique({ where: { id: userId } })
  return !!u && String(u.email).toLowerCase() === adminEmail
}

async function isDeptLead(userId: string | null, deptId: string | null) {
  if (!userId || !deptId) return false
  const db: any = prisma
  const dept = await db.department.findUnique({ where: { id: deptId } })
  return !!dept && String(dept.leadId || '') === String(userId)
}

// List pending approvals (super admin sees all; dept leads see only their dept)
router.get('/pending', async (req, res) => {
  const actorId = (req as any).userId as string | null
  if (!actorId) return res.status(401).json({ error: 'Authentication required' })
  const superAdmin = await isSuperAdmin(actorId)
  const db: any = prisma
  const leadDepts: any[] = await db.department.findMany({ where: { leadId: actorId } })
  const where: any = { status: 'PENDING' }
  if (!superAdmin) {
    if (!leadDepts.length) return res.json({ items: [], total: 0 })
    where.requestedDepartmentId = { in: leadDepts.map(d => d.id) }
  }
  const rows = await db.approvalRequest.findMany({ where, include: { user: true }, orderBy: { submittedAt: 'asc' } })
  const items = rows.map((r: any) => ({
    id: r.id,
    userId: r.userId,
    name: (r as any).user?.name || '',
    email: (r as any).user?.email || '',
    requestedDepartmentId: r.requestedDepartmentId,
    requestedRoleId: r.requestedRoleId,
    status: r.status,
    billable: r.billable,
    submittedAt: r.submittedAt,
  }))
  res.json({ items, total: items.length })
})

// Approve a user
router.post('/:userId/approve', async (req, res) => {
  const actorId = (req as any).userId as string | null
  if (!actorId) return res.status(401).json({ error: 'Authentication required' })
  const body = z.object({
    departmentId: z.string().min(1),
    roleId: z.string().min(1),
    active: z.coerce.boolean().default(true),
    billable: z.coerce.boolean().optional(),
    billRate: z.coerce.number().optional(),
    costRate: z.coerce.number().optional(),
    utilizationTarget: z.coerce.number().optional(),
    skills: z.array(z.string()).optional(),
    managerId: z.string().optional(),
  }).parse(req.body || {})
  if (actorId === req.params.userId) return res.status(403).json({ error: 'Self-approval is not allowed' })
  const superAdmin = await isSuperAdmin(actorId)
  const isLead = await isDeptLead(actorId, body.departmentId)
  if (!(superAdmin || isLead)) return res.status(403).json({ error: 'Not authorized to approve for this department' })

  try {
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: ({
        departmentId: body.departmentId,
        roleId: body.roleId,
        isActive: body.active,
        billable: body.billable ?? false,
        billRate: body.billRate,
        costRate: body.costRate,
        utilizationTarget: body.utilizationTarget,
        skills: body.skills as any,
        managerId: body.managerId || null,
      } as any),
    })
    await (prisma as any).approvalRequest.update({ where: { userId: req.params.userId }, data: { status: 'APPROVED', decidedById: actorId, decidedAt: new Date() } })
    // Audit
    const db: any = prisma
    await db.adminAudit.create({ data: { adminId: actorId!, targetUserId: user.id, action: 'APPROVE_USER', details: `dept=${body.departmentId}, role=${body.roleId}, active=${body.active}` } })
    // Send welcome/approved email
    if (emailEnabled()) {
      const clientBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173'
      const { subject, html } = renderApprovedEmail(clientBase)
      try { await sendMail(user.email, subject, html) } catch {}
    }
    res.json({ ok: true, id: user.id })
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Approval failed' })
  }
})

// Reject a user
router.post('/:userId/reject', async (req, res) => {
  const actorId = (req as any).userId as string | null
  if (!actorId) return res.status(401).json({ error: 'Authentication required' })
  const body = z.object({ reason: z.string().min(3) }).parse(req.body || {})
  if (actorId === req.params.userId) return res.status(403).json({ error: 'Self-rejection is not allowed' })
  const db: any = prisma
  const ar = await (db as any).approvalRequest.findUnique({ where: { userId: req.params.userId } })
  const superAdmin = await isSuperAdmin(actorId)
  const isLead = await isDeptLead(actorId, ar?.requestedDepartmentId || null)
  if (!(superAdmin || isLead)) return res.status(403).json({ error: 'Not authorized to reject' })
  try {
    await (prisma as any).approvalRequest.update({ where: { userId: req.params.userId }, data: { status: 'REJECTED', reason: body.reason, decidedById: actorId, decidedAt: new Date() } })
    await prisma.user.update({ where: { id: req.params.userId }, data: ({ isActive: false } as any) })
    await db.adminAudit.create({ data: { adminId: actorId!, targetUserId: req.params.userId, action: 'REJECT_USER', details: body.reason } })
    res.json({ ok: true })
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Reject failed' })
  }
})

export default router
