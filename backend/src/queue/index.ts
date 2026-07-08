import { env } from '../config/env'
import type { IQueueProvider } from './IQueueProvider'
import { RedisQueueProvider } from './RedisQueueProvider'
import { SQSQueueProvider } from './SQSQueueProvider'
import { QueueService } from './QueueService'

export type { QueueMessage, IQueueProvider } from './IQueueProvider'
export { QueueService }

let service: QueueService | null = null

export function getQueueService(): QueueService {
  if (!service) {
    let provider: IQueueProvider

    if (env.QUEUE_DRIVER === 'redis') {
      provider = new RedisQueueProvider({ host: env.REDIS_HOST, port: env.REDIS_PORT })
    } else if (env.QUEUE_DRIVER === 'sqs') {
      if (!env.SQS_QUEUE_URL) throw new Error('SQS_QUEUE_URL is required when QUEUE_DRIVER=sqs')
      if (!env.AWS_REGION) throw new Error('AWS_REGION is required when QUEUE_DRIVER=sqs')
      provider = new SQSQueueProvider(
        env.AWS_REGION,
        env.SQS_QUEUE_URL,
        env.AWS_ACCESS_KEY_ID,
        env.AWS_SECRET_ACCESS_KEY,
      )
    } else {
      throw new Error(`Unknown QUEUE_DRIVER: ${env.QUEUE_DRIVER}`)
    }

    service = new QueueService(provider, env.QUEUE_NAME)
  }

  return service
}
