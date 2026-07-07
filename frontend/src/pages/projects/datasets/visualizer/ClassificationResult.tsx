import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { NeuronHit } from '@/components/training/SomCanvas/hooks/useCanvasInteraction'
import type { ClassificationMatch } from '@/components/training/SomCanvas/hooks/useClassification'
import type { ColorStop } from '@/components/training/SomCanvas/hooks/useHeatmap'
import MinimapCanvas from '@/components/training/SomCanvas/MinimapCanvas'

interface ClassificationResultProps {
  result: ClassificationMatch | null
  winnerNeuron: NeuronHit | null
  weights: number[][]
  activation: number[]
  activeDimensionIndex: number
  gridWidth: number
  gridHeight: number
  palette: ColorStop[]
  onClear: () => void
}

export default function ClassificationResult({
  result,
  winnerNeuron,
  weights,
  activation,
  activeDimensionIndex,
  gridWidth,
  gridHeight,
  palette,
  onClear,
}: ClassificationResultProps) {
  return (
    <div className="px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Clasificación
      </p>

      {!result || !winnerNeuron ? (
        <div className="mt-3 flex flex-col items-center gap-2 py-4 text-center">
          <MapPin className="h-4 w-4 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            Ingresa un registro y presiona Clasificar.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-xs font-semibold text-foreground">Neurona ganadora</p>

          <p className="text-sm font-bold" style={{ color: 'hsl(221,83%,53%)' }}>
            Fila {result.fila + 1}, Col {result.columna + 1}
          </p>

          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Distancia</span>
              <span className="tabular-nums font-medium">{result.distancia.toFixed(4)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Similitud</span>
              <span className="tabular-nums font-medium">{result.similitud.toFixed(2)}%</span>
            </div>
          </div>

          {/* Minimap */}
          <div className="overflow-hidden rounded-md border" style={{ height: 96 }}>
            <MinimapCanvas
              weights={weights}
              activation={activation}
              activeDimensionIndex={activeDimensionIndex}
              gridWidth={gridWidth}
              gridHeight={gridHeight}
              palette={palette}
              winnerNeuron={winnerNeuron}
            />
          </div>

          <Button size="sm" variant="outline" className="w-full" onClick={onClear}>
            Limpiar resultado
          </Button>
        </div>
      )}
    </div>
  )
}