export interface TrainingDimension {
  nombre: string
  index: number
  tipo_dato: 'continuo' | 'discreto'
  min: number
  max: number
  rango?: string[]
}
