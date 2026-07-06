import { MousePointer } from 'lucide-react'

export default function NeuronDetail() {
  return (
    <div className="border-b px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Neurona</p>

      <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
        <MousePointer className="h-5 w-5 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">
          Pasa el mouse sobre una neurona para ver sus valores.
        </p>
      </div>

      {/* Reserved space for dimension value table */}
      <div className="mt-2 rounded-md border border-dashed p-3">
        <p className="text-center text-xs text-muted-foreground/50">
          Tabla de dimensiones — fase posterior
        </p>
      </div>
    </div>
  )
}
