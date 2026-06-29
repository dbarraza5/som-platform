import { Link } from 'react-router-dom'
import { Calendar, FolderOpen, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Project } from '@/types/project'

interface ProjectListItemProps {
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

export default function ProjectListItem({ project, onDelete }: ProjectListItemProps) {
  return (
    <div className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40">
      <div className="shrink-0 rounded-lg bg-primary/8 p-2.5">
        <FolderOpen className="h-5 w-5 text-primary/70" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{project.name}</p>
        {project.description ? (
          <p className="truncate text-xs text-muted-foreground mt-0.5">{project.description}</p>
        ) : (
          <p className="text-xs text-muted-foreground/50 mt-0.5 italic">Sin descripción</p>
        )}
      </div>

      <div className="hidden shrink-0 space-y-1 text-right text-xs text-muted-foreground lg:block">
        <div className="flex items-center justify-end gap-1.5">
          <Calendar className="h-3 w-3" />
          <span>Creado {formatDate(project.createdAt)}</span>
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <Calendar className="h-3 w-3" />
          <span>Actualizado {formatDate(project.updatedAt)}</span>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-1">
        <Button asChild size="sm">
          <Link to={`/projects/${project.id}`}>Entrar</Link>
        </Button>
        <Button asChild size="icon" variant="ghost" title="Editar">
          <Link to={`/projects/${project.id}/edit`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          title="Eliminar"
          onClick={() => onDelete(project)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
