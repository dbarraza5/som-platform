import json
import logging
from typing import List

import boto3
from botocore.exceptions import ClientError

from ..config.settings import settings
from .i_queue_consumer import IQueueConsumer, MessageHandler

logger = logging.getLogger(__name__)

_WAIT_TIME_SECONDS = 20  # long polling
_MAX_MESSAGES = 1
_VISIBILITY_TIMEOUT = 300  # 5 min — enough for normalization + training


class SQSQueueConsumer(IQueueConsumer):
    def __init__(self) -> None:
        if not settings.SQS_QUEUE_URL:
            raise ValueError("SQS_QUEUE_URL is required when QUEUE_DRIVER=sqs")

        kwargs: dict = {"region_name": settings.SQS_REGION}
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

        self._queue_url = settings.SQS_QUEUE_URL
        self._client = boto3.client("sqs", **kwargs)
        self._running = False

    def connect(self) -> None:
        try:
            self._client.get_queue_attributes(
                QueueUrl=self._queue_url,
                AttributeNames=["QueueArn"],
            )
            logger.info("[WORKER] SQS accesible: %s", self._queue_url)
        except ClientError as e:
            raise ConnectionError(f"No se pudo conectar a SQS: {e}") from e

    def consume(self, queues: List[str], handler: MessageHandler) -> None:
        # SQS uses a single queue URL — the queues list (som_jobs, training_jobs)
        # is unified into one SQS queue; operation field distinguishes them.
        self._running = True
        while self._running:
            try:
                response = self._client.receive_message(
                    QueueUrl=self._queue_url,
                    MaxNumberOfMessages=_MAX_MESSAGES,
                    WaitTimeSeconds=_WAIT_TIME_SECONDS,
                    VisibilityTimeout=_VISIBILITY_TIMEOUT,
                )
            except ClientError as e:
                logger.error("[WORKER] Error al recibir mensaje de SQS: %s", e)
                continue

            messages = response.get("Messages", [])
            for msg in messages:
                receipt_handle = msg["ReceiptHandle"]
                try:
                    payload = json.loads(msg["Body"])
                    logger.info(
                        "[WORKER] Mensaje SQS recibido. MessageId=%s", msg.get("MessageId")
                    )
                    handler(payload)
                    # Delete only after successful handling
                    self._client.delete_message(
                        QueueUrl=self._queue_url,
                        ReceiptHandle=receipt_handle,
                    )
                    logger.info("[WORKER] Mensaje eliminado de SQS.")
                except json.JSONDecodeError as exc:
                    logger.error("[WORKER] Mensaje SQS descartado — JSON inválido: %s", exc)
                    self._client.delete_message(
                        QueueUrl=self._queue_url,
                        ReceiptHandle=receipt_handle,
                    )
                except Exception as exc:
                    logger.error(
                        "[WORKER] Error procesando mensaje SQS (permanece en cola): %s", exc
                    )
                    # Do NOT delete — SQS will re-deliver after VisibilityTimeout

    def close(self) -> None:
        self._running = False