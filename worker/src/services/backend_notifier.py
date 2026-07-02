"""
Cliente HTTP para notificar al Backend el resultado de un trabajo de normalización.

El Worker nunca accede directamente a PostgreSQL: el Backend es el único
responsable de actualizar el Dataset. Este servicio solo llama al endpoint
interno del Backend, autenticado con una API key compartida (no un JWT de
usuario).
"""

import logging
from typing import Optional

import requests

from ..config.settings import settings

logger = logging.getLogger(__name__)

_TIMEOUT_S = 10


class BackendNotifier:
    def __init__(self, base_url: str, api_key: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key

    def notify_normalization_result(
        self,
        dataset_id: str,
        status: str,
        error_message: Optional[str] = None,
    ) -> bool:
        """Reporta COMPLETED o FAILED al Backend. Nunca lanza excepciones."""
        url = f"{self._base_url}/api/internal/datasets/{dataset_id}/normalization"

        try:
            response = requests.patch(
                url,
                json={"status": status, "error": error_message},
                headers={"X-Internal-Api-Key": self._api_key},
                timeout=_TIMEOUT_S,
            )
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            logger.error("[WORKER] Error al notificar al Backend: %s", exc)
            return False


def get_backend_notifier() -> BackendNotifier:
    return BackendNotifier(base_url=settings.BACKEND_URL, api_key=settings.INTERNAL_API_KEY)
