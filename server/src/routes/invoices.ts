import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.ts'
import { authRequired } from '../middleware/auth-required.ts'
import { createNotifications } from '../utils/notifications.ts'

const db: any = prisma
const router = Router()

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

async function getExecutiveRecipients(): Promise<Array<{ id: string; name: string }>> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { department: { name: { equals: 'Executive Department', mode: 'insensitive' } } },
        { role: { name: { equals: 'admin', mode: 'insensitive' } } },
      ],
    },
    select: { id: true, name: true },
  })
  return users.map(u => ({ id: u.id, name: u.name || 'Executive' }))
}

function mapInvoice(i: any) {
  return {
    id: i.id,
    invoiceNo: i.invoiceNo,
    createdById: i.createdById || null,
    createdByName: i.createdBy?.name || '',
    approvedById: i.approvedById || null,
    approvedByName: i.approvedBy?.name || '',
    projectId: i.projectId,
    phaseId: i.phaseId,
    projectName: i.project?.title || '',
    phaseName: i.phase?.name || '',
    clientCompanyName: i.clientCompanyName || '',
    clientAddress: i.clientAddress || '',
    clientPhone: i.clientPhone || '',
    clientName: i.clientName || '',
    clientDesignation: i.clientDesignation || '',
    issueDate: i.issueDate,
    dueDate: i.dueDate,
    currency: i.currency,
    subtotal: i.subtotal,
    taxAmount: i.taxAmount,
    total: i.total,
    collected: i.collected,
    outstanding: i.outstanding,
    status: i.status,
    approvalStatus: i.approvalStatus || 'PENDING',
    approvalNote: i.approvalNote || '',
    approvedAt: i.approvedAt || null,
    pdfKey: i.pdfKey || null,
    notes: i.notes || '',
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }
}

router.get('/', authRequired, async (_req: Request, res: Response) => {
  const list = await db.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    include: { project: true, phase: true, createdBy: true, approvedBy: true },
  })
  res.json(list.map(mapInvoice))
})

const createSchema = z.object({
  invoiceNo: z.string(),
  projectId: z.string(),
  phaseId: z.string(),
  clientCompanyName: z.string().optional(),
  clientAddress: z.string().optional(),
  clientPhone: z.string().optional(),
  clientName: z.string().optional(),
  clientDesignation: z.string().optional(),
  issueDate: z.string(),
  dueDate: z.string(),
  currency: z.string().default('USD'),
  subtotal: z.number().nonnegative().default(0),
  taxAmount: z.number().nonnegative().default(0),
  total: z.number().nonnegative().default(0),
  notes: z.string().optional().default(''),
})

router.post('/', authRequired, async (req: Request, res: Response) => {
  const actorId = (req as any).userId as string
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const data = parsed.data
  try {
    const created = await db.invoice.create({
      data: {
        invoiceNo: data.invoiceNo,
        createdById: actorId,
        projectId: data.projectId,
        phaseId: data.phaseId,
        clientCompanyName: data.clientCompanyName || undefined,
        clientAddress: data.clientAddress || undefined,
        clientPhone: data.clientPhone || undefined,
        clientName: data.clientName || undefined,
        clientDesignation: data.clientDesignation || undefined,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        currency: data.currency,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        total: data.total,
        collected: 0,
        outstanding: data.total,
        status: 'DRAFT',
        approvalStatus: 'PENDING',
        notes: data.notes || '',
      },
      include: { project: true, phase: true, createdBy: true, approvedBy: true },
    })
    try {
      const execs = await getExecutiveRecipients()
      if (execs.length) {
        await createNotifications(execs.map(e => ({
          userId: e.id,
          type: 'INVOICE_APPROVAL',
          title: 'Invoice approval required',
          message: `Invoice ${created.invoiceNo} is awaiting approval.`,
          targetUrl: '/slips-invoices',
        })))
      }
    } catch {}
    res.status(201).json(mapInvoice(created))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to create invoice' })
  }
})

