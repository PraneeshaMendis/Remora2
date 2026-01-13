import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { z } from 'zod'
import { prisma } from '../prisma.ts'

const db: any = prisma
const router = Router()

// Storage: uploads/documents/<timestamp>-<rand>-<sanitized-name>
const uploadDir = path.resolve(process.cwd(), 'uploads', 'documents')
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try { await fs.mkdir(uploadDir, { recursive: true }) } catch {}
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const name = String(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
    const ext = path.extname(name)
    const base = path.basename(name, ext)
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}`
    cb(null, `${unique}${ext}`)
  }
})
const upload = multer({ storage })

function mapStatus(s: string): string {
  switch (s) {
    case 'DRAFT': return 'draft'
    case 'IN_REVIEW': return 'in-review'
    case 'APPROVED': return 'approved'
    case 'NEEDS_CHANGES': return 'needs-changes'
    case 'REJECTED': return 'rejected'
    default: return 'draft'
  }
}

function mapDocument(d: any) {
  return {
    id: d.id,
    name: d.name,
    fileUrl: d.filePath?.startsWith('/uploads') ? d.filePath : `/uploads/${d.filePath}`,
    filePath: d.filePath,
    status: mapStatus(d.status || 'DRAFT'),
    reviewerId: d.reviewerId || null,
    reviewer: d.reviewer ? { id: d.reviewer.id, name: d.reviewer.name, email: d.reviewer.email } : null,
    reviewerRole: d.reviewer?.role?.name || null,
    createdById: d.createdById,
    createdBy: d.createdBy ? { id: d.createdBy.id, name: d.createdBy.name, email: d.createdBy.email } : null,
    createdByRole: d.createdBy?.role?.name || null,
    projectId: d.projectId || null,
    phaseId: d.phaseId || null,
    taskId: d.taskId || null,
    projectName: d.project?.title || '',
    phaseName: d.phase?.name || '',
    taskTitle: d.task?.title || '',
    reviewComment: d.reviewComment || null,
    reviewedAt: d.reviewedAt || null,
    version: d.version || 1,
    createdAt: d.createdAt,
  }
}

// Upload one or multiple documents and assign a reviewer
router.post('/upload', upload.array('files'), async (req: Request, res: Response) => {
  const userId = (req as any).userId as string | null
  if (!userId) return res.status(401).json({ error: 'Login required' })

  const schema = z.object({
    projectId: z.string(),
    phaseId: z.string(),
    taskId: z.string().optional().nullable(),
    reviewerId: z.string(),
    status: z.enum(['draft','in-review']).optional().default('in-review'),
    name: z.string().optional(),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { projectId, phaseId, taskId, reviewerId, status, name } = parsed.data

  const files = (req.files as Express.Multer.File[]) || []
  if (!files.length) return res.status(400).json({ error: 'No files uploaded (use field name "files")' })

  try {
    // Ensure project/phase exist; validate reviewer
    const [project, phase, reviewer] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.phase.findUnique({ where: { id: phaseId } }),
      prisma.user.findUnique({ where: { id: reviewerId } }),
    ])
    if (!project) return res.status(400).json({ error: 'Invalid projectId' })
    if (!phase || phase.projectId !== projectId) return res.status(400).json({ error: 'Invalid phaseId for project' })
    if (!reviewer) return res.status(400).json({ error: 'Invalid reviewerId' })

    const statusDb = status === 'in-review' ? 'IN_REVIEW' : 'DRAFT'
    const created = [] as any[]
    for (const f of files) {
      const relPath = path.posix.join('documents', path.basename(f.path))
      const doc = await db.document.create({
        data: {
          name: name || f.originalname || 'document',
          filePath: relPath, // served at /uploads/<relPath>
          projectId,
          phaseId,
          taskId: taskId || null,
          reviewerId,
          createdById: userId,
          status: statusDb,
        },
        include: { reviewer: { include: { role: true } }, createdBy: { include: { role: true } }, project: true, phase: true, task: true },
      })
      created.push(mapDocument(doc))
      // Add to task history timeline if associated with a task
      try {
        if (taskId) {
          await prisma.historyEvent.create({
            data: {
              taskId: String(taskId),
              type: 'DOCUMENT' as any,
              message: `Document: ${doc.name}`,
              createdById: userId,
            },
          })
        }
      } catch {}
    }
    res.status(201).json(created)
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to upload documents' })
  }
})

// Documents assigned to the current user (inbox)
router.get('/inbox', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string | null
  if (!userId) return res.status(401).json({ error: 'Login required' })
  const rows = await db.document.findMany({
    where: { reviewerId: userId },
    orderBy: { createdAt: 'desc' },
    include: { reviewer: { include: { role: true } }, createdBy: { include: { role: true } }, project: true, phase: true, task: true },
  })
  res.json(rows.map(mapDocument))
})

// Documents sent by current user
router.get('/sent', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string | null
  if (!userId) return res.status(401).json({ error: 'Login required' })
  const rows = await db.document.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: 'desc' },
    include: { reviewer: { include: { role: true } }, createdBy: { include: { role: true } }, project: true, phase: true, task: true },
  })
  res.json(rows.map(mapDocument))
})

// List documents for a specific task (used by Task Detail UI)
router.get('/by-task/:taskId', async (req: Request, res: Response) => {
  const taskId = req.params.taskId
  if (!taskId) return res.status(400).json({ error: 'taskId required' })
  try {
    const rows = await db.document.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: { reviewer: { include: { role: true } }, createdBy: { include: { role: true } }, project: true, phase: true, task: true },
    })
    res.json(rows.map(mapDocument))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to load documents' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const d = await db.document.findUnique({
    where: { id: req.params.id },
    include: { reviewer: { include: { role: true } }, createdBy: { include: { role: true } }, project: true, phase: true, task: true },
  })
  if (!d) return res.status(404).json({ error: 'Not found' })
  res.json(mapDocument(d))
})

// Reviewer updates status (approve / reject / needs-changes / in-review)
router.patch('/:id/review', async (req: Request, res: Response) => {
  const userId = (req as any).userId as string | null
  if (!userId) return res.status(401).json({ error: 'Login required' })
  const schema = z.object({
    status: z.enum(['approved','rejected','needs-changes','in-review']),
    reviewComment: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(parsed.error.flatten())
  const { status, reviewComment } = parsed.data
  const d = await db.document.findUnique({ where: { id: req.params.id } })
  if (!d) return res.status(404).json({ error: 'Not found' })
  if (d.reviewerId !== userId) return res.status(403).json({ error: 'Only assigned reviewer can update status' })
  const statusDb =
    status === 'approved' ? 'APPROVED' :
    status === 'rejected' ? 'REJECTED' :
    status === 'needs-changes' ? 'NEEDS_CHANGES' : 'IN_REVIEW'

  const updated = await db.document.update({
    where: { id: d.id },
    data: { status: statusDb, reviewComment: reviewComment || undefined, reviewedAt: new Date() },
    include: { reviewer: { include: { role: true } }, createdBy: { include: { role: true } }, project: true, phase: true, task: true },
  })
  res.json(mapDocument(updated))
})

// Reviewer uploads an annotated version and (optionally) sets next status
// Replace-file (annotator) endpoint removed

export default router
