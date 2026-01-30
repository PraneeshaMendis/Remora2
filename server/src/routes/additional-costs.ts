import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.ts'
import { authRequired } from '../middleware/auth-required.ts'

const router = Router()

function hasModel(name: string) {
  const db = prisma as any
  const model = db?.[name]
  return model && typeof model.findMany === 'function'
}

const createSchema = z.object({
  projectId: z.string().min(1),
  phaseId: z.string().optional().nullable(),
  taskId: z.string().optional().nullable(),
  category: z.string().min(1),
  customCategory: z.string().optional().nullable(),
  amount: z.number().nonnegative(),
  note: z.string().optional().nullable(),
  spentAt: z.string().datetime(),
})

router.get('/', async (req: Request, res: Response) => {
  if (!hasModel('additionalCost')) return res.json([])
  const projectId = String(req.query.projectId || '')
  if (!projectId) return res.status(400).json({ error: 'projectId required' })
  const phaseId = req.query.phaseId ? String(req.query.phaseId) : ''
  const taskId = req.query.taskId ? String(req.query.taskId) : ''

  const where: any = { projectId }
  if (phaseId && phaseId !== 'all') where.phaseId = phaseId
  if (taskId) where.taskId = taskId

  const list = await prisma.additionalCost.findMany({
    where,
    orderBy: { spentAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, title: true } },
      phase: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
    },
  })

  res.json(
    list.map(cost => ({
      ...cost,
      userName: cost.user?.name || null,
      userEmail: cost.user?.email || null,
      projectName: cost.project?.title || null,
      phaseName: cost.phase?.name || null,
      taskTitle: cost.task?.title || null,
    })),
  )
})

router.post('/', authRequired, async (req: Request, res: Response) => {
  if (!hasModel('additionalCost')) return res.status(501).json({ error: 'Additional costs not migrated yet' })
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const userId = (req as any).userId as string
  const data = parsed.data

  const category = data.category.trim()
  const isOther = category.toLowerCase() === 'other'
  const customCategory = isOther ? data.customCategory?.trim() : null
  if (isOther && !customCategory) {
    return res.status(400).json({ error: 'Custom category required for Other' })
  }

  try {
    const created = await prisma.additionalCost.create({
      data: {
        projectId: data.projectId,
        phaseId: data.phaseId || null,
        taskId: data.taskId || null,
        userId,
        category,
        customCategory: customCategory || null,
        amount: data.amount,
        note: data.note?.trim() || null,
        spentAt: new Date(data.spentAt),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    res.status(201).json({
      ...created,
      userName: created.user?.name || null,
      userEmail: created.user?.email || null,
    })
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to add cost' })
  }
})

export default router
