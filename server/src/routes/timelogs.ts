import { Router, Request, Response } from 'express'
import { z } from 'zod'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { prisma } from '../prisma.ts'

const router = Router()

// Ensure uploads directory exists
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')
try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }) } catch (_) {}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: any, cb: (err: any, dest: string) => void) => cb(null, UPLOAD_DIR),
  filename: (_req: Request, file: any, cb: (err: any, fileName: string) => void) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')
    cb(null, `${unique}-${safe}`)
  },
})
const upload = multer({ storage })

const createSchema = z.object({
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  description: z.string(),
})

// Supports multipart/form-data (with optional `file`) or JSON body
router.post('/tasks/:taskId/timelogs', upload.single('file'), async (req: Request, res: Response) => {
  const userId = (req as any).userId
  if (!userId) return res.status(401).json({ error: 'x-user-id required' })
  const taskId = req.params.taskId
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { startedAt, endedAt, description } = parsed.data
  const start = new Date(startedAt)
  const end = new Date(endedAt)
  const durationMins = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
  try {
    let attachmentId: string | undefined
    if ((req as any).file) {
      // Attach uploaded file to this task's project if possible
      const file = (req as any).file as any
      // Resolve projectId via task -> phase
      const task = await prisma.task.findUnique({ where: { id: taskId }, include: { phase: true } })
      const projectId = task?.phase?.projectId
      const attachment = await prisma.attachment.create({
        data: {
          filePath: path.relative(process.cwd(), path.join(UPLOAD_DIR, file.filename)),
          fileType: file.mimetype || 'application/octet-stream',
          projectId: projectId || undefined,
        },
      })
      attachmentId = attachment.id
    }

    const log = await prisma.timeLog.create({
      data: { taskId, userId, startedAt: start, endedAt: end, durationMins, description, attachmentId },
    })
    try {
      // Record in task history for unified timeline
      await prisma.historyEvent.create({
        data: {
          taskId,
          type: 'TIME_LOG' as any,
          message: `Logged ${Math.round((durationMins / 60) * 10) / 10}h: ${description}`,
          createdById: String(userId),
        },
      })
    } catch {}
    res.status(201).json(log)
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to create time log' })
  }
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
  const logs = await prisma.timeLog.findMany({
    where,
    orderBy: { startedAt: 'desc' },
    include: { attachment: true, user: { select: { id: true, name: true, email: true } } },
  })
  // Add userName for convenience on the client
  res.json(logs.map(l => ({ ...l, userName: (l as any).user?.name || null })))
})

export default router
