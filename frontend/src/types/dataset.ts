export type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface Dataset {
  id: string
  projectId: string
  name: string
  description: string | null
  originalFilename: string | null
  storageKey: string | null
  mimeType: string | null
  fileSize: number | null
  rows: number | null
  columns: number | null
  uploadedAt: string | null
  analysisStatus: AnalysisStatus
  analysisError: string | null
  createdAt: string
  updatedAt: string
}
