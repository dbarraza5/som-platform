import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs'
import type { IQueueProvider, QueueMessage } from './IQueueProvider'

export class SQSQueueProvider implements IQueueProvider {
  private client: SQSClient
  private queueUrl: string

  constructor(region: string, queueUrl: string, accessKeyId?: string, secretAccessKey?: string) {
    this.queueUrl = queueUrl
    this.client = new SQSClient({
      region,
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    })
  }

  // The backend only publishes — consume() is reserved for the Worker
  async publish(_queue: string, message: QueueMessage): Promise<void> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
      }),
    )
  }

  async consume(_queue: string, _handler: (message: QueueMessage) => Promise<void>): Promise<void> {
    throw new Error('consume() is handled by the Worker process, not the backend.')
  }

  async close(): Promise<void> {
    this.client.destroy()
  }
}