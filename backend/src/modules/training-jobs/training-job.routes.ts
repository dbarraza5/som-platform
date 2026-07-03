import { Router } from 'express'
import { trainingJobController } from './training-job.controller'
import { asyncHandler } from '../../utils/asyncHandler'
import { authenticate } from '../../middlewares/authenticate'
import { internalAuth } from '../../middlewares/internalAuth'
import { validate } from '../../middlewares/validate'
import { createTrainingJobSchema, reportTrainingJobStatusSchema } from './training-job.schemas'

// Mounted at /api/projects/:projectId/datasets/:datasetId/training-jobs
// mergeParams allows access to :projectId and :datasetId from the parent path
export const trainingJobRouter = Router({ mergeParams: true })
trainingJobRouter.use(authenticate)
trainingJobRouter.post('/', validate(createTrainingJobSchema), asyncHandler(trainingJobController.create))

// Mounted at /api/internal/training-jobs — Worker-to-backend only, authenticated
// via a shared API key (internalAuth), never a user JWT.
export const internalTrainingJobRouter = Router()
internalTrainingJobRouter.use(internalAuth)
internalTrainingJobRouter.get('/', asyncHandler(trainingJobController.listInternal))
internalTrainingJobRouter.get('/:id', asyncHandler(trainingJobController.getByIdInternal))
internalTrainingJobRouter.patch(
  '/:id/status',
  validate(reportTrainingJobStatusSchema),
  asyncHandler(trainingJobController.reportStatus),
)
