import api from './axios'
import type { TrainingDimension } from '@/types/trainingFiles'

interface ApiResponse<T> {
  success: boolean
  data: T
}

const base = (projectId: string, datasetId: string, trainingId: string) =>
  `/projects/${projectId}/datasets/${datasetId}/training-jobs/${trainingId}`

export const trainingFilesApi = {
  getDimensions: (projectId: string, datasetId: string, trainingId: string) =>
    api.get<ApiResponse<{ dimensions: TrainingDimension[] }>>(`${base(projectId, datasetId, trainingId)}/dimensions`),

  getWeights: (projectId: string, datasetId: string, trainingId: string) =>
    api.get<ApiResponse<{ weights: number[][] }>>(`${base(projectId, datasetId, trainingId)}/weights`),

  getActivation: (projectId: string, datasetId: string, trainingId: string) =>
    api.get<ApiResponse<{ activation: number[] }>>(`${base(projectId, datasetId, trainingId)}/activation`),
}
