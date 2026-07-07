import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Maximize2, Palette, Pencil, Eye, EyeOff } from 'lucide-react'
import HeatmapCanvas from './HeatmapCanvas'
import PizarraCanvas from './PizarraCanvas'
import PizarraToolbar from './PizarraToolbar'
import { PALETTES, normalizarDimension, normalizarActivacion } from './hooks/useHeatmap'
import type { ColorStop } from './hooks/useHeatmap'
import { calcularCentro, calcularVertices, RADIO_INICIAL_HEX } from './hooks/useHexGrid'
import { useCanvasInteraction } from './hooks/useCanvasInteraction'
import type { NeuronHit } from './hooks/useCanvasInteraction'
import { useCamera } from './hooks/useCamera'
import { usePizarra } from './hooks/usePizarra'
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
  // ── Palette ────────────────────────────────────────────────────────────────
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

  // ── Canvas size (single ResizeObserver on the container) ───────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setCanvasSize({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Camera ─────────────────────────────────────────────────────────────────
  const {
    zoom, panX, panY, isPanning,
    initCamera, resetCamera, zoomIn, zoomOut,
    onWheelZoom, onPanStart, onPanMove, onPanEnd,
    onPinchStart, onPinchMove, onPinchEnd,
    canvasToWorld,
  } = useCamera({
    canvasWidth: canvasSize.width,
    canvasHeight: canvasSize.height,
    gridWidth,
    gridHeight,
  })

  // Init camera once canvas has a size
  useEffect(() => {
    initCamera()
  }, [canvasSize.width, canvasSize.height, initCamera])

  // ── Pizarra ────────────────────────────────────────────────────────────────
  const {
    layers: pizarraLayers,
    tool: pizarraTool, setTool: setPizarraTool,
    color: pizarraColor, setColor: setPizarraColor,
    width: pizarraWidth, setWidth: setPizarraWidth,
    clearLayer: clearPizarraLayer,
    undo: undoPizarra,
    onDrawStart, onDrawMove, onDrawEnd, cancelDraw,
  } = usePizarra()

  const [pizarraEditando, setPizarraEditando] = useState(false)
  const [pizarraVisible, setPizarraVisible] = useState(false)
  const hasStrokes = pizarraLayers.some(l => l.strokes.length > 0)

  function togglePizarraEdit() {
    if (!pizarraEditando) {
      setPizarraEditando(true)
      setPizarraVisible(true)
    } else {
      setPizarraEditando(false)
    }
  }

  function togglePizarraVisible() {
    const next = !pizarraVisible
    setPizarraVisible(next)
    if (!next) setPizarraEditando(false)
  }

  // ── Interaction (hover + selection) ───────────────────────────────────────
  const { hoveredNeuron, setHoveredNeuron, selectedNeuron, setSelectedNeuron, findNeuron } =
    useCanvasInteraction({ gridWidth, gridHeight })

  // Stable refs for touch handlers (avoid stale closures in useEffect)
  const selectedNeuronRef = useRef(selectedNeuron)
  selectedNeuronRef.current = selectedNeuron
  const findNeuronRef = useRef(findNeuron)
  findNeuronRef.current = findNeuron
  const onNeuronSelectRef = useRef(onNeuronSelect)
  onNeuronSelectRef.current = onNeuronSelect
  const setHoveredRef = useRef(setHoveredNeuron)
  setHoveredRef.current = setHoveredNeuron
  const setSelectedRef = useRef(setSelectedNeuron)
  setSelectedRef.current = setSelectedNeuron

  // ── Tooltip cursor position ────────────────────────────────────────────────
  const [tooltipCursor, setTooltipCursor] = useState<{ x: number; y: number } | null>(null)

  // ── Interaction canvas ─────────────────────────────────────────────────────
  const interactionRef = useRef<HTMLCanvasElement>(null)

  // Non-passive wheel on container (always active, even when pizarra is on top)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      const rect = container!.getBoundingClientRect()
      onWheelZoom(e.deltaY, e.clientX - rect.left, e.clientY - rect.top)
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [onWheelZoom])

  // Non-passive touch event listeners on interaction canvas (pan + pinch)
  useEffect(() => {
    const canvas = interactionRef.current
    if (!canvas) return

    function handleTouchStart(e: TouchEvent) {
      e.preventDefault()
      if (e.touches.length === 1) {
        onPanStart(e.touches[0].clientX, e.touches[0].clientY)
      } else if (e.touches.length === 2) {
        const rect = canvas!.getBoundingClientRect()
        onPinchStart(e.touches, rect)
      }
    }

    function handleTouchMove(e: TouchEvent) {
      e.preventDefault()
      if (e.touches.length === 1) {
        onPanMove(e.touches[0].clientX, e.touches[0].clientY)
        setHoveredRef.current(null)
        setTooltipCursor(null)
      } else if (e.touches.length === 2) {
        onPinchMove(e.touches)
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      const wasClick = onPanEnd()
      onPinchEnd()
      setHoveredRef.current(null)
      setTooltipCursor(null)
      if (wasClick && e.changedTouches.length === 1) {
        const rect = canvas!.getBoundingClientRect()
        const cx = e.changedTouches[0].clientX - rect.left
        const cy = e.changedTouches[0].clientY - rect.top
        const { x: wx, y: wy } = canvasToWorld(cx, cy)
        const hit = findNeuronRef.current(wx, wy)
        const prev = selectedNeuronRef.current
        const next = prev?.index === hit?.index ? null : hit
        setSelectedRef.current(next)
        onNeuronSelectRef.current?.(next)
      }
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd)
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onPanStart, onPanMove, onPanEnd, onPinchStart, onPinchMove, onPinchEnd, canvasToWorld])

  // Draw winner, hover, and selection on interaction canvas
  useEffect(() => {
    const canvas = interactionRef.current
    if (!canvas || canvasSize.width === 0) return

    const dpr = window.devicePixelRatio || 1
    const w = Math.round(canvasSize.width * dpr)
    const h = Math.round(canvasSize.height * dpr)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear in device-pixel space, then apply camera transform
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, panX * dpr, panY * dpr)

    function hexPath(col: number, row: number) {
      const { cx, cy } = calcularCentro(col, row, RADIO_INICIAL_HEX)
      const verts = calcularVertices(cx, cy, RADIO_INICIAL_HEX)
      ctx!.beginPath()
      ctx!.moveTo(verts[0].x, verts[0].y)
      for (let v = 1; v < 6; v++) ctx!.lineTo(verts[v].x, verts[v].y)
      ctx!.closePath()
    }

    // 1. Winner: accent fill + accent border
    if (winnerNeuron) {
      hexPath(winnerNeuron.col, winnerNeuron.row)
      ctx.fillStyle = 'hsla(221,83%,53%,0.4)'
      ctx.fill()
      ctx.strokeStyle = SELECTION_COLOR
      ctx.lineWidth = 3 / zoom
      ctx.stroke()
    }

    // 2. Selected: white halo + accent border
    if (selectedNeuron) {
      hexPath(selectedNeuron.col, selectedNeuron.row)
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.lineWidth = 3.5 / zoom
      ctx.stroke()
      ctx.strokeStyle = SELECTION_COLOR
      ctx.lineWidth = 2 / zoom
      ctx.stroke()
    }

    // 3. Hovered: white fill + white border
    if (hoveredNeuron) {
      hexPath(hoveredNeuron.col, hoveredNeuron.row)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fill()
      if (hoveredNeuron.index !== selectedNeuron?.index) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'
        ctx.lineWidth = 2 / zoom
        ctx.stroke()
      }
    }

    // 4. Winner center dot (always on top)
    if (winnerNeuron) {
      const { cx, cy } = calcularCentro(winnerNeuron.col, winnerNeuron.row, RADIO_INICIAL_HEX)
      const dotRadius = Math.max(RADIO_INICIAL_HEX * 0.2, 2 / zoom)

      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.beginPath()
      ctx.arc(cx, cy, dotRadius + 1.5 / zoom, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = SELECTION_COLOR
      ctx.beginPath()
      ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [hoveredNeuron, selectedNeuron, winnerNeuron, canvasSize, zoom, panX, panY])

  // ── Mouse events on interaction canvas ────────────────────────────────────
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    onPanStart(e.clientX, e.clientY)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const nowPanning = onPanMove(e.clientX, e.clientY)
    if (!nowPanning) {
      const { x: wx, y: wy } = canvasToWorld(cx, cy)
      const hit = findNeuron(wx, wy)
      setHoveredNeuron(hit)
      setTooltipCursor(hit ? { x: cx, y: cy } : null)
    } else {
      setHoveredNeuron(null)
      setTooltipCursor(null)
    }
  }

  function handleMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    const wasClick = onPanEnd()
    if (wasClick) {
      const rect = e.currentTarget.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const { x: wx, y: wy } = canvasToWorld(cx, cy)
      const hit = findNeuron(wx, wy)
      const next = selectedNeuron?.index === hit?.index ? null : hit
      setSelectedNeuron(next)
      onNeuronSelect?.(next)
    }
  }

  function handleMouseLeave() {
    onPanEnd()
    setHoveredNeuron(null)
    setTooltipCursor(null)
  }

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
      <div ref={containerRef} className="relative min-h-0 flex-1">
        {/* Layer 1 — heatmap */}
        <HeatmapCanvas
          weights={weights}
          activation={activation}
          activeDimensionIndex={activeDimensionIndex}
          gridWidth={gridWidth}
          gridHeight={gridHeight}
          palette={activePalette}
          zoom={zoom}
          panX={panX}
          panY={panY}
        />

        {/* Layer 2 — interaction (receives mouse + touch events when pizarra inactive) */}
        <canvas
          ref={interactionRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 2,
            cursor: isPanning ? 'grabbing' : hoveredNeuron ? 'pointer' : 'grab',
            pointerEvents: pizarraEditando ? 'none' : 'auto',
          }}
        />

        {/* Layer 3+ — pizarra (visible cuando editando o cuando se activó la vista) */}
        {pizarraVisible && (
          <PizarraCanvas
            pizarraActiva={pizarraEditando}
            layers={pizarraLayers}
            tool={pizarraTool}
            color={pizarraColor}
            width={pizarraWidth}
            canvasSize={canvasSize}
            zoom={zoom}
            panX={panX}
            panY={panY}
            canvasToWorld={canvasToWorld}
            onDrawStart={onDrawStart}
            onDrawMove={onDrawMove}
            onDrawEnd={onDrawEnd}
            cancelDraw={cancelDraw}
          />
        )}

        {/* Pizarra toolbar — solo en modo edición */}
        {pizarraEditando && (
          <PizarraToolbar
            tool={pizarraTool}
            setTool={setPizarraTool}
            color={pizarraColor}
            setColor={setPizarraColor}
            width={pizarraWidth}
            setWidth={setPizarraWidth}
            hasStrokes={hasStrokes}
            clearLayer={clearPizarraLayer}
            undo={undoPizarra}
          />
        )}

        {/* Pizarra controls — bottom-right */}
        <div
          style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 10 }}
          className="flex items-center rounded-md border bg-background/90 shadow-sm backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={togglePizarraEdit}
            title={pizarraEditando ? 'Salir del modo edición' : 'Editar pizarra'}
            className={`flex h-7 w-7 items-center justify-center rounded-l-md transition-colors ${
              pizarraEditando
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <div className="mx-0.5 h-4 w-px bg-border" />
          <button
            type="button"
            onClick={togglePizarraVisible}
            title={pizarraVisible ? 'Ocultar dibujo' : 'Mostrar dibujo'}
            className={`flex h-7 w-7 items-center justify-center rounded-r-md transition-colors ${
              pizarraVisible
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {pizarraVisible
              ? <Eye className="h-3.5 w-3.5" />
              : <EyeOff className="h-3.5 w-3.5" />
            }
          </button>
        </div>

        {/* Tooltip */}
        {tooltipCursor && hoveredNeuron && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(tooltipCursor.x + 14, canvasSize.width - 190),
              top: Math.max(8, tooltipCursor.y - 48),
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

        {/* Zoom controls — bottom-left */}
        <div
          style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 10 }}
          className="flex items-center rounded-md border bg-background/90 shadow-sm backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={zoomOut}
            title="Alejar"
            className="flex h-7 w-7 items-center justify-center rounded-l-md text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            −
          </button>
          <span className="min-w-[3.25rem] px-1 text-center text-xs font-medium tabular-nums text-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            title="Acercar"
            className="flex h-7 w-7 items-center justify-center text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            +
          </button>
          <div className="mx-0.5 h-4 w-px bg-border" />
          <button
            type="button"
            onClick={resetCamera}
            title="Ajustar a pantalla"
            className="flex h-7 w-7 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

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