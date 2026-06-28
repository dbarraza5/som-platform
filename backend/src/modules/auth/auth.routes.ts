import { Router } from 'express'
import { authController } from './auth.controller'
import { asyncHandler } from '../../utils/asyncHandler'
import { authenticate } from '../../middlewares/authenticate'
import { validate } from '../../middlewares/validate'
import { registerSchema, loginSchema, refreshSchema } from './auth.schemas'

const router = Router()

router.post('/register', validate(registerSchema), asyncHandler(authController.register))
router.post('/login', validate(loginSchema), asyncHandler(authController.login))
router.post('/refresh', validate(refreshSchema), asyncHandler(authController.refresh))
router.post('/logout', asyncHandler(authController.logout))
router.get('/me', authenticate, asyncHandler(authController.me))

export default router