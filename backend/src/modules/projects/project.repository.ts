import prisma from '../../database/prisma'
import { Prisma } from '@prisma/client'

export const projectRepository = {
  findAll() {
    return prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
  },

  create(data: Prisma.ProjectCreateInput) {
    return prisma.project.create({ data })
  },
}