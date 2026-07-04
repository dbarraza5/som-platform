import api from './axios'
import type { CreateTrainingJobPayload, TrainingJob } from '@/types/trainingJob'

interface ApiResponse<T> {
  success: boolean
  data: T
}

export const trainingJobsApi = {
  create: (projectId: string, datasetId: string, body: CreateTrainingJobPayload) =>
    api.post<ApiResponse<{ trainingJob: TrainingJob }>>(
      `/projects/${projectId}/datasets/${datasetId}/training-jobs`,
      body,
    ),
}
