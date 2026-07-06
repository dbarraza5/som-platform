import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  TRAINING_STATUS_META,
  formatDateTime,
  formatDuration,
  getTrainingDisplayStatus,
  isTrainingDisplayStatusActive,
} from '@/lib/trainingJobStatus'
import type { TrainingJob } from '@/types/trainingJob'

interface TrainingJobMonitorCardProps {
  trainingJob: TrainingJob
  projectId: string
  datasetId: string
  onCreateNew: () => void
}

export default function TrainingJobMonitorCard({ trainingJob, projectId, datasetId, onCreateNew }: TrainingJobMonitorCardProps) {
  const displayStatus = getTrainingDisplayStatus(trainingJob)
  const meta = TRAINING_STATUS_META[displayStatus]
  const Icon = meta.icon
  const isActive = isTrainingDisplayStatusActive(displayStatus)

  const startedAtMs = trainingJob.startedAt ? new Date(trainingJob.startedAt).getTime() : null
  const endMs = !isActive && trainingJob.finishedAt ? new Date(trainingJob.finishedAt).getTime() : Date.now()
  const elapsedLabel = startedAtMs != null ? formatDuration(endMs - startedAtMs) : 'No disponible'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Entrenamiento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn('rounded-full p-2', meta.iconWrapperClassName)}>
            <Icon className={cn('h-5 w-5', meta.spin && 'animate-spin')} />
          </div>
          <div>
            <p className="font-medium">{meta.label}</p>
            <p className="text-sm text-muted-foreground">{meta.description}</p>
          </div>
        </div>

        {isActive && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progreso</span>
              <span className="font-medium tabular-nums">{trainingJob.progress}%</span>
            </div>
            <Progress value={trainingJob.progress} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Iteración actual</p>
            <p className="font-medium tabular-nums">{trainingJob.currentIteration ?? 'No disponible'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ciclo actual</p>
            <p className="font-medium tabular-nums">{trainingJob.currentCycle ?? 'No disponible'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Inicio</p>
            <p className="font-medium">
              {trainingJob.startedAt ? formatDateTime(trainingJob.startedAt) : 'No disponible'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{isActive ? 'Tiempo transcurrido' : 'Duración total'}</p>
            <p className="font-medium tabular-nums">{elapsedLabel}</p>
          </div>
        </div>

        {displayStatus === 'COMPLETED' && trainingJob.finishedAt && (
          <>
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              El entrenamiento terminó correctamente el {formatDateTime(trainingJob.finishedAt)}.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onCreateNew}>
                Crear nuevo entrenamiento
              </Button>
              <Button asChild>
                <Link to={`/projects/${projectId}/datasets/${datasetId}/trainings/${trainingJob.id}`}>
                  Ver resultados
                </Link>
              </Button>
            </div>
          </>
        )}

        {displayStatus === 'FAILED' && (
          <>
            {trainingJob.errorMessage && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {trainingJob.errorMessage}
              </p>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={onCreateNew}>
                Crear nuevo entrenamiento
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
