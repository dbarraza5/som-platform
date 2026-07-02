import { Request, Response } from 'express'
import { trainingJobService } from './training-job.service'
import { success, error } from '../../utils/response'

function handleTrainingJobError(err: unknown, res: Response): boolean {
  if (err instanceof Error) {
    if (err.message === 'DATASET_NOT_FOUND') {
      error(res, 'Dataset not found', 404)
      return true
    }
    if (err.message === 'FORBIDDEN') {
      error(res, 'Access denied', 403)
      return true
    }
    if (err.message === 'NORMALIZATION_NOT_COMPLETED') {
      error(res, 'Dataset normalization has not finished yet', 409)
      return true
    }
    if (err.message === 'NORMALIZATION_FAILED') {
      error(res, 'Dataset normalization failed; cannot start training', 422)
      return true
    }
  }
  return false
}

export const trainingJobController = {
  async create(req: Request, res: Response) {
    try {
      const trainingJob = await trainingJobService.create(
        req.params.projectId,
        req.params.datasetId,
        req.user!.id,
        req.body,
      )
      success(res, { trainingJob }, 201)
    } catch (err) {
      if (!handleTrainingJobError(err, res)) throw err
    }
  },
}
