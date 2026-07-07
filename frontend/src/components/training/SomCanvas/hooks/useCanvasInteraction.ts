import { useState } from 'react'
import { calcularCentro, RADIO_INICIAL_HEX } from './useHexGrid'

export interface NeuronHit {
  index: number
  col: number
  row: number
}

interface Props {
  gridWidth: number
  gridHeight: number
}

export function useCanvasInteraction({ gridWidth, gridHeight }: Props) {
  const [hoveredNeuron, setHoveredNeuron] = useState<NeuronHit | null>(null)
  const [selectedNeuron, setSelectedNeuron] = useState<NeuronHit | null>(null)

  // Hit test in world coordinates (RADIO_INICIAL_HEX is the world-space hex radius)
  function findNeuron(worldX: number, worldY: number): NeuronHit | null {
    let best: NeuronHit | null = null
    let bestDist = Infinity
    for (let col = 0; col < gridWidth; col++) {
      for (let row = 0; row < gridHeight; row++) {
        const { cx, cy } = calcularCentro(col, row, RADIO_INICIAL_HEX)
        const d = Math.hypot(worldX - cx, worldY - cy)
        if (d < bestDist) {
          bestDist = d
          best = { index: row * gridWidth + col, col, row }
        }
      }
    }
    return best !== null && bestDist <= RADIO_INICIAL_HEX ? best : null
  }

  return { hoveredNeuron, setHoveredNeuron, selectedNeuron, setSelectedNeuron, findNeuron }
}