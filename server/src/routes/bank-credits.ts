import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()
const db: any = prisma
const router = Router()

function hasModel(name: string) {
  const m = (prisma as any)[name]
  return m && typeof m.findMany === 'function'
}

function mapCredit(c: any) {
  return {
    id: c.id,
    amount: c.amount,
    currency: c.currency,
    valueDate: c.valueDate,
    payerName: c.payerName || null,
    bankRef: c.bankRef || null,
    memo: c.memo || null,
    sourceMailbox: c.sourceMailbox,
    messageId: c.messageId,
    receivedAt: c.receivedAt,
    matchedInvoiceId: c.matchedInvoiceId || null,
    matchedAmount: c.matchedAmount || null,
    confidence: c.confidence || null,
    status: c.status === 'MATCHED' ? 'Matched' : c.status === 'NEEDS_REVIEW' ? 'NeedsReview' : 'Unmatched',
    suggestions: [],
  }
}

router.get('/', async (_req: Request, res: Response) => {
  if (!hasModel('bankCredit')) return res.json([])
  const list = await db.bankCredit.findMany({ orderBy: { receivedAt: 'desc' } })
  res.json(list.map(mapCredit))
})

router.post('/:id/match', async (req: Request, res: Response) => {
  const id = req.params.id
  if (!hasModel('bankCredit')) return res.status(501).json({ error: 'Bank credits persistence not migrated yet' })
  const body = z.object({ invoiceId: z.string(), confirm: z.boolean().optional() }).parse(req.body || {})
  const userId = (req as any).userId || 'system'
  try {
    const credit = await db.bankCredit.findUnique({ where: { id } })
    if (!credit) return res.status(404).json({ error: 'Bank credit not found' })
    const inv = await db.invoice.findUnique({ where: { id: body.invoiceId } })
    if (!inv) return res.status(404).json({ error: 'Invoice not found' })

    await db.$transaction(async (tx: any) => {
      await tx.bankCredit.update({ where: { id }, data: { matchedInvoiceId: body.invoiceId, matchedAmount: credit.amount, status: 'MATCHED', confidence: 0.95 } })
      await tx.paymentMatch.create({ data: { invoiceId: body.invoiceId, bankCreditId: id, amount: credit.amount, matchedBy: String(userId), type: 'bank_credit' } })
      await tx.invoice.update({ where: { id: body.invoiceId }, data: {
        collected: inv.collected + credit.amount,
        outstanding: Math.max(0, inv.total - (inv.collected + credit.amount)),
        status: inv.total === (inv.collected + credit.amount) ? 'PAID' : (inv.collected + credit.amount) > 0 ? 'PARTIALLY_PAID' : inv.status,
      } })
    })

    const updated = await db.bankCredit.findUnique({ where: { id } })
    res.json(mapCredit(updated))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to match bank credit' })
  }
})

router.post('/:id/not-ours', async (req: Request, res: Response) => {
  const id = req.params.id
  if (!hasModel('bankCredit')) return res.status(501).json({ error: 'Bank credits persistence not migrated yet' })
  try {
    const updated = await db.bankCredit.update({ where: { id }, data: { status: 'MATCHED' } })
    res.json(mapCredit(updated))
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to mark bank credit' })
  }
})

export default router
