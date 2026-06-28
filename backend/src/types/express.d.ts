declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        nombre: string
        email: string
        createdAt: Date
        updatedAt: Date
      }
    }
  }
}

export {}