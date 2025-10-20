import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()
const router = Router()

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  roleId: z.string().optional(),
  departmentId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
})

router.get('/', async (req, res) => {
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

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { role: { select: { name: true } }, department: { select: { name: true } } },
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])
  res.json({ total, page, limit, items })
})

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  roleId: z.string(),
  departmentId: z.string(),
  isActive: z.boolean().optional(),
})

router.post('/', async (req, res) => {
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

router.get('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { role: true, department: true },
  })
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json(user)
})

const updateUserSchema = createUserSchema.partial()
router.patch('/:id', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (e: any) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found' })
    res.status(400).json({ error: e?.message || 'Failed to delete user' })
  }
})

export default router

