import { Router, Request, Response } from 'express'
import { PrismaClient, TaskStatus } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()
const router = Router()

function calcTaskProgress(tasks: { status: TaskStatus }[]) {
  const total = tasks.length
  if (total === 0) return 0
  const completed = tasks.filter(t => t.status === 'COMPLETED').length
  return Math.round((completed / total) * 100)
}

async function projectProgressAndHours(projectId: string) {
  const phases = await prisma.phase.findMany({
    where: { projectId },
    include: { tasks: { select: { id: true, status: true } } },
  })
  const allTasks = phases.flatMap(p => p.tasks)
  const progress = calcTaskProgress(allTasks)

  const usedMinsAgg = await prisma.timeLog.aggregate({
    _sum: { durationMins: true },
    where: { task: { phase: { projectId } } },
  })
  const usedMins = usedMinsAgg._sum.durationMins || 0
  const usedHours = Math.round((usedMins / 60) * 100) / 100

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { allocatedHours: true },
  })
  const allocatedHours = project?.allocatedHours ?? 0
  const leftHours = Math.max(allocatedHours - usedHours, 0)
  return { progress, usedHours, leftHours, allocatedHours }
}

router.get('/', async (_req: Request, res: Response) => {
  const projects = await prisma.project.findMany({
    include: { phases: { include: { tasks: { select: { status: true } } } } },
    orderBy: { createdAt: 'desc' },
  })
  const result = await Promise.all(
    projects.map(async p => {
      const allTasks = p.phases.flatMap(ph => ph.tasks)
      const progress = calcTaskProgress(allTasks)
      const agg = await prisma.timeLog.aggregate({
        _sum: { durationMins: true },
        where: { task: { phase: { projectId: p.id } } },
      })
      const usedHours = Math.round(((agg._sum.durationMins || 0) / 60) * 100) / 100
      const leftHours = Math.max(p.allocatedHours - usedHours, 0)

      // Determine duration dates: prefer project-level, fallback to phases' min/max
      const phaseStart = p.phases
        .map(ph => ph.startDate)
        .filter(Boolean)
        .sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime())[0] as Date | undefined
      const phaseEnd = p.phases
        .map(ph => ph.endDate)
        .filter(Boolean)
        .sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime())[0] as Date | undefined
      const startDate = p.startDate ?? phaseStart ?? null
      const endDate = p.endDate ?? phaseEnd ?? null
      return {
        ...p,
        phases: undefined,
        progress,
        usedHours,
        leftHours,
        startDate,
        endDate,
      }
    })
  )
  res.json(result)
})

const createProjectSchema = z.object({
  code: z.string(),
  title: z.string(),
  description: z.string().default(''),
  ownerId: z.string().optional(),
  allocatedHours: z.number().int().nonnegative().default(0),
  visibility: z.enum(['PRIVATE', 'TEAM', 'COMPANY']).default('TEAM'),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

router.post('/', async (req: Request, res: Response) => {
  const parsed = createProjectSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const data = parsed.data as any
  // Coerce dates and validate order if present
  if (data.startDate) data.startDate = new Date(data.startDate)
  if (data.endDate) data.endDate = new Date(data.endDate)
  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    return res.status(400).json({ error: 'startDate must be before or equal to endDate' })
  }
  try {
    const project = await prisma.project.create({ data })
    res.status(201).json(project)
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to create project' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      phases: { include: { tasks: true } },
      memberships: { include: { user: true } },
    },
  })
  if (!project) return res.status(404).json({ error: 'Not found' })
  const meta = await projectProgressAndHours(id)
  res.json({ ...project, ...meta })
})

const updateProjectSchema = createProjectSchema.partial()
router.patch('/:id', async (req: Request, res: Response) => {
  const id = req.params.id
  const parsed = updateProjectSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const data: any = { ...parsed.data }
  if (data.startDate !== undefined) data.startDate = data.startDate ? new Date(data.startDate) : null
  if (data.endDate !== undefined) data.endDate = data.endDate ? new Date(data.endDate) : null
  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    return res.status(400).json({ error: 'startDate must be before or equal to endDate' })
  }
  const project = await prisma.project.update({ where: { id }, data })
  const meta = await projectProgressAndHours(id)
  res.json({ ...project, ...meta })
})

router.post('/:id/phases', async (req: Request, res: Response) => {
  const id = req.params.id
  const schema = z.object({
    name: z.string(),
    description: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { name, description, startDate, endDate } = parsed.data
  const phase = await prisma.phase.create({
    data: {
      name,
      description,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      projectId: id,
    },
  })
  res.status(201).json(phase)
})

export default router
