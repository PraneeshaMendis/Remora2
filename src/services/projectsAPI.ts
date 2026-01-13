import { apiGet } from './api'

export async function getProjectsWithPhases(): Promise<Array<{ id: string; name: string; phases: Array<{ id: string; name: string }> }>> {
  const list = await apiGet('/projects/basic')
  return Array.isArray(list) ? list : []
}

export async function getProjects(): Promise<any[]> {
  const list = await apiGet('/projects')
  return Array.isArray(list) ? list : []
}
