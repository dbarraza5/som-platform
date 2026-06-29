import { z } from 'zod'

export const createProjectSchema = z.object({
  name: z.string().min(3, 'name must be at least 3 characters'),
  description: z.string().optional(),
})

export const updateProjectSchema = z.object({
  name: z.string().min(3, 'name must be at least 3 characters').optional(),
  description: z.string().optional(),
})
