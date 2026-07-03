"""
Maneja mensajes de la cola de entrenamiento (operation=TRAIN).

El Worker prepara el entorno de trabajo del TrainingJob (descarga el
Dataset normalizado, calcula NUMERO_ENTRADAS, genera ConfiguracionRNA.conf
— Fase 10.2) y luego ejecuta som_ hasta que finalice (Fase 10.3). Todavía
NO se reporta progreso intermedio, no hay reanudación automática, y los
archivos generados no se suben a Storage — eso queda para fases
posteriores.

El mensaje de la cola solo identifica el TrainingJob (trainingJobId);
toda la información adicional (parámetros del entrenamiento, datasetId,
projectId) se recupera del Backend, nunca se asume desde el mensaje.
"""

import logging
import os

from ..config.settings import settings
from ..storage.factory import get_storage_provider
from .backend_client import get_backend_client
from .training_environment_service import DATASET_FILENAME, TrainingEnvironmentService, count_columns
from .training_execution_service import TrainingExecutionService

logger = logging.getLogger(__name__)

_TRAINING_BASE = os.path.join(settings.STORAGE_LOCAL_PATH, "training")


def handle_training_message(message: dict) -> None:
    training_job_id = message.get("trainingJobId", "unknown")
    client = get_backend_client()

    logger.info("[WORKER] TrainingJob recibido. trainingJobId=%s", training_job_id)

    try:
        training_job = client.get_training_job(training_job_id)
        dataset_id = training_job["datasetId"]
        dataset = client.get_dataset(dataset_id)

        logger.info("[WORKER] Creando directorio de trabajo.")
        training_dir = os.path.join(_TRAINING_BASE, training_job_id)
        os.makedirs(training_dir, exist_ok=True)

        logger.info("[WORKER] Descargando Dataset normalizado.")
        normalized_key = f"projects/{dataset['projectId']}/datasets/{dataset_id}/normalized.csv"
        dataset_path = os.path.join(training_dir, DATASET_FILENAME)
        storage = get_storage_provider()
        storage.download(normalized_key, dataset_path)

        if not os.path.isfile(dataset_path) or os.path.getsize(dataset_path) == 0:
            raise RuntimeError(f"El Dataset normalizado no se descargó correctamente: {normalized_key}")

        logger.info("[WORKER] Calculando NUMERO_ENTRADAS.")
        numero_entradas = count_columns(dataset_path)
        logger.info("[WORKER] NUMERO_ENTRADAS calculado: %d", numero_entradas)

        logger.info("[WORKER] Generando ConfiguracionRNA.conf.")
        env_service = TrainingEnvironmentService()
        env_service.generate_conf(training_dir, training_job, numero_entradas)

        logger.info("[WORKER] Entorno preparado correctamente. trainingJobId=%s", training_job_id)

    except Exception as exc:
        error_message = f"Error al preparar el entorno de entrenamiento: {exc}"
        logger.error("[WORKER] %s", error_message)
        client.report_training_job_failed(training_job_id, error_message)
        return

    try:
        logger.info("[WORKER] Iniciando entrenamiento...")
        client.update_training_job_status(training_job_id, status="RUNNING", progress=0)

        files_before = set(os.listdir(training_dir))

        logger.info("[WORKER] Ejecutando som_...")
        execution_service = TrainingExecutionService()
        logger.info("[WORKER] Proceso iniciado.")
        result = execution_service.run(training_dir)
        logger.info("[WORKER] Proceso finalizado.")
        logger.info("[WORKER] Código de salida: %d", result.exit_code)

        generated_files = sorted(set(os.listdir(training_dir)) - files_before)
        logger.info("[WORKER] Archivos generados: %s", generated_files or "ninguno")

        if not result.succeeded:
            error_message = (
                f"El entrenamiento finalizó con código de salida {result.exit_code}. "
                f"stderr: {result.stderr.strip() or '(vacío)'} | stdout: {result.stdout.strip() or '(vacío)'}"
            )
            logger.error("[WORKER] %s", error_message)
            client.report_training_job_failed(training_job_id, error_message)
            return

        logger.info("[WORKER] Entrenamiento finalizado correctamente. trainingJobId=%s", training_job_id)
        client.update_training_job_status(training_job_id, status="COMPLETED")

    except Exception as exc:
        error_message = f"Error al ejecutar el entrenamiento: {exc}"
        logger.error("[WORKER] %s", error_message)
        client.report_training_job_failed(training_job_id, error_message)
