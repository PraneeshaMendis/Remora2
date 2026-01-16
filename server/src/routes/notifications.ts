import { Router, Request, Response } from 'express'
import { prisma } from '../prisma.ts'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string | null
  if (!userId) return res.status(401).json({ error: 'Login required' })

  const limit = Math.min(Number(req.query.limit || 20), 50)
  const unreadOnly = String(req.query.unread || '').toLowerCase() === 'true'
  const sinceRaw = String(req.query.since || '').trim()
  const since = sinceRaw ? new Date(sinceRaw) : null

  const where: any = { userId }
  if (unreadOnly) where.read = false
  if (since && !Number.isNaN(since.getTime())) {
    where.createdAt = { gt: since }
  }

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ])

  res.json({ items, unreadCount })
})

router.patch('/:id/read', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string | null
  if (!userId) return res.status(401).json({ error: 'Login required' })
  const id = String(req.params.id || '')
  const existing = await prisma.notification.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) return res.status(404).json({ error: 'Not found' })
  const updated = await prisma.notification.update({ where: { id }, data: { read: true } })
  res.json(updated)
})

router.post('/read-all', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string | null
  if (!userId) return res.status(401).json({ error: 'Login required' })
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
  res.json({ ok: true })
})

export default router
