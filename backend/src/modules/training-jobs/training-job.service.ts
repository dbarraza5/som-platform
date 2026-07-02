import { datasetRepository } from '../datasets/dataset.repository'
import { trainingJobRepository } from './training-job.repository'
import { getQueueService } from '../../queue'
import type { QueueMessage } from '../../queue'
import { env } from '../../config/env'

type CreateTrainingJobData = {
  name: string
  description?: string | null
  gridWidth: number
  gridHeight: number
  alpha: number
  beta: number
  neighborhoodRadius: number
  objectiveDimensionWeight: number
  iterationLimit?: number | null
  useLogarithmicForget?: boolean
  threadCount?: number
}

async function assertDatasetReadyForTraining(projectId: string, datasetId: string, userId: string) {
  const dataset = await datasetRepository.findById(datasetId)
  if (!dataset || dataset.projectId !== projectId) throw new Error('DATASET_NOT_FOUND')
  if (dataset.project.userId !== userId) throw new Error('FORBIDDEN')
  if (dataset.normalizationStatus === 'FAILED') throw new Error('NORMALIZATION_FAILED')
  if (dataset.normalizationStatus !== 'COMPLETED') throw new Error('NORMALIZATION_NOT_COMPLETED')
  return dataset
}

export const trainingJobService = {
  async create(projectId: string, datasetId: string, userId: string, data: CreateTrainingJobData) {
    await assertDatasetReadyForTraining(projectId, datasetId, userId)

    const trainingJob = await trainingJobRepository.create({
      datasetId,
      name: data.name,
      description: data.description ?? null,
      gridWidth: data.gridWidth,
      gridHeight: data.gridHeight,
      neuronCount: data.gridWidth * data.gridHeight,
      alpha: data.alpha,
      beta: data.beta,
      neighborhoodRadius: data.neighborhoodRadius,
      objectiveDimensionWeight: data.objectiveDimensionWeight,
      iterationLimit: data.iterationLimit ?? null,
      useLogarithmicForget: data.useLogarithmicForget ?? false,
      threadCount: data.threadCount ?? 1,
    })

    console.log(`[TRAINING] TrainingJob creado. id=${trainingJob.id} datasetId=${datasetId}`)

    const message: QueueMessage = {
      operation: 'TRAIN',
      trainingJobId: trainingJob.id,
      datasetId,
      timestamp: new Date().toISOString(),
    }

    try {
      await getQueueService().publish(message, env.TRAINING_QUEUE_NAME)
      console.log(
        `[TRAINING] Mensaje enviado a la cola '${env.TRAINING_QUEUE_NAME}'. trainingJobId=${trainingJob.id} datasetId=${datasetId}`,
      )
    } catch (err) {
      const queueError = err instanceof Error ? err.message : 'Queue publish failed'
      console.error(`[TRAINING] Error al publicar trabajo para TrainingJob ${trainingJob.id}: ${queueError}`)
      await trainingJobRepository.update(trainingJob.id, { status: 'FAILED', errorMessage: queueError })
    }

    return trainingJobRepository.findById(trainingJob.id)
  },
}
