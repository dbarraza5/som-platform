import { useEffect, useRef, useState, useMemo } from 'react'
import { Palette } from 'lucide-react'
import HeatmapCanvas from './HeatmapCanvas'
import { PALETTES, normalizarDimension, normalizarActivacion } from './hooks/useHeatmap'
import type { ColorStop } from './hooks/useHeatmap'
import { calcularCentro, calcularVertices } from './hooks/useHexGrid'
import { useCanvasInteraction } from './hooks/useCanvasInteraction'
import type { NeuronHit } from './hooks/useCanvasInteraction'
import { desnormalizarContinuo, desnormalizarDiscreto } from './hooks/useDenormalize'
import type { TrainingDimension } from '@/types/trainingFiles'

export type { NeuronHit }

export interface SomCanvasProps {
  weights: number[][]
  activation: number[]
  dimensions: TrainingDimension[]
  activeDimensionIndex: number
  gridWidth: number
  gridHeight: number
  winnerNeuron?: NeuronHit | null
  onNeuronSelect?: (neuron: NeuronHit | null) => void
  onPaletteChange?: (palette: ColorStop[]) => void
}

function stopsToGradient(stops: ColorStop[]): string {
  return `linear-gradient(to right, ${stops.map((s) => s.color).join(', ')})`
}

// Bright blue visible on any heatmap background
const SELECTION_COLOR = 'hsl(221,83%,53%)'

export default function SomCanvas({
  weights,
  activation,
  dimensions,
  activeDimensionIndex,
  gridWidth,
  gridHeight,
  winnerNeuron,
  onNeuronSelect,
  onPaletteChange,
}: SomCanvasProps) {
  // ── Palette state ──────────────────────────────────────────────────────────
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
    onPaletteChange?.(stops)
  }

  // ── Interaction canvas ─────────────────────────────────────────────────────
  const interactionRef = useRef<HTMLCanvasElement>(null)

  const {
    hoveredNeuron,
    selectedNeuron,
    tooltip,
    size,
    radio,
    offsetX,
    offsetY,
    onMouseMove,
    onMouseLeave,
    onClick: onCanvasClick,
  } = useCanvasInteraction({ canvasRef: interactionRef, gridWidth, gridHeight, onNeuronSelect })

  // Draw winner, hover, and selection on interaction canvas
  useEffect(() => {
    const canvas = interactionRef.current
    if (!canvas || size.width === 0 || radio === 0) return

    const dpr = window.devicePixelRatio || 1
    const w = Math.round(size.width * dpr)
    const h = Math.round(size.height * dpr)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.width, size.height)

    function hexPath(col: number, row: number) {
      const { cx: rawCx, cy: rawCy } = calcularCentro(col, row, radio)
      const verts = calcularVertices(rawCx + offsetX, rawCy + offsetY, radio)
      ctx.beginPath()
      ctx.moveTo(verts[0].x, verts[0].y)
      for (let v = 1; v < 6; v++) ctx.lineTo(verts[v].x, verts[v].y)
      ctx.closePath()
    }

    // 1. Draw winner: accent fill + accent border
    if (winnerNeuron) {
      hexPath(winnerNeuron.col, winnerNeuron.row)
      ctx.fillStyle = 'hsla(221,83%,53%,0.4)'
      ctx.fill()
      ctx.strokeStyle = SELECTION_COLOR
      ctx.lineWidth = 3
      ctx.stroke()
    }

    // 2. Draw selected: white halo + accent border (on top of winner if same neuron)
    if (selectedNeuron) {
      hexPath(selectedNeuron.col, selectedNeuron.row)
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.lineWidth = 3.5
      ctx.stroke()
      ctx.strokeStyle = SELECTION_COLOR
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // 3. Draw hover: white fill + white border (unless hovering selected)
    if (hoveredNeuron) {
      hexPath(hoveredNeuron.col, hoveredNeuron.row)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fill()
      if (hoveredNeuron.index !== selectedNeuron?.index) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    // 4. Draw winner center dot (always on top so it's visible over hover/selection)
    if (winnerNeuron) {
      const { cx: rawCx, cy: rawCy } = calcularCentro(winnerNeuron.col, winnerNeuron.row, radio)
      const cx = rawCx + offsetX
      const cy = rawCy + offsetY
      const dotRadius = Math.max(3, radio * 0.2)

      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.beginPath()
      ctx.arc(cx, cy, dotRadius + 1.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = SELECTION_COLOR
      ctx.beginPath()
      ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [hoveredNeuron, selectedNeuron, winnerNeuron, size, radio, offsetX, offsetY])

  // ── Normalized values for tooltip ─────────────────────────────────────────
  const normalizedValues = useMemo(() => {
    if (activeDimensionIndex === -1) return normalizarActivacion(activation)
    if (weights.length === 0) return []
    return normalizarDimension(weights, activeDimensionIndex)
  }, [weights, activation, activeDimensionIndex])

  function tooltipValue(neuronIndex: number): string {
    if (activeDimensionIndex === -1) {
      return `Activación: ${(activation[neuronIndex] ?? 0).toFixed(2)}`
    }
    const dim = dimensions[activeDimensionIndex]
    if (!dim) return ''
    const norm = normalizedValues[neuronIndex] ?? 0
    if (dim.tipo_dato === 'continuo') {
      return `${dim.nombre}: ${desnormalizarContinuo(norm, dim.min, dim.max)}`
    }
    const result = desnormalizarDiscreto(norm, dim)
    if (result.secundario && result.principal.porcentaje < 95) {
      return `${dim.nombre}: ${result.principal.etiqueta} (${result.principal.porcentaje}%)`
    }
    return `${dim.nombre}: ${result.principal.etiqueta}`
  }

  // ── Legend label ───────────────────────────────────────────────────────────
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

        {/* Layer 2 — interaction */}
        <canvas
          ref={interactionRef}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          onClick={onCanvasClick}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 2,
            cursor: hoveredNeuron ? 'pointer' : 'default',
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

        {/* Tooltip */}
        {tooltip && hoveredNeuron && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(tooltip.x + 14, size.width - 190),
              top: Math.max(8, tooltip.y - 48),
              zIndex: 20,
              pointerEvents: 'none',
            }}
            className="rounded-md border bg-background/95 px-2.5 py-1.5 text-xs shadow-md backdrop-blur-sm"
          >
            <p className="font-semibold text-foreground">
              Fila {hoveredNeuron.row + 1}, Col {hoveredNeuron.col + 1}
            </p>
            <p className="mt-0.5 text-muted-foreground">{tooltipValue(hoveredNeuron.index)}</p>
          </div>
        )}

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