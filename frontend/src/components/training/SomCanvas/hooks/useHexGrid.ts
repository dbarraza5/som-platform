export const RADIO_INICIAL_HEX = 12
export const RADIO_MINIMO_HEX = 6

const SQRT3 = Math.sqrt(3)

export function calcularRadio(ancho: number, alto: number, cols: number, filas: number): number {
  const radioH = ancho / ((cols + 0.5) * SQRT3)
  const radioV = alto / (filas * 1.5 + 0.5)
  return Math.min(radioH, radioV)
}

export function calcularCentro(
  col: number,
  fila: number,
  radio: number,
): { cx: number; cy: number } {
  const cx = col * radio * SQRT3 + (fila % 2 === 1 ? (radio * SQRT3) / 2 : 0) + (radio * SQRT3) / 2
  const cy = fila * radio * 1.5 + radio
  return { cx, cy }
}

export function calcularVertices(
  cx: number,
  cy: number,
  radio: number,
): { x: number; y: number }[] {
  return Array.from({ length: 6 }, (_, i) => ({
    x: cx + radio * Math.cos((Math.PI / 180) * (60 * i - 30)),
    y: cy + radio * Math.sin((Math.PI / 180) * (60 * i - 30)),
  }))
}

export function useHexGrid() {
  return { calcularRadio, calcularCentro, calcularVertices }
}
