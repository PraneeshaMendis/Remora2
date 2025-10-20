import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()
const router = Router()

router.get('/', async (_req, res) => {
  const items = await prisma.department.findMany({ orderBy: { name: 'asc' } })
  res.json(items)
})

const bodySchema = z.object({ name: z.string().min(1) })

router.post('/', async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  try {
    const item = await prisma.department.create({ data: parsed.data })
    res.status(201).json(item)
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Department already exists' })
    res.status(400).json({ error: e?.message || 'Failed to create department' })
  }
})

router.patch('/:id', async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  try {
    const item = await prisma.department.update({ where: { id: req.params.id }, data: parsed.data })
    res.json(item)
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Department already exists' })
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found' })
    res.status(400).json({ error: e?.message || 'Failed to update department' })
  }
})

router.delete('/:id', async (req, res) => {
  const id = req.params.id
  const count = await prisma.user.count({ where: { departmentId: id } })
  if (count > 0) return res.status(409).json({ error: 'Users reference this department' })
  try {
    await prisma.department.delete({ where: { id } })
    res.status(204).end()
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found' })
    res.status(400).json({ error: e?.message || 'Failed to delete department' })
  }
})

export default router

