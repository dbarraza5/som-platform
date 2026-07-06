import { MapPin } from 'lucide-react'

export default function ClassificationResult() {
  return (
    <div className="px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Clasificación
      </p>

      <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
        <MapPin className="h-5 w-5 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">
          Ingresa un registro y presiona Clasificar.
        </p>
      </div>

      {/* Reserved space for classification result + map thumbnail */}
      <div className="mt-2 rounded-md border border-dashed p-3">
        <p className="text-center text-xs text-muted-foreground/50">
          Resultado y miniatura del mapa — fase posterior
        </p>
      </div>
    </div>
  )
}
