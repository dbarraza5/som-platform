import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { projectsApi } from '@/api/projects'
import { Button } from '@/components/ui/button'
import AppLayout from '@/components/layout/AppLayout'
import ProjectCard from '@/components/projects/ProjectCard'
import EmptyProjects from '@/components/projects/EmptyProjects'
import DeleteProjectDialog from '@/components/projects/DeleteProjectDialog'
import type { Project } from '@/types/project'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll().then((r) => r.data.data.projects),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setProjectToDelete(null)
    },
  })

  const projects = data ?? []

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bienvenido, {user?.nombre}</h1>
            <p className="text-sm text-muted-foreground">Tus proyectos de análisis SOM</p>
          </div>
          <Button asChild>
            <Link to="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo proyecto
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <p className="text-sm text-muted-foreground">Cargando proyectos...</p>
          </div>
        ) : projects.length === 0 ? (
          <EmptyProjects />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onDelete={setProjectToDelete} />
            ))}
          </div>
        )}
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
