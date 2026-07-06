import { Request, Response } from 'express'
import { trainingJobService } from './training-job.service'
import { trainingFilesService } from './training-job.files.service'
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
    if (err.message === 'TRAINING_JOB_NOT_FOUND') {
      error(res, 'Training job not found', 404)
      return true
    }
    if (err.message === 'INVALID_STATUS') {
      error(res, 'Invalid status query parameter', 400)
      return true
    }
    if (err.message === 'FILE_NOT_FOUND') {
      error(res, 'Training output files have not been generated yet', 404)
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

  async getLatest(req: Request, res: Response) {
    try {
      const trainingJob = await trainingJobService.getLatestForDataset(
        req.params.projectId,
        req.params.datasetId,
        req.user!.id,
      )
      success(res, { trainingJob })
    } catch (err) {
      if (!handleTrainingJobError(err, res)) throw err
    }
  },

  async list(req: Request, res: Response) {
    try {
      const trainingJobs = await trainingJobService.list(req.params.projectId, req.params.datasetId, req.user!.id)
      success(res, { trainingJobs })
    } catch (err) {
      if (!handleTrainingJobError(err, res)) throw err
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const trainingJob = await trainingJobService.getByIdForDataset(
        req.params.projectId,
        req.params.datasetId,
        req.params.id,
        req.user!.id,
      )
      success(res, { trainingJob })
    } catch (err) {
      if (!handleTrainingJobError(err, res)) throw err
    }
  },

  async getByIdInternal(req: Request, res: Response) {
    try {
      const trainingJob = await trainingJobService.getByIdInternal(req.params.id)
      success(res, { trainingJob })
    } catch (err) {
      if (!handleTrainingJobError(err, res)) throw err
    }
  },

  async reportStatus(req: Request, res: Response) {
    try {
      const trainingJob = await trainingJobService.reportStatus(req.params.id, req.body)
      success(res, { trainingJob })
    } catch (err) {
      if (!handleTrainingJobError(err, res)) throw err
    }
  },

  async listInternal(req: Request, res: Response) {
    try {
      const trainingJobs = await trainingJobService.listByStatusInternal(req.query.status as string)
      success(res, { trainingJobs })
    } catch (err) {
      if (!handleTrainingJobError(err, res)) throw err
    }
  },

  async getDimensions(req: Request, res: Response) {
    try {
      const dimensions = await trainingFilesService.getDimensions(
        req.params.projectId,
        req.params.datasetId,
        req.params.id,
        req.user!.id,
      )
      success(res, { dimensions })
    } catch (err) {
      if (!handleTrainingJobError(err, res)) throw err
    }
  },

  async getWeights(req: Request, res: Response) {
    try {
      const weights = await trainingFilesService.getWeights(
        req.params.projectId,
        req.params.datasetId,
        req.params.id,
        req.user!.id,
      )
      success(res, { weights })
    } catch (err) {
      if (!handleTrainingJobError(err, res)) throw err
    }
  },

  async getActivation(req: Request, res: Response) {
    try {
      const activation = await trainingFilesService.getActivation(
        req.params.projectId,
        req.params.datasetId,
        req.params.id,
        req.user!.id,
      )
      success(res, { activation })
    } catch (err) {
      if (!handleTrainingJobError(err, res)) throw err
    }
  },
}
