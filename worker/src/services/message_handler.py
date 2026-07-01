import json
import logging
import os
import shutil

from ..storage.factory import get_storage_provider

logger = logging.getLogger(__name__)

_TEMP_BASE = "temp"


def handle_message(message: dict) -> None:
    dataset_id = message.get("datasetId", "unknown")
    storage_key = message.get("storageKey")

    logger.info("[WORKER] Trabajo recibido. datasetId=%s", dataset_id)
    logger.info("[WORKER]\n%s", json.dumps(message, indent=2, ensure_ascii=False))

    if not storage_key:
        logger.error("[WORKER] Mensaje inválido: falta storageKey. datasetId=%s", dataset_id)
        return

    temp_dir = os.path.join(_TEMP_BASE, f"job-{dataset_id}")
    temp_file = os.path.join(temp_dir, "original.csv")

    try:
        logger.info("[WORKER] Descargando Dataset... storageKey=%s", storage_key)
        storage = get_storage_provider()
        storage.download(storage_key, temp_file)

        logger.info("[WORKER] Archivo descargado correctamente.")
        logger.info("[WORKER] Ruta temporal: %s", temp_file)

        if not os.path.isfile(temp_file):
            raise FileNotFoundError(f"El archivo no existe en la ruta temporal: {temp_file}")
        size = os.path.getsize(temp_file)
        if size == 0:
            raise ValueError("El archivo descargado está vacío.")

        logger.info("[WORKER] Validación exitosa. Tamaño: %d bytes.", size)

    except FileNotFoundError as exc:
        logger.error("[WORKER] Archivo no encontrado en el storage: %s", exc)
    except OSError as exc:
        logger.error("[WORKER] Error de escritura en directorio temporal: %s", exc)
    except Exception as exc:
        logger.error("[WORKER] Error inesperado durante la descarga: %s", exc)
    finally:
        if os.path.isdir(temp_dir):
            shutil.rmtree(temp_dir)
            logger.info("[WORKER] Directorio temporal limpiado: %s", temp_dir)
