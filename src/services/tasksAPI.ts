import { request } from './api'

export async function createTask(phaseId: string, payload: { title: string; description?: string; dueDate?: string }) {
  return request(`/tasks/phases/${phaseId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getTask(id: string) {
  return request(`/tasks/${id}`)
}

export async function updateTask(id: string, payload: any) {
  return request(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

