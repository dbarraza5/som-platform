import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ClassificationFormProps {
  dimensions: string[]
}

export default function ClassificationForm({ dimensions }: ClassificationFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(dimensions.map((d) => [d, ''])),
  )

  function handleClear() {
    setValues(Object.fromEntries(dimensions.map((d) => [d, ''])))
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
          <div key={dim} className="space-y-1">
            <Label htmlFor={`cls-${dim}`} className="text-xs">
              {dim}
            </Label>
            <Input
              id={`cls-${dim}`}
              type="text"
              placeholder={`Ej: valor de ${dim}`}
              value={values[dim]}
              onChange={(e) => setValues((prev) => ({ ...prev, [dim]: e.target.value }))}
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
