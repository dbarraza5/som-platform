import { MousePointer } from 'lucide-react'

export default function NeuronDetail() {
  return (
    <div className="border-b px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Neurona</p>

      <div className="mt-3 flex flex-col items-center gap-2 py-4 text-center">
        <MousePointer className="h-4 w-4 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">
          Pasa el mouse sobre una neurona para ver sus valores.
        </p>
      </div>
    </div>
  )
}
