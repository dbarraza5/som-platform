import { Router } from 'express'
import { projectController } from './project.controller'
import { asyncHandler } from '../../utils/asyncHandler'
import { authenticate } from '../../middlewares/authenticate'
import { validate } from '../../middlewares/validate'
import { createProjectSchema, updateProjectSchema } from './project.schemas'

const router = Router()

router.use(authenticate)

router.get('/', asyncHandler(projectController.getAll))
router.get('/:id', asyncHandler(projectController.getById))
router.post('/', validate(createProjectSchema), asyncHandler(projectController.create))
router.put('/:id', validate(updateProjectSchema), asyncHandler(projectController.update))
router.delete('/:id', asyncHandler(projectController.remove))

export default router
