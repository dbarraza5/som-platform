import { useEffect, useRef, useState } from 'react'
import { Palette } from 'lucide-react'
import HeatmapCanvas from './HeatmapCanvas'
import { PALETTES } from './hooks/useHeatmap'
import type { ColorStop } from './hooks/useHeatmap'
import type { TrainingDimension } from '@/types/trainingFiles'

export interface SomCanvasProps {
  weights: number[][]
  activation: number[]
  dimensions: TrainingDimension[]
  activeDimensionIndex: number
  gridWidth: number
  gridHeight: number
}

function stopsToGradient(stops: ColorStop[]): string {
  return `linear-gradient(to right, ${stops.map((s) => s.color).join(', ')})`
}

export default function SomCanvas({
  weights,
  activation,
  dimensions,
  activeDimensionIndex,
  gridWidth,
  gridHeight,
}: SomCanvasProps) {
  const [activePaletteId, setActivePaletteId] = useState(PALETTES[0].id)
  const [activePalette, setActivePalette] = useState<ColorStop[]>(PALETTES[0].stops)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({})
  const btnRef = useRef<HTMLButtonElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showPicker) return
    function onDown(e: MouseEvent) {
      const target = e.target as Node
      if (
        pickerRef.current && !pickerRef.current.contains(target) &&
        btnRef.current && !btnRef.current.contains(target)
      ) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showPicker])

  function openPicker() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPickerStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
        zIndex: 50,
      })
    }
    setShowPicker((prev) => !prev)
  }

  function selectPalette(stops: ColorStop[], id: string) {
    setActivePalette(stops)
    setActivePaletteId(id)
    setShowPicker(false)
  }

  const activeDimLabel =
    activeDimensionIndex === -1
      ? 'Activación de la Red'
      : (dimensions[activeDimensionIndex]?.nombre ?? '')

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
          palette={activePalette}
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

        {/* Palette button — floating top-right */}
        <button
          ref={btnRef}
          type="button"
          onClick={openPicker}
          title="Mapa de color"
          style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
          className={`rounded-md border p-1.5 shadow-sm transition-colors ${
            showPicker
              ? 'border-primary bg-background text-primary'
              : 'border-border bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground'
          }`}
        >
          <Palette className="h-4 w-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="shrink-0 border-t px-6 py-3">
        <p className="mb-1.5 text-center text-xs font-semibold text-foreground/70">
          {activeDimLabel}
        </p>
        <div
          className="h-4 rounded-sm shadow-sm"
          style={{ background: stopsToGradient(activePalette) }}
        />
        <div className="mt-1 flex justify-between text-xs font-medium text-muted-foreground">
          <span>Bajo</span>
          <span>Alto</span>
        </div>
      </div>

      {/* Palette picker popover */}
      {showPicker && (
        <div
          ref={pickerRef}
          style={pickerStyle}
          className="w-52 overflow-hidden rounded-lg border bg-background shadow-lg"
        >
          <div className="border-b px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mapa de color
            </p>
          </div>
          <div className="space-y-0.5 p-2">
            {PALETTES.map((p) => {
              const isActive = p.id === activePaletteId
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPalette(p.stops, p.id)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60 ${
                    isActive ? 'bg-muted/40 ring-1 ring-primary' : ''
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
      )}
    </div>
  )
}