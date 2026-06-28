import { Router } from 'express'
import { projectController } from './project.controller'
import { asyncHandler } from '../../utils/asyncHandler'
import { authenticate } from '../../middlewares/authenticate'

const router = Router()

router.use(authenticate)

router.get('/', asyncHandler(projectController.getAll))
router.post('/', asyncHandler(projectController.create))

export default router