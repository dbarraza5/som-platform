import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { projectsApi } from '@/api/projects'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AppLayout from '@/components/layout/AppLayout'
import ProjectForm from '@/components/projects/ProjectForm'
import type { ProjectFormValues } from '@/components/projects/ProjectForm'

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getById(id!).then((r) => r.data.data.project),
    enabled: !!id,
  })

  const mutation = useMutation({
    mutationFn: (values: ProjectFormValues) => projectsApi.update(id!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      navigate(`/projects/${id}`)
    },
  })

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link to={`/projects/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al proyecto
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Editar proyecto</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : (
              <ProjectForm
                defaultValues={{
                  name: project?.name ?? '',
                  description: project?.description ?? '',
                }}
                onSubmit={async (values) => { await mutation.mutateAsync(values) }}
                isSubmitting={mutation.isPending}
                submitLabel="Guardar cambios"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
