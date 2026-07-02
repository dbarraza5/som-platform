"""
Prepara el archivo de configuración que leerá el ejecutable som_.

No descarga archivos ni conoce Redis/Queue/Backend: solo sabe calcular
NUMERO_ENTRADAS leyendo un CSV ya presente en disco y generar
ConfiguracionRNA.conf a partir de los parámetros de un TrainingJob. La
orquestación (descarga del Dataset, directorios, notificación de fallos al
Backend) vive en training_message_handler.py.
"""

import os
from typing import Any, Dict

CONFIG_FILENAME = "ConfiguracionRNA.conf"
DATASET_FILENAME = "DatosEntrenamiento.csv"

# Orden en que som_ (Fase 9) espera encontrar estas claves; el parser del
# ejecutable es tolerante a espacios pero busca literalmente estos tokens.
_EXPECTED_KEYS = [
    "RUTA_ARCHIVO",
    "NUMERO_ENTRADAS",
    "NUMERO_NEURONAS",
    "LARGO",
    "ANCHO",
    "ALFA",
    "BETA",
    "RANGO_VECINDAD",
    "PESO_DIMENSION_OBJ",
    "NUMERO_LIMITE_ITERACIONES",
    "OLVIDO_LOGARITMICO",
    "NUMERO_HILOS",
]


def count_columns(csv_path: str, delimiter: str = ";") -> int:
    """NUMERO_ENTRADAS: cuenta columnas leyendo la primera línea no vacía del CSV."""
    with open(csv_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                return len(line.split(delimiter))
    raise ValueError(f"El archivo está vacío, no se pudo calcular NUMERO_ENTRADAS: {csv_path}")


class TrainingEnvironmentService:
    def generate_conf(self, output_dir: str, training_job: Dict[str, Any], numero_entradas: int) -> str:
        conf_path = os.path.join(output_dir, CONFIG_FILENAME)

        lines = [
            f"RUTA_ARCHIVO = {DATASET_FILENAME}",
            f"NUMERO_ENTRADAS = {numero_entradas}",
            f"NUMERO_NEURONAS = {training_job['neuronCount']}",
            f"LARGO = {training_job['gridWidth']}",
            f"ANCHO = {training_job['gridHeight']}",
            f"ALFA = {training_job['alpha']}",
            f"BETA = {training_job['beta']}",
            f"RANGO_VECINDAD = {training_job['neighborhoodRadius']}",
            f"PESO_DIMENSION_OBJ = {training_job['objectiveDimensionWeight']}",
            f"NUMERO_LIMITE_ITERACIONES = {training_job.get('iterationLimit') or 0}",
            f"OLVIDO_LOGARITMICO = {1 if training_job.get('useLogarithmicForget') else 0}",
            f"NUMERO_HILOS = {training_job.get('threadCount') or 1}",
        ]

        with open(conf_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")

        self.validate_conf(conf_path, numero_entradas)
        return conf_path

    def validate_conf(self, conf_path: str, numero_entradas: int) -> None:
        if not os.path.isfile(conf_path) or os.path.getsize(conf_path) == 0:
            raise RuntimeError(f"ConfiguracionRNA.conf no se generó correctamente: {conf_path}")

        values = self._parse_conf(conf_path)

        missing = [key for key in _EXPECTED_KEYS if key not in values]
        if missing:
            raise RuntimeError(f"Faltan parámetros en ConfiguracionRNA.conf: {', '.join(missing)}")

        if values.get("NUMERO_ENTRADAS") != str(numero_entradas):
            raise RuntimeError(
                f"NUMERO_ENTRADAS no coincide: esperado {numero_entradas}, "
                f"encontrado {values.get('NUMERO_ENTRADAS')}"
            )

    @staticmethod
    def _parse_conf(path: str) -> Dict[str, str]:
        values: Dict[str, str] = {}
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                if "=" not in line:
                    continue
                key, _, value = line.partition("=")
                values[key.strip()] = value.strip()
        return values
