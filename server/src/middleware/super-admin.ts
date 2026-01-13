import { Request, Response, NextFunction } from 'express'
import { getSuperAdminEmail } from '../utils/settings.ts'
import { prisma } from '../prisma.ts'

export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const adminEmail = (await getSuperAdminEmail()).toLowerCase()
    if (!adminEmail) {
      return res.status(500).json({ error: 'SUPERADMIN_EMAIL is not configured' })
    }
    const impersonatingAdminId = (req as any).adminId as string | null
    const userId = (req as any).userId as string | null
    if (!userId && !impersonatingAdminId) return res.status(401).json({ error: 'Authentication required' })

    // If impersonating, authorize based on the original admin identity
    if (impersonatingAdminId) {
      const adminUser = await prisma.user.findUnique({ where: { id: impersonatingAdminId } })
      if (!adminUser) return res.status(401).json({ error: 'Invalid admin' })
      const isSuperAdmin = adminUser.email.toLowerCase() === adminEmail
      if (!isSuperAdmin) return res.status(403).json({ error: 'Admin only' })
      ;(req as any).user = adminUser
      return next()
    }

    // Normal case: use current user identity
    const user = await prisma.user.findUnique({ where: { id: userId! } })
    if (!user) return res.status(401).json({ error: 'Invalid user' })
    const isSuper = user.email.toLowerCase() === adminEmail
    if (!isSuper) return res.status(403).json({ error: 'Admin only' })
    ;(req as any).user = user
    return next()
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Authorization failed' })
  }
}

export async function isSuperAdminByUserId(userId: string | null) {
  if (!userId) return false
  const adminEmail = String(process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase()
  if (!adminEmail) return false
  const user = await prisma.user.findUnique({ where: { id: userId } })
  return !!user && user.email.toLowerCase() === adminEmail
}
