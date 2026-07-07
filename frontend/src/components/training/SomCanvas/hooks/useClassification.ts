export interface ClassificationMatch {
  indice: number
  fila: number
  columna: number
  distancia: number
  similitud: number
}

interface Props {
  weights: number[][]
  gridWidth: number
}

export function useClassification({ weights, gridWidth }: Props) {
  function clasificar(inputNorm: number[]): ClassificationMatch | null {
    if (weights.length === 0 || inputNorm.length === 0) return null

    let bestIndex = 0
    let bestDist = Infinity

    for (let i = 0; i < weights.length; i++) {
      const w = weights[i]
      let sum = 0
      for (let j = 0; j < inputNorm.length; j++) {
        const d = inputNorm[j] - (w[j] ?? 0)
        sum += d * d
      }
      const dist = Math.sqrt(sum)
      if (dist < bestDist) {
        bestDist = dist
        bestIndex = i
      }
    }

    const distanciaMaxPosible = Math.sqrt(inputNorm.length)
    const similitud = Math.max(0, Math.min(100, (1 - bestDist / distanciaMaxPosible) * 100))
    const fila = Math.floor(bestIndex / gridWidth)
    const columna = bestIndex % gridWidth

    return { indice: bestIndex, fila, columna, distancia: bestDist, similitud }
  }

  return { clasificar }
}