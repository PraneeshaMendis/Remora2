import { prisma } from '../prisma.ts'

let cachedEmail: string | null = null
let cachedAt = 0
let settingsTableExists: boolean | null = null
let settingsTableCheckedAt = 0
const SETTINGS_TABLE_CACHE_MS = 60 * 1000

async function hasSystemSettingTable(): Promise<boolean> {
  const now = Date.now()
  if (settingsTableExists !== null && now - settingsTableCheckedAt < SETTINGS_TABLE_CACHE_MS) {
    return settingsTableExists
  }
  try {
    const rows = await prisma.$queryRaw<{ table_name: string | null }[]>`SELECT to_regclass('public."SystemSetting"')::text AS table_name`
    settingsTableExists = !!rows?.[0]?.table_name
  } catch {
    settingsTableExists = false
  }
  settingsTableCheckedAt = now
  return settingsTableExists
}

export async function getSuperAdminEmail(): Promise<string> {
  const now = Date.now()
  if (cachedEmail && now - cachedAt < 30000) return cachedEmail
  const hasTable = await hasSystemSettingTable()
  const rec = hasTable
    ? await prisma.systemSetting.findUnique({ where: { key: 'SUPERADMIN_EMAIL' } }).catch(() => null)
    : null
  const envEmail = String(process.env.SUPERADMIN_EMAIL || '').trim()
  const email = (rec?.value || envEmail || 'admin@company.com').trim()
  cachedEmail = email
  cachedAt = now
  return email
}

export async function setSuperAdminEmail(email: string) {
  if (!(await hasSystemSettingTable())) {
    throw new Error('System settings table is missing. Run database migrations.')
  }
  const value = email.trim()
  await prisma.systemSetting.upsert({ where: { key: 'SUPERADMIN_EMAIL' }, update: { value }, create: { key: 'SUPERADMIN_EMAIL', value } })
  cachedEmail = value
  cachedAt = Date.now()
  return value
}
