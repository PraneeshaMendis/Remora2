import { prisma } from '../prisma.ts'

let cachedEmail: string | null = null
let cachedAt = 0

export async function getSuperAdminEmail(): Promise<string> {
  const now = Date.now()
  if (cachedEmail && now - cachedAt < 30000) return cachedEmail
  const rec = await prisma.systemSetting.findUnique({ where: { key: 'SUPERADMIN_EMAIL' } }).catch(() => null)
  const envEmail = String(process.env.SUPERADMIN_EMAIL || '').trim()
  const email = (rec?.value || envEmail || 'admin@company.com').trim()
  cachedEmail = email
  cachedAt = now
  return email
}

export async function setSuperAdminEmail(email: string) {
  const value = email.trim()
  await prisma.systemSetting.upsert({ where: { key: 'SUPERADMIN_EMAIL' }, update: { value }, create: { key: 'SUPERADMIN_EMAIL', value } })
  cachedEmail = value
  cachedAt = Date.now()
  return value
}
