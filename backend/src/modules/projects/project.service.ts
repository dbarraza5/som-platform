import { projectRepository } from './project.repository'

type CreateProjectData = {
  name: string
  description?: string | null
  userId: string
}

export const projectService = {
  getAll(userId: string) {
    return projectRepository.findAllByUserId(userId)
  },

  create(data: CreateProjectData) {
    return projectRepository.create(data)
  },
}