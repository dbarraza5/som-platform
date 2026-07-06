import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Grid3x3 } from 'lucide-react'
import { trainingJobsApi } from '@/api/trainingJobs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AppLayout from '@/components/layout/AppLayout'
import { cn } from '@/lib/utils'
import { TRAINING_STATUS_META, formatDateTime, getTrainingDisplayStatus } from '@/lib/trainingJobStatus'

export default function TrainingJobDetailPage() {
  const { id: projectId, datasetId, trainingId } = useParams<{
    id: string
    datasetId: string
    trainingId: string
  }>()

  const { data: trainingJob, isLoading } = useQuery({
    queryKey: ['trainingJob', trainingId],
    queryFn: () =>
      trainingJobsApi.getById(projectId!, datasetId!, trainingId!).then((r) => r.data.data.trainingJob),
    enabled: !!projectId && !!datasetId && !!trainingId,
  })

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <p className="text-muted-foreground">Cargando entrenamiento...</p>
        </div>
      </AppLayout>
    )
  }

  if (!trainingJob) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="mb-4 text-muted-foreground">Entrenamiento no encontrado.</p>
          <Button asChild variant="outline">
            <Link to={`/projects/${projectId}/datasets/${datasetId}`}>Volver al dataset</Link>
          </Button>
        </div>
      </AppLayout>
    )
  }

  const displayStatus = getTrainingDisplayStatus(trainingJob)
  const meta = TRAINING_STATUS_META[displayStatus]
  const Icon = meta.icon

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-3 mb-1">
            <Link to={`/projects/${projectId}/datasets/${datasetId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al dataset
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Entrenamiento SOM</h1>
          <p className="text-muted-foreground">{trainingJob.name}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información del entrenamiento</CardTitle>
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

            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Topología</p>
                <p className="font-medium">
                  {trainingJob.gridWidth} × {trainingJob.gridHeight}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Neuronas</p>
                <p className="font-medium tabular-nums">{trainingJob.neuronCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Alpha</p>
                <p className="font-medium tabular-nums">{trainingJob.alpha}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Omega</p>
                <p className="font-medium tabular-nums">{trainingJob.beta}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Iteración final</p>
                <p className="font-medium tabular-nums">{trainingJob.currentIteration ?? 'No disponible'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ciclo final</p>
                <p className="font-medium tabular-nums">{trainingJob.currentCycle ?? 'No disponible'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Inicio</p>
                <p className="font-medium">
                  {trainingJob.startedAt ? formatDateTime(trainingJob.startedAt) : 'No disponible'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Término</p>
                <p className="font-medium">
                  {trainingJob.finishedAt ? formatDateTime(trainingJob.finishedAt) : 'No disponible'}
                </p>
              </div>
            </div>

            {trainingJob.errorMessage && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {trainingJob.errorMessage}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="rounded-full bg-muted p-3">
              <Grid3x3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Visualización disponible en la siguiente iteración.
            </p>
            <p className="max-w-md text-xs text-muted-foreground/70">
              Aquí se mostrará el mapa SOM, la configuración utilizada, los pesos entrenados, la activación de
              neuronas y los archivos generados durante este entrenamiento.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
