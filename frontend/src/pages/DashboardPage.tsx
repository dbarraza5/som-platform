import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Plus,
  Search,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { projectsApi } from '@/api/projects'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import AppLayout from '@/components/layout/AppLayout'
import ProjectListItem from '@/components/projects/ProjectListItem'
import DeleteProjectDialog from '@/components/projects/DeleteProjectDialog'
import type { Project } from '@/types/project'

const PAGE_SIZE = 5

export default function DashboardPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll().then((r) => r.data.data.projects),
  })

  const projects = data ?? []
  const totalPages = Math.max(1, Math.ceil(projects.length / PAGE_SIZE))
  const page = Math.min(currentPage, totalPages)
  const paginatedProjects = projects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const from = projects.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, projects.length)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setProjectToDelete(null)
      if (paginatedProjects.length === 1 && currentPage > 1) {
        setCurrentPage((p) => p - 1)
      }
    },
  })

  const stats = [
    { label: 'Total proyectos', value: isLoading ? '—' : projects.length, Icon: FolderOpen },
    { label: 'En curso', value: 0, Icon: Activity },
    { label: 'Completados', value: 0, Icon: CheckCircle2 },
    { label: 'Fallidos', value: 0, Icon: XCircle },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bienvenido, {user?.nombre}</h1>
            <p className="text-sm text-muted-foreground">Tus proyectos de análisis SOM</p>
          </div>
          <Button asChild>
            <Link to="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo proyecto
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                </div>
                <div className="rounded-full bg-muted p-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Projects card */}
        <Card className="overflow-hidden">
          {/* Card header */}
          <div className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold leading-none tracking-tight">Mis proyectos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isLoading
                  ? 'Cargando...'
                  : projects.length === 0
                  ? 'Sin proyectos'
                  : `Mostrando ${from}–${to} de ${projects.length} proyecto${projects.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 w-full pl-9 sm:w-64"
                  placeholder="Buscar proyecto..."
                  disabled
                />
              </div>
              <Button variant="outline" size="sm" disabled>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filtrar
              </Button>
            </div>
          </div>

          {/* Card content */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <p className="text-sm text-muted-foreground">Cargando proyectos...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-full bg-muted p-6">
                <FolderOpen className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <h3 className="mb-1 text-base font-semibold">No tienes proyectos todavía</h3>
              <p className="mb-6 max-w-xs text-sm text-muted-foreground">
                Crea tu primer proyecto para comenzar a analizar datos con redes neuronales SOM.
              </p>
              <Button asChild>
                <Link to="/projects/new">Crear mi primer proyecto</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="divide-y">
                {paginatedProjects.map((project) => (
                  <ProjectListItem
                    key={project.id}
                    project={project}
                    onDelete={setProjectToDelete}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={page === totalPages}
                    >
                      Siguiente
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      <DeleteProjectDialog
        project={projectToDelete}
        onConfirm={() => projectToDelete && deleteMutation.mutate(projectToDelete.id)}
        onCancel={() => setProjectToDelete(null)}
        isDeleting={deleteMutation.isPending}
      />
    </AppLayout>
  )
}
