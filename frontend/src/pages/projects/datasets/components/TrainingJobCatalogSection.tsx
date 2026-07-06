import { History } from 'lucide-react'
import { Card } from '@/components/ui/card'
import TrainingJobListItem from '@/components/training-jobs/TrainingJobListItem'
import type { TrainingJob } from '@/types/trainingJob'

interface TrainingJobCatalogSectionProps {
  trainingJobs: TrainingJob[]
  projectId: string
  datasetId: string
  isLoading: boolean
}

export default function TrainingJobCatalogSection({
  trainingJobs,
  projectId,
  datasetId,
  isLoading,
}: TrainingJobCatalogSectionProps) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Entrenamientos anteriores</h2>
      <Card>
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Cargando entrenamientos...</div>
        ) : trainingJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="rounded-full bg-muted p-3">
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Todavía no existen entrenamientos anteriores para este Dataset.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {trainingJobs.map((trainingJob) => (
              <TrainingJobListItem
                key={trainingJob.id}
                trainingJob={trainingJob}
                projectId={projectId}
                datasetId={datasetId}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
