import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.ts'
import { authRequired } from '../middleware/auth-required.ts'

const router = Router()

type MeetingTypeInput = 'Online' | 'Physical'

type MeetingRow = {
  id: string
  title: string
  date: string
  type: MeetingTypeInput
  projectId: string
  projectName: string
  phaseId: string | null
  phase: string | null
  taskId: string | null
  task: string | null
  clParticipantIds: string[]
  clParticipants: string[]
  clientParticipants: string | null
  durationHours: number
  clHeadcount: number
  totalEffort: number
  discussion: string | null
  createdById: string | null
  createdAt: string
}

const createSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  type: z.enum(['Online', 'Physical']),
  projectId: z.string().min(1),
  phaseId: z.string().optional().nullable(),
  taskId: z.string().optional().nullable(),
  clParticipantIds: z.array(z.string()).optional().default([]),
  clientParticipants: z.string().optional().nullable(),
  durationHours: z.number().nonnegative(),
  clHeadcount: z.number().int().nonnegative().optional(),
  discussion: z.string().optional().nullable(),
})

const updateSchema = createSchema

const formatDate = (value: Date) => value.toISOString().slice(0, 10)

const mapTypeToEnum = (value: MeetingTypeInput) => (value === 'Physical' ? 'PHYSICAL' : 'ONLINE')

const mapTypeToLabel = (value: any): MeetingTypeInput => (value === 'PHYSICAL' ? 'Physical' : 'Online')

const mapMeeting = (log: any, userNameById: Map<string, string>): MeetingRow => {
  const participantNames = (log.clParticipantIds || [])
    .map((id: string) => userNameById.get(id))
    .filter((name: string | undefined): name is string => Boolean(name))
  return {
    id: String(log.id),
    title: String(log.title || ''),
    date: formatDate(log.meetingDate),
    type: mapTypeToLabel(log.type),
    projectId: String(log.projectId || ''),
    projectName: String(log.project?.title || ''),
    phaseId: log.phaseId ? String(log.phaseId) : null,
    phase: log.phase?.name ? String(log.phase.name) : null,
    taskId: log.taskId ? String(log.taskId) : null,
    task: log.task?.title ? String(log.task.title) : null,
    clParticipantIds: Array.isArray(log.clParticipantIds) ? log.clParticipantIds.map((id: string) => String(id)) : [],
    clParticipants: participantNames,
    clientParticipants: log.clientParticipants ? String(log.clientParticipants) : null,
    durationHours: Number(log.durationHours || 0),
    clHeadcount: Number(log.clHeadcount || 0),
    totalEffort: Number(log.totalEffort || 0),
    discussion: log.discussion ? String(log.discussion) : null,
    createdById: log.createdById ? String(log.createdById) : null,
    createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString(),
  }
}

router.get('/', async (req: Request, res: Response) => {
  const projectId = req.query.projectId ? String(req.query.projectId) : ''
  const where: any = {}
  if (projectId) where.projectId = projectId

  const list = await prisma.meetingLog.findMany({
    where,
    orderBy: [{ meetingDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      project: { select: { id: true, title: true } },
      phase: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
    },
  })

  const participantIds = new Set<string>()
  list.forEach(log => {
    const ids = Array.isArray(log.clParticipantIds) ? log.clParticipantIds : []
    ids.forEach(id => participantIds.add(String(id)))
  })

  const users = participantIds.size
    ? await prisma.user.findMany({
        where: { id: { in: Array.from(participantIds) } },
        select: { id: true, name: true },
      })
    : []
  const userNameById = new Map(users.map(user => [String(user.id), String(user.name || '')]))

  res.json(list.map(log => mapMeeting(log, userNameById)))
})

router.post('/', authRequired, async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())

  const data = parsed.data
  const meetingDate = new Date(data.date)
  if (Number.isNaN(meetingDate.getTime())) {
    return res.status(400).json({ error: 'Invalid meeting date' })
  }

  const participantIds = Array.from(new Set((data.clParticipantIds || []).filter(Boolean)))
  const clHeadcount = participantIds.length
  const totalEffort = data.durationHours * clHeadcount
  const createdById = (req as any).userId as string | null

  try {
    const created = await prisma.meetingLog.create({
      data: {
        title: data.title.trim(),
        meetingDate,
        type: mapTypeToEnum(data.type) as any,
        projectId: data.projectId,
        phaseId: data.phaseId || null,
        taskId: data.taskId || null,
        clParticipantIds: participantIds,
        clientParticipants: data.clientParticipants?.trim() || null,
        durationHours: data.durationHours,
        clHeadcount,
        totalEffort,
        discussion: data.discussion?.trim() || null,
        createdById: createdById || null,
      },
      include: {
        project: { select: { id: true, title: true } },
        phase: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    })

    const users = participantIds.length
      ? await prisma.user.findMany({
          where: { id: { in: participantIds } },
          select: { id: true, name: true },
        })
      : []
    const userNameById = new Map(users.map(user => [String(user.id), String(user.name || '')]))

    res.status(201).json(mapMeeting(created, userNameById))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to create meeting log' })
  }
})

router.patch('/:id', authRequired, async (req: Request, res: Response) => {
  const id = String(req.params.id || '')
  if (!id) return res.status(400).json({ error: 'Meeting log id required' })
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())

  const data = parsed.data
  const meetingDate = new Date(data.date)
  if (Number.isNaN(meetingDate.getTime())) {
    return res.status(400).json({ error: 'Invalid meeting date' })
  }

  const participantIds = Array.from(new Set((data.clParticipantIds || []).filter(Boolean)))
  const clHeadcount = participantIds.length
  const totalEffort = data.durationHours * clHeadcount

  try {
    const updated = await prisma.meetingLog.update({
      where: { id },
      data: {
        title: data.title.trim(),
        meetingDate,
        type: mapTypeToEnum(data.type) as any,
        projectId: data.projectId,
        phaseId: data.phaseId || null,
        taskId: data.taskId || null,
        clParticipantIds: participantIds,
        clientParticipants: data.clientParticipants?.trim() || null,
        durationHours: data.durationHours,
        clHeadcount,
        totalEffort,
        discussion: data.discussion?.trim() || null,
      },
      include: {
        project: { select: { id: true, title: true } },
        phase: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    })

    const users = participantIds.length
      ? await prisma.user.findMany({
          where: { id: { in: participantIds } },
          select: { id: true, name: true },
        })
      : []
    const userNameById = new Map(users.map(user => [String(user.id), String(user.name || '')]))

    res.json(mapMeeting(updated, userNameById))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to update meeting log' })
  }
})

router.delete('/:id', authRequired, async (req: Request, res: Response) => {
  const id = String(req.params.id || '')
  if (!id) return res.status(400).json({ error: 'Meeting log id required' })
  try {
    await prisma.meetingLog.delete({ where: { id } })
    res.status(204).end()
  } catch {
    res.status(404).json({ error: 'Meeting log not found' })
  }
})

export default router
