import { Request, Response } from 'express'
import multer from 'multer'
import { datasetService } from './dataset.service'
import { success, error } from '../../utils/response'
import { runUpload } from '../../middlewares/upload'

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

  async upload(req: Request, res: Response) {
    try {
      await runUpload(req, res)

      if (!req.file) {
        error(res, 'No file provided', 400)
        return
      }

      const dataset = await datasetService.uploadFile(req.params.id, req.user!.id, req.file)
      success(res, { dataset })
    } catch (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        error(res, 'File exceeds the maximum allowed size', 400)
        return
      }
      if (err instanceof Error && err.message === 'INVALID_FILE_TYPE') {
        error(res, 'Only CSV files are allowed', 400)
        return
      }
      if (!handleDatasetError(err, res)) throw err
    }
  },

  async reportNormalization(req: Request, res: Response) {
    try {
      const dataset = await datasetService.reportNormalizationResult(req.params.id, req.body)
      success(res, { dataset })
    } catch (err) {
      if (!handleDatasetError(err, res)) throw err
    }
  },
}
