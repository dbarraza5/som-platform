import json
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)


def handle_message(message: Dict[str, Any]) -> None:
    logger.info("[WORKER] Mensaje recibido.")
    logger.info("[WORKER]\n%s", json.dumps(message, indent=2, ensure_ascii=False))
