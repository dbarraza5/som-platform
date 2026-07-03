"""
Cliente HTTP para consultar TrainingJob/Dataset y reportar fallos de
preparación al Backend.

El Worker nunca accede directamente a PostgreSQL: toda lectura de
TrainingJob/Dataset y toda actualización de TrainingJob.status pasa por
los endpoints internos del Backend, autenticados con la misma API key
compartida que BackendNotifier (Fase 7.6).
"""

import logging
from typing import Any, Dict, Optional

import requests

from ..config.settings import settings

logger = logging.getLogger(__name__)

_TIMEOUT_S = 10


class BackendClient:
    def __init__(self, base_url: str, api_key: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._headers = {"X-Internal-Api-Key": api_key}

    def get_training_job(self, training_job_id: str) -> Dict[str, Any]:
        url = f"{self._base_url}/api/internal/training-jobs/{training_job_id}"
        response = requests.get(url, headers=self._headers, timeout=_TIMEOUT_S)
        response.raise_for_status()
        return response.json()["data"]["trainingJob"]

    def get_dataset(self, dataset_id: str) -> Dict[str, Any]:
        url = f"{self._base_url}/api/internal/datasets/{dataset_id}"
        response = requests.get(url, headers=self._headers, timeout=_TIMEOUT_S)
        response.raise_for_status()
        return response.json()["data"]["dataset"]

    def update_training_job_status(
        self,
        training_job_id: str,
        status: str,
        error_message: Optional[str] = None,
        progress: Optional[int] = None,
    ) -> bool:
        """Nunca lanza excepciones: un Backend caído no debe tumbar al Worker."""
        url = f"{self._base_url}/api/internal/training-jobs/{training_job_id}/status"
        payload: Dict[str, Any] = {"status": status, "errorMessage": error_message}
        if progress is not None:
            payload["progress"] = progress

        try:
            response = requests.patch(url, json=payload, headers=self._headers, timeout=_TIMEOUT_S)
            response.raise_for_status()
            return True
        except requests.RequestException as exc:
            logger.error("[WORKER] Error al actualizar el estado del TrainingJob en el Backend: %s", exc)
            return False

    def report_training_job_failed(self, training_job_id: str, error_message: str) -> bool:
        return self.update_training_job_status(training_job_id, status="FAILED", error_message=error_message)


def get_backend_client() -> BackendClient:
    return BackendClient(base_url=settings.BACKEND_URL, api_key=settings.INTERNAL_API_KEY)
