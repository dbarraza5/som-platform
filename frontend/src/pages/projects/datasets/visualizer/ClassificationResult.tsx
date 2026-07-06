import { MapPin } from 'lucide-react'

export default function ClassificationResult() {
  return (
    <div className="px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Clasificación
      </p>

      <div className="mt-3 flex flex-col items-center gap-2 py-4 text-center">
        <MapPin className="h-4 w-4 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">
          Ingresa un registro y presiona Clasificar.
        </p>
      </div>
    </div>
  )
}
