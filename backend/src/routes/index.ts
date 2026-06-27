import { Router } from 'express'
import projectRoutes from '../modules/projects/project.routes'

const router = Router()

router.use('/projects', projectRoutes)

export default router