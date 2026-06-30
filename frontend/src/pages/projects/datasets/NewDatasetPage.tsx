import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { datasetsApi } from '@/api/datasets'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AppLayout from '@/components/layout/AppLayout'
import DatasetForm from '@/components/datasets/DatasetForm'
import type { DatasetFormValues } from '@/components/datasets/DatasetForm'

export default function NewDatasetPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (values: DatasetFormValues) =>
      datasetsApi.create(projectId!, { name: values.name, description: values.description }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['datasets', projectId] })
      navigate(`/projects/${projectId}/datasets/${res.data.data.dataset.id}`)
    },
  })

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link to={`/projects/${projectId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al proyecto
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Nuevo dataset</CardTitle>
          </CardHeader>
          <CardContent>
            <DatasetForm
              onSubmit={(values) => mutation.mutateAsync(values)}
              isSubmitting={mutation.isPending}
              submitLabel="Crear dataset"
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
