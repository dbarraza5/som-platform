import { Response } from 'express'

export function success(res: Response, data: unknown, status = 200, message?: string) {
  const body: Record<string, unknown> = { success: true, data }
  if (message) body.message = message
  res.status(status).json(body)
}

export function error(
  res: Response,
  message: string,
  status = 400,
  errors?: { field: string; message: string }[],
) {
  const body: Record<string, unknown> = { success: false, message }
  if (errors) body.errors = errors
  res.status(status).json(body)
}