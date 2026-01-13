import { Router, Request, Response } from 'express'
import { z } from 'zod'
import path from 'path'
import fs from 'fs/promises'
import { prisma } from '../prisma.ts'

const db: any = prisma
const router = Router()

function hasModel(name: string) {
  const m = (db as any)[name]
  return m && typeof m.findMany === 'function'
}

function mapReceipt(r: any) {
  return {
    id: r.id,
    paymentRequestId: r.paymentRequestId || null,
    invoiceId: r.invoiceId || null,
    matchedInvoiceNo: r.invoice?.invoiceNo || null,
    receiptCode: `RC-${String(r.messageId || r.id).slice(0,6).toUpperCase()}`,
    projectId: r.projectId || null,
    phaseId: r.phaseId || null,
    projectName: r.project?.title || '',
    phaseName: r.phase?.name || '',
    source: r.source,
    fileKey: r.fileKey || null,
    fileName: r.fileName || null,
    fileType: r.fileType || null,
    fileSize: r.fileSize || null,
    amount: r.amount || null,
    paidDate: r.paidDate || null,
    transactionRef: r.transactionRef || null,
    payerName: r.payerName || null,
    payerEmail: r.payerEmail || null,
    status: r.status === 'VERIFIED' ? 'Verified' : r.status === 'REJECTED' ? 'Rejected' : 'Submitted',
    confidence: r.confidence || null,
    matchedInvoiceId: r.invoiceId || null,
    matchedAmount: null,
    flags: r.flags || [],
    senderEmail: r.senderEmail || null,
    messageId: r.messageId || null,
    gmailThreadId: r.gmailThreadId || null,
    receivedAt: r.receivedAt,
    reviewedBy: r.reviewedBy || null,
    reviewedAt: r.reviewedAt || null,
    reviewNote: r.reviewNote || null,
  }
}

router.get('/', async (_req: Request, res: Response) => {
  if (!hasModel('paymentReceipt')) return res.json([])
  const list = await db.paymentReceipt.findMany({ orderBy: { receivedAt: 'desc' }, include: { project: true, phase: true, invoice: true } })
  res.json(list.map(mapReceipt))
})

router.post('/:id/verify', async (req: Request, res: Response) => {
  const id = req.params.id
  if (!hasModel('paymentReceipt')) return res.status(501).json({ error: 'Receipts persistence not migrated yet' })
  const userId = (req as any).userId || 'system'
  const body = z.object({ reviewNote: z.string().optional() }).parse(req.body || {})
  try {
    // Load previous state to make operation idempotent
    const prev = await db.paymentReceipt.findUnique({ where: { id } })
    if (!prev) return res.status(404).json({ error: 'Receipt not found' })

    const wasVerified = String(prev.status || '').toUpperCase() === 'VERIFIED'

    // If already verified, do not apply again or re-fetch file
    if (wasVerified) {
      try {
        const prevFull = await db.paymentReceipt.findUnique({ where: { id }, include: { invoice: true, project: true, phase: true } })
        return res.json(mapReceipt(prevFull))
      } catch {
        return res.json(mapReceipt(prev))
      }
    }

    // Update receipt as verified (no-op if already verified)
    const updated = await db.paymentReceipt.update({ where: { id }, data: { status: 'VERIFIED', reviewedBy: userId, reviewedAt: new Date(), reviewNote: body.reviewNote || undefined } , include: { invoice: true, project: true, phase: true }})

    // Apply to invoice only once: if another receipt for same message/file is already VERIFIED, skip applying
    let shouldApply = true
    try {
      if (prev.messageId || prev.fileName) {
        const already = await db.paymentReceipt.findFirst({
          where: {
            id: { not: id },
            status: 'VERIFIED',
            OR: [
              { messageId: prev.messageId || undefined, fileName: prev.fileName || undefined },
              { messageId: prev.messageId || undefined },
            ],
          },
        })
        if (already) shouldApply = false
      }
    } catch {}

    if (shouldApply && updated.invoiceId && updated.amount && updated.amount > 0) {
      const inv = await db.invoice.findUnique({ where: { id: updated.invoiceId } })
      if (inv) {
        const newCollected = (inv.collected || 0) + Number(updated.amount)
        const outstanding = Math.max(0, Number(inv.total) - newCollected)
        const status = outstanding === 0 ? 'PAID' : newCollected > 0 ? 'PARTIALLY_PAID' : inv.status
        await db.invoice.update({ where: { id: inv.id }, data: { collected: newCollected, outstanding, status } })
      }
    }
    // Persist slip as Attachment and repoint fileKey to local path
    try {
      if (updated.fileKey) {
        const axios = (await import('axios')).default
        const resp = await axios.get(String(updated.fileKey), { responseType: 'arraybuffer' })
        const buf = Buffer.from(resp.data)
        const mime = String(resp.headers['content-type'] || updated.fileType || 'application/octet-stream')
        const uploadDir = process.env.UPLOAD_DIR || 'uploads'
        const recDir = path.resolve(process.cwd(), uploadDir, 'receipts')
        await fs.mkdir(recDir, { recursive: true })
        const extFromName = (updated.fileName || '').split('.').pop() || ''
        const ext = extFromName ? extFromName.toLowerCase() : (mime.includes('pdf') ? 'pdf' : 'bin')
        const filename = `${updated.id}.${ext}`
        const absPath = path.join(recDir, filename)
        await fs.writeFile(absPath, buf)
        const relPath = path.posix.join('receipts', filename)
        try { await db.attachment.create({ data: { filePath: relPath, fileType: mime, projectId: updated.projectId || null } }) } catch {}
        await db.paymentReceipt.update({ where: { id: updated.id }, data: { fileKey: `/uploads/${relPath}` } })
      }
    } catch {}

    res.json(mapReceipt(updated))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to verify receipt' })
  }
})

