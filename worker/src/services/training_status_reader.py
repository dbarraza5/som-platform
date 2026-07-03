"""
Interpreta statusRNA.dat — la única fuente oficial del estado de un
entrenamiento en curso (Fase 10.4). No sabe nada de Redis, Queue ni
Backend: su única responsabilidad es transformar el archivo en un objeto
de dominio.

No usar stdout para obtener progreso — este archivo es la única fuente
válida de sincronización con el Backend.
"""

import os
from dataclasses import dataclass
from typing import Dict, Optional

STATUS_FILENAME = "statusRNA.dat"


@dataclass
class TrainingStatus:
    termino_entrenarse: bool
    ciclos: int
    iteracion: int
    raw: Dict[str, str]


class TrainingStatusReader:
    def read(self, training_dir: str) -> Optional[TrainingStatus]:
        """
        None si el archivo todavía no existe, no tiene los campos mínimos, o
        se leyó a mitad de una escritura de som_ (archivo momentáneamente
        corrupto/incompleto). En todos esos casos el llamador debe tratarlo
        como "todavía no hay datos", no como un error.
        """
        status_path = os.path.join(training_dir, STATUS_FILENAME)

        if not os.path.isfile(status_path):
            return None

        try:
            raw = self._parse(status_path)

            if not all(key in raw for key in ("termino_entrenarse", "ciclos", "iteracion")):
                return None

            return TrainingStatus(
                termino_entrenarse=raw["termino_entrenarse"].strip().lower() == "si",
                ciclos=int(raw["ciclos"]),
                iteracion=int(raw["iteracion"]),
                raw=raw,
            )
        except (OSError, ValueError):
            return None

    @staticmethod
    def _parse(status_path: str) -> Dict[str, str]:
        raw: Dict[str, str] = {}
        with open(status_path, "r", encoding="utf-8") as f:
            for line in f:
                if "=" not in line:
                    continue
                key, _, value = line.partition("=")
                raw[key.strip()] = value.strip()
        return raw
