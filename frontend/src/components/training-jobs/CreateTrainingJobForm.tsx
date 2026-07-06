import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { DATASET_STATUS_META, getDatasetPipelineStatus } from '@/lib/datasetStatus'
import {
  DEFAULT_ALPHA,
  DEFAULT_OMEGA,
  DEFAULT_TOPOLOGY,
  SOM_TOPOLOGY_OPTIONS,
  getTopologyOption,
} from '@/lib/somDefaults'
import type { Dataset } from '@/types/dataset'

const createTrainingJobFormSchema = z.object({
  topology: z.enum(['20', '30', '40', '50', '60', '80']),
  alpha: z.coerce.number().positive('Alpha debe ser mayor que 0'),
  omega: z.coerce.number().positive('Omega debe ser mayor que 0'),
  neighborhoodRadius: z.coerce.number().int().positive('El rango de vecindad debe ser mayor que 0'),
})

export type CreateTrainingJobFormValues = z.infer<typeof createTrainingJobFormSchema>

interface CreateTrainingJobFormProps {
  dataset: Dataset
  onSubmit: (values: CreateTrainingJobFormValues) => void
  onCancel: () => void
  isSubmitting?: boolean
  submitError?: string | null
}

const DEFAULT_TOPOLOGY_OPTION = getTopologyOption(DEFAULT_TOPOLOGY)

export default function CreateTrainingJobForm({
  dataset,
  onSubmit,
  onCancel,
  isSubmitting,
  submitError,
}: CreateTrainingJobFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateTrainingJobFormValues>({
    resolver: zodResolver(createTrainingJobFormSchema),
    defaultValues: {
      topology: DEFAULT_TOPOLOGY,
      alpha: DEFAULT_ALPHA,
      omega: DEFAULT_OMEGA,
      neighborhoodRadius: DEFAULT_TOPOLOGY_OPTION.defaultNeighborhoodRadius,
    },
  })

  const topologyValue = watch('topology')
  const topology = getTopologyOption(topologyValue)
  const alpha = Number(watch('alpha'))
  const omega = Number(watch('omega'))
  const neighborhoodRadius = Number(watch('neighborhoodRadius'))
  const neuronCount = topology.width * topology.height

  // When topology changes, clamp neighborhoodRadius to the new max.
  useEffect(() => {
    const current = Number(getValues('neighborhoodRadius'))
    if (current > topology.maxNeighborhoodRadius) {
      setValue('neighborhoodRadius', topology.defaultNeighborhoodRadius)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topologyValue])

  const datasetStatus = getDatasetPipelineStatus(dataset)
  const statusMeta = DATASET_STATUS_META[datasetStatus]
  const canTrain = datasetStatus === 'COMPLETED'

  const radiusOptions = Array.from(
    { length: topology.maxNeighborhoodRadius },
    (_, i) => i + 1,
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-3 gap-3 rounded-md bg-muted/40 px-4 py-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Dataset</p>
          <p className="truncate font-medium">{dataset.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Entradas</p>
          <p className="font-medium">{dataset.columns ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Estado</p>
          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusMeta.badgeClassName)}>
            {statusMeta.label}
          </span>
        </div>
      </div>

      {!canTrain && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Este Dataset todavía no está listo para entrenar: {statusMeta.description}
        </p>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Configuración del SOM</h3>

        <div className="space-y-1.5">
          <Label htmlFor="topology">Topología</Label>
          <Select id="topology" disabled={!canTrain} {...register('topology')}>
            {SOM_TOPOLOGY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">{neuronCount} neuronas</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="alpha">Alpha</Label>
            <Input id="alpha" type="number" step="0.01" min="0" disabled={!canTrain} {...register('alpha')} />
            {errors.alpha && <p className="text-xs text-destructive">{errors.alpha.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="omega">Omega</Label>
            <Input id="omega" type="number" step="0.001" min="0" disabled={!canTrain} {...register('omega')} />
            {errors.omega && <p className="text-xs text-destructive">{errors.omega.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="neighborhoodRadius">Rango de vecindad</Label>
            <Select id="neighborhoodRadius" disabled={!canTrain} {...register('neighborhoodRadius')}>
              {radiusOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
            {errors.neighborhoodRadius && (
              <p className="text-xs text-destructive">{errors.neighborhoodRadius.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-md border border-dashed p-4">
        <h3 className="text-sm font-semibold">Resumen</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Dataset</dt>
            <dd className="truncate font-medium">{dataset.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Topología</dt>
            <dd className="font-medium">{topology.label}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Neuronas</dt>
            <dd className="font-medium">{neuronCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Entradas</dt>
            <dd className="font-medium">{dataset.columns ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Alpha</dt>
            <dd className="font-medium">{Number.isFinite(alpha) ? alpha : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Omega</dt>
            <dd className="font-medium">{Number.isFinite(omega) ? omega : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Rango vecindad</dt>
            <dd className="font-medium">{Number.isFinite(neighborhoodRadius) ? neighborhoodRadius : '—'}</dd>
          </div>
        </dl>
      </div>

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!canTrain || isSubmitting}>
          {isSubmitting ? 'Creando...' : 'Crear entrenamiento'}
        </Button>
      </div>
    </form>
  )
}
