import { Request, Response } from 'express'
import { projectService } from './project.service'
import { success, error } from '../../utils/response'

function handleProjectError(err: unknown, res: Response): boolean {
  if (err instanceof Error) {
    if (err.message === 'PROJECT_NOT_FOUND') {
      error(res, 'Project not found', 404)
      return true
    }
    if (err.message === 'FORBIDDEN') {
      error(res, 'Access denied', 403)
      return true
    }
  }
  return false
}

export const projectController = {
  async getAll(req: Request, res: Response) {
    const projects = await projectService.getAll(req.user!.id)
    success(res, { projects })
  },

  async getById(req: Request, res: Response) {
    try {
      const project = await projectService.getById(req.params.id, req.user!.id)
      success(res, { project })
    } catch (err) {
      if (!handleProjectError(err, res)) throw err
    }
  },

  async create(req: Request, res: Response) {
    const { name, description } = req.body
    const project = await projectService.create({ name, description, userId: req.user!.id })
    success(res, { project }, 201)
  },

  async update(req: Request, res: Response) {
    try {
      const project = await projectService.update(req.params.id, req.user!.id, req.body)
      success(res, { project })
    } catch (err) {
      if (!handleProjectError(err, res)) throw err
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await projectService.delete(req.params.id, req.user!.id)
      success(res, null, 200, 'Project deleted successfully')
    } catch (err) {
      if (!handleProjectError(err, res)) throw err
    }
  },
}
