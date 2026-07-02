import type { ChangeEvent, RefObject } from 'react'
import { FileUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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

interface DatasetStatusCardProps {
  dataset: Dataset
  upload: UploadState
}

export default function DatasetStatusCard({ dataset, upload }: DatasetStatusCardProps) {
  const status = getDatasetPipelineStatus(dataset)
  const meta = DATASET_STATUS_META[status]
  const Icon = meta.icon
  const errorMessage = dataset.analysisError ?? dataset.normalizationError

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estado del procesamiento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
              meta.iconWrapperClassName,
            )}
          >
            <Icon className={cn('h-5 w-5', status === 'PROCESSING' && 'animate-spin')} />
          </div>
          <div className="min-w-0">
            <span
              className={cn(
                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                meta.badgeClassName,
              )}
            >
              {meta.label}
            </span>
            <p className="mt-1.5 text-sm text-muted-foreground">{meta.description}</p>
            {status === 'FAILED' && errorMessage && (
              <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
            )}
          </div>
        </div>

        {status === 'NO_FILE' && (
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
        )}

        {status === 'NO_FILE' && upload.error && (
          <p className="text-sm text-destructive">{upload.error}</p>
        )}
      </CardContent>
    </Card>
  )
}
