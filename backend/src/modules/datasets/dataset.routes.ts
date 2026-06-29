import { Router } from 'express'
import { datasetController } from './dataset.controller'
import { asyncHandler } from '../../utils/asyncHandler'
import { authenticate } from '../../middlewares/authenticate'
import { validate } from '../../middlewares/validate'
import { createDatasetSchema, updateDatasetSchema } from './dataset.schemas'

// Mounted at /api/projects/:projectId/datasets
// mergeParams allows access to :projectId from the parent router
export const projectDatasetRouter = Router({ mergeParams: true })
projectDatasetRouter.use(authenticate)
projectDatasetRouter.get('/', asyncHandler(datasetController.getAll))
projectDatasetRouter.post('/', validate(createDatasetSchema), asyncHandler(datasetController.create))

// Mounted at /api/datasets
export const datasetRouter = Router()
datasetRouter.use(authenticate)
datasetRouter.get('/:id', asyncHandler(datasetController.getById))
datasetRouter.put('/:id', validate(updateDatasetSchema), asyncHandler(datasetController.update))
datasetRouter.delete('/:id', asyncHandler(datasetController.remove))
datasetRouter.post('/:id/upload', asyncHandler(datasetController.upload))
