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
    include: {
      phases: { include: { tasks: { select: { status: true } } } },
      memberships: { include: { user: true } },
    },
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
        memberships: p.memberships,
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

// Minimal list of projects with phases for invoicing UI
router.get('/basic', async (_req: Request, res: Response) => {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      phases: { select: { id: true, name: true } },
    },
  })
  res.json(projects.map(p => ({ id: p.id, name: p.title, phases: p.phases.map(ph => ({ id: ph.id, name: ph.name })) })))
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
  memberUserIds: z.array(z.string()).optional().default([]),
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
    const { memberUserIds, ...projectData } = data
    const project = await prisma.project.create({ data: projectData })

    if (memberUserIds && memberUserIds.length > 0) {
      const roleMap = await inferProjectRoles(prisma, memberUserIds)
      for (const userId of memberUserIds) {
        const role = (roleMap[userId] || 'ENGINEER') as any
        await prisma.projectMembership.upsert({
          where: { projectId_userId: { projectId: project.id, userId } },
          update: { role },
          create: { projectId: project.id, userId, role },
        })
      }
    }

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
      phases: { include: { tasks: { include: { assignees: { include: { user: true } } } } } },
      memberships: { include: { user: true } },
      owner: true,
    },
  })
  if (!project) return res.status(404).json({ error: 'Not found' })
  const meta = await projectProgressAndHours(id)
  res.json({ ...project, ...meta })
})

// Get project members (users) for a given project
router.get('/:id/members', async (req: Request, res: Response) => {
  const id = req.params.id
  const memberships = await prisma.projectMembership.findMany({
    where: { projectId: id },
    include: { user: true },
    orderBy: { user: { name: 'asc' } },
  })
  const users = memberships.map(m => m.user)
  res.json(users)
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

// Update a phase's basic fields (name, description, dates)
router.patch('/:id/phases/:phaseId', async (req: Request, res: Response) => {
  const projectId = req.params.id
  const phaseId = req.params.phaseId

  const schema = z.object({
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    startDate: z.string().datetime().nullable().optional(),
    endDate: z.string().datetime().nullable().optional(),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())

  // Ensure the phase belongs to this project
  const phase = await prisma.phase.findFirst({ where: { id: phaseId, projectId } })
  if (!phase) return res.status(404).json({ error: 'Phase not found for project' })

  const data: any = { ...parsed.data }
  if (data.startDate !== undefined) data.startDate = data.startDate ? new Date(data.startDate) : null
  if (data.endDate !== undefined) data.endDate = data.endDate ? new Date(data.endDate) : null

  try {
    const updated = await prisma.phase.update({ where: { id: phaseId }, data })
    res.json(updated)
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to update phase' })
  }
})

// Add members to a project by user IDs
router.post('/:id/members', async (req: Request, res: Response) => {
  const projectId = req.params.id
  const schema = z.object({ userIds: z.array(z.string()).min(1), role: z.enum(['DIRECTOR','MANAGER','CONSULTANT','LEAD','ENGINEER','OPS']).optional() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { userIds, role } = parsed.data
  try {
    let roleMap: Record<string, string> = {}
    if (!role) {
      roleMap = await inferProjectRoles(prisma, userIds)
    }
    let count = 0
    for (const userId of userIds) {
      const r = (role || roleMap[userId] || 'ENGINEER') as any
      await prisma.projectMembership.upsert({
        where: { projectId_userId: { projectId, userId } },
        update: { role: r },
        create: { projectId, userId, role: r },
      })
      count++
    }
    res.status(201).json({ count })
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to add members' })
  }
})

// Remove members from a project
router.delete('/:id/members', async (req: Request, res: Response) => {
  const projectId = req.params.id
  const schema = z.object({ userIds: z.array(z.string()).min(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { userIds } = parsed.data
  try {
    const result = await prisma.projectMembership.deleteMany({
      where: { projectId, userId: { in: userIds } },
    })
    res.json({ count: result.count })
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to remove members' })
  }
})

// Create a task in a phase (supports optional assignees by userId)
router.post('/:id/phases/:phaseId/tasks', async (req: Request, res: Response) => {
  const projectId = req.params.id
  const phaseId = req.params.phaseId

  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional().default(''),
    dueDate: z.string().optional(), // Accepts ISO strings or YYYY-MM-DD
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED']).optional().default('NOT_STARTED'),
    assigneeUserIds: z.array(z.string()).optional().default([]),
    priority: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).optional(),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { title, description, dueDate, status, assigneeUserIds, priority } = parsed.data as any

  try {
    // Ensure phase belongs to project
    const phase = await prisma.phase.findFirst({ where: { id: phaseId, projectId } })
    if (!phase) return res.status(404).json({ error: 'Phase not found for project' })

    // Normalize date string (support date-only)
    let due: Date | undefined
    if (dueDate) {
      const asDate = new Date(dueDate)
      if (isNaN(asDate.getTime())) {
        return res.status(400).json({ error: 'Invalid dueDate format' })
      }
      due = asDate
    }

    // Map provided userIds to membership ids for this project
    // Find existing memberships and create missing ones
    const existingMemberships = assigneeUserIds.length
      ? await prisma.projectMembership.findMany({
          where: { projectId, userId: { in: assigneeUserIds } },
          select: { id: true, userId: true },
        })
      : []

    const existingUserIds = new Set(existingMemberships.map(m => m.userId))
    const missingUserIds = (assigneeUserIds || []).filter((uid: string) => !existingUserIds.has(uid))

    let createdMemberships: { id: string }[] = []
    if (missingUserIds.length > 0) {
      // Create missing memberships with inferred roles
      const roleMap = await inferProjectRoles(prisma, missingUserIds)
      await prisma.projectMembership.createMany({
        data: missingUserIds.map((uid: string) => ({ projectId, userId: uid, role: (roleMap[uid] || 'ENGINEER') as any })),
        skipDuplicates: true,
      })
      createdMemberships = await prisma.projectMembership.findMany({
        where: { projectId, userId: { in: missingUserIds } },
        select: { id: true },
      })
    }

    const created = await prisma.task.create({
      data: ({
        title,
        description: description || '',
        status: status as any,
        dueDate: due,
        priority: (priority || 'MEDIUM') as any,
        phaseId,
        assignees: (existingMemberships.length || createdMemberships.length)
          ? { connect: [...existingMemberships, ...createdMemberships].map(m => ({ id: m.id })) }
          : undefined,
      } as any),
      include: {
        assignees: { include: { user: true } },
      },
    })

    res.status(201).json(created)
  } catch (e: any) {
    console.error('Failed to create task', e)
    res.status(400).json({ error: e?.message || 'Failed to create task' })
  }
})

export default router
// Infer a ProjectRole from the user's app role/department
async function inferProjectRoles(prisma: PrismaClient, userIds: string[]): Promise<Record<string, string>> {
  if (!userIds || userIds.length === 0) return {}
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: { role: true, department: true },
  })
  const map: Record<string, string> = {}
  for (const u of users) {
    const appRole = (u.role?.name || '').toUpperCase()
    const dept = (u.department?.name || '').toUpperCase()
    let pr: string = 'ENGINEER'
    if (['DIRECTOR', 'MANAGER', 'LEAD', 'CONSULTANT', 'ENGINEER', 'OPS'].includes(appRole)) {
      pr = appRole
    } else if (dept.includes('OPS')) {
      pr = 'OPS'
    } else if (appRole === 'CLIENT') {
      // No CLIENT in ProjectRole; treat as CONSULTANT by default
      pr = 'CONSULTANT'
    }
    map[u.id] = pr
  }
  return map
}
