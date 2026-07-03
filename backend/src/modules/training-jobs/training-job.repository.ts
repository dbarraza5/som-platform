import prisma from '../../database/prisma'

type CreateTrainingJobData = {
  datasetId: string
  name: string
  description?: string | null
  gridWidth: number
  gridHeight: number
  neuronCount: number
  alpha: number
  beta: number
  neighborhoodRadius: number
  objectiveDimensionWeight: number
  iterationLimit?: number | null
  useLogarithmicForget: boolean
  threadCount: number
}

type TrainingJobStatusValue = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

type UpdateTrainingJobData = {
  status?: TrainingJobStatusValue
  errorMessage?: string | null
  progress?: number
  currentIteration?: number
  currentCycle?: number
  recoveryAttempts?: number
  startedAt?: Date | null
  finishedAt?: Date | null
}

export const trainingJobRepository = {
  create(data: CreateTrainingJobData) {
    return prisma.trainingJob.create({ data })
  },

  findById(id: string) {
    return prisma.trainingJob.findUnique({ where: { id } })
  },

  findAllByStatus(status: TrainingJobStatusValue) {
    return prisma.trainingJob.findMany({ where: { status } })
  },

  update(id: string, data: UpdateTrainingJobData) {
    return prisma.trainingJob.update({ where: { id }, data })
  },
}
