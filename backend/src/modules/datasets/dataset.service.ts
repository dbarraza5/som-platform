import { projectRepository } from '../projects/project.repository'
import { datasetRepository } from './dataset.repository'
import { getStorageProvider } from '../../storage'

type CreateDatasetData = {
  name: string
  description?: string | null
}

type UpdateDatasetData = {
  name?: string
  description?: string | null
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

    if (dataset.storageKey) {
      const fileExists = await storage.exists(dataset.storageKey)
      if (fileExists) await storage.delete(dataset.storageKey)
    }

    await storage.save({ key, buffer: file.buffer, mimeType: file.mimetype })

    return datasetRepository.updateFileMetadata(id, {
      originalFilename: file.originalname,
      storageKey: key,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date(),
    })
  },
}
