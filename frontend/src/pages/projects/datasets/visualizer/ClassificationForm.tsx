import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TrainingDimension } from '@/types/trainingFiles'

interface ClassificationFormProps {
  dimensions: TrainingDimension[]
}

export default function ClassificationForm({ dimensions }: ClassificationFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})

  function handleClear() {
    setValues({})
  }

  return (
    <div className="border-b px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Clasificación
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Ingresar un registro para clasificar y localizar en el mapa.
      </p>

      <div className="mt-3 space-y-2.5">
        {dimensions.map((dim) => (
          <div key={dim.nombre} className="space-y-1">
            <Label htmlFor={`cls-${dim.nombre}`} className="truncate text-xs">
              {dim.nombre}
            </Label>
            <Input
              id={`cls-${dim.nombre}`}
              type="text"
              placeholder={
                dim.tipo_dato === 'discreto' && dim.rango
                  ? dim.rango.join(' / ')
                  : `${dim.min} – ${dim.max}`
              }
              value={values[dim.nombre] ?? ''}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [dim.nombre]: e.target.value }))
              }
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Button size="sm" className="flex-1" disabled>
          Clasificar
        </Button>
        <Button size="sm" variant="outline" onClick={handleClear}>
          Limpiar
        </Button>
      </div>
    </div>
  )
}
