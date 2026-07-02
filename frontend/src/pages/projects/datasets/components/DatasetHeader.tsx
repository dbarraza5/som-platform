import { Link } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBytes, formatDate } from '@/lib/utils'
import type { Dataset } from '@/types/dataset'

interface DatasetHeaderProps {
  dataset: Dataset
  projectId: string
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium">{value}</dd>
    </div>
  )
}

export default function DatasetHeader({ dataset, projectId }: DatasetHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-3 mb-1">
            <Link to={`/projects/${projectId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al proyecto
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{dataset.name}</h1>
          {dataset.description && <p className="text-muted-foreground">{dataset.description}</p>}
        </div>
        <Button variant="outline" asChild className="shrink-0">
          <Link to={`/projects/${projectId}/datasets/${dataset.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border bg-muted/30 px-4 py-3 sm:grid-cols-4">
        <SummaryField label="Archivo CSV" value={dataset.originalFilename ?? 'Sin subir'} />
        <SummaryField
          label="Tamaño"
          value={dataset.fileSize ? formatBytes(dataset.fileSize) : '—'}
        />
        <SummaryField
          label="Subido"
          value={dataset.uploadedAt ? formatDate(dataset.uploadedAt) : '—'}
        />
        <SummaryField label="Última actualización" value={formatDate(dataset.updatedAt)} />
      </dl>
    </div>
  )
}
