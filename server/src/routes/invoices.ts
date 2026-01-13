import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.ts'

const db: any = prisma
const router = Router()

function mapInvoice(i: any) {
  return {
    id: i.id,
    invoiceNo: i.invoiceNo,
    projectId: i.projectId,
    phaseId: i.phaseId,
    projectName: i.project?.title || '',
    phaseName: i.phase?.name || '',
    issueDate: i.issueDate,
    dueDate: i.dueDate,
    currency: i.currency,
    subtotal: i.subtotal,
    taxAmount: i.taxAmount,
    total: i.total,
    collected: i.collected,
    outstanding: i.outstanding,
    status: i.status,
    pdfKey: i.pdfKey || null,
    notes: i.notes || '',
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const list = await db.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    include: { project: true, phase: true },
  })
  res.json(list.map(mapInvoice))
})

const createSchema = z.object({
  invoiceNo: z.string(),
  projectId: z.string(),
  phaseId: z.string(),
  issueDate: z.string(),
  dueDate: z.string(),
  currency: z.string().default('USD'),
  subtotal: z.number().nonnegative().default(0),
  taxAmount: z.number().nonnegative().default(0),
  total: z.number().nonnegative().default(0),
  notes: z.string().optional().default(''),
})

router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const data = parsed.data
  try {
    const created = await db.invoice.create({
      data: {
        invoiceNo: data.invoiceNo,
        projectId: data.projectId,
        phaseId: data.phaseId,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        currency: data.currency,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        total: data.total,
        collected: 0,
        outstanding: data.total,
        status: 'DRAFT',
        notes: data.notes || '',
      },
      include: { project: true, phase: true },
    })
    res.status(201).json(mapInvoice(created))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to create invoice' })
  }
})

const updateSchema = createSchema.partial()
router.patch('/:id', async (req: Request, res: Response) => {
  const id = req.params.id
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const data = parsed.data as any
  if (data.issueDate !== undefined) data.issueDate = new Date(data.issueDate)
  if (data.dueDate !== undefined) data.dueDate = new Date(data.dueDate)
  try {
    const updated = await db.invoice.update({ where: { id }, data, include: { project: true, phase: true } })
    res.json(mapInvoice(updated))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to update invoice' })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params.id
  try {
    await db.invoice.delete({ where: { id } })
    res.status(204).end()
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to delete invoice' })
  }
})

router.post('/:id/mark-paid', async (req: Request, res: Response) => {
  const id = req.params.id
  try {
    const inv = await db.invoice.findUnique({ where: { id } })
    if (!inv) return res.status(404).json({ error: 'Not found' })
    const updated = await db.invoice.update({
      where: { id },
      data: { collected: inv.total, outstanding: 0, status: 'PAID' },
      include: { project: true, phase: true },
    })
    res.json(mapInvoice(updated))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to mark invoice paid' })
  }
})

export default router
