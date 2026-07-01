import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { getQueueService } from '../queue'
import { success } from '../utils/response'
import type { QueueMessage } from '../queue'

// Temporary endpoints for development and integration testing.
// These routes are only mounted when NODE_ENV !== 'production'.
// Remove this file (and its mount in index.ts) before deploying to production.
const router = Router()

router.post(
  '/queue-test',
  asyncHandler(async (req, res) => {
    const datasetId: string = req.body?.datasetId ?? 'test-dataset-id'
    const projectId: string = req.body?.projectId ?? 'test-project-id'
    const storageKey: string =
      req.body?.storageKey ?? `projects/${projectId}/datasets/${datasetId}/original.csv`

    const message: QueueMessage = {
      operation: 'NORMALIZE',
      datasetId,
      projectId,
      storageKey,
      timestamp: new Date().toISOString(),
    }

    await getQueueService().publish(message)
    success(res, { published: true, queue: process.env.QUEUE_NAME ?? 'som_jobs', message })
  }),
)

export default router
