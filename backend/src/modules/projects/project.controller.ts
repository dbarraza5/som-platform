import { Request, Response } from 'express'
import { projectService } from './project.service'

export const projectController = {
  async getAll(_req: Request, res: Response) {
    const projects = await projectService.getAll()
    res.json({ data: projects })
  },

  async create(req: Request, res: Response) {
    const { nombre, descripcion, estado } = req.body

    if (!nombre) {
      res.status(400).json({ error: 'nombre is required' })
      return
    }

    const project = await projectService.create({ nombre, descripcion, estado })
    res.status(201).json({ data: project })
  },
}