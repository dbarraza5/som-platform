import { z } from 'zod'

export const createDatasetSchema = z.object({
  name: z.string().min(3, 'name must be at least 3 characters'),
  description: z.string().optional(),
})

export const updateDatasetSchema = z.object({
  name: z.string().min(3, 'name must be at least 3 characters').optional(),
  description: z.string().optional(),
})

export const reportNormalizationSchema = z.object({
  status: z.enum(['COMPLETED', 'FAILED']),
  error: z.string().nullable().optional(),
})
