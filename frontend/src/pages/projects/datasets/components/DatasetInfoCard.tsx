import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatBytes, formatDate } from '@/lib/utils'
import { DATASET_STATUS_META, getDatasetPipelineStatus } from '@/lib/datasetStatus'
import type { Dataset } from '@/types/dataset'

function Placeholder({ text }: { text: string }) {
  return <span className="italic text-muted-foreground/60">{text}</span>
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  )
}

export default function DatasetInfoCard({ dataset }: { dataset: Dataset }) {
  const status = getDatasetPipelineStatus(dataset)
  const meta = DATASET_STATUS_META[status]
  // The backend doesn't clear analysisError/normalizationError/normalizationFinishedAt
  // when a dataset is re-uploaded after a failure, so those fields can hold stale data
  // from a previous attempt. Only trust them when the current status still reflects them.
  const errorMessage = status === 'FAILED' ? dataset.analysisError ?? dataset.normalizationError : null
  const showFinishedAt = status === 'COMPLETED' || status === 'FAILED'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Información del Dataset</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nombre del archivo"
          value={dataset.originalFilename ?? <Placeholder text="Aún no se ha subido un archivo" />}
        />
        <Field
          label="Tamaño"
          value={dataset.fileSize ? formatBytes(dataset.fileSize) : <Placeholder text="No disponible" />}
        />
        <Field
          label="Estado"
          value={
            <span
              className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                meta.badgeClassName,
              )}
            >
              {meta.label}
            </span>
          }
        />
        <Field
          label="Fecha de subida"
          value={dataset.uploadedAt ? formatDate(dataset.uploadedAt) : <Placeholder text="No disponible" />}
        />
        <Field
          label="Normalización finalizada"
          value={
            showFinishedAt && dataset.normalizationFinishedAt ? (
              formatDate(dataset.normalizationFinishedAt)
            ) : (
              <Placeholder text="Aún no ha finalizado" />
            )
          }
        />
        <Field
          label="Mensaje de error"
          value={
            errorMessage ? (
              <span className="text-destructive">{errorMessage}</span>
            ) : (
              <Placeholder text="Sin errores" />
            )
          }
        />
      </CardContent>
    </Card>
  )
}
