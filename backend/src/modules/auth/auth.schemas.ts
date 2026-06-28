import { z } from 'zod'

export const registerSchema = z.object({
  nombre: z.string().min(1, 'nombre is required'),
  email: z.string().email('invalid email format'),
  password: z.string().min(8, 'password must be at least 8 characters'),
})

export const loginSchema = z.object({
  email: z.string().email('invalid email format'),
  password: z.string().min(1, 'password is required'),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
})