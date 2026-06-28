import prisma from '../../database/prisma'

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, nombre: true, email: true, createdAt: true, updatedAt: true },
    })
  },

  create(data: { nombre: string; email: string; password: string }) {
    return prisma.user.create({ data })
  },
}