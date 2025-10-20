import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()
const router = Router()

const createSchema = z.object({
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  description: z.string(),
})

router.post('/tasks/:taskId/timelogs', async (req: Request, res: Response) => {
  const userId = (req as any).userId
  if (!userId) return res.status(401).json({ error: 'x-user-id required' })
  const taskId = req.params.taskId
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { startedAt, endedAt, description } = parsed.data
  const start = new Date(startedAt)
  const end = new Date(endedAt)
  const durationMins = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
  const log = await prisma.timeLog.create({
    data: { taskId, userId, startedAt: start, endedAt: end, durationMins, description },
  })
  res.status(201).json(log)
})

router.get('/tasks/:taskId/timelogs', async (req: Request, res: Response) => {
  const scope = (req.query.scope as string) || 'all'
  const taskId = req.params.taskId
  const where: any = { taskId }
  if (scope === 'mine') {
    const userId = (req as any).userId
    if (!userId) return res.status(401).json({ error: 'x-user-id required' })
    where.userId = userId
  }
  const logs = await prisma.timeLog.findMany({ where, orderBy: { startedAt: 'desc' } })
  res.json(logs)
})

export default router
