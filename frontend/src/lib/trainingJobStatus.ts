import { Ban, CheckCircle2, Clock, Loader2, RotateCw, XCircle, type LucideIcon } from 'lucide-react'
import type { TrainingJob } from '@/types/trainingJob'

// The Backend only has 5 real statuses (QUEUED/RUNNING/COMPLETED/FAILED/
// CANCELLED) — "Iniciando" and "Recuperando entrenamiento" are UI-only
// distinctions derived from fields already present on TrainingJob, not new
// Backend states.
export type TrainingDisplayStatus =
  | 'QUEUED'
  | 'STARTING'
  | 'RECOVERING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export function getTrainingDisplayStatus(job: TrainingJob): TrainingDisplayStatus {
  if (job.status === 'QUEUED') return 'QUEUED'
  if (job.status === 'COMPLETED') return 'COMPLETED'
  if (job.status === 'FAILED') return 'FAILED'
  if (job.status === 'CANCELLED') return 'CANCELLED'

  // status === 'RUNNING' from here on.
  // recoveryAttempts is only ever incremented by the Worker when it resumes
  // a job left RUNNING by a previous crash/restart (Phase 10.5) — its mere
  // presence is a true signal this run needed to be resumed, so it is shown
  // for the rest of the run rather than just a brief instant, since no
  // separate "recovery in progress right now" signal exists yet.
  if (job.recoveryAttempts > 0) return 'RECOVERING'
  // The Worker flips status to RUNNING as soon as it launches som_, before
  // its first statusRNA.dat poll populates currentIteration/currentCycle
  // (Phase 10.3 vs 10.4) — that gap is what "Iniciando" represents.
  if (job.currentIteration == null && job.currentCycle == null) return 'STARTING'
  return 'RUNNING'
}

export function isTrainingDisplayStatusActive(status: TrainingDisplayStatus): boolean {
  return status !== 'COMPLETED' && status !== 'FAILED' && status !== 'CANCELLED'
}

interface TrainingStatusMeta {
  label: string
  description: string
  icon: LucideIcon
  spin: boolean
  badgeClassName: string
  iconWrapperClassName: string
}

export const TRAINING_STATUS_META: Record<TrainingDisplayStatus, TrainingStatusMeta> = {
  QUEUED: {
    label: 'En cola',
    description: 'El Worker todavía no ha iniciado el procesamiento de este entrenamiento.',
    icon: Clock,
    spin: false,
    badgeClassName: 'bg-amber-100 text-amber-700',
    iconWrapperClassName: 'bg-amber-100 text-amber-600',
  },
  STARTING: {
    label: 'Iniciando',
    description: 'El Worker está preparando el entrenamiento.',
    icon: Loader2,
    spin: true,
    badgeClassName: 'bg-blue-100 text-blue-700',
    iconWrapperClassName: 'bg-blue-100 text-blue-600',
  },
  RECOVERING: {
    label: 'Recuperando entrenamiento...',
    description: 'El sistema se interrumpió y está retomando el entrenamiento desde el último punto guardado.',
    icon: RotateCw,
    spin: true,
    badgeClassName: 'bg-orange-100 text-orange-700',
    iconWrapperClassName: 'bg-orange-100 text-orange-600',
  },
  RUNNING: {
    label: 'Entrenando',
    description: 'El modelo SOM se está entrenando.',
    icon: Loader2,
    spin: true,
    badgeClassName: 'bg-blue-100 text-blue-700',
    iconWrapperClassName: 'bg-blue-100 text-blue-600',
  },
  COMPLETED: {
    label: 'Entrenamiento completado',
    description: 'El entrenamiento finalizó correctamente.',
    icon: CheckCircle2,
    spin: false,
    badgeClassName: 'bg-green-100 text-green-700',
    iconWrapperClassName: 'bg-green-100 text-green-600',
  },
  FAILED: {
    label: 'Entrenamiento fallido',
    description: 'El entrenamiento no pudo finalizar correctamente.',
    icon: XCircle,
    spin: false,
    badgeClassName: 'bg-red-100 text-red-700',
    iconWrapperClassName: 'bg-red-100 text-red-600',
  },
  CANCELLED: {
    label: 'Entrenamiento cancelado',
    description: 'Este entrenamiento fue cancelado.',
    icon: Ban,
    spin: false,
    badgeClassName: 'bg-muted text-muted-foreground',
    iconWrapperClassName: 'bg-muted text-muted-foreground',
  },
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES')
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (hours > 0 || minutes > 0) parts.push(`${minutes}m`)
  parts.push(`${seconds}s`)
  return parts.join(' ')
}
