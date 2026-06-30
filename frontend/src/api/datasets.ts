import api from './axios'
import type { Dataset } from '@/types/dataset'

interface ApiResponse<T> {
  success: boolean
  data: T
}

export const datasetsApi = {
  getAll: (projectId: string) =>
    api.get<ApiResponse<{ datasets: Dataset[] }>>(`/projects/${projectId}/datasets`),

  getById: (id: string) =>
    api.get<ApiResponse<{ dataset: Dataset }>>(`/datasets/${id}`),

  create: (projectId: string, body: { name: string; description?: string }) =>
    api.post<ApiResponse<{ dataset: Dataset }>>(`/projects/${projectId}/datasets`, body),

  update: (id: string, body: { name?: string; description?: string }) =>
    api.put<ApiResponse<{ dataset: Dataset }>>(`/datasets/${id}`, body),

  delete: (id: string) =>
    api.delete(`/datasets/${id}`),

  upload: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<ApiResponse<{ dataset: Dataset }>>(`/datasets/${id}/upload`, formData)
  },
}
