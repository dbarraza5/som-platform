import type { IQueueProvider, QueueMessage } from './IQueueProvider'

// Placeholder — will use @aws-sdk/client-sqs in a future phase.
// Set QUEUE_DRIVER=sqs and configure AWS_REGION + SQS_QUEUE_URL to activate.
export class SQSQueueProvider implements IQueueProvider {
  async publish(_queue: string, _message: QueueMessage): Promise<void> {
    throw new Error('SQSQueueProvider is not yet implemented. Set QUEUE_DRIVER=redis for local development.')
  }

  async consume(_queue: string, _handler: (message: QueueMessage) => Promise<void>): Promise<void> {
    throw new Error('SQSQueueProvider is not yet implemented.')
  }

  async close(): Promise<void> {
    // nothing to close
  }
}
