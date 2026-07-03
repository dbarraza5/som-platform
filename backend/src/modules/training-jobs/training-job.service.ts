import { datasetRepository } from '../datasets/dataset.repository'
import { trainingJobRepository } from './training-job.repository'
import { getQueueService } from '../../queue'
import type { QueueMessage } from '../../queue'
import { env } from '../../config/env'

type TrainingJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

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

  // Called by the Worker (internalAuth, not a user JWT) to look up a
  // TrainingJob it only knows the id of.
  async getByIdInternal(id: string) {
    const trainingJob = await trainingJobRepository.findById(id)
    if (!trainingJob) throw new Error('TRAINING_JOB_NOT_FOUND')
    return trainingJob
  },

  // Called by the Worker to report environment-preparation or training
  // progress (RUNNING/COMPLETED/FAILED). The Backend remains the only
  // writer of TrainingJob.status — the Worker never touches Postgres.
  //
  // Since Phase 10.4 the Worker calls this repeatedly while som_ runs (once
  // per statusRNA.dat poll), always with status=RUNNING — so startedAt must
  // only be set on the *first* such call, not reset on every sync tick.
  async reportStatus(
    id: string,
    data: {
      status: TrainingJobStatus
      errorMessage?: string | null
      progress?: number
      currentIteration?: number
      currentCycle?: number
    },
  ) {
    const trainingJob = await trainingJobRepository.findById(id)
    if (!trainingJob) throw new Error('TRAINING_JOB_NOT_FOUND')

    const updateData: Parameters<typeof trainingJobRepository.update>[1] = {
      status: data.status,
      errorMessage: data.errorMessage ?? null,
    }

    if (data.progress !== undefined) updateData.progress = data.progress
    if (data.currentIteration !== undefined) updateData.currentIteration = data.currentIteration
    if (data.currentCycle !== undefined) updateData.currentCycle = data.currentCycle
    if (data.status === 'RUNNING' && !trainingJob.startedAt) updateData.startedAt = new Date()
    if (data.status === 'COMPLETED' || data.status === 'FAILED') updateData.finishedAt = new Date()

    await trainingJobRepository.update(id, updateData)

    return trainingJobRepository.findById(id)
  },
}
