import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TRAINING_STATUS_META, formatDateTime, formatDuration, getTrainingDisplayStatus } from '@/lib/trainingJobStatus'
import type { TrainingJob } from '@/types/trainingJob'

interface TrainingJobListItemProps {
  trainingJob: TrainingJob
  projectId: string
  datasetId: string
}

export default function TrainingJobListItem({ trainingJob, projectId, datasetId }: TrainingJobListItemProps) {
  const displayStatus = getTrainingDisplayStatus(trainingJob)
  const meta = TRAINING_STATUS_META[displayStatus]
  const Icon = meta.icon

  const durationLabel =
    trainingJob.startedAt && trainingJob.finishedAt
      ? formatDuration(new Date(trainingJob.finishedAt).getTime() - new Date(trainingJob.startedAt).getTime())
      : 'No disponible'

  return (
    <div className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40">
      <div className={cn('shrink-0 rounded-lg p-2.5', meta.iconWrapperClassName)}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', meta.badgeClassName)}>
            {meta.label}
          </span>
          <p className="truncate text-sm font-medium">{trainingJob.name}</p>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-4">
          <span>Inicio: {trainingJob.startedAt ? formatDateTime(trainingJob.startedAt) : 'No disponible'}</span>
          <span>Término: {trainingJob.finishedAt ? formatDateTime(trainingJob.finishedAt) : 'No disponible'}</span>
          <span>Duración: {durationLabel}</span>
          <span>
            Topología: {trainingJob.gridWidth} × {trainingJob.gridHeight} ({trainingJob.neuronCount} neuronas)
          </span>
          <span>Alpha: {trainingJob.alpha}</span>
          <span>Omega: {trainingJob.beta}</span>
        </div>
      </div>

      <div className="shrink-0">
        <Button asChild size="sm" variant="outline">
          <Link to={`/projects/${projectId}/datasets/${datasetId}/trainings/${trainingJob.id}`}>Ver detalle</Link>
        </Button>
      </div>
    </div>
  )
}
