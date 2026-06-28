import { Request, Response } from 'express'
import { projectService } from './project.service'

export const projectController = {
  async getAll(_req: Request, res: Response) {
    const projects = await projectService.getAll()
    res.json({ data: projects })
  },

  async create(req: Request, res: Response) {
    const { name, description } = req.body

    if (!name) {
      res.status(400).json({ error: 'name is required' })
      return
    }

    const project = await projectService.create({ name, description })
    res.status(201).json({ data: project })
  },
}