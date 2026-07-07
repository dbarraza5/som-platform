import type { TrainingDimension } from '@/types/trainingFiles'

export function normalizarContinuo(valor: number, min: number, max: number): number {
  if (max === min) return 0
  return Math.max(0, Math.min(1, (valor - min) / (max - min)))
}

export function normalizarDiscreto(etiqueta: string, dimension: TrainingDimension): number {
  const idx = (dimension.rango?.indexOf(etiqueta) ?? -1) + 1
  if (dimension.max === dimension.min) return 0
  return Math.max(0, Math.min(1, (idx - dimension.min) / (dimension.max - dimension.min)))
}

export function desnormalizarContinuo(valorNorm: number, min: number, max: number): number {
  return Math.round((valorNorm * (max - min) + min) * 100) / 100
}

export interface DiscreteResult {
  principal: { etiqueta: string; porcentaje: number }
  secundario: { etiqueta: string; porcentaje: number } | null
  empate: boolean
}

export function desnormalizarDiscreto(valorNorm: number, dimension: TrainingDimension): DiscreteResult {
  const valorReal = valorNorm * (dimension.max - dimension.min) + dimension.min
  const minInt = Math.round(dimension.min)
  const maxInt = Math.round(dimension.max)
  const inferior = Math.max(minInt, Math.min(maxInt, Math.floor(valorReal)))
  const superior = Math.max(minInt, Math.min(maxInt, Math.ceil(valorReal)))

  function toLabel(v: number): string {
    const idx = v - minInt
    return dimension.rango?.[idx] ?? String(v)
  }

  if (inferior === superior) {
    return {
      principal: { etiqueta: toLabel(inferior), porcentaje: 100 },
      secundario: null,
      empate: false,
    }
  }

  const distancia = (valorReal - inferior) / (superior - inferior)
  const pctSuperior = Math.round(distancia * 100)
  const pctInferior = 100 - pctSuperior
  const empate = pctSuperior === 50

  if (pctInferior >= pctSuperior) {
    return {
      principal: { etiqueta: toLabel(inferior), porcentaje: pctInferior },
      secundario: { etiqueta: toLabel(superior), porcentaje: pctSuperior },
      empate,
    }
  }
  return {
    principal: { etiqueta: toLabel(superior), porcentaje: pctSuperior },
    secundario: { etiqueta: toLabel(inferior), porcentaje: pctInferior },
    empate,
  }
}