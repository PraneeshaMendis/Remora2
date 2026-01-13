import { Router, Request, Response } from 'express'
import { TaskStatus, HistoryType } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../prisma.ts'

const router = Router()

router.post('/phases/:phaseId/tasks', async (req: Request, res: Response) => {
  const phaseId = req.params.phaseId
  const schema = z.object({
    title: z.string(),
    description: z.string().default(''),
    dueDate: z.string().datetime().optional(),
    priority: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { title, description, dueDate, priority } = parsed.data as any
  const task = await prisma.task.create({ data: ({ title, description, priority: (priority || 'MEDIUM') as any, dueDate: dueDate ? new Date(dueDate) : null, phaseId } as any) })
  res.status(201).json(task)
})

router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      timeLogs: true,
      comments: {
        include: {
          author: true,
          replies: { include: { author: true } },
          mentions: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      documents: true,
      phase: { include: { project: true } },
      assignees: { include: { user: true } },
      history: { orderBy: { createdAt: 'desc' } },
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
    priority: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).optional(),
    assigneeUserIds: z.array(z.string()).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { assigneeUserIds, ...rest } = parsed.data as any
  const data: any = { ...rest }
  if (data.dueDate !== undefined) {
    data.dueDate = data.dueDate ? new Date(data.dueDate) : null
  }
  // Update basic fields first
  await prisma.task.update({ where: { id }, data })

  // If assigneeUserIds is provided, update the relation
  if (assigneeUserIds !== undefined) {
    // Determine projectId via task -> phase
    const t = await prisma.task.findUnique({
      where: { id },
      select: { phase: { select: { projectId: true } } },
    })
    const projectId = t?.phase?.projectId
    if (!projectId) return res.status(400).json({ error: 'Task phase/project not found' })

    // Find existing memberships and create missing ones
    const existing = assigneeUserIds.length
      ? await prisma.projectMembership.findMany({ where: { projectId, userId: { in: assigneeUserIds } }, select: { id: true, userId: true } })
      : []
    const existingIds = new Set(existing.map(e => e.userId))
    const missing = (assigneeUserIds || []).filter((uid: string) => !existingIds.has(uid))
    if (missing.length > 0) {
      await prisma.projectMembership.createMany({ data: missing.map((uid: string) => ({ projectId, userId: uid, role: 'ENGINEER' })), skipDuplicates: true })
    }
    const allMemberships = assigneeUserIds.length
      ? await prisma.projectMembership.findMany({ where: { projectId, userId: { in: assigneeUserIds } }, select: { id: true } })
      : []

    // Set new assignees (clear if empty array)
    await prisma.task.update({
      where: { id },
      data: {
        assignees: { set: [], ...(allMemberships.length ? { connect: allMemberships.map(m => ({ id: m.id })) } : {}) },
      },
    })
  }

  const updated = await prisma.task.findUnique({
    where: { id },
    include: { assignees: { include: { user: true } } },
  })
  res.json(updated)
})

// Create a comment on a task (supports optional parent reply and mentions)
router.post('/:taskId/comments', async (req: Request, res: Response) => {
  const userId = (req as any).userId
  if (!userId) return res.status(401).json({ error: 'x-user-id required' })
  const taskId = req.params.taskId
  const schema = z.object({
    content: z.string().min(1),
    parentId: z.string().optional(),
    mentionUserIds: z.array(z.string()).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { content, parentId, mentionUserIds } = parsed.data

  try {
    // Ensure task exists
    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const comment = await prisma.comment.create({
      data: {
        taskId,
        authorId: userId,
        content,
        parentId: parentId || undefined,
        ...(mentionUserIds && mentionUserIds.length
          ? { mentions: { connect: mentionUserIds.map(id => ({ id })) } }
          : {}),
      },
      include: { author: true, replies: { include: { author: true } }, mentions: true },
    })

    // Record in task history as an update
    const snippet = content.length > 180 ? `${content.slice(0, 180)}…` : content
    await prisma.historyEvent.create({
      data: {
        taskId,
        type: HistoryType.COMMENT,
        message: `Comment: ${snippet}`,
        createdById: userId,
      },
    })

    res.status(201).json(comment)
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to create comment' })
  }
})

// List comments for a task (top-level with nested replies)
router.get('/:taskId/comments', async (req: Request, res: Response) => {
  const taskId = req.params.taskId
  try {
    const comments = await prisma.comment.findMany({
      where: { taskId, parentId: null },
      include: { author: true, replies: { include: { author: true } }, mentions: true },
      orderBy: { createdAt: 'asc' },
    })
    res.json(comments)
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to load comments' })
  }
})

// List task history events (comments, time logs, status changes, documents)
router.get('/:taskId/history', async (req: Request, res: Response) => {
  const taskId = req.params.taskId
  try {
    const history = await prisma.historyEvent.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: true },
    })
    res.json(history)
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to load history' })
  }
})

export default router
