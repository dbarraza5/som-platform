import { useQuery } from '@tanstack/react-query'
import { trainingFilesApi } from '@/api/trainingFiles'
import type { TrainingDimension } from '@/types/trainingFiles'

export function useTrainingDimensions(
  projectId: string,
  datasetId: string,
  trainingId: string,
): { data: TrainingDimension[] | undefined; isLoading: boolean; isNotFound: boolean; isError: boolean } {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['trainingDimensions', trainingId],
    queryFn: () =>
      trainingFilesApi
        .getDimensions(projectId, datasetId, trainingId)
        .then((r) => r.data.data.dimensions),
    enabled: !!projectId && !!datasetId && !!trainingId,
    retry: false,
  })

  const isNotFound =
    isError && error instanceof Error && (error as unknown as { response?: { status: number } }).response?.status === 404

  return { data, isLoading, isNotFound, isError }
}
