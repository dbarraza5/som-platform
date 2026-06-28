import { Request, Response } from 'express'
import { projectService } from './project.service'
import { success, error } from '../../utils/response'

export const projectController = {
  async getAll(req: Request, res: Response) {
    const projects = await projectService.getAll(req.user!.id)
    success(res, { projects })
  },

  async create(req: Request, res: Response) {
    const { name, description } = req.body

    if (!name) {
      error(res, 'name is required', 400)
      return
    }

    const project = await projectService.create({
      name,
      description,
      userId: req.user!.id,
    })
    success(res, { project }, 201)
  },
}