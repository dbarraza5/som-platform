import { Router } from 'express'
import { projectController } from './project.controller'
import { asyncHandler } from '../../utils/asyncHandler'

const router = Router()

router.get('/', asyncHandler(projectController.getAll))
router.post('/', asyncHandler(projectController.create))

export default router