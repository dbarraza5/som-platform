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

type UpdateTrainingJobData = {
  status?: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  errorMessage?: string | null
}

export const trainingJobRepository = {
  create(data: CreateTrainingJobData) {
    return prisma.trainingJob.create({ data })
  },

  findById(id: string) {
    return prisma.trainingJob.findUnique({ where: { id } })
  },

  update(id: string, data: UpdateTrainingJobData) {
    return prisma.trainingJob.update({ where: { id }, data })
  },
}
