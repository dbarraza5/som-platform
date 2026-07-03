"""
Publica los archivos generados por un entrenamiento finalizado hacia el
storage permanente, junto al Dataset correspondiente, usando la misma
abstracción StorageProvider que ya usa el resto del Worker (Fase 7.4/7.6).

No sabe nada de Redis, Queue ni Backend: solo sube archivos y verifica
que efectivamente quedaron disponibles. La orquestación (cuándo publicar,
qué hacer si falla, actualizar el TrainingJob) vive en training_runner.py.
"""

import logging
import os
from typing import Iterable, List

logger = logging.getLogger(__name__)

# Archivos que se esperan siempre que un entrenamiento termina
# correctamente (Fase 9/10.3). training_runner.py les suma cualquier otro
# archivo detectado como "generado" en esa corrida (el mismo diff que ya
# usa para logging desde la Fase 10.3) — así, si una versión futura de
# som_ empieza a producir un archivo nuevo, se publica automáticamente sin
# tener que tocar esta lista.
KNOWN_RESULT_FILENAMES = (
    "pesosRNA.csv",
    "statusRNA.dat",
    "activacion_rna.csv",
    "ConfiguracionRNA.xml",
)


class TrainingResultsPublisher:
    def __init__(self, storage) -> None:
        self._storage = storage

    def publish(
        self,
        training_dir: str,
        project_id: str,
        dataset_id: str,
        training_job_id: str,
        extra_filenames: Iterable[str] = (),
    ) -> List[str]:
        """Sube cada archivo a projects/<projectId>/datasets/<datasetId>/training-jobs/<trainingJobId>/<filename>.

        Nombres de archivo sin modificar. Lanza en el primer archivo que
        falte localmente o cuya subida no se pueda verificar — la
        publicación es todo o nada; el llamador es responsable de no
        marcar el TrainingJob como COMPLETED si esto lanza.
        """
        filenames = sorted(set(KNOWN_RESULT_FILENAMES) | set(extra_filenames))
        published_keys = []

        for filename in filenames:
            local_path = os.path.join(training_dir, filename)
            if not os.path.isfile(local_path):
                raise RuntimeError(f"Archivo de resultado esperado no encontrado: {filename}")

            key = self._build_key(project_id, dataset_id, training_job_id, filename)

            logger.info("[WORKER] Subiendo: %s", filename)
            self._storage.upload(key, local_path)

            if not self._storage.exists(key):
                raise RuntimeError(f"No se pudo verificar la publicación de: {key}")

            published_keys.append(key)

        return published_keys

    @staticmethod
    def _build_key(project_id: str, dataset_id: str, training_job_id: str, filename: str) -> str:
        return f"projects/{project_id}/datasets/{dataset_id}/training-jobs/{training_job_id}/{filename}"
