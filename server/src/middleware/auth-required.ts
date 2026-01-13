import { Request, Response, NextFunction } from 'express'

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId as string | null
  if (!userId) return res.status(401).json({ error: 'Authentication required' })
  next()
}

export function rolesRequired(...roles: string[]) {
  const required = roles.map(r => r.toLowerCase())
  return (req: Request, res: Response, next: any) => {
    const u = (req as any).user as any
    const name = String(u?.role?.name || u?.role || '').toLowerCase()
    if (!u?.id) return res.status(401).json({ error: 'Authentication required' })
    if (required.length && !required.includes(name)) return res.status(403).json({ error: 'Forbidden' })
    next()
  }
}

