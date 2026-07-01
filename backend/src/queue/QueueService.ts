import type { IQueueProvider, QueueMessage } from './IQueueProvider'

export class QueueService {
  constructor(
    private readonly provider: IQueueProvider,
    private readonly defaultQueue: string,
  ) {}

  publish(message: QueueMessage, queue?: string): Promise<void> {
    return this.provider.publish(queue ?? this.defaultQueue, message)
  }

  close(): Promise<void> {
    return this.provider.close()
  }
}
