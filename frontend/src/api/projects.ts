import api from './axios'
import type { Project } from '@/types/project'

interface ApiResponse<T> {
  success: boolean
  data: T
}

export const projectsApi = {
  getAll: () =>
    api.get<ApiResponse<{ projects: Project[] }>>('/projects'),

  getById: (id: string) =>
    api.get<ApiResponse<{ project: Project }>>(`/projects/${id}`),

  create: (body: { name: string; description?: string }) =>
    api.post<ApiResponse<{ project: Project }>>('/projects', body),

  update: (id: string, body: { name?: string; description?: string }) =>
    api.put<ApiResponse<{ project: Project }>>(`/projects/${id}`, body),

  delete: (id: string) =>
    api.delete(`/projects/${id}`),
}
