import json
import logging
import time
from typing import Any, Dict

import redis

from .i_queue_consumer import IQueueConsumer, MessageHandler

logger = logging.getLogger(__name__)

_CONNECT_RETRIES = 10
_CONNECT_DELAY_S = 2
_BRPOP_TIMEOUT_S = 5  # unblocks periodically so signals are handled cleanly


class RedisQueueConsumer(IQueueConsumer):
    def __init__(self, host: str, port: int) -> None:
        self._client = redis.Redis(host=host, port=port, decode_responses=True)

    def connect(self) -> None:
        for attempt in range(1, _CONNECT_RETRIES + 1):
            try:
                self._client.ping()
                return
            except redis.ConnectionError:
                if attempt == _CONNECT_RETRIES:
                    raise
                logger.warning(
                    "[WORKER] Redis no disponible (intento %d/%d). Reintentando en %ds...",
                    attempt,
                    _CONNECT_RETRIES,
                    _CONNECT_DELAY_S,
                )
                time.sleep(_CONNECT_DELAY_S)

    def consume(self, queue: str, handler: MessageHandler) -> None:
        while True:
            result = self._client.brpop(queue, timeout=_BRPOP_TIMEOUT_S)
            if result is not None:
                _, raw = result
                try:
                    message: Dict[str, Any] = json.loads(raw)
                    handler(message)
                except json.JSONDecodeError as exc:
                    logger.error(
                        "[WORKER] Mensaje descartado — JSON inválido: %s | Error: %s",
                        raw,
                        exc,
                    )

    def close(self) -> None:
        self._client.close()
