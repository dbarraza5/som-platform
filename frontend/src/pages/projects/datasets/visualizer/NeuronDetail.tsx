import { MousePointer } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NeuronHit } from '@/components/training/SomCanvas/hooks/useCanvasInteraction'
import type { TrainingDimension } from '@/types/trainingFiles'
import { desnormalizarContinuo, desnormalizarDiscreto } from '@/components/training/SomCanvas/hooks/useDenormalize'
import { normalizarDimension } from '@/components/training/SomCanvas/hooks/useHeatmap'

interface NeuronDetailProps {
  selectedNeuron: NeuronHit | null
  allWeights: number[][]
  dimensions: TrainingDimension[]
  activeDimensionIndex: number
}

export default function NeuronDetail({
  selectedNeuron,
  allWeights,
  dimensions,
  activeDimensionIndex,
}: NeuronDetailProps) {
  return (
    <div className="border-b px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Neurona</p>

      {!selectedNeuron ? (
        <div className="mt-3 flex flex-col items-center gap-2 py-4 text-center">
          <MousePointer className="h-4 w-4 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            Haz click sobre una neurona para ver sus valores.
          </p>
        </div>
      ) : (
        <NeuronData
          neuron={selectedNeuron}
          allWeights={allWeights}
          dimensions={dimensions}
          activeDimensionIndex={activeDimensionIndex}
        />
      )}
    </div>
  )
}

function NeuronData({
  neuron,
  allWeights,
  dimensions,
  activeDimensionIndex,
}: {
  neuron: NeuronHit
  allWeights: number[][]
  dimensions: TrainingDimension[]
  activeDimensionIndex: number
}) {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Índice</span>
        <span className="font-medium tabular-nums">{neuron.index}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Posición</span>
        <span className="font-medium tabular-nums">
          Fila {neuron.row + 1}, Col {neuron.col + 1}
        </span>
      </div>

      {dimensions.length > 0 && (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Dimensión</th>
                <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Valor</th>
              </tr>
            </thead>
            <tbody>
              {dimensions.map((dim, i) => {
                const normValues = normalizarDimension(allWeights, i)
                const norm = normValues[neuron.index] ?? 0
                const isActive = activeDimensionIndex === i
                return (
                  <DimensionRow key={dim.nombre} dim={dim} norm={norm} isActive={isActive} />
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DimensionRow({
  dim,
  norm,
  isActive,
}: {
  dim: TrainingDimension
  norm: number
  isActive: boolean
}) {
  if (dim.tipo_dato === 'continuo') {
    const val = desnormalizarContinuo(norm, dim.min, dim.max)
    return (
      <tr className={cn('border-b last:border-b-0', isActive && 'bg-primary/5')}>
        <td className={cn('max-w-0 truncate px-2 py-1.5', isActive && 'font-medium')}>
          {dim.nombre}
        </td>
        <td className="px-2 py-1.5 text-right tabular-nums">{val}</td>
      </tr>
    )
  }

  const result = desnormalizarDiscreto(norm, dim)
  const showPct = result.secundario !== null && result.principal.porcentaje < 95

  return (
    <tr
      className={cn(
        'border-b last:border-b-0',
        isActive && 'bg-primary/5',
        result.empate && 'bg-amber-50 dark:bg-amber-950/20',
      )}
    >
      <td className={cn('max-w-0 truncate px-2 py-1.5', isActive && 'font-medium')}>
        {dim.nombre}
      </td>
      <td className="px-2 py-1.5 text-right leading-snug">
        {showPct ? (
          <span>
            {result.principal.etiqueta}{' '}
            <span className="text-muted-foreground">({result.principal.porcentaje}%)</span>
            {result.secundario && (
              <>
                {' → '}
                {result.secundario.etiqueta}{' '}
                <span className="text-muted-foreground">({result.secundario.porcentaje}%)</span>
              </>
            )}
          </span>
        ) : (
          result.principal.etiqueta
        )}
      </td>
    </tr>
  )
}