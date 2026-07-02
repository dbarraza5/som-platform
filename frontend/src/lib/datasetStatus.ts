import { CheckCircle2, Clock, Loader2, UploadCloud, XCircle, type LucideIcon } from 'lucide-react'
import type { Dataset } from '@/types/dataset'

// The backend exposes two independent enums (analysisStatus, normalizationStatus).
// The UI needs a single pipeline status to drive the badge, description and stepper.
export type DatasetPipelineStatus =
  | 'NO_FILE'
  | 'UPLOADED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'

export function getDatasetPipelineStatus(dataset: Dataset): DatasetPipelineStatus {
  if (!dataset.originalFilename) return 'NO_FILE'
  if (dataset.analysisStatus === 'FAILED') return 'FAILED'
  if (dataset.normalizationStatus === 'FAILED') return 'FAILED'
  if (dataset.normalizationStatus === 'COMPLETED') return 'COMPLETED'
  if (dataset.normalizationStatus === 'PROCESSING') return 'PROCESSING'
  if (dataset.normalizationStatus === 'PENDING' && dataset.analysisStatus === 'COMPLETED') {
    return 'QUEUED'
  }
  return 'UPLOADED'
}

// Statuses where something is still happening server-side and the view should poll.
export function isDatasetPipelineActive(status: DatasetPipelineStatus): boolean {
  return status === 'UPLOADED' || status === 'QUEUED' || status === 'PROCESSING'
}

interface DatasetStatusMeta {
  label: string
  description: string
  icon: LucideIcon
  badgeClassName: string
  iconWrapperClassName: string
}

export const DATASET_STATUS_META: Record<DatasetPipelineStatus, DatasetStatusMeta> = {
  NO_FILE: {
    label: 'Esperando archivo',
    description: 'Sube un archivo CSV para comenzar el procesamiento.',
    icon: UploadCloud,
    badgeClassName: 'bg-muted text-muted-foreground',
    iconWrapperClassName: 'bg-muted text-muted-foreground',
  },
  UPLOADED: {
    label: 'CSV recibido',
    description: 'El archivo fue recibido y está a punto de encolarse para su normalización.',
    icon: Clock,
    badgeClassName: 'bg-blue-100 text-blue-700',
    iconWrapperClassName: 'bg-blue-100 text-blue-600',
  },
  QUEUED: {
    label: 'En cola',
    description: 'El trabajo de normalización está encolado, esperando a que el Worker lo tome.',
    icon: Clock,
    badgeClassName: 'bg-amber-100 text-amber-700',
    iconWrapperClassName: 'bg-amber-100 text-amber-600',
  },
  PROCESSING: {
    label: 'Procesando',
    description: 'El Worker está normalizando el Dataset.',
    icon: Loader2,
    badgeClassName: 'bg-amber-100 text-amber-700',
    iconWrapperClassName: 'bg-amber-100 text-amber-600',
  },
  COMPLETED: {
    label: 'Normalización completada',
    description: 'El Dataset está listo para crear entrenamientos.',
    icon: CheckCircle2,
    badgeClassName: 'bg-green-100 text-green-700',
    iconWrapperClassName: 'bg-green-100 text-green-600',
  },
  FAILED: {
    label: 'Error',
    description: 'La normalización no pudo finalizar correctamente.',
    icon: XCircle,
    badgeClassName: 'bg-red-100 text-red-700',
    iconWrapperClassName: 'bg-red-100 text-red-600',
  },
}

export type PipelineStepState = 'done' | 'current' | 'pending' | 'error'

export interface PipelineStep {
  key: string
  label: string
  state: PipelineStepState
}

// Drives the visual stepper: which steps are done, which one is in flight,
// and — on failure — exactly where the process stopped.
export function getDatasetPipelineSteps(dataset: Dataset): PipelineStep[] {
  const status = getDatasetPipelineStatus(dataset)

  const steps: PipelineStep[] = [
    { key: 'received', label: 'CSV recibido', state: 'pending' },
    { key: 'queued', label: 'Trabajo encolado', state: 'pending' },
    { key: 'normalized', label: 'Normalización', state: 'pending' },
    { key: 'training', label: 'Entrenamiento', state: 'pending' },
  ]

  switch (status) {
    case 'NO_FILE':
      return steps
    case 'UPLOADED':
      steps[0].state = 'current'
      return steps
    case 'QUEUED':
      steps[0].state = 'done'
      steps[1].state = 'current'
      return steps
    case 'PROCESSING':
      steps[0].state = 'done'
      steps[1].state = 'done'
      steps[2].state = 'current'
      return steps
    case 'COMPLETED':
      steps[0].state = 'done'
      steps[1].state = 'done'
      steps[2].state = 'done'
      steps[3].state = 'current'
      return steps
    case 'FAILED':
      if (dataset.analysisStatus === 'FAILED') {
        steps[0].state = 'error'
      } else {
        steps[0].state = 'done'
        steps[1].state = 'done'
        steps[2].state = 'error'
      }
      return steps
  }
}
