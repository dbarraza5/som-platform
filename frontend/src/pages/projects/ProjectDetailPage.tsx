import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BarChart2, Cpu, Database, Network, Pencil } from 'lucide-react'
import { projectsApi } from '@/api/projects'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AppLayout from '@/components/layout/AppLayout'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const futureSections = [
  {
    icon: Database,
    title: 'Dataset',
    description: 'Carga y configura el dataset CSV para el análisis.',
  },
  {
    icon: Cpu,
    title: 'Training Jobs',
    description: 'Ejecuta y monitorea el entrenamiento de la red SOM.',
  },
  {
    icon: BarChart2,
    title: 'Resultados',
    description: 'Consulta métricas y estadísticas del entrenamiento.',
  },
  {
    icon: Network,
    title: 'Visualización SOM',
    description: 'Explora el mapa auto-organizado generado.',
  },
]

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getById(id!).then((r) => r.data.data.project),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <p className="text-sm text-muted-foreground">Cargando proyecto...</p>
        </div>
      </AppLayout>
    )
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="mb-4 text-muted-foreground">Proyecto no encontrado.</p>
          <Button asChild variant="outline">
            <Link to="/dashboard">Volver al dashboard</Link>
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-1">
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link to={`/projects/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información del proyecto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Creado</p>
              <p className="font-medium">{formatDate(project.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Última actualización</p>
              <p className="font-medium">{formatDate(project.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Módulos</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {futureSections.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="border-dashed opacity-60">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-muted p-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">{title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{description}</p>
                  <p className="mt-2 text-xs text-muted-foreground/60">Próximamente</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
