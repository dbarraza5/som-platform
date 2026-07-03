"""
Ejecuta el binario som_ dentro de un directorio de trabajo ya preparado
(Fase 10.2: DatosEntrenamiento.csv + ConfiguracionRNA.conf presentes).

No conoce Redis, Queue ni Backend: solo lanza el proceso, espera a que
finalice, y devuelve un resultado estructurado (código de salida, stdout,
stderr). La orquestación (actualizar el TrainingJob, detectar archivos
generados) vive en training_message_handler.py.
"""

import os
import subprocess
from dataclasses import dataclass

# Resuelto contra el cwd del propio proceso Python (WORKDIR /app), no contra
# el directorio de trabajo del entrenamiento — subprocess.run cambia el cwd
# solo del proceso hijo.
SOM_EXECUTABLE_PATH = os.path.abspath(os.path.join("executables", "som_"))


@dataclass
class TrainingExecutionResult:
    exit_code: int
    stdout: str
    stderr: str

    @property
    def succeeded(self) -> bool:
        return self.exit_code == 0


class TrainingExecutionService:
    def __init__(self, executable_path: str = SOM_EXECUTABLE_PATH) -> None:
        self._executable_path = executable_path

    def run(self, working_dir: str) -> TrainingExecutionResult:
        if not os.path.isfile(self._executable_path):
            raise FileNotFoundError(f"Ejecutable som_ no encontrado: {self._executable_path}")

        # capture_output=True usa Popen.communicate() internamente, evitando
        # el deadlock clásico de leer stdout/stderr manualmente con pipes
        # sin drenar mientras el proceso hijo sigue escribiendo.
        completed = subprocess.run(
            [self._executable_path],
            cwd=working_dir,
            capture_output=True,
            text=True,
        )

        return TrainingExecutionResult(
            exit_code=completed.returncode,
            stdout=completed.stdout,
            stderr=completed.stderr,
        )
