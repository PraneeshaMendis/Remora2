import { Router, Request, Response } from 'express'
import { TaskStatus, HistoryType } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../prisma.ts'
import { createNotifications } from '../utils/notifications.ts'

const router = Router()

function formatNotificationDate(date: Date | null | undefined) {
  if (!date) return 'Not set'
  return date.toISOString().slice(0, 10)
}

router.post('/phases/:phaseId/tasks', async (req: Request, res: Response) => {
  const phaseId = req.params.phaseId
  const schema = z.object({
    title: z.string(),
    description: z.string().default(''),
    status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.NOT_STARTED),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
    completedAt: z.string().nullable().optional(),
    priority: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { title, description, status, startDate, dueDate, completedAt, priority } = parsed.data as any

  let completedAtDate: Date | null = null
  if (status === TaskStatus.COMPLETED) {
    if (completedAt) {
      const parsedCompletedAt = new Date(completedAt)
      if (isNaN(parsedCompletedAt.getTime())) {
        return res.status(400).json({ error: 'Invalid completedAt format' })
      }
      completedAtDate = parsedCompletedAt
    } else {
      completedAtDate = new Date()
    }
  }

  const task = await prisma.task.create({
    data: ({
      title,
      description,
      status,
      priority: (priority || 'MEDIUM') as any,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      completedAt: completedAtDate,
      phaseId,
    } as any),
  })
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
  const actorId = (req as any).userId as string | null
  const schema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    startDate: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    completedAt: z.string().nullable().optional(),
    priority: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).optional(),
    assigneeUserIds: z.array(z.string()).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { assigneeUserIds, ...rest } = parsed.data as any
  const hasCompletedAtInput = Object.prototype.hasOwnProperty.call(parsed.data, 'completedAt')
  let taskMeta: { title: string; phaseName: string; projectId: string; projectTitle: string; startDate: Date | null; dueDate: Date | null } | null = null
  let existingAssignees: string[] = []
  if (assigneeUserIds !== undefined) {
    const taskInfo = await prisma.task.findUnique({
      where: { id },
      include: {
        assignees: { select: { userId: true } },
        phase: { select: { name: true, projectId: true, project: { select: { title: true } } } },
      },
    })
    if (!taskInfo) return res.status(404).json({ error: 'Task not found' })
    existingAssignees = taskInfo.assignees.map(a => a.userId)
    taskMeta = {
      title: taskInfo.title,
      phaseName: taskInfo.phase.name,
      projectId: taskInfo.phase.projectId,
      projectTitle: taskInfo.phase.project.title || 'Untitled project',
      startDate: taskInfo.startDate,
      dueDate: taskInfo.dueDate,
    }
  }
  const data: any = { ...rest }
  if (data.startDate !== undefined) {
    data.startDate = data.startDate ? new Date(data.startDate) : null
  }
  if (data.dueDate !== undefined) {
    data.dueDate = data.dueDate ? new Date(data.dueDate) : null
  }
  if (hasCompletedAtInput) {
    if (data.completedAt) {
      const parsedCompletedAt = new Date(data.completedAt)
      if (isNaN(parsedCompletedAt.getTime())) {
        return res.status(400).json({ error: 'Invalid completedAt format' })
      }
      data.completedAt = parsedCompletedAt
    } else {
      data.completedAt = null
    }
  }
  if (data.status !== undefined) {
    if (data.status === TaskStatus.COMPLETED) {
      if (!data.completedAt) {
        data.completedAt = new Date()
      }
    } else {
      data.completedAt = null
    }
  }
  if (taskMeta && data.title) {
    taskMeta.title = data.title
  }
  if (taskMeta && data.startDate !== undefined) {
    taskMeta.startDate = data.startDate
  }
  if (taskMeta && data.dueDate !== undefined) {
    taskMeta.dueDate = data.dueDate
  }
  // Update basic fields first
  await prisma.task.update({ where: { id }, data })

  // If assigneeUserIds is provided, update the relation
  if (assigneeUserIds !== undefined) {
    const projectId = taskMeta?.projectId
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

    const newAssignees = (assigneeUserIds || []).filter((uid: string) => !existingAssignees.includes(uid))
    const notifyIds = newAssignees.filter((uid: string) => uid && uid !== actorId)
    if (notifyIds.length && taskMeta) {
      try {
        const startLabel = formatNotificationDate(taskMeta.startDate)
        const dueLabel = formatNotificationDate(taskMeta.dueDate)
        await createNotifications(
          notifyIds.map((uid: string) => ({
            userId: uid,
            type: 'TASK_ASSIGNMENT',
            title: 'Assigned to task',
            message: `You were assigned to "${taskMeta.title}" in project "${taskMeta.projectTitle}" (phase "${taskMeta.phaseName}"). Start date: ${startLabel}. Due date: ${dueLabel}.`,
            targetUrl: `/projects/${taskMeta.projectId}/tasks/${id}`,
          })),
        )
      } catch {}
    }
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
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: { select: { userId: true } },
        phase: { select: { name: true, projectId: true, project: { select: { title: true } } } },
      },
    })
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

    const recipientIds = new Set<string>()
    task.assignees.forEach(a => recipientIds.add(a.userId))
    ;(mentionUserIds || []).forEach(id => recipientIds.add(id))
    recipientIds.delete(String(userId))
    if (recipientIds.size > 0) {
      const authorName = comment.author?.name || 'Someone'
      const targetUrl = `/projects/${task.phase.projectId}/tasks/${taskId}`
      try {
        await createNotifications(
          Array.from(recipientIds).map(uid => ({
            userId: uid,
            type: 'COMMENT',
            title: 'New comment',
            message: `${authorName} commented on "${task.title}": ${snippet}`,
            targetUrl,
          })),
        )
      } catch {}
    }

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
