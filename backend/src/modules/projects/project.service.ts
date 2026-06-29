import { projectRepository } from './project.repository'

type CreateProjectData = {
  name: string
  description?: string | null
  userId: string
}

type UpdateProjectData = {
  name?: string
  description?: string | null
}

export const projectService = {
  getAll(userId: string) {
    return projectRepository.findAllByUserId(userId)
  },

  async getById(id: string, userId: string) {
    const project = await projectRepository.findById(id)
    if (!project) throw new Error('PROJECT_NOT_FOUND')
    if (project.userId !== userId) throw new Error('FORBIDDEN')
    return project
  },

  create(data: CreateProjectData) {
    return projectRepository.create(data)
  },

  async update(id: string, userId: string, data: UpdateProjectData) {
    const project = await projectRepository.findById(id)
    if (!project) throw new Error('PROJECT_NOT_FOUND')
    if (project.userId !== userId) throw new Error('FORBIDDEN')
    return projectRepository.update(id, data)
  },

  async delete(id: string, userId: string) {
    const project = await projectRepository.findById(id)
    if (!project) throw new Error('PROJECT_NOT_FOUND')
    if (project.userId !== userId) throw new Error('FORBIDDEN')
    await projectRepository.delete(id)
  },
}
