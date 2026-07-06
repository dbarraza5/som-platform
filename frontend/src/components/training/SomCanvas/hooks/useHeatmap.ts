interface ColorStop {
  t: number
  r: number
  g: number
  b: number
}

const STOPS: ColorStop[] = [
  { t: 0.0,  r: 0x31, g: 0x36, b: 0x95 },
  { t: 0.25, r: 0x74, g: 0xad, b: 0xd1 },
  { t: 0.5,  r: 0xa6, g: 0xd9, b: 0x6a },
  { t: 0.75, r: 0xfd, g: 0xae, b: 0x61 },
  { t: 1.0,  r: 0xd7, g: 0x30, b: 0x27 },
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

export function valorAColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  let lower = STOPS[0]
  let upper = STOPS[STOPS.length - 1]
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (clamped >= STOPS[i].t && clamped <= STOPS[i + 1].t) {
      lower = STOPS[i]
      upper = STOPS[i + 1]
      break
    }
  }
  const range = upper.t - lower.t
  const factor = range === 0 ? 0 : (clamped - lower.t) / range
  const r = Math.round(lower.r + (upper.r - lower.r) * factor)
  const g = Math.round(lower.g + (upper.g - lower.g) * factor)
  const b = Math.round(lower.b + (upper.b - lower.b) * factor)
  return `rgb(${r},${g},${b})`
}

export function useHeatmap() {
  return { normalizarDimension, normalizarActivacion, valorAColor }
}
