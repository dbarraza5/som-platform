import { useRef, useState, type ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Cpu } from 'lucide-react'
import { datasetsApi } from '@/api/datasets'
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
import DatasetStatusCard from './components/DatasetStatusCard'
import DatasetPipeline from './components/DatasetPipeline'
import DatasetInfoCard from './components/DatasetInfoCard'
import DatasetTrainingCard from './components/DatasetTrainingCard'
import DatasetDetailSkeleton from './components/DatasetDetailSkeleton'
import { getDatasetPipelineStatus, isDatasetPipelineActive } from '@/lib/datasetStatus'
import type { Dataset } from '@/types/dataset'

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

  const uploadMutation = useMutation({
    mutationFn: (file: File) => datasetsApi.upload(datasetId!, file),
    onSuccess: (res) => {
      queryClient.setQueryData(['dataset', datasetId], res.data.data.dataset)
      queryClient.invalidateQueries({ queryKey: ['datasets', projectId] })
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
  })

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null)
  }

  function handleUpload() {
    if (selectedFile) uploadMutation.mutate(selectedFile)
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
          <DatasetTrainingCard dataset={dataset} onCreateTraining={() => setShowTrainingModal(true)} />
        </div>
      </div>

      {/* Training modal placeholder — flow implemented in a future phase */}
      <Dialog open={showTrainingModal} onOpenChange={setShowTrainingModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Entrenamiento del modelo
            </DialogTitle>
            <DialogDescription>
              Aquí irá el formulario de configuración y lanzamiento del entrenamiento SOM.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted py-10 text-center">
            <Cpu className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Próximamente</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Configuración de parámetros SOM y lanzamiento de training jobs.
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowTrainingModal(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
