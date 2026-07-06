import { useQuery } from '@tanstack/react-query'
import { trainingFilesApi } from '@/api/trainingFiles'

export function useTrainingWeights(
  projectId: string,
  datasetId: string,
  trainingId: string,
): { data: number[][] | undefined; isLoading: boolean; isNotFound: boolean; isError: boolean } {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['trainingWeights', trainingId],
    queryFn: () =>
      trainingFilesApi
        .getWeights(projectId, datasetId, trainingId)
        .then((r) => r.data.data.weights),
    enabled: !!projectId && !!datasetId && !!trainingId,
    retry: false,
  })

  const isNotFound =
    isError && error instanceof Error && (error as unknown as { response?: { status: number } }).response?.status === 404

  return { data, isLoading, isNotFound, isError }
}
