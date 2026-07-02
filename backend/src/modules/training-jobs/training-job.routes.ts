import { Router } from 'express'
import { trainingJobController } from './training-job.controller'
import { asyncHandler } from '../../utils/asyncHandler'
import { authenticate } from '../../middlewares/authenticate'
import { validate } from '../../middlewares/validate'
import { createTrainingJobSchema } from './training-job.schemas'

// Mounted at /api/projects/:projectId/datasets/:datasetId/training-jobs
// mergeParams allows access to :projectId and :datasetId from the parent path
export const trainingJobRouter = Router({ mergeParams: true })
trainingJobRouter.use(authenticate)
trainingJobRouter.post('/', validate(createTrainingJobSchema), asyncHandler(trainingJobController.create))
