import { Request, Response } from 'express'
import { authService } from './auth.service'
import { success, error } from '../../utils/response'

export const authController = {
  async register(req: Request, res: Response) {
    const { nombre, email, password } = req.body

    try {
      const user = await authService.register(nombre, email, password)
      success(res, { user }, 201, 'User registered successfully')
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'EMAIL_TAKEN') {
        error(res, 'Email already registered', 409)
        return
      }
      throw err
    }
  },

  async login(req: Request, res: Response) {
    const { email, password } = req.body

    try {
      const result = await authService.login(email, password)
      success(res, result)
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
        error(res, 'Invalid email or password', 401)
        return
      }
      throw err
    }
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body

    try {
      const tokens = await authService.refresh(refreshToken)
      success(res, tokens)
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'INVALID_TOKEN') {
        error(res, 'Invalid or expired refresh token', 401)
        return
      }
      throw err
    }
  },

  async logout(req: Request, res: Response) {
    const { refreshToken } = req.body
    if (refreshToken) {
      await authService.logout(refreshToken)
    }
    success(res, null, 200, 'Logged out successfully')
  },

  async me(req: Request, res: Response) {
    success(res, { user: req.user })
  },
}