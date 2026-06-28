import prisma from '../../database/prisma'

type CreateProjectData = {
  name: string
  description?: string | null
  userId: string
}

export const projectRepository = {
  findAllByUserId(userId: string) {
    return prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  },

  create(data: CreateProjectData) {
    return prisma.project.create({ data })
  },
}