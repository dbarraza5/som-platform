"""
Maneja mensajes de la cola de entrenamiento (operation=TRAIN).

El Worker prepara el entorno de trabajo del TrainingJob (descarga el
Dataset normalizado, calcula NUMERO_ENTRADAS, genera ConfiguracionRNA.conf
— Fase 10.2), ejecuta som_ (Fase 10.3), y mientras el proceso está en
ejecución monitorea periódicamente statusRNA.dat, sincronizando el
progreso con el Backend (Fase 10.4). Todavía NO hay reanudación
automática, ni cálculo definitivo del porcentaje de avance, ni subida de
archivos a Storage — eso queda para fases posteriores.

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
from .training_status_reader import TrainingStatusReader

logger = logging.getLogger(__name__)

_TRAINING_BASE = os.path.join(settings.STORAGE_LOCAL_PATH, "training")

# Cuántos polls consecutivos con el mismo (ciclos, iteracion) antes de avisar
# que statusRNA.dat parece estancado. Solo se registra en logs — la
# recuperación automática es la Fase 10.5.
_STALE_TICKS_WARNING_THRESHOLD = 3


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
        logger.info("[WORKER] Entrenamiento iniciado.")

        files_before = set(os.listdir(training_dir))
        status_reader = TrainingStatusReader()
        last_seen = None
        stale_ticks = 0

        def on_tick() -> None:
            nonlocal last_seen, stale_ticks

            logger.info("[WORKER] Leyendo statusRNA.dat...")
            status = status_reader.read(training_dir)

            if status is None:
                # Esperado durante los primeros segundos: som_ todavía no
                # escribió el archivo. No es un error — se reintenta en el
                # próximo tick.
                logger.info("[WORKER] statusRNA.dat todavía no disponible. Reintentando...")
                return

            logger.info("[WORKER] Iteración: %d", status.iteracion)
            logger.info("[WORKER] Ciclo: %d", status.ciclos)

            seen = (status.ciclos, status.iteracion)
            if seen == last_seen:
                stale_ticks += 1
                if stale_ticks >= _STALE_TICKS_WARNING_THRESHOLD:
                    logger.warning(
                        "[WORKER] statusRNA.dat no cambió en los últimos %d intentos "
                        "(ciclos=%d, iteracion=%d). La recuperación automática se implementará en la Fase 10.5.",
                        stale_ticks,
                        status.ciclos,
                        status.iteracion,
                    )
            else:
                stale_ticks = 0
            last_seen = seen

            logger.info("[WORKER] Sincronizando estado con Backend...")
            client.update_training_job_status(
                training_job_id,
                status="RUNNING",
                # TODO(fase futura): reemplazar por el cálculo definitivo del
                # porcentaje de avance. NUMERO_LIMITE_ITERACIONES no debe
                # usarse para este cálculo (indicado explícitamente en la
                # Fase 10.4). Por ahora solo confirma que el entrenamiento
                # sigue en curso; currentIteration/currentCycle ya reflejan
                # avance real y son suficientes para esta fase.
                progress=0,
                current_iteration=status.iteracion,
                current_cycle=status.ciclos,
            )

        logger.info("[WORKER] Ejecutando som_...")
        execution_service = TrainingExecutionService(poll_interval_s=settings.TRAINING_STATUS_POLL_INTERVAL_S)
        logger.info("[WORKER] Proceso iniciado.")
        result = execution_service.run(training_dir, on_tick=on_tick)
        logger.info("[WORKER] Proceso finalizado.")
        logger.info("[WORKER] Código de salida: %d", result.exit_code)

        generated_files = sorted(set(os.listdir(training_dir)) - files_before)
        logger.info("[WORKER] Archivos generados: %s", generated_files or "ninguno")

        # statusRNA.dat es la única fuente oficial de finalización — no el
        # código de salida (Fase 9/10.3 ya encontraron que som_ puede salir
        # con 0 incluso ante errores de validación).
        final_status = status_reader.read(training_dir)

        if final_status is not None and final_status.termino_entrenarse:
            logger.info("[WORKER] Entrenamiento finalizado. trainingJobId=%s", training_job_id)
            client.update_training_job_status(
                training_job_id,
                status="COMPLETED",
                progress=100,
                current_iteration=final_status.iteracion,
                current_cycle=final_status.ciclos,
            )
            return

        error_message = (
            "El entrenamiento finalizó pero statusRNA.dat no confirma termino_entrenarse=si. "
            f"código de salida={result.exit_code} | "
            f"statusRNA.dat={final_status.raw if final_status else '(no disponible)'} | "
            f"stderr: {result.stderr.strip() or '(vacío)'} | stdout: {result.stdout.strip() or '(vacío)'}"
        )
        logger.error("[WORKER] %s", error_message)
        client.report_training_job_failed(training_job_id, error_message)

    except Exception as exc:
        error_message = f"Error al ejecutar el entrenamiento: {exc}"
        logger.error("[WORKER] %s", error_message)
        client.report_training_job_failed(training_job_id, error_message)
