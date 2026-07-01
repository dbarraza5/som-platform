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
      provider = new SQSQueueProvider()
    } else {
      throw new Error(`Unknown QUEUE_DRIVER: ${env.QUEUE_DRIVER}`)
    }

    service = new QueueService(provider, env.QUEUE_NAME)
  }

  return service
}
