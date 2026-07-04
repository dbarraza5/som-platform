"""
Ejecuta som_ dentro de un directorio de entrenamiento ya preparado y
monitorea su progreso vía statusRNA.dat hasta que finaliza (Fases
10.3/10.4). Compartido entre el flujo normal (training_message_handler,
un TrainingJob recién creado) y la recuperación automática de
entrenamientos interrumpidos (training_recovery_service, Fase 10.5) —
ambos terminan haciendo exactamente lo mismo una vez que el directorio de
trabajo ya existe con ConfiguracionRNA.conf y DatosEntrenamiento.csv.

Al confirmarse termino_entrenarse=si, también publica los resultados
hacia el storage permanente y limpia el directorio temporal (Fase 10.6):
el TrainingJob solo pasa a COMPLETED después de una publicación exitosa.
"""

import logging
import os
import shutil

from ..config.settings import settings
from ..storage.factory import get_storage_provider
from .backend_client import BackendClient
from .training_execution_service import TrainingExecutionService
from .training_results_publisher import TrainingResultsPublisher
from .training_status_reader import TrainingStatus, TrainingStatusReader

logger = logging.getLogger(__name__)

# Cuántos polls consecutivos con el mismo (ciclos, iteracion) antes de avisar
# que statusRNA.dat parece estancado. Solo se registra en logs — la
# recuperación automática ya existe (Fase 10.5) pero no se dispara desde
# aquí; ocurre en el próximo arranque del Worker.
_STALE_TICKS_WARNING_THRESHOLD = 3


def _total_cycles(alpha: float, beta: float) -> float | None:
    """Ciclos totales esperados para este TrainingJob.

    alfa es la tasa de aprendizaje inicial y beta ("Omega" en el Frontend)
    la tasa final a la que decae; alfa / beta da el número de ciclos
    esperado. None si beta es 0 (progreso no calculable, se reporta 0).
    """
    if not beta:
        return None
    return alpha / beta


def _progress_from_cycles(current_cycle: int, total_cycles: float | None) -> int:
    if not total_cycles or total_cycles <= 0:
        return 0
    return int(min(100, round((current_cycle / total_cycles) * 100)))


def run_and_monitor(client: BackendClient, training_job_id: str, training_dir: str) -> bool:
    """Ejecuta som_, sincroniza progreso, y reporta el resultado final al Backend.

    True si statusRNA.dat confirmó termino_entrenarse=si (COMPLETED); False
    en cualquier otro caso (ya reportado como FAILED al Backend).
    """
    logger.info("[WORKER] Iniciando entrenamiento...")
    training_job = client.get_training_job(training_job_id)
    total_cycles = _total_cycles(training_job["alpha"], training_job["beta"])
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
                    "(ciclos=%d, iteracion=%d).",
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
            progress=_progress_from_cycles(status.ciclos, total_cycles),
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
        logger.info("[WORKER] Entrenamiento finalizado.")

        try:
            _publish_and_finalize(client, training_job_id, training_dir, generated_files, final_status)
        except Exception as exc:
            error_message = f"Error al publicar resultados del entrenamiento: {exc}"
            logger.error("[WORKER] %s", error_message)
            client.report_training_job_failed(training_job_id, error_message)
            return False

        return True

    error_message = (
        "El entrenamiento finalizó pero statusRNA.dat no confirma termino_entrenarse=si. "
        f"código de salida={result.exit_code} | "
        f"statusRNA.dat={final_status.raw if final_status else '(no disponible)'} | "
        f"stderr: {result.stderr.strip() or '(vacío)'} | stdout: {result.stdout.strip() or '(vacío)'}"
    )
    logger.error("[WORKER] %s", error_message)
    client.report_training_job_failed(training_job_id, error_message)
    return False


def _publish_and_finalize(
    client: BackendClient,
    training_job_id: str,
    training_dir: str,
    generated_files: list,
    final_status: TrainingStatus,
) -> None:
    """Publica resultados, marca COMPLETED, y limpia — en ese orden.

    Cualquier excepción se propaga sin capturarse: run_and_monitor la
    atrapa y reporta FAILED sin borrar nada localmente, para permitir
    reintentar la publicación más adelante.
    """
    logger.info("[WORKER] Publicando resultados.")

    training_job = client.get_training_job(training_job_id)
    dataset = client.get_dataset(training_job["datasetId"])

    storage = get_storage_provider()
    publisher = TrainingResultsPublisher(storage)
    publisher.publish(
        training_dir=training_dir,
        project_id=dataset["projectId"],
        dataset_id=dataset["id"],
        training_job_id=training_job_id,
        extra_filenames=generated_files,
    )

    logger.info("[WORKER] Actualizando TrainingJob.")
    client.update_training_job_status(
        training_job_id,
        status="COMPLETED",
        progress=100,
        current_iteration=final_status.iteracion,
        current_cycle=final_status.ciclos,
    )

    logger.info("[WORKER] Limpiando directorio temporal.")
    shutil.rmtree(training_dir)

    logger.info("[WORKER] Entrenamiento finalizado correctamente. trainingJobId=%s", training_job_id)
