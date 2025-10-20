import { Router, Request, Response } from 'express'
import { PrismaClient, TaskStatus } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()
const router = Router()

router.post('/phases/:phaseId/tasks', async (req: Request, res: Response) => {
  const phaseId = req.params.phaseId
  const schema = z.object({
    title: z.string(),
    description: z.string().default(''),
    dueDate: z.string().datetime().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { title, description, dueDate } = parsed.data
  const task = await prisma.task.create({ data: { title, description, dueDate: dueDate ? new Date(dueDate) : null, phaseId } })
  res.status(201).json(task)
})

router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      timeLogs: true,
      comments: true,
      documents: true,
      phase: { include: { project: true } },
    },
  })
  if (!task) return res.status(404).json({ error: 'Not found' })
  res.json(task)
})

router.patch('/:id', async (req: Request, res: Response) => {
  const id = req.params.id
  const schema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    dueDate: z.string().datetime().nullable().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const data: any = { ...parsed.data }
  if (data.dueDate !== undefined) {
    data.dueDate = data.dueDate ? new Date(data.dueDate) : null
  }
  const task = await prisma.task.update({ where: { id }, data })
  res.json(task)
})

export default router
