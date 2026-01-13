import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()
const router = Router()

router.get('/', async (_req, res) => {
  const items = await prisma.appRole.findMany({ orderBy: { name: 'asc' } })
  res.json(items)
})

const bodySchema = z.object({ name: z.string().min(1) })

router.post('/', async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  try {
    const item = await prisma.appRole.create({ data: parsed.data })
    res.status(201).json(item)
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Role already exists' })
    res.status(400).json({ error: e?.message || 'Failed to create role' })
  }
})

router.patch('/:id', async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  try {
    const item = await prisma.appRole.update({ where: { id: req.params.id }, data: parsed.data })
    res.json(item)
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Role already exists' })
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found' })
    res.status(400).json({ error: e?.message || 'Failed to update role' })
  }
})

router.delete('/:id', async (req, res) => {
  const id = req.params.id
  const force = String(req.query.force || '').toLowerCase() === 'true'
  const toRoleId = (req.query.toRoleId as string) || ''
  const count = await prisma.user.count({ where: { roleId: id } })
  if (count > 0 && !force) return res.status(409).json({ error: 'Users reference this role' })
  try {
    if (count > 0 && force) {
      let targetId = toRoleId
      if (!targetId) {
        // Find or create a fallback role named "Unassigned"
        const unassigned = await prisma.appRole.upsert({
          where: { name: 'Unassigned' },
          update: {},
          create: { name: 'Unassigned' },
        })
        targetId = unassigned.id
      } else {
        const exists = await prisma.appRole.findUnique({ where: { id: targetId } })
        if (!exists) return res.status(400).json({ error: 'toRoleId not found' })
        if (targetId === id) return res.status(400).json({ error: 'toRoleId cannot equal the role being deleted' })
      }
      await prisma.user.updateMany({ where: { roleId: id }, data: { roleId: targetId } })
    }
    await prisma.appRole.delete({ where: { id } })
    res.status(204).end()
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found' })
    res.status(400).json({ error: e?.message || 'Failed to delete role' })
  }
})

export default router
