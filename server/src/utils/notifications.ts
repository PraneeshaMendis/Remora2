import { prisma } from '../prisma.ts'

type NotificationInput = {
  userId: string
  type: string
  title: string
  message: string
  targetUrl?: string | null
}

export async function createNotifications(notifications: NotificationInput[]) {
  if (!notifications || notifications.length === 0) return
  const deduped = new Map<string, NotificationInput>()
  for (const n of notifications) {
    if (!n?.userId) continue
    const key = `${n.userId}:${n.type}:${n.title}:${n.message}:${n.targetUrl || ''}`
    if (!deduped.has(key)) deduped.set(key, n)
  }
  const data = Array.from(deduped.values()).map(n => ({
    userId: n.userId,
    type: n.type as any,
    title: n.title,
    message: n.message,
    targetUrl: n.targetUrl || null,
  }))
  if (data.length === 0) return
  await prisma.notification.createMany({ data })
}
