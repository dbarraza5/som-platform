export type QueueOperation = 'NORMALIZE' | 'TRAIN' | string

export interface NormalizeQueueMessage {
  operation: 'NORMALIZE'
  datasetId: string
  projectId: string
  storageKey: string
  timestamp: string // ISO 8601
}

// Deliberately minimal — no file paths, no computed training parameters.
// The Worker looks everything else up (TrainingJob row, Dataset) when it
// starts consuming this queue in a later phase.
export interface TrainQueueMessage {
  operation: 'TRAIN'
  trainingJobId: string
  datasetId: string
  timestamp: string // ISO 8601
}

export type QueueMessage = NormalizeQueueMessage | TrainQueueMessage

export interface IQueueProvider {
  publish(queue: string, message: QueueMessage): Promise<void>
  consume(queue: string, handler: (message: QueueMessage) => Promise<void>): Promise<void>
  close(): Promise<void>
}
