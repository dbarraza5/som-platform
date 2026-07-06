import HeatmapCanvas from './HeatmapCanvas'
import { valorAColor } from './hooks/useHeatmap'
import type { TrainingDimension } from '@/types/trainingFiles'

export interface SomCanvasProps {
  weights: number[][]
  activation: number[]
  dimensions: TrainingDimension[]
  activeDimensionIndex: number
  gridWidth: number
  gridHeight: number
}

const LEGEND_STOPS = [0, 0.25, 0.5, 0.75, 1]

export default function SomCanvas({
  weights,
  activation,
  dimensions,
  activeDimensionIndex,
  gridWidth,
  gridHeight,
}: SomCanvasProps) {
  const activeDimLabel =
    activeDimensionIndex === -1
      ? 'Activación de la Red'
      : (dimensions[activeDimensionIndex]?.nombre ?? '')

  const gradientStops = LEGEND_STOPS.map(
    (t) => `${valorAColor(t)} ${t * 100}%`,
  ).join(', ')

  return (
    <div className="flex h-full flex-col">
      {/* Canvas stack */}
      <div className="relative min-h-0 flex-1">
        {/* Layer 1 — heatmap */}
        <HeatmapCanvas
          weights={weights}
          activation={activation}
          activeDimensionIndex={activeDimensionIndex}
          gridWidth={gridWidth}
          gridHeight={gridHeight}
        />
        {/* Layer 2 — interaction (future) */}
        <canvas
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
        {/* Layer 3 — pizarra (future) */}
        <canvas
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 3,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Legend */}
      <div className="shrink-0 px-6 py-3">
        <p className="mb-1.5 text-center text-xs font-medium text-muted-foreground">
          {activeDimLabel}
        </p>
        <div
          className="h-3 rounded-full"
          style={{ background: `linear-gradient(to right, ${gradientStops})` }}
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>Bajo</span>
          <span>Alto</span>
        </div>
      </div>
    </div>
  )
}
