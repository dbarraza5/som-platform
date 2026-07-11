import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { projectsApi } from '@/api/projects'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AppLayout from '@/components/layout/AppLayout'
import ProjectForm from '@/components/projects/ProjectForm'
import type { ProjectFormValues } from '@/components/projects/ProjectForm'

export default function NewProjectPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (values: ProjectFormValues) => projectsApi.create(values),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate(`/projects/${res.data.data.project.id}`)
    },
  })

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al dashboard
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Nuevo proyecto</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectForm
              onSubmit={async (values) => { await mutation.mutateAsync(values) }}
              isSubmitting={mutation.isPending}
              submitLabel="Crear proyecto"
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
