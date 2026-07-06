import json
import logging
import os
import shutil

from ..storage.factory import get_storage_provider
from .backend_notifier import get_backend_notifier
from .normalization_service import NormalizationService

logger = logging.getLogger(__name__)

_TEMP_BASE = "temp"


def _detect_delimiter(path: str) -> str:
    """Returns ';' or ',' based on whichever appears more in the header line."""
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            first_line = f.readline()
        delimiter = ";" if first_line.count(";") >= first_line.count(",") else ","
        logger.info("[WORKER] Delimitador detectado: '%s'", delimiter)
        return delimiter
    except OSError:
        logger.warning("[WORKER] No se pudo detectar el delimitador; usando ';' por defecto.")
        return ";"


def handle_message(message: dict) -> None:
    dataset_id = message.get("datasetId", "unknown")
    project_id = message.get("projectId", "unknown")
    storage_key = message.get("storageKey")

    logger.info("[WORKER] Trabajo recibido. datasetId=%s", dataset_id)
    logger.info("[WORKER]\n%s", json.dumps(message, indent=2, ensure_ascii=False))

    if not storage_key:
        logger.error("[WORKER] Mensaje inválido: falta storageKey. datasetId=%s", dataset_id)
        return

    temp_dir = os.path.join(_TEMP_BASE, f"job-{dataset_id}")
    temp_file = os.path.join(temp_dir, "original.csv")
    notifier = get_backend_notifier()

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

        delimiter = _detect_delimiter(temp_file)

        logger.info("[WORKER] Iniciando normalización...")
        normalization = NormalizationService(delimiter=delimiter)
        result = normalization.run(input_path=temp_file, output_dir=temp_dir)

        for output_path in (result.normalized_csv_path, result.dimensions_xml_path):
            if not os.path.isfile(output_path):
                raise RuntimeError(f"El algoritmo no generó el archivo esperado: {output_path}")
            if os.path.getsize(output_path) == 0:
                raise RuntimeError(f"El archivo generado está vacío: {output_path}")

        logger.info("[WORKER] Normalización finalizada correctamente.")
        logger.info("[WORKER] Archivo generado: %s", result.normalized_csv_path)
        logger.info("[WORKER] Archivo generado: %s", result.dimensions_xml_path)

        normalized_key = f"projects/{project_id}/datasets/{dataset_id}/normalized.csv"
        dimensions_key = f"projects/{project_id}/datasets/{dataset_id}/dimensions.xml"

        logger.info("[WORKER] Publicando normalized.csv...")
        storage.upload(normalized_key, result.normalized_csv_path)
        if not storage.exists(normalized_key):
            raise RuntimeError(f"No se pudo verificar la publicación de: {normalized_key}")

        logger.info("[WORKER] Publicando dimensions.xml...")
        storage.upload(dimensions_key, result.dimensions_xml_path)
        if not storage.exists(dimensions_key):
            raise RuntimeError(f"No se pudo verificar la publicación de: {dimensions_key}")

        logger.info("[WORKER] Archivos almacenados correctamente.")

        logger.info("[WORKER] Eliminando archivos temporales...")
        shutil.rmtree(temp_dir)

        logger.info("[WORKER] Notificando Backend...")
        notifier.notify_normalization_result(dataset_id, status="COMPLETED")

        logger.info("[WORKER] Normalización finalizada correctamente.")
        return

    except FileNotFoundError as exc:
        error_message = f"Archivo no encontrado en el storage: {exc}"
        logger.error("[WORKER] %s", error_message)
    except OSError as exc:
        error_message = f"Error de E/S durante el procesamiento: {exc}"
        logger.error("[WORKER] %s", error_message)
    except Exception as exc:
        error_message = f"Error inesperado durante la normalización: {exc}"
        logger.error("[WORKER] %s", error_message)

    # Cualquier fallo llega aquí: el directorio temporal se conserva para
    # diagnóstico y el Backend se entera del fallo.
    logger.info("[WORKER] Notificando Backend del fallo...")
    notifier.notify_normalization_result(dataset_id, status="FAILED", error_message=error_message)
