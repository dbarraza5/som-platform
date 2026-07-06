import { Grid3x3 } from 'lucide-react'

export default function SomCanvas() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-muted/20 select-none">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-full bg-muted p-4">
          <Grid3x3 className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Mapa SOM</p>
        <p className="max-w-xs text-xs text-muted-foreground/60">
          El renderizado del mapa hexagonal estará disponible en la siguiente iteración.
        </p>
      </div>
    </div>
  )
}
