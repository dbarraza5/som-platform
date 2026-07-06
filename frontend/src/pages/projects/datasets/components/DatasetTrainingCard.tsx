import { Cpu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDatasetPipelineStatus } from '@/lib/datasetStatus'
import type { Dataset } from '@/types/dataset'

interface DatasetTrainingCardProps {
  dataset: Dataset
  onCreateTraining: () => void
}

export default function DatasetTrainingCard({ dataset, onCreateTraining }: DatasetTrainingCardProps) {
  const canTrain = getDatasetPipelineStatus(dataset) === 'COMPLETED'

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border bg-card px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Cpu className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-semibold">Sin entrenamientos</p>
          <p className="text-sm text-muted-foreground">
            {canTrain
              ? 'El Dataset está normalizado y listo para entrenar.'
              : 'Disponible cuando la normalización se complete correctamente.'}
          </p>
        </div>
      </div>
      <Button onClick={onCreateTraining} disabled={!canTrain} size="lg" className="shrink-0">
        <Cpu className="mr-2 h-4 w-4" />
        Nuevo entrenamiento SOM
      </Button>
    </div>
  )
}
