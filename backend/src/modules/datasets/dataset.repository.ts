import prisma from '../../database/prisma'

type CreateDatasetData = {
  name: string
  description?: string | null
  projectId: string
}

type UpdateDatasetData = {
  name?: string
  description?: string | null
}

type UpdateFileMetadata = {
  originalFilename: string
  storageKey: string
  mimeType: string
  fileSize: number
  uploadedAt: Date
}

type UpdateAnalysisData = {
  analysisStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  rows?: number | null
  columns?: number | null
  analysisError?: string | null
}

type UpdateNormalizationData = {
  normalizationStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  normalizationError?: string | null
}

export const datasetRepository = {
  findAllByProjectId(projectId: string) {
    return prisma.dataset.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    })
  },

  findById(id: string) {
    return prisma.dataset.findUnique({
      where: { id },
      include: { project: true },
    })
  },

  create(data: CreateDatasetData) {
    return prisma.dataset.create({ data })
  },

  update(id: string, data: UpdateDatasetData) {
    return prisma.dataset.update({ where: { id }, data })
  },

  delete(id: string) {
    return prisma.dataset.delete({ where: { id } })
  },

  updateFileMetadata(id: string, data: UpdateFileMetadata) {
    return prisma.dataset.update({ where: { id }, data })
  },

  updateAnalysis(id: string, data: UpdateAnalysisData) {
    return prisma.dataset.update({ where: { id }, data })
  },

  updateNormalization(id: string, data: UpdateNormalizationData) {
    return prisma.dataset.update({ where: { id }, data })
  },
}
