import { useRef, useState, type ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Cpu } from 'lucide-react'
import { datasetsApi } from '@/api/datasets'
import { trainingJobsApi } from '@/api/trainingJobs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import AppLayout from '@/components/layout/AppLayout'
import DatasetHeader from './components/DatasetHeader'
import DatasetStatusCard from './components/DatasetStatusCard'
import DatasetPipeline from './components/DatasetPipeline'
import DatasetInfoCard from './components/DatasetInfoCard'
import DatasetTrainingCard from './components/DatasetTrainingCard'
import DatasetDetailSkeleton from './components/DatasetDetailSkeleton'
import CreateTrainingJobForm, {
  type CreateTrainingJobFormValues,
} from '@/components/training-jobs/CreateTrainingJobForm'
import { getDatasetPipelineStatus, isDatasetPipelineActive } from '@/lib/datasetStatus'
import { getTopologyOption, DEFAULT_NEIGHBORHOOD_RADIUS, DEFAULT_OBJECTIVE_DIMENSION_WEIGHT } from '@/lib/somDefaults'
import type { Dataset } from '@/types/dataset'

const POLL_INTERVAL_MS = 5000

export default function DatasetDetailPage() {
  const { id: projectId, datasetId } = useParams<{ id: string; datasetId: string }>()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showTrainingModal, setShowTrainingModal] = useState(false)
  const [trainingCreatedMessage, setTrainingCreatedMessage] = useState<string | null>(null)

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
        neighborhoodRadius: DEFAULT_NEIGHBORHOOD_RADIUS,
        objectiveDimensionWeight: DEFAULT_OBJECTIVE_DIMENSION_WEIGHT,
      })
    },
    onSuccess: () => {
      setShowTrainingModal(false)
      setTrainingCreatedMessage('Entrenamiento creado correctamente. Quedó encolado para su procesamiento.')
    },
  })

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null)
  }

  function handleUpload() {
    if (selectedFile) uploadMutation.mutate(selectedFile)
  }

  function handleCreateTraining() {
    setTrainingCreatedMessage(null)
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
      <div className="space-y-6">
        <DatasetHeader dataset={dataset} projectId={projectId!} />

        <DatasetStatusCard
          dataset={dataset}
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

        <DatasetPipeline dataset={dataset} />

        <div className="grid gap-6 lg:grid-cols-2">
          <DatasetInfoCard dataset={dataset} />
          <div className="space-y-3">
            {trainingCreatedMessage && (
              <Alert>
                <AlertDescription className="flex items-center justify-between gap-2">
                  {trainingCreatedMessage}
                  <button
                    type="button"
                    onClick={() => setTrainingCreatedMessage(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cerrar
                  </button>
                </AlertDescription>
              </Alert>
            )}
            <DatasetTrainingCard dataset={dataset} onCreateTraining={handleCreateTraining} />
          </div>
        </div>
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
