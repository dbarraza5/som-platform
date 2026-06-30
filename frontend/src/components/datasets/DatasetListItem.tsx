import { Link } from 'react-router-dom'
import { Database, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Dataset } from '@/types/dataset'

interface DatasetListItemProps {
  dataset: Dataset
  projectId: string
  onDelete: (dataset: Dataset) => void
}

const statusBadge: Record<Dataset['analysisStatus'], { label: string; className: string }> = {
  PENDING:    { label: 'Sin archivo',   className: 'bg-muted text-muted-foreground' },
  PROCESSING: { label: 'Analizando…',  className: 'bg-blue-100 text-blue-700' },
  COMPLETED:  { label: 'Listo',         className: 'bg-green-100 text-green-700' },
  FAILED:     { label: 'Error',         className: 'bg-red-100 text-red-700' },
}

export default function DatasetListItem({ dataset, projectId, onDelete }: DatasetListItemProps) {
  const badge = statusBadge[dataset.analysisStatus]

  return (
    <div className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40">
      <div className="shrink-0 rounded-lg bg-primary/8 p-2.5">
        <Database className="h-5 w-5 text-primary/70" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{dataset.name}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        {dataset.description ? (
          <p className="truncate text-xs text-muted-foreground mt-0.5">{dataset.description}</p>
        ) : (
          <p className="text-xs text-muted-foreground/50 mt-0.5 italic">Sin descripción</p>
        )}
        {dataset.analysisStatus === 'COMPLETED' && dataset.rows !== null && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {dataset.rows.toLocaleString()} filas · {dataset.columns} columnas
          </p>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-1">
        <Button asChild size="sm">
          <Link to={`/projects/${projectId}/datasets/${dataset.id}`}>Entrar</Link>
        </Button>
        <Button asChild size="icon" variant="ghost" title="Editar">
          <Link to={`/projects/${projectId}/datasets/${dataset.id}/edit`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          title="Eliminar"
          onClick={() => onDelete(dataset)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