const updateSchema = createSchema.partial()
router.patch('/:id', authRequired, async (req: Request, res: Response) => {
  const actorId = (req as any).userId as string
  const id = req.params.id
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const data = parsed.data as any
  if (data.issueDate !== undefined) data.issueDate = new Date(data.issueDate)
  if (data.dueDate !== undefined) data.dueDate = new Date(data.dueDate)
  const existing = await db.invoice.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const isExec = await isExecutiveMember(actorId)
  if (!isExec && existing.approvalStatus && ['CHANGES_REQUESTED', 'REJECTED'].includes(String(existing.approvalStatus))) {
    data.approvalStatus = 'PENDING'
    data.approvalNote = null
    data.approvedById = null
    data.approvedAt = null
    try {
      const execs = await getExecutiveRecipients()
      if (execs.length) {
        await createNotifications(execs.map(e => ({
          userId: e.id,
          type: 'INVOICE_APPROVAL',
          title: 'Invoice resubmitted',
          message: `Invoice ${existing.invoiceNo} was updated and resubmitted for approval.`,
          targetUrl: '/slips-invoices',
        })))
      }
    } catch {}
  }
  try {
    const updated = await db.invoice.update({ where: { id }, data, include: { project: true, phase: true, createdBy: true, approvedBy: true } })
    res.json(mapInvoice(updated))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to update invoice' })
  }
})

router.delete('/:id', authRequired, async (req: Request, res: Response) => {
  const id = req.params.id
  try {
    await db.invoice.delete({ where: { id } })
    res.status(204).end()
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to delete invoice' })
  }
})

router.post('/:id/mark-paid', authRequired, async (req: Request, res: Response) => {
  const id = req.params.id
  try {
    const inv = await db.invoice.findUnique({ where: { id } })
    if (!inv) return res.status(404).json({ error: 'Not found' })
    const updated = await db.invoice.update({
      where: { id },
      data: { collected: inv.total, outstanding: 0, status: 'PAID' },
      include: { project: true, phase: true, createdBy: true, approvedBy: true },
    })
    res.json(mapInvoice(updated))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to mark invoice paid' })
  }
})

const reviewSchema = z.object({
  action: z.enum(['approve', 'changes', 'reject']),
  note: z.string().optional(),
})

const requestApprovalSchema = z.object({
  reviewerId: z.string().min(1),
  note: z.string().optional(),
})

router.post('/:id/request-approval', authRequired, async (req: Request, res: Response) => {
  const id = req.params.id
  const parsed = requestApprovalSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())

  const inv = await db.invoice.findUnique({ where: { id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })

  if (String(inv.approvalStatus || '').toUpperCase() === 'APPROVED') {
    return res.status(409).json({ error: 'Invoice already approved' })
  }

  const reviewerId = parsed.data.reviewerId
  const reviewerIsExec = await isExecutiveMember(reviewerId)
  if (!reviewerIsExec) return res.status(400).json({ error: 'Reviewer must be in executive department' })

  const note = String(parsed.data.note || '').trim()
  try {
    await createNotifications([{
      userId: reviewerId,
      type: 'INVOICE_APPROVAL',
      title: 'Invoice approval requested',
      message: note
        ? `${note}\n\nInvoice ${inv.invoiceNo} is awaiting your approval.`
        : `Invoice ${inv.invoiceNo} is awaiting your approval.`,
      targetUrl: '/slips-invoices',
    }])
  } catch {}

  res.json({ ok: true })
})

router.post('/:id/review', authRequired, async (req: Request, res: Response) => {
  const actorId = (req as any).userId as string
  const id = req.params.id
  const parsed = reviewSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const isExec = await isExecutiveMember(actorId)
  if (!isExec) return res.status(403).json({ error: 'Executive approval required' })
  const inv = await db.invoice.findUnique({ where: { id }, include: { project: true, phase: true, createdBy: true, approvedBy: true } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  const action = parsed.data.action
  const nextStatus = action === 'approve'
    ? 'APPROVED'
    : action === 'changes'
      ? 'CHANGES_REQUESTED'
      : 'REJECTED'
  const updated = await db.invoice.update({
    where: { id },
    data: {
      approvalStatus: nextStatus,
      approvalNote: parsed.data.note || null,
      approvedById: actorId,
      approvedAt: new Date(),
    },
    include: { project: true, phase: true, createdBy: true, approvedBy: true },
  })
  try {
    const creatorId = updated.createdById
    if (creatorId) {
      await createNotifications([{
        userId: creatorId,
        type: 'INVOICE_APPROVAL',
        title: `Invoice ${updated.invoiceNo} ${nextStatus.replace('_', ' ').toLowerCase()}`,
        message: parsed.data.note
          ? parsed.data.note
          : `Your invoice ${updated.invoiceNo} was ${nextStatus.replace('_', ' ').toLowerCase()}.`,
        targetUrl: '/slips-invoices',
      }])
    }
  } catch {}
  res.json(mapInvoice(updated))
})

export default router
