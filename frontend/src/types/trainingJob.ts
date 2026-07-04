export type TrainingJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface TrainingJob {
  id: string
  datasetId: string
  name: string
  description: string | null
  status: TrainingJobStatus
  progress: number
  currentIteration: number | null
  currentCycle: number | null
  gridWidth: number
  gridHeight: number
  neuronCount: number
  alpha: number
  beta: number
  neighborhoodRadius: number
  objectiveDimensionWeight: number
  useLogarithmicForget: boolean
  threadCount: number
  iterationLimit: number | null
  startedAt: string | null
  finishedAt: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTrainingJobPayload {
  name: string
  gridWidth: number
  gridHeight: number
  alpha: number
  beta: number
  neighborhoodRadius: number
  objectiveDimensionWeight: number
}
