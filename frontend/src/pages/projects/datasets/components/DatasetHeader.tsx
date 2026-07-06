import type { ChangeEvent, RefObject } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileUp, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatBytes, formatDate } from '@/lib/utils'
import { DATASET_STATUS_META, getDatasetPipelineStatus } from '@/lib/datasetStatus'
import type { Dataset } from '@/types/dataset'

export interface UploadState {
  fileInputRef: RefObject<HTMLInputElement>
  selectedFile: File | null
  isUploading: boolean
  error: string | null
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void
  onUpload: () => void
}

interface DatasetHeaderProps {
  dataset: Dataset
  projectId: string
  upload: UploadState
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium">{value}</dd>
    </div>
  )
}

export default function DatasetHeader({ dataset, projectId, upload }: DatasetHeaderProps) {
  const status = getDatasetPipelineStatus(dataset)
  const meta = DATASET_STATUS_META[status]
  const Icon = meta.icon
  const canUpload = status === 'NO_FILE' || status === 'FAILED'
  const errorMessage = status === 'FAILED' ? (dataset.analysisError ?? dataset.normalizationError) : null

  return (
    <div className="space-y-4">
      {/* Navigation row */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link to={`/projects/${projectId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al proyecto
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link to={`/projects/${projectId}/datasets/${dataset.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      {/* Name + description */}
      <div>
        <h1 className="text-2xl font-bold">{dataset.name}</h1>
        {dataset.description && (
          <p className="mt-1 text-muted-foreground">{dataset.description}</p>
        )}
      </div>

      {/* Key stats */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border bg-muted/30 px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatItem
          label="Registros"
          value={dataset.rows != null ? dataset.rows.toLocaleString('es-ES') : '—'}
        />
        <StatItem
          label="Atributos"
          value={dataset.columns != null ? dataset.columns.toLocaleString('es-ES') : '—'}
        />
        <StatItem
          label="Tamaño"
          value={dataset.fileSize ? formatBytes(dataset.fileSize) : '—'}
        />
        <StatItem label="Creado" value={formatDate(dataset.createdAt)} />
        <StatItem
          label="Subido"
          value={dataset.uploadedAt ? formatDate(dataset.uploadedAt) : '—'}
        />
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Estado</dt>
          <dd className="mt-0.5">
            <span
              className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                meta.badgeClassName,
              )}
            >
              {meta.label}
            </span>
          </dd>
        </div>
      </dl>

      {/* Status row + optional upload area — only when action is needed */}
      {canUpload && (
        <div className="space-y-4 rounded-lg border px-4 py-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                meta.iconWrapperClassName,
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium">{meta.label}</p>
              <p className="text-sm text-muted-foreground">{meta.description}</p>
              {errorMessage && (
                <p className="mt-1 text-sm text-destructive">{errorMessage}</p>
              )}
              {status === 'FAILED' && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Puedes subir un nuevo archivo para reintentar.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-md border border-dashed p-4 sm:flex-row sm:items-center">
            <label
              htmlFor="csv-upload"
              className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <FileUp className="h-4 w-4 shrink-0" />
              {upload.selectedFile ? upload.selectedFile.name : 'Seleccionar archivo CSV…'}
              <input
                id="csv-upload"
                ref={upload.fileInputRef}
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={upload.onFileChange}
                disabled={upload.isUploading}
              />
            </label>
            <Button
              onClick={upload.onUpload}
              disabled={!upload.selectedFile || upload.isUploading}
              className="shrink-0"
            >
              {upload.isUploading ? 'Subiendo...' : 'Subir y procesar'}
            </Button>
          </div>

          {upload.error && <p className="text-sm text-destructive">{upload.error}</p>}
        </div>
      )}
    </div>
  )
}
