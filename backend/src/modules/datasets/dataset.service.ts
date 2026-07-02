import { projectRepository } from '../projects/project.repository'
import { datasetRepository } from './dataset.repository'
import { getStorageProvider } from '../../storage'
import { datasetAnalyzerService } from './dataset.analyzer'
import { getQueueService } from '../../queue'
import type { QueueMessage } from '../../queue'

type CreateDatasetData = {
  name: string
  description?: string | null
}

type UpdateDatasetData = {
  name?: string
  description?: string | null
}

type ReportNormalizationData = {
  status: 'COMPLETED' | 'FAILED'
  error?: string | null
}

async function assertProjectOwnership(projectId: string, userId: string) {
  const project = await projectRepository.findById(projectId)
  if (!project) throw new Error('PROJECT_NOT_FOUND')
  if (project.userId !== userId) throw new Error('FORBIDDEN')
  return project
}

async function assertDatasetOwnership(datasetId: string, userId: string) {
  const dataset = await datasetRepository.findById(datasetId)
  if (!dataset) throw new Error('DATASET_NOT_FOUND')
  if (dataset.project.userId !== userId) throw new Error('FORBIDDEN')
  return dataset
}

export const datasetService = {
  async getAll(projectId: string, userId: string) {
    await assertProjectOwnership(projectId, userId)
    return datasetRepository.findAllByProjectId(projectId)
  },

  async getById(id: string, userId: string) {
    return assertDatasetOwnership(id, userId)
  },

  async create(projectId: string, userId: string, data: CreateDatasetData) {
    await assertProjectOwnership(projectId, userId)
    return datasetRepository.create({ ...data, projectId })
  },

  async update(id: string, userId: string, data: UpdateDatasetData) {
    await assertDatasetOwnership(id, userId)
    return datasetRepository.update(id, data)
  },

  async delete(id: string, userId: string) {
    await assertDatasetOwnership(id, userId)
    await datasetRepository.delete(id)
  },

  async uploadFile(id: string, userId: string, file: Express.Multer.File) {
    const dataset = await assertDatasetOwnership(id, userId)
    const storage = getStorageProvider()
    const key = `projects/${dataset.project.id}/datasets/${dataset.id}/original.csv`

    console.log(`[UPLOAD] Dataset ${id} recibido. Archivo: ${file.originalname} (${file.size} bytes)`)

    if (dataset.storageKey) {
      const fileExists = await storage.exists(dataset.storageKey)
      if (fileExists) await storage.delete(dataset.storageKey)
    }

    await storage.save({ key, buffer: file.buffer, mimeType: file.mimetype })

    await datasetRepository.updateFileMetadata(id, {
      originalFilename: file.originalname,
      storageKey: key,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date(),
    })

    // --- CSV analysis (Phase 6.4) — synchronous, runs in the same HTTP request ---
    await datasetRepository.updateAnalysis(id, { analysisStatus: 'PROCESSING' })

    let analysisOk = false
    try {
      const stream = await storage.getReadStream(key)
      const result = await datasetAnalyzerService.analyze(stream)
      await datasetRepository.updateAnalysis(id, {
        analysisStatus: 'COMPLETED',
        rows: result.rows,
        columns: result.columns,
        analysisError: null,
      })
      analysisOk = true
    } catch (err) {
      const analysisError = err instanceof Error ? err.message : 'Analysis failed'
      console.error(`[UPLOAD] Error al analizar dataset ${id}: ${analysisError}`)
      await datasetRepository.updateAnalysis(id, {
        analysisStatus: 'FAILED',
        analysisError,
      })
      await datasetRepository.updateNormalization(id, {
        normalizationStatus: 'FAILED',
        normalizationError: 'CSV analysis failed; normalization was not enqueued.',
      })
    }

    // --- Queue publish (Phase 7.2) — only if analysis succeeded ---
    if (analysisOk) {
      await datasetRepository.updateNormalization(id, { normalizationStatus: 'PENDING' })

      const message: QueueMessage = {
        operation: 'NORMALIZE',
        datasetId: dataset.id,
        projectId: dataset.project.id,
        storageKey: key,
        timestamp: new Date().toISOString(),
      }

      console.log(`[QUEUE] Publicando trabajo de normalización para dataset ${id}.`)
      try {
        await getQueueService().publish(message)
        console.log(`[QUEUE] Trabajo publicado correctamente. Dataset: ${id}, cola: ${key}`)
      } catch (err) {
        const queueError = err instanceof Error ? err.message : 'Queue publish failed'
        console.error(`[QUEUE] Error al publicar trabajo para dataset ${id}: ${queueError}`)
        await datasetRepository.updateNormalization(id, {
          normalizationStatus: 'FAILED',
          normalizationError: queueError,
        })
      }
    }

    return datasetRepository.findById(id)
  },

  // Called by the Worker (via internal-auth, not a user JWT) once it has
  // published (or failed to publish) normalized.csv / dimensions.xml.
  async reportNormalizationResult(id: string, data: ReportNormalizationData) {
    const dataset = await datasetRepository.findById(id)
    if (!dataset) throw new Error('DATASET_NOT_FOUND')

    await datasetRepository.updateNormalization(id, {
      normalizationStatus: data.status,
      normalizationError: data.status === 'FAILED' ? (data.error ?? 'Normalization failed') : null,
      normalizationFinishedAt: new Date(),
    })

    return datasetRepository.findById(id)
  },
}
