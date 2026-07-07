import { useEffect, useRef, useState } from 'react'
import { calcularRadio, calcularCentro, calcularVertices } from './hooks/useHexGrid'
import { normalizarDimension, normalizarActivacion, valorAColor } from './hooks/useHeatmap'
import type { ColorStop } from './hooks/useHeatmap'
import type { NeuronHit } from './hooks/useCanvasInteraction'

const SQRT3 = Math.sqrt(3)
const ACCENT = 'hsl(221,83%,53%)'

interface MinimapCanvasProps {
  weights: number[][]
  activation: number[]
  activeDimensionIndex: number
  gridWidth: number
  gridHeight: number
  palette: ColorStop[]
  winnerNeuron: NeuronHit
}

export default function MinimapCanvas({
  weights,
  activation,
  activeDimensionIndex,
  gridWidth,
  gridHeight,
  palette,
  winnerNeuron,
}: MinimapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.width === 0 || size.height === 0 || weights.length === 0) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size.width * dpr
    canvas.height = size.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    const radio = calcularRadio(size.width, size.height, gridWidth, gridHeight)
    const offsetX = (size.width - (gridWidth + 0.5) * SQRT3 * radio) / 2
    const offsetY = (size.height - (gridHeight * 1.5 + 0.5) * radio) / 2

    const normalizedValues =
      activeDimensionIndex === -1
        ? normalizarActivacion(activation)
        : normalizarDimension(weights, activeDimensionIndex)

    // Draw hexagons
    for (let col = 0; col < gridWidth; col++) {
      for (let row = 0; row < gridHeight; row++) {
        const neuronIndex = row * gridWidth + col
        const { cx: rawCx, cy: rawCy } = calcularCentro(col, row, radio)
        const vertices = calcularVertices(rawCx + offsetX, rawCy + offsetY, radio)
        const color = valorAColor(normalizedValues[neuronIndex] ?? 0, palette)

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(vertices[0].x, vertices[0].y)
        for (let v = 1; v < 6; v++) ctx.lineTo(vertices[v].x, vertices[v].y)
        ctx.closePath()
        ctx.fill()
      }
    }

    // Draw winner marker
    const { cx: rawCx, cy: rawCy } = calcularCentro(winnerNeuron.col, winnerNeuron.row, radio)
    const cx = rawCx + offsetX
    const cy = rawCy + offsetY
    const dotRadius = Math.max(2.5, radio * 0.32)

    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.arc(cx, cy, dotRadius + 1.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = ACCENT
    ctx.beginPath()
    ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2)
    ctx.fill()
  }, [size, activeDimensionIndex, weights, activation, gridWidth, gridHeight, palette, winnerNeuron])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  )
}