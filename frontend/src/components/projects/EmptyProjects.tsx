import { Link } from 'react-router-dom'
import { FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function EmptyProjects() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <FolderOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">Sin proyectos todavía</h3>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">
        Crea tu primer proyecto para comenzar a analizar datos con redes neuronales SOM.
      </p>
      <Button asChild>
        <Link to="/projects/new">Crear primer proyecto</Link>
      </Button>
    </div>
  )
}
