"""
Recupera automáticamente TrainingJob interrumpidos al iniciar el Worker
(Fase 10.5).

som_ soporta reanudación de forma nativa: lee su propio statusRNA.dat al
arrancar y continúa desde ahí (Fase 9). El Worker solo necesita volver a
ejecutarlo en el mismo directorio de trabajo — nunca vuelve a descargar
el Dataset, nunca regenera ConfiguracionRNA.conf, y nunca toca
statusRNA.dat directamente. Reutiliza exactamente el mismo
run_and_monitor que un TrainingJob recién creado (training_runner.py).
"""

import logging
import os
from typing import Any, Dict

from ..config.settings import settings
from .backend_client import BackendClient, get_backend_client
from .training_environment_service import CONFIG_FILENAME, DATASET_FILENAME
from .training_execution_service import TrainingExecutionService
from .training_runner import run_and_monitor
from .training_status_reader import STATUS_FILENAME

logger = logging.getLogger(__name__)

_TRAINING_BASE = os.path.join(settings.STORAGE_LOCAL_PATH, "training")

# Archivos indispensables para poder reanudar sin volver a preparar el
# entorno desde cero (Fase 10.2). Si falta alguno, el checkpoint no es
# confiable y no vale la pena intentar reanudar.
_REQUIRED_FILES = (CONFIG_FILENAME, DATASET_FILENAME, STATUS_FILENAME)


def recover_interrupted_trainings() -> None:
    logger.info("[WORKER] Buscando entrenamientos pendientes de recuperación.")
    client = get_backend_client()

    try:
        training_jobs = client.list_training_jobs(status="RUNNING")
    except Exception as exc:
        logger.error("[WORKER] No se pudo consultar TrainingJobs en RUNNING: %s", exc)
        return

    if not training_jobs:
        logger.info("[WORKER] No hay entrenamientos pendientes de recuperación.")
        return

    for training_job in training_jobs:
        _recover_one(client, training_job)


def _recover_one(client: BackendClient, training_job: Dict[str, Any]) -> None:
    training_job_id = training_job.get("id", "unknown")

    try:
        logger.info("[WORKER] TrainingJob encontrado. trainingJobId=%s", training_job_id)
        training_dir = os.path.join(_TRAINING_BASE, training_job_id)

        if TrainingExecutionService.is_running(training_dir):
            logger.info(
                "[WORKER] Ya existe un proceso som_ en ejecución para trainingJobId=%s. No se hace nada.",
                training_job_id,
            )
            return

        logger.info("[WORKER] Verificando archivos del entrenamiento.")

        if not os.path.isdir(training_dir):
            error_message = f"No existe el directorio del entrenamiento: {training_dir}"
            logger.error("[WORKER] %s", error_message)
            client.report_training_job_failed(training_job_id, error_message)
            return

        missing = [name for name in _REQUIRED_FILES if not os.path.isfile(os.path.join(training_dir, name))]
        if missing:
            error_message = f"Faltan archivos necesarios para reanudar: {', '.join(missing)}"
            logger.error("[WORKER] %s", error_message)
            client.report_training_job_failed(training_job_id, error_message)
            return

        logger.info("[WORKER] statusRNA.dat encontrado.")

        recovery_attempts = training_job.get("recoveryAttempts") or 0
        if recovery_attempts >= settings.MAX_RECOVERY_ATTEMPTS:
            error_message = (
                f"Se alcanzó el límite de intentos de recuperación "
                f"({recovery_attempts}/{settings.MAX_RECOVERY_ATTEMPTS})."
            )
            logger.error("[WORKER] %s", error_message)
            client.report_training_job_failed(training_job_id, error_message)
            return

        next_attempt = recovery_attempts + 1
        client.update_training_job_status(training_job_id, status="RUNNING", recovery_attempts=next_attempt)
        logger.info(
            "[WORKER] Reanudando entrenamiento. trainingJobId=%s intento=%d/%d",
            training_job_id,
            next_attempt,
            settings.MAX_RECOVERY_ATTEMPTS,
        )

        recovered = run_and_monitor(client, training_job_id, training_dir)

        if recovered:
            logger.info("[WORKER] Entrenamiento recuperado correctamente. trainingJobId=%s", training_job_id)

    except Exception as exc:
        error_message = f"Error inesperado al recuperar el entrenamiento: {exc}"
        logger.error("[WORKER] %s", error_message)
        client.report_training_job_failed(training_job_id, error_message)
