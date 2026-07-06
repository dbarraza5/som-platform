import { useState, useEffect } from 'react'
import type React from 'react'
import { calcularRadio, calcularCentro } from './useHexGrid'

const SQRT3 = Math.sqrt(3)

export interface NeuronHit {
  index: number
  col: number
  row: number
}

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement>
  gridWidth: number
  gridHeight: number
  onNeuronSelect?: (neuron: NeuronHit | null) => void
}

export function useCanvasInteraction({ canvasRef, gridWidth, gridHeight, onNeuronSelect }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hoveredNeuron, setHoveredNeuron] = useState<NeuronHit | null>(null)
  const [selectedNeuron, setSelectedNeuron] = useState<NeuronHit | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; neuronIndex: number } | null>(null)

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const radio = size.width > 0 ? calcularRadio(size.width, size.height, gridWidth, gridHeight) : 0
  const offsetX = radio > 0 ? (size.width - (gridWidth + 0.5) * SQRT3 * radio) / 2 : 0
  const offsetY = radio > 0 ? (size.height - (gridHeight * 1.5 + 0.5) * radio) / 2 : 0

  function findNeuron(mx: number, my: number): NeuronHit | null {
    if (radio === 0) return null
    let best: NeuronHit | null = null
    let bestDist = Infinity
    for (let col = 0; col < gridWidth; col++) {
      for (let row = 0; row < gridHeight; row++) {
        const { cx: rawCx, cy: rawCy } = calcularCentro(col, row, radio)
        const d = Math.hypot(mx - (rawCx + offsetX), my - (rawCy + offsetY))
        if (d < bestDist) {
          bestDist = d
          best = { index: row * gridWidth + col, col, row }
        }
      }
    }
    return best !== null && bestDist <= radio ? best : null
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { left, top } = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - left
    const my = e.clientY - top
    const hit = findNeuron(mx, my)
    setHoveredNeuron(hit)
    setTooltip(hit ? { x: mx, y: my, neuronIndex: hit.index } : null)
  }

  function onMouseLeave() {
    setHoveredNeuron(null)
    setTooltip(null)
  }

  function onClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const { left, top } = e.currentTarget.getBoundingClientRect()
    const hit = findNeuron(e.clientX - left, e.clientY - top)
    if (!hit) return
    const next = selectedNeuron?.index === hit.index ? null : hit
    setSelectedNeuron(next)
    onNeuronSelect?.(next)
  }

  return {
    hoveredNeuron,
    selectedNeuron,
    tooltip,
    size,
    radio,
    offsetX,
    offsetY,
    onMouseMove,
    onMouseLeave,
    onClick,
  }
}