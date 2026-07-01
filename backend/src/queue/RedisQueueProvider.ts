import Redis from 'ioredis'
import type { IQueueProvider, QueueMessage } from './IQueueProvider'

interface RedisQueueOptions {
  host: string
  port: number
}

export class RedisQueueProvider implements IQueueProvider {
  private readonly client: Redis

  constructor(options: RedisQueueOptions) {
    this.client = new Redis({ host: options.host, port: options.port, lazyConnect: true })
  }

  async publish(queue: string, message: QueueMessage): Promise<void> {
    const payload = JSON.stringify(message)
    await this.client.lpush(queue, payload)
  }

  // Worker will implement BRPOP consumption in a future phase
  async consume(_queue: string, _handler: (message: QueueMessage) => Promise<void>): Promise<void> {
    throw new Error('consume() not yet implemented in RedisQueueProvider')
  }

  async close(): Promise<void> {
    await this.client.quit()
  }
}
