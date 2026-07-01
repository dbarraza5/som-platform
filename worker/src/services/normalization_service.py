"""
Servicio de normalización de datasets para entrenamiento SOM.

Reescritura como módulo reutilizable del script original de preprocesamiento:
lee un CSV, detecta el tipo de cada columna (continua o discreta/categórica),
castea y normaliza (min-max a [0,1]), desordena las filas, y exporta
normalized.csv (dataset normalizado) y dimensions.xml (metadata por dimensión).

El servicio no conoce Redis, colas, Docker ni storage: solo ejecuta el
algoritmo sobre las rutas de entrada/salida que recibe.
"""

import logging
import os
from dataclasses import dataclass
from xml.dom import minidom
from xml.etree.ElementTree import Element, SubElement, tostring

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

NORMALIZED_CSV_FILENAME = "normalized.csv"
DIMENSIONS_XML_FILENAME = "dimensions.xml"


@dataclass
class NormalizationResult:
    normalized_csv_path: str
    dimensions_xml_path: str


class NormalizationService:
    """Ejecuta el algoritmo de normalización sobre un archivo CSV."""

    def __init__(self, delimiter: str = ";", random_seed: int | None = None) -> None:
        self._delimiter = delimiter
        self._random_seed = random_seed

    def run(self, input_path: str, output_dir: str) -> NormalizationResult:
        os.makedirs(output_dir, exist_ok=True)

        df = self._cargar_tabla(input_path, self._delimiter)
        df_cast, dimensiones = self._castear_y_describir(df)
        df_norm = self._normalizar(df_cast)
        df_final = self._desordenar(df_norm, self._random_seed)

        csv_path = os.path.join(output_dir, NORMALIZED_CSV_FILENAME)
        xml_path = os.path.join(output_dir, DIMENSIONS_XML_FILENAME)

        df_final.to_csv(
            csv_path,
            sep=";",
            index=False,
            header=False,
            lineterminator="\n",
        )
        self._crear_xml(dimensiones, xml_path)

        return NormalizationResult(normalized_csv_path=csv_path, dimensions_xml_path=xml_path)

    # ------------------------------------------------------------------
    # Algoritmo (equivalente en comportamiento al script original)
    # ------------------------------------------------------------------

    @staticmethod
    def _cargar_tabla(path: str, sep: str) -> pd.DataFrame:
        df = pd.read_csv(
            path,
            sep=sep,
            engine="python",
            skipinitialspace=True,
            quotechar='"',
            doublequote=True,
        )
        df.columns = [c.strip().strip('"').strip("'") for c in df.columns]
        return df

    @staticmethod
    def _es_columna_continua(serie: pd.Series) -> bool:
        return pd.to_numeric(serie, errors="coerce").notna().all()

    def _castear_y_describir(self, df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
        df_cast = df.copy()
        dimensiones: dict[str, dict] = {}

        for col in df.columns:
            serie = df[col].astype(str).str.strip().str.strip('"').str.strip("'")

            if self._es_columna_continua(serie):
                valores = pd.to_numeric(serie, errors="coerce").fillna(-1.0)
                df_cast[col] = valores.astype(float)
                dimensiones[col] = {
                    "tipo_dato": "continuo",
                    "min": float(valores.min()),
                    "max": float(valores.max()),
                }
            else:
                categorias = sorted(serie.unique())
                mapeo = {cat: i + 1 for i, cat in enumerate(categorias)}
                df_cast[col] = serie.map(mapeo).astype(int)
                dimensiones[col] = {
                    "tipo_dato": "discreto",
                    "rango": categorias,
                    "min": 1,
                    "max": len(categorias),
                }

        return df_cast, dimensiones

    @staticmethod
    def _normalizar(df: pd.DataFrame) -> pd.DataFrame:
        df_norm = df.copy()
        for col in df.columns:
            x_min = df[col].min()
            x_max = df[col].max()
            logger.debug("[WORKER] Columna %s: min=%s max=%s", col, x_min, x_max)
            if x_min != x_max:
                df_norm[col] = (df[col] - x_min) / (x_max - x_min)
            else:
                df_norm[col] = 1.0
        return df_norm

    @staticmethod
    def _desordenar(df: pd.DataFrame, semilla: int | None) -> pd.DataFrame:
        rng = np.random.default_rng(semilla)
        indices = rng.permutation(len(df))
        return df.iloc[indices].reset_index(drop=True)

    @staticmethod
    def _crear_xml(dimensiones: dict, path: str) -> None:
        raiz = Element("configuracion")

        for indice, (nombre, info) in enumerate(dimensiones.items()):
            dim = SubElement(raiz, "dimension")
            SubElement(dim, "nombre").text = nombre
            SubElement(dim, "index").text = str(indice)

            for atributo, valor in info.items():
                if atributo == "rango":
                    rango_el = SubElement(dim, "rango")
                    for item in valor:
                        SubElement(rango_el, "item").text = str(item)
                else:
                    SubElement(dim, atributo).text = str(valor)

        xml_bytes = tostring(raiz, encoding="utf-8")
        xml_bonito = minidom.parseString(xml_bytes).toprettyxml(indent="     ")

        with open(path, "w", encoding="iso-8859-1", errors="xmlcharrefreplace") as f:
            f.write(xml_bonito)
