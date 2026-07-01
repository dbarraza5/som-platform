import json
import logging
import os

from ..storage.factory import get_storage_provider
from .normalization_service import NormalizationService

logger = logging.getLogger(__name__)

_TEMP_BASE = "temp"
_DELIMITER = ";"


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

        logger.info("[WORKER] Iniciando normalización...")
        normalization = NormalizationService(delimiter=_DELIMITER)
        result = normalization.run(input_path=temp_file, output_dir=temp_dir)

        for output_path in (result.normalized_csv_path, result.dimensions_xml_path):
            if not os.path.isfile(output_path):
                raise RuntimeError(f"El algoritmo no generó el archivo esperado: {output_path}")
            if os.path.getsize(output_path) == 0:
                raise RuntimeError(f"El archivo generado está vacío: {output_path}")

        logger.info("[WORKER] Normalización finalizada correctamente.")
        logger.info("[WORKER] Archivo generado: %s", result.normalized_csv_path)
        logger.info("[WORKER] Archivo generado: %s", result.dimensions_xml_path)

    except FileNotFoundError as exc:
        logger.error("[WORKER] Archivo no encontrado en el storage: %s", exc)
    except OSError as exc:
        logger.error("[WORKER] Error de escritura en directorio temporal: %s", exc)
    except Exception as exc:
        logger.error("[WORKER] Error inesperado durante la normalización: %s", exc)
