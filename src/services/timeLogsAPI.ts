import { request } from './api'

export async function listTimeLogs(taskId: string, scope: 'all' | 'mine' = 'all', userId?: string) {
  return request(`/timelogs/tasks/${taskId}/timelogs?scope=${scope}`, {
    headers: userId ? { 'x-user-id': userId } as any : undefined,
  })
}

export async function createTimeLog(taskId: string, payload: { startedAt: string; endedAt: string; description: string }, userId: string) {
  return request(`/timelogs/tasks/${taskId}/timelogs`, {
    method: 'POST',
    headers: { 'x-user-id': userId } as any,
    body: JSON.stringify(payload),
  })
}

