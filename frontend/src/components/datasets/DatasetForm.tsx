import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const datasetSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().optional(),
})

export type DatasetFormValues = z.infer<typeof datasetSchema>

interface DatasetFormProps {
  defaultValues?: DatasetFormValues
  onSubmit: (values: DatasetFormValues) => Promise<void>
  isSubmitting?: boolean
  submitLabel?: string
}

export default function DatasetForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = 'Guardar',
}: DatasetFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DatasetFormValues>({
    resolver: zodResolver(datasetSchema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre *</Label>
        <Input id="name" placeholder="Nombre del dataset" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          placeholder="Descripción opcional..."
          rows={3}
          {...register('description')}
        />
      </div>
      <div className="pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
