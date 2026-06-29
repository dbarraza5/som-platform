import { projectRepository } from '../projects/project.repository'
import { datasetRepository } from './dataset.repository'

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
}
