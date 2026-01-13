import { Router } from 'express'
import { z } from 'zod'
import { requireSuperAdmin } from '../middleware/super-admin.ts'
import { getSuperAdminEmail, setSuperAdminEmail } from '../utils/settings.ts'

const router = Router()

router.get('/superadmin-email', requireSuperAdmin, async (_req, res) => {
  const email = await getSuperAdminEmail()
  const fromEnv = !!process.env.SUPERADMIN_EMAIL
  res.json({ email, source: fromEnv ? 'env' : 'db' })
})

router.put('/superadmin-email', requireSuperAdmin, async (req, res) => {
  const body = z.object({ email: z.string().email() }).parse(req.body || {})
  const value = await setSuperAdminEmail(body.email)
  res.json({ ok: true, email: value })
})

export default router

