import { projectRepository } from './project.repository'
import { Prisma } from '@prisma/client'

export const projectService = {
  getAll() {
    return projectRepository.findAll()
  },

  create(data: Prisma.ProjectCreateInput) {
    return projectRepository.create(data)
  },
}