import prisma from '../../database/prisma'

type CreateProjectData = {
  name: string
  description?: string | null
  userId: string
}

type UpdateProjectData = {
  name?: string
  description?: string | null
}

export const projectRepository = {
  findAllByUserId(userId: string) {
    return prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  },

  findById(id: string) {
    return prisma.project.findUnique({ where: { id } })
  },

  create(data: CreateProjectData) {
    return prisma.project.create({ data })
  },

  update(id: string, data: UpdateProjectData) {
    return prisma.project.update({ where: { id }, data })
  },

  delete(id: string) {
    return prisma.project.delete({ where: { id } })
  },
}