router.post('/:id/reject', async (req: Request, res: Response) => {
  const id = req.params.id
  if (!hasModel('paymentReceipt')) return res.status(501).json({ error: 'Receipts persistence not migrated yet' })
  const userId = (req as any).userId || 'system'
  const body = z.object({ reason: z.string(), reviewNote: z.string().optional() }).parse(req.body || {})
  try {
    const updated = await db.paymentReceipt.update({ where: { id }, data: { status: 'REJECTED', reviewedBy: userId, reviewedAt: new Date(), reviewNote: body.reviewNote || body.reason }, include: { invoice: true, project: true, phase: true } })
    res.json(mapReceipt(updated))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to reject receipt' })
  }
})

router.get('/:id/suggestions', async (req: Request, res: Response) => {
  const id = req.params.id
  if (!hasModel('paymentReceipt')) return res.status(501).json({ error: 'Receipts persistence not migrated yet' })
  const r = await db.paymentReceipt.findUnique({ where: { id } })
  if (!r) return res.status(404).json({ error: 'Not found' })
  const amt = r.amount || 0
  const invs = await db.invoice.findMany({ where: { status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE', 'DRAFT'] } } })
  const suggestions = invs
    .map((i: any) => ({ invoice: i, delta: Math.abs((i.total || 0) - amt) }))
    .sort((a: any, b: any) => a.delta - b.delta)
    .slice(0, 5)
    .map((x: any) => ({
      id: x.invoice.id,
      invoiceNo: x.invoice.invoiceNo,
      projectId: x.invoice.projectId,
      phaseId: x.invoice.phaseId,
      projectName: '',
      phaseName: '',
      issueDate: x.invoice.issueDate,
      dueDate: x.invoice.dueDate,
      currency: x.invoice.currency,
      subtotal: x.invoice.subtotal,
      taxAmount: x.invoice.taxAmount,
      total: x.invoice.total,
      collected: x.invoice.collected,
      outstanding: x.invoice.outstanding,
      status: x.invoice.status,
      pdfKey: x.invoice.pdfKey || null,
      notes: x.invoice.notes || '',
      createdAt: x.invoice.createdAt,
      updatedAt: x.invoice.updatedAt,
    }))
  res.json(suggestions)
})

router.post('/:id/match', async (req: Request, res: Response) => {
  const id = req.params.id
  if (!hasModel('paymentReceipt')) return res.status(501).json({ error: 'Receipts persistence not migrated yet' })
  const body = z.object({ invoiceId: z.string(), amount: z.number().nonnegative() }).parse(req.body || {})
  const userId = (req as any).userId || 'system'
  try {
    const inv = await db.invoice.findUnique({ where: { id: body.invoiceId } })
    if (!inv) return res.status(404).json({ error: 'Invoice not found' })
    const rec = await db.paymentReceipt.findUnique({ where: { id } })
    if (!rec) return res.status(404).json({ error: 'Receipt not found' })

    await db.$transaction(async (tx: any) => {
      await tx.paymentReceipt.update({ where: { id }, data: { invoiceId: body.invoiceId } })
      await tx.paymentMatch.create({ data: { invoiceId: body.invoiceId, receiptId: id, amount: body.amount, matchedBy: String(userId), type: 'receipt' } })
    })

    const updated = await db.paymentReceipt.findUnique({ where: { id }, include: { invoice: true, project: true, phase: true } })
    res.json(mapReceipt(updated))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to match receipt' })
  }
})

router.post('/:id/unmatch', async (req: Request, res: Response) => {
  const id = req.params.id
  if (!hasModel('paymentReceipt')) return res.status(501).json({ error: 'Receipts persistence not migrated yet' })
  try {
    const rec = await db.paymentReceipt.findUnique({ where: { id } })
    if (!rec) return res.status(404).json({ error: 'Receipt not found' })
    await db.paymentReceipt.update({ where: { id }, data: { invoiceId: null, status: 'SUBMITTED' } })
    const updated = await db.paymentReceipt.findUnique({ where: { id }, include: { invoice: true, project: true, phase: true } })
    res.json(mapReceipt(updated))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to unmatch receipt' })
  }
})

// Re-extract amount from the attached slip and update the receipt
router.post('/:id/reextract', async (req: Request, res: Response) => {
  const id = req.params.id
  if (!hasModel('paymentReceipt')) return res.status(501).json({ error: 'Receipts persistence not migrated yet' })
  try {
    const r = await db.paymentReceipt.findUnique({ where: { id } })
    if (!r) return res.status(404).json({ error: 'Receipt not found' })
    if (!r.fileKey) return res.status(400).json({ error: 'No slip attached' })

    // Fetch the file via proxy URL (should include content-type)
    const axios = (await import('axios')).default
    const resp = await axios.get(String(r.fileKey), { responseType: 'arraybuffer' })
    const buf = Buffer.from(resp.data)
    const mime = String(resp.headers['content-type'] || r.fileType || 'application/octet-stream')
    const { extractAmount } = await import('../utils/slip-extract.ts')
    const amount = await extractAmount(buf, mime)
    if (amount === undefined) return res.status(422).json({ error: 'Could not extract amount from slip' })

    const updated = await db.paymentReceipt.update({ where: { id }, data: { amount, confidence: Math.max(0.7, r.confidence || 0.7) } })
    res.json(mapReceipt(updated))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to re-extract amount' })
  }
})

export default router
