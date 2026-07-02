import { Router } from 'express'
import authRoutes from '../modules/auth/auth.routes'
import projectRoutes from '../modules/projects/project.routes'
import { projectDatasetRouter, datasetRouter, internalDatasetRouter } from '../modules/datasets/dataset.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/projects', projectRoutes)
router.use('/projects/:projectId/datasets', projectDatasetRouter)
router.use('/datasets', datasetRouter)
router.use('/internal/datasets', internalDatasetRouter)

export default router
