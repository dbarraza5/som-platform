import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt'
import { userRepository } from '../modules/users/user.repository'
import { error } from '../utils/response'

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    error(res, 'Unauthorized', 401)
    return
  }

  const token = authHeader.slice(7)

  try {
    const payload = verifyAccessToken(token)
    const user = await userRepository.findById(payload.sub)

    if (!user) {
      error(res, 'Unauthorized', 401)
      return
    }

    req.user = user
    next()
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      error(res, 'Token expired', 401)
      return
    }
    error(res, 'Unauthorized', 401)
  }
}