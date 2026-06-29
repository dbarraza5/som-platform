import { Link } from 'react-router-dom'
import { Calendar, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Project } from '@/types/project'

interface ProjectCardProps {
  project: Project
  onDelete: (project: Project) => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{project.name}</CardTitle>
        {project.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>Creado: {formatDate(project.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>Actualizado: {formatDate(project.updatedAt)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" className="flex-1">
            <Link to={`/projects/${project.id}`}>Entrar</Link>
          </Button>
          <Button asChild variant="outline" size="icon" title="Editar">
            <Link to={`/projects/${project.id}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            title="Eliminar"
            onClick={() => onDelete(project)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
