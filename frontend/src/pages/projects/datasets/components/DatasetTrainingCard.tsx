import { Cpu } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Entrenamientos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="rounded-full bg-muted p-3">
          <Cpu className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No existen entrenamientos para este Dataset.</p>
        <Button onClick={onCreateTraining} disabled={!canTrain}>
          <Cpu className="mr-2 h-4 w-4" />
          Crear entrenamiento
        </Button>
        {!canTrain && (
          <p className="text-xs text-muted-foreground/70">
            Disponible cuando la normalización se complete correctamente.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
