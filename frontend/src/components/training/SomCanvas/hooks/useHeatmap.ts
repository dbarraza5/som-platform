export interface ColorStop {
  stop: number
  color: string
}

export interface PaletteOption {
  id: string
  name: string
  stops: ColorStop[]
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

export const PALETTE_JET: ColorStop[] = [
  { stop: 0.000, color: '#00007F' },
  { stop: 0.125, color: '#0000FF' },
  { stop: 0.250, color: '#007FFF' },
  { stop: 0.375, color: '#00FFFF' },
  { stop: 0.500, color: '#7FFF7F' },
  { stop: 0.625, color: '#FFFF00' },
  { stop: 0.750, color: '#FF7F00' },
  { stop: 0.875, color: '#FF0000' },
  { stop: 1.000, color: '#7F0000' },
]

export const PALETTE_VIRIDIS: ColorStop[] = [
  { stop: 0.00, color: '#440154' },
  { stop: 0.25, color: '#3B528B' },
  { stop: 0.50, color: '#21908C' },
  { stop: 0.75, color: '#5DC963' },
  { stop: 1.00, color: '#FDE725' },
]

export const PALETTE_PLASMA: ColorStop[] = [
  { stop: 0.0, color: '#0D0887' },
  { stop: 0.2, color: '#6A00A8' },
  { stop: 0.4, color: '#B12A90' },
  { stop: 0.6, color: '#E16462' },
  { stop: 0.8, color: '#FCA636' },
  { stop: 1.0, color: '#F0F921' },
]

export const PALETTE_MAGMA: ColorStop[] = [
  { stop: 0.0, color: '#000004' },
  { stop: 0.2, color: '#3B0F70' },
  { stop: 0.4, color: '#8C2981' },
  { stop: 0.6, color: '#DE4968' },
  { stop: 0.8, color: '#FE9F6D' },
  { stop: 1.0, color: '#FCFDBF' },
]

export const PALETTE_INFERNO: ColorStop[] = [
  { stop: 0.0, color: '#000004' },
  { stop: 0.2, color: '#420A68' },
  { stop: 0.4, color: '#932667' },
  { stop: 0.6, color: '#DD513A' },
  { stop: 0.8, color: '#FCA50A' },
  { stop: 1.0, color: '#FCFFA4' },
]

export const PALETTE_WARM: ColorStop[] = [
  { stop: 0.00, color: '#FF0000' },
  { stop: 0.33, color: '#FF7F00' },
  { stop: 0.67, color: '#FFFF00' },
  { stop: 1.00, color: '#FFFFFF' },
]

export const PALETTE_COOL: ColorStop[] = [
  { stop: 0.00, color: '#00007F' },
  { stop: 0.33, color: '#0000FF' },
  { stop: 0.67, color: '#00FFFF' },
  { stop: 1.00, color: '#FFFFFF' },
]

export const PALETTE_GRAY: ColorStop[] = [
  { stop: 0.0, color: '#000000' },
  { stop: 1.0, color: '#FFFFFF' },
]

export const PALETTES: PaletteOption[] = [
  { id: 'jet',     name: 'Jet',     stops: PALETTE_JET },
  { id: 'viridis', name: 'Viridis', stops: PALETTE_VIRIDIS },
  { id: 'plasma',  name: 'Plasma',  stops: PALETTE_PLASMA },
  { id: 'magma',   name: 'Magma',   stops: PALETTE_MAGMA },
  { id: 'inferno', name: 'Inferno', stops: PALETTE_INFERNO },
  { id: 'warm',    name: 'Cálido',  stops: PALETTE_WARM },
  { id: 'cool',    name: 'Frío',    stops: PALETTE_COOL },
  { id: 'gray',    name: 'Grises',  stops: PALETTE_GRAY },
]

export function normalizarDimension(weights: number[][], dimensionIndex: number): number[] {
  if (weights.length === 0) return []
  const values = weights.map((neuron) => neuron[dimensionIndex] ?? 0)
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 0)
  return values.map((v) => (v - min) / (max - min))
}

export function normalizarActivacion(activation: number[]): number[] {
  if (activation.length === 0) return []
  const min = Math.min(...activation)
  const max = Math.max(...activation)
  if (max === min) return activation.map(() => 0)
  return activation.map((v) => (v - min) / (max - min))
}

export function valorAColor(t: number, paleta: ColorStop[]): string {
  const clamped = Math.max(0, Math.min(1, t))
  let lower = paleta[0]
  let upper = paleta[paleta.length - 1]
  for (let i = 0; i < paleta.length - 1; i++) {
    if (clamped >= paleta[i].stop && clamped <= paleta[i + 1].stop) {
      lower = paleta[i]
      upper = paleta[i + 1]
      break
    }
  }
  const range = upper.stop - lower.stop
  const factor = range === 0 ? 0 : (clamped - lower.stop) / range
  const [lr, lg, lb] = hexToRgb(lower.color)
  const [ur, ug, ub] = hexToRgb(upper.color)
  const r = Math.round(lr + (ur - lr) * factor)
  const g = Math.round(lg + (ug - lg) * factor)
  const b = Math.round(lb + (ub - lb) * factor)
  return `rgb(${r},${g},${b})`
}

export function useHeatmap() {
  return { normalizarDimension, normalizarActivacion, valorAColor }
}