import { useRef, useState, type ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Cpu } from 'lucide-react'
import { datasetsApi } from '@/api/datasets'
import { trainingJobsApi } from '@/api/trainingJobs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import AppLayout from '@/components/layout/AppLayout'
import DatasetHeader from './components/DatasetHeader'
import DatasetPipeline from './components/DatasetPipeline'
import DatasetTrainingCard from './components/DatasetTrainingCard'
import TrainingJobMonitorCard from './components/TrainingJobMonitorCard'
import TrainingJobCatalogSection from './components/TrainingJobCatalogSection'
import DatasetDetailSkeleton from './components/DatasetDetailSkeleton'
import CreateTrainingJobForm, {
  type CreateTrainingJobFormValues,
} from '@/components/training-jobs/CreateTrainingJobForm'
import { getDatasetPipelineStatus, isDatasetPipelineActive } from '@/lib/datasetStatus'
import { getTopologyOption, DEFAULT_OBJECTIVE_DIMENSION_WEIGHT } from '@/lib/somDefaults'
import { getTrainingDisplayStatus, isTrainingDisplayStatusActive } from '@/lib/trainingJobStatus'
import type { Dataset } from '@/types/dataset'
import type { TrainingJob } from '@/types/trainingJob'

const POLL_INTERVAL_MS = 5000

export default function DatasetDetailPage() {
  const { id: projectId, datasetId } = useParams<{ id: string; datasetId: string }>()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showTrainingModal, setShowTrainingModal] = useState(false)

  const { data: dataset, isLoading } = useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: () => datasetsApi.getById(datasetId!).then((r) => r.data.data.dataset),
    enabled: !!datasetId,
    refetchInterval: (query) => {
      const current = query.state.data as Dataset | undefined
      if (!current) return false
      return isDatasetPipelineActive(getDatasetPipelineStatus(current)) ? POLL_INTERVAL_MS : false
    },
  })

  const { data: latestTrainingJob } = useQuery({
    queryKey: ['trainingJob', 'latest', datasetId],
    queryFn: () =>
      trainingJobsApi.getLatest(projectId!, datasetId!).then((r) => r.data.data.trainingJob),
    enabled: !!projectId && !!datasetId,
    refetchInterval: (query) => {
      const current = query.state.data as TrainingJob | null | undefined
      if (!current) return false
      return isTrainingDisplayStatusActive(getTrainingDisplayStatus(current)) ? POLL_INTERVAL_MS : false
    },
  })

  const { data: allTrainingJobs, isLoading: isLoadingTrainingJobs } = useQuery({
    queryKey: ['trainingJobs', datasetId],
    queryFn: () => trainingJobsApi.getAll(projectId!, datasetId!).then((r) => r.data.data.trainingJobs),
    enabled: !!projectId && !!datasetId,
  })

  // The monitor card above already shows the most recent TrainingJob (any status).
  // The catalog only lists the rest, so the same job never appears twice on the page.
  const catalogTrainingJobs = (allTrainingJobs ?? []).filter((job) => job.id !== latestTrainingJob?.id)

  const uploadMutation = useMutation({
    mutationFn: (file: File) => datasetsApi.upload(datasetId!, file),
    onSuccess: (res) => {
      queryClient.setQueryData(['dataset', datasetId], res.data.data.dataset)
      queryClient.invalidateQueries({ queryKey: ['datasets', projectId] })
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
  })

  const createTrainingJobMutation = useMutation({
    mutationFn: (values: CreateTrainingJobFormValues) => {
      const topology = getTopologyOption(values.topology)
      return trainingJobsApi.create(projectId!, datasetId!, {
        name: `Entrenamiento ${dataset!.name} — ${new Date().toLocaleString('es-ES')}`,
        gridWidth: topology.width,
        gridHeight: topology.height,
        alpha: values.alpha,
        beta: values.omega,
        neighborhoodRadius: values.neighborhoodRadius,
        objectiveDimensionWeight: DEFAULT_OBJECTIVE_DIMENSION_WEIGHT,
      })
    },
    onSuccess: () => {
      setShowTrainingModal(false)
      queryClient.invalidateQueries({ queryKey: ['trainingJob', 'latest', datasetId] })
      queryClient.invalidateQueries({ queryKey: ['trainingJobs', datasetId] })
    },
  })

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null)
  }

  function handleUpload() {
    if (selectedFile) uploadMutation.mutate(selectedFile)
  }

  function handleCreateTraining() {
    setShowTrainingModal(true)
  }

  function handleSubmitTraining(values: CreateTrainingJobFormValues) {
    createTrainingJobMutation.mutate(values)
  }

  if (isLoading) {
    return (
      <AppLayout>
        <DatasetDetailSkeleton />
      </AppLayout>
    )
  }

  if (!dataset) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="mb-4 text-muted-foreground">Dataset no encontrado.</p>
          <Button asChild variant="outline">
            <Link to={`/projects/${projectId}`}>Volver al proyecto</Link>
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-10">

        {/* ── 1. Información del Dataset ─────────────────────────── */}
        <DatasetHeader
          dataset={dataset}
          projectId={projectId!}
          upload={{
            fileInputRef,
            selectedFile,
            isUploading: uploadMutation.isPending,
            error: uploadMutation.isError
              ? uploadMutation.error instanceof Error
                ? uploadMutation.error.message
                : 'Error al subir el archivo.'
              : null,
            onFileChange: handleFileChange,
            onUpload: handleUpload,
          }}
        />

        {/* ── 2. Procesamiento del Dataset (automático) ──────────── */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Procesamiento del Dataset</h2>
            <p className="text-sm text-muted-foreground">
              El sistema procesa el archivo CSV de forma automática.
            </p>
          </div>
          <DatasetPipeline dataset={dataset} />
        </section>

        {/* ── 3. Entrenamiento SOM (iniciado por el usuario) ─────── */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Entrenamiento SOM</h2>
            <p className="text-sm text-muted-foreground">
              Los entrenamientos son creados y configurados manualmente.
            </p>
          </div>
          {latestTrainingJob ? (
            <TrainingJobMonitorCard
              trainingJob={latestTrainingJob}
              onCreateNew={handleCreateTraining}
            />
          ) : (
            <DatasetTrainingCard dataset={dataset} onCreateTraining={handleCreateTraining} />
          )}
        </section>

        {/* ── 4. Catálogo de entrenamientos ──────────────────────── */}
        <TrainingJobCatalogSection
          trainingJobs={catalogTrainingJobs}
          projectId={projectId!}
          datasetId={datasetId!}
          isLoading={isLoadingTrainingJobs}
        />

      </div>

      <Dialog open={showTrainingModal} onOpenChange={setShowTrainingModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Configurar entrenamiento
            </DialogTitle>
            <DialogDescription>
              Define la topología del mapa y los parámetros del SOM antes de crear el entrenamiento.
            </DialogDescription>
          </DialogHeader>
          <CreateTrainingJobForm
            dataset={dataset}
            onSubmit={handleSubmitTraining}
            onCancel={() => setShowTrainingModal(false)}
            isSubmitting={createTrainingJobMutation.isPending}
            submitError={
              createTrainingJobMutation.isError
                ? createTrainingJobMutation.error instanceof Error
                  ? createTrainingJobMutation.error.message
                  : 'No se pudo crear el entrenamiento.'
                : null
            }
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
