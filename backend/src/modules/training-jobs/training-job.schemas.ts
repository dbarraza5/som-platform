import { z } from 'zod'

export const createTrainingJobSchema = z.object({
  name: z.string().min(3, 'name must be at least 3 characters'),
  description: z.string().optional(),
  gridWidth: z.number().int().positive(),
  gridHeight: z.number().int().positive(),
  alpha: z.number().nonnegative(),
  beta: z.number().nonnegative(),
  neighborhoodRadius: z.number().nonnegative(),
  objectiveDimensionWeight: z.number().nonnegative(),
  iterationLimit: z.number().int().nonnegative().optional(),
  useLogarithmicForget: z.boolean().optional(),
  threadCount: z.number().int().positive().optional(),
})

export const reportTrainingJobStatusSchema = z.object({
  status: z.enum(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  errorMessage: z.string().nullable().optional(),
})
