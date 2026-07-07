import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { TrainingDimension } from '@/types/trainingFiles'
import { normalizarContinuo, normalizarDiscreto } from '@/components/training/SomCanvas/hooks/useDenormalize'

// Dimensions with more unique values than this threshold use a text input
// instead of a <select> to avoid rendering thousands of <option> nodes.
const MAX_SELECT_OPTIONS = 50

interface ClassificationFormProps {
  dimensions: TrainingDimension[]
  onClassify: (inputNorm: number[]) => void
  onClear: () => void
}

export default function ClassificationForm({ dimensions, onClassify, onClear }: ClassificationFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Pre-build Sets for high-cardinality discrete dims (O(1) lookup in validation)
  const highCardSets = useMemo(() => {
    const sets: Record<string, Set<string>> = {}
    for (const dim of dimensions) {
      if (dim.tipo_dato === 'discreto' && dim.rango && dim.rango.length > MAX_SELECT_OPTIONS) {
        sets[dim.nombre] = new Set(dim.rango.map(String))
      }
    }
    return sets
  }, [dimensions])

  function setValue(nombre: string, value: string) {
    setValues((prev) => ({ ...prev, [nombre]: value }))
    if (errors[nombre]) setErrors((prev) => { const next = { ...prev }; delete next[nombre]; return next })
  }

  function handleClear() {
    setValues({})
    setErrors({})
    onClear()
  }

  function handleClasificar() {
    const newErrors: Record<string, string> = {}

    for (const dim of dimensions) {
      const raw = values[dim.nombre] ?? ''

      if (dim.tipo_dato === 'continuo') {
        if (raw === '') {
          newErrors[dim.nombre] = 'Campo requerido.'
        } else {
          const num = parseFloat(raw)
          if (isNaN(num)) {
            newErrors[dim.nombre] = 'Debe ser un número.'
          } else if (num < dim.min || num > dim.max) {
            newErrors[dim.nombre] = `Debe estar entre ${dim.min} y ${dim.max}.`
          }
        }
      } else {
        if (raw === '') {
          newErrors[dim.nombre] = 'Selecciona una opción.'
        } else if (highCardSets[dim.nombre] && !highCardSets[dim.nombre].has(raw)) {
          newErrors[dim.nombre] = 'Valor no encontrado en el dataset.'
        }
      }
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    const inputNorm = dimensions.map((dim) => {
      const raw = values[dim.nombre]
      if (dim.tipo_dato === 'continuo') {
        return normalizarContinuo(parseFloat(raw), dim.min, dim.max)
      }
      return normalizarDiscreto(raw, dim)
    })

    onClassify(inputNorm)
  }

  return (
    <div className="border-b px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Clasificación
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Ingresar un registro para clasificar y localizar en el mapa.
      </p>

      <div className="mt-3 space-y-3">
        {dimensions.map((dim) => (
          <div key={dim.nombre}>
            <Label htmlFor={`cls-${dim.nombre}`} className="truncate text-xs">
              {dim.nombre}
            </Label>

            {dim.tipo_dato === 'continuo' ? (
              <Input
                id={`cls-${dim.nombre}`}
                type="number"
                min={dim.min}
                max={dim.max}
                step={0.01}
                placeholder={`Ej: ${dim.min} - ${dim.max}`}
                value={values[dim.nombre] ?? ''}
                onChange={(e) => setValue(dim.nombre, e.target.value)}
                className={`mt-1 h-8 text-sm ${errors[dim.nombre] ? 'border-destructive' : ''}`}
              />
            ) : highCardSets[dim.nombre] ? (
              // High-cardinality discrete: text input avoids rendering thousands of <option> nodes
              <Input
                id={`cls-${dim.nombre}`}
                type="text"
                placeholder={`${(dim.rango?.length ?? 0).toLocaleString()} valores únicos`}
                value={values[dim.nombre] ?? ''}
                onChange={(e) => setValue(dim.nombre, e.target.value)}
                className={`mt-1 h-8 text-sm ${errors[dim.nombre] ? 'border-destructive' : ''}`}
              />
            ) : (
              <Select
                id={`cls-${dim.nombre}`}
                value={values[dim.nombre] ?? ''}
                onChange={(e) => setValue(dim.nombre, e.target.value)}
                className={`mt-1 h-8 text-sm ${errors[dim.nombre] ? 'border-destructive' : ''}`}
              >
                <option value="">Seleccionar...</option>
                {dim.rango?.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </Select>
            )}

            {errors[dim.nombre] && (
              <p className="mt-0.5 text-xs text-destructive">{errors[dim.nombre]}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Button size="sm" className="flex-1" onClick={handleClasificar}>
          Clasificar
        </Button>
        <Button size="sm" variant="outline" onClick={handleClear}>
          Limpiar
        </Button>
      </div>
    </div>
  )
}