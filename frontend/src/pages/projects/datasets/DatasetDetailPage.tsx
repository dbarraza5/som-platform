import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Cpu, FileUp, Pencil, XCircle } from 'lucide-react'
import { datasetsApi } from '@/api/datasets'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import AppLayout from '@/components/layout/AppLayout'
import type { Dataset } from '@/types/dataset'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AnalysisResult({ dataset }: { dataset: Dataset }) {
  if (dataset.analysisStatus === 'PENDING') {
    return (
      <p className="text-sm text-muted-foreground">
        Sube un archivo CSV para comenzar el análisis.
      </p>
    )
  }

  if (dataset.analysisStatus === 'PROCESSING') {
    return (
      <div className="flex items-center gap-2 text-blue-600">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="text-sm font-medium">Analizando archivo...</span>
      </div>
    )
  }

  if (dataset.analysisStatus === 'FAILED') {
    return (
      <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-red-700">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Error en el análisis</p>
          <p className="mt-0.5 text-sm">{dataset.analysisError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4 text-green-700">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="text-sm font-semibold">Análisis completado</p>
        <p className="mt-1 text-sm">
          {dataset.rows?.toLocaleString()} filas · {dataset.columns} columnas
        </p>
        {dataset.originalFilename && (
          <p className="mt-0.5 text-xs text-green-600/80">{dataset.originalFilename}</p>
        )}
      </div>
    </div>
  )
}

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
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => datasetsApi.upload(datasetId!, file),
    onSuccess: (res) => {
      const updated = res.data.data.dataset
      queryClient.setQueryData(['dataset', datasetId], updated)
      queryClient.invalidateQueries({ queryKey: ['datasets', projectId] })
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (updated.analysisStatus === 'COMPLETED') {
        setShowTrainingModal(true)
      }
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null)
  }

  function handleUpload() {
    if (selectedFile) uploadMutation.mutate(selectedFile)
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <p className="text-sm text-muted-foreground">Cargando dataset...</p>
        </div>
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

  const isCompleted = dataset.analysisStatus === 'COMPLETED'
  const isUploading = uploadMutation.isPending

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-1">
              <Link to={`/projects/${projectId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al proyecto
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{dataset.name}</h1>
            {dataset.description && (
              <p className="text-muted-foreground">{dataset.description}</p>
            )}
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link to={`/projects/${projectId}/datasets/${datasetId}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>

        {/* File upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Archivo CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dataset.uploadedAt && dataset.originalFilename && (
              <div className="rounded-md bg-muted px-4 py-3 text-sm">
                <p className="font-medium">{dataset.originalFilename}</p>
                <p className="mt-0.5 text-muted-foreground">
                  {dataset.fileSize ? formatBytes(dataset.fileSize) : ''} · Subido el{' '}
                  {formatDate(dataset.uploadedAt)}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label
                htmlFor="csv-upload"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <FileUp className="h-4 w-4 shrink-0" />
                {selectedFile ? selectedFile.name : 'Seleccionar archivo CSV…'}
                <input
                  id="csv-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </label>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="shrink-0"
              >
                {isUploading ? 'Subiendo...' : 'Subir y analizar'}
              </Button>
            </div>

            {uploadMutation.isError && (
              <p className="text-sm text-destructive">
                {uploadMutation.error instanceof Error
                  ? uploadMutation.error.message
                  : 'Error al subir el archivo.'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Analysis result */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado del análisis</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalysisResult dataset={dataset} />
          </CardContent>
        </Card>

        {/* Training module (unlocked when COMPLETED) */}
        <Card className={!isCompleted ? 'border-dashed opacity-60' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-muted p-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-base">Entrenamiento del modelo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isCompleted ? (
              <Button onClick={() => setShowTrainingModal(true)}>
                <Cpu className="mr-2 h-4 w-4" />
                Iniciar entrenamiento
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Disponible una vez que el análisis del CSV sea exitoso.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Training modal placeholder */}
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
