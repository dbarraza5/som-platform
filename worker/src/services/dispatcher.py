"""Enruta cada mensaje de la cola al handler correspondiente según su 'operation'."""

import logging

from .message_handler import handle_message
from .training_message_handler import handle_training_message

logger = logging.getLogger(__name__)


def dispatch_message(message: dict) -> None:
    operation = message.get("operation")

    if operation == "NORMALIZE":
        handle_message(message)
    elif operation == "TRAIN":
        handle_training_message(message)
    else:
        logger.error("[WORKER] Operación desconocida en el mensaje: %s", operation)
