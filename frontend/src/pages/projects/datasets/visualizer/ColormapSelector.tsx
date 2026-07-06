import { PALETTES } from '@/components/training/SomCanvas/hooks/useHeatmap'
import type { ColorStop } from '@/components/training/SomCanvas/hooks/useHeatmap'

interface ColormapSelectorProps {
  activePaletteId: string
  onSelect: (stops: ColorStop[], id: string) => void
}

function stopsToGradient(stops: ColorStop[]): string {
  return `linear-gradient(to right, ${stops.map((s) => s.color).join(', ')})`
}

export default function ColormapSelector({ activePaletteId, onSelect }: ColormapSelectorProps) {
  return (
    <div className="border-b px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Mapa de color
      </p>
      <div className="mt-3 space-y-1">
        {PALETTES.map((p) => {
          const isActive = p.id === activePaletteId
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.stops, p.id)}
              className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60 ${
                isActive ? 'ring-1 ring-primary bg-muted/40' : ''
              }`}
            >
              <div
                className="h-4 flex-1 rounded"
                style={{ background: stopsToGradient(p.stops) }}
              />
              <span
                className={`w-14 shrink-0 text-left text-xs ${
                  isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
                }`}
              >
                {p.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}