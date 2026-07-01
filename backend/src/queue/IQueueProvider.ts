export type QueueOperation = 'NORMALIZE' | string

export interface QueueMessage {
  operation: QueueOperation
  datasetId: string
  storageKey: string
  timestamp: string // ISO 8601
}

export interface IQueueProvider {
  publish(queue: string, message: QueueMessage): Promise<void>
  consume(queue: string, handler: (message: QueueMessage) => Promise<void>): Promise<void>
  close(): Promise<void>
}
