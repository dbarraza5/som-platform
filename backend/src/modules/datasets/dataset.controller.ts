import { Request, Response } from 'express'
import { datasetService } from './dataset.service'
import { success, error } from '../../utils/response'

function handleDatasetError(err: unknown, res: Response): boolean {
  if (err instanceof Error) {
    if (err.message === 'PROJECT_NOT_FOUND') {
      error(res, 'Project not found', 404)
      return true
    }
    if (err.message === 'DATASET_NOT_FOUND') {
      error(res, 'Dataset not found', 404)
      return true
    }
    if (err.message === 'FORBIDDEN') {
      error(res, 'Access denied', 403)
      return true
    }
  }
  return false
}

export const datasetController = {
  async getAll(req: Request, res: Response) {
    try {
      const datasets = await datasetService.getAll(req.params.projectId, req.user!.id)
      success(res, { datasets })
    } catch (err) {
      if (!handleDatasetError(err, res)) throw err
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const dataset = await datasetService.getById(req.params.id, req.user!.id)
      success(res, { dataset })
    } catch (err) {
      if (!handleDatasetError(err, res)) throw err
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { name, description } = req.body
      const dataset = await datasetService.create(req.params.projectId, req.user!.id, {
        name,
        description,
      })
      success(res, { dataset }, 201)
    } catch (err) {
      if (!handleDatasetError(err, res)) throw err
    }
  },

  async update(req: Request, res: Response) {
    try {
      const dataset = await datasetService.update(req.params.id, req.user!.id, req.body)
      success(res, { dataset })
    } catch (err) {
      if (!handleDatasetError(err, res)) throw err
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await datasetService.delete(req.params.id, req.user!.id)
      success(res, null, 200, 'Dataset deleted successfully')
    } catch (err) {
      if (!handleDatasetError(err, res)) throw err
    }
  },
}
