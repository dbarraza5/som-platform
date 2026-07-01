from ..config.settings import settings
from .i_queue_consumer import IQueueConsumer
from .redis_queue_consumer import RedisQueueConsumer
from .sqs_queue_consumer import SQSQueueConsumer


def create_queue_consumer() -> IQueueConsumer:
    if settings.QUEUE_DRIVER == "redis":
        return RedisQueueConsumer(host=settings.REDIS_HOST, port=settings.REDIS_PORT)
    elif settings.QUEUE_DRIVER == "sqs":
        return SQSQueueConsumer()
    else:
        raise ValueError(f"Unknown QUEUE_DRIVER: {settings.QUEUE_DRIVER!r}")
