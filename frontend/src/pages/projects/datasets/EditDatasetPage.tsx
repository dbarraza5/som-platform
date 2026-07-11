import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { datasetsApi } from '@/api/datasets'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AppLayout from '@/components/layout/AppLayout'
import DatasetForm from '@/components/datasets/DatasetForm'
import type { DatasetFormValues } from '@/components/datasets/DatasetForm'

export default function EditDatasetPage() {
  const { id: projectId, datasetId } = useParams<{ id: string; datasetId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: dataset, isLoading } = useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: () => datasetsApi.getById(datasetId!).then((r) => r.data.data.dataset),
    enabled: !!datasetId,
  })

  const mutation = useMutation({
    mutationFn: (values: DatasetFormValues) =>
      datasetsApi.update(datasetId!, { name: values.name, description: values.description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets', projectId] })
      queryClient.invalidateQueries({ queryKey: ['dataset', datasetId] })
      navigate(`/projects/${projectId}/datasets/${datasetId}`)
    },
  })

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link to={`/projects/${projectId}/datasets/${datasetId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al dataset
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Editar dataset</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : (
              <DatasetForm
                defaultValues={{
                  name: dataset?.name ?? '',
                  description: dataset?.description ?? '',
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
