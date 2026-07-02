from typing import List

from .i_queue_consumer import IQueueConsumer, MessageHandler

# Placeholder — will use boto3 in a future phase.
# Set QUEUE_DRIVER=sqs and configure AWS_REGION + SQS_QUEUE_URL to activate.


class SQSQueueConsumer(IQueueConsumer):
    def connect(self) -> None:
        raise NotImplementedError(
            "SQSQueueConsumer is not yet implemented. "
            "Set QUEUE_DRIVER=redis for local development."
        )

    def consume(self, queues: List[str], handler: MessageHandler) -> None:
        raise NotImplementedError("SQSQueueConsumer is not yet implemented.")

    def close(self) -> None:
        pass
