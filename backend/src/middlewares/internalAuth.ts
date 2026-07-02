import { Request, Response, NextFunction } from 'express'
import { env } from '../config/env'
import { error } from '../utils/response'

// Authenticates service-to-service calls (e.g. the Worker reporting job results)
// using a shared secret header instead of a user JWT.
export function internalAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-internal-api-key']

  if (apiKey !== env.INTERNAL_API_KEY) {
    error(res, 'Unauthorized', 401)
    return
  }

  next()
}
