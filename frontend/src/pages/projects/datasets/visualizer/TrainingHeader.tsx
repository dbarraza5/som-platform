import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  TRAINING_STATUS_META,
  formatDateTime,
  formatDuration,
  getTrainingDisplayStatus,
} from '@/lib/trainingJobStatus'
import type { TrainingJob } from '@/types/trainingJob'

interface TrainingHeaderProps {
  trainingJob: TrainingJob
  projectId: string
  datasetId: string
  dimensionCount: number
}

function StatCell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('min-w-0 shrink-0', className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium tabular-nums">{value}</p>
    </div>
  )
}

export default function TrainingHeader({
  trainingJob,
  projectId,
  datasetId,
  dimensionCount,
}: TrainingHeaderProps) {
  const [downloadOpen, setDownloadOpen] = useState(false)
  const downloadRef = useRef<HTMLDivElement>(null)

  const displayStatus = getTrainingDisplayStatus(trainingJob)
  const meta = TRAINING_STATUS_META[displayStatus]

  const durationLabel =
    trainingJob.startedAt && trainingJob.finishedAt
      ? formatDuration(
          new Date(trainingJob.finishedAt).getTime() - new Date(trainingJob.startedAt).getTime(),
        )
      : '—'

  const fechaLabel = trainingJob.startedAt ? formatDateTime(trainingJob.startedAt) : '—'

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setDownloadOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="shrink-0 border-b bg-background">
      {/* Row 1 — breadcrumb + actions */}
      <div className="flex items-center justify-between gap-4 px-4 py-2">
        <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/dashboard" className="shrink-0 hover:text-foreground">
            Proyectos
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Link
            to={`/projects/${projectId}/datasets/${datasetId}`}
            className="shrink-0 hover:text-foreground"
          >
            Dataset
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-medium text-foreground">{trainingJob.name}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Download dropdown */}
          <div ref={downloadRef} className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDownloadOpen((o) => !o)}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar archivos
            </Button>
            {downloadOpen && (
              <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-md border bg-background shadow-md">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60"
                  onClick={() => setDownloadOpen(false)}
                >
                  CSV normalizado
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60"
                  onClick={() => setDownloadOpen(false)}
                >
                  dimensiones.xml
                </button>
              </div>
            )}
          </div>

          <Button variant="ghost" size="sm" asChild>
            <Link to={`/projects/${projectId}/datasets/${datasetId}`}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Volver al dataset
            </Link>
          </Button>
        </div>
      </div>

      {/* Row 2 — technical sheet */}
      <div className="flex items-center gap-6 overflow-x-auto px-4 pb-3 pt-0">
        <StatCell label="Topología" value={`${trainingJob.gridWidth} × ${trainingJob.gridHeight}`} />
        <div className="h-8 w-px shrink-0 bg-border" />
        <StatCell label="Neuronas" value={trainingJob.neuronCount.toLocaleString('es-ES')} />
        <div className="h-8 w-px shrink-0 bg-border" />
        <StatCell label="Dimensiones" value={String(dimensionCount)} />
        <div className="h-8 w-px shrink-0 bg-border" />
        <StatCell label="Alpha" value={String(trainingJob.alpha)} />
        <div className="h-8 w-px shrink-0 bg-border" />
        <StatCell label="Omega" value={String(trainingJob.beta)} />
        <div className="h-8 w-px shrink-0 bg-border" />
        <StatCell label="Ciclos" value={trainingJob.currentCycle != null ? String(trainingJob.currentCycle) : '—'} />
        <div className="h-8 w-px shrink-0 bg-border" />
        <StatCell label="Duración" value={durationLabel} />
        <div className="h-8 w-px shrink-0 bg-border" />
        <StatCell label="Fecha" value={fechaLabel} />
        <div className="h-8 w-px shrink-0 bg-border" />
        <div className="min-w-0 shrink-0">
          <p className="text-xs text-muted-foreground">Estado</p>
          <span
            className={cn(
              'mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
              meta.badgeClassName,
            )}
          >
            {meta.label}
          </span>
        </div>
      </div>
    </div>
  )
}
