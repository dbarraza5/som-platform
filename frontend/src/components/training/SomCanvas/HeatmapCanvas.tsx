import { useEffect, useRef, useState } from 'react'
import { calcularRadio, calcularCentro, calcularVertices } from './hooks/useHexGrid'
import { normalizarDimension, normalizarActivacion, valorAColor } from './hooks/useHeatmap'
import type { ColorStop } from './hooks/useHeatmap'

interface HeatmapCanvasProps {
  weights: number[][]
  activation: number[]
  activeDimensionIndex: number
  gridWidth: number
  gridHeight: number
  palette: ColorStop[]
}

export default function HeatmapCanvas({
  weights,
  activation,
  activeDimensionIndex,
  gridWidth,
  gridHeight,
  palette,
}: HeatmapCanvasProps) {
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
    if (!canvas || size.width === 0 || size.height === 0) return
    if (weights.length === 0) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size.width * dpr
    canvas.height = size.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    const radio = calcularRadio(size.width, size.height, gridWidth, gridHeight)

    const normalizedValues =
      activeDimensionIndex === -1
        ? normalizarActivacion(activation)
        : normalizarDimension(weights, activeDimensionIndex)

    for (let col = 0; col < gridWidth; col++) {
      for (let row = 0; row < gridHeight; row++) {
        const neuronIndex = row * gridWidth + col
        const { cx, cy } = calcularCentro(col, row, radio)
        const vertices = calcularVertices(cx, cy, radio)
        const color = valorAColor(normalizedValues[neuronIndex] ?? 0, palette)

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(vertices[0].x, vertices[0].y)
        for (let v = 1; v < 6; v++) ctx.lineTo(vertices[v].x, vertices[v].y)
        ctx.closePath()
        ctx.fill()

        ctx.strokeStyle = 'rgba(0,0,0,0.08)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    }
  }, [size, activeDimensionIndex, weights, activation, gridWidth, gridHeight, palette])

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  )
}