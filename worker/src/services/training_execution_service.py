"""
Ejecuta el binario som_ dentro de un directorio de trabajo ya preparado
(Fase 10.2: DatosEntrenamiento.csv + ConfiguracionRNA.conf presentes).

No conoce Redis, Queue ni Backend: solo lanza el proceso, espera a que
finalice —invocando un callback periódico mientras tanto, para permitir
monitoreo (Fase 10.4)— y devuelve un resultado estructurado (código de
salida, stdout, stderr). La orquestación (leer statusRNA.dat, sincronizar
con el Backend, detectar archivos generados) vive en
training_message_handler.py.
"""

import os
import subprocess
import tempfile
import time
from dataclasses import dataclass
from typing import Callable, Optional

# Resuelto contra el cwd del propio proceso Python (WORKDIR /app), no contra
# el directorio de trabajo del entrenamiento — subprocess.Popen cambia el
# cwd solo del proceso hijo.
SOM_EXECUTABLE_PATH = os.path.abspath(os.path.join("executables", "som_"))

DEFAULT_POLL_INTERVAL_S = 5.0


@dataclass
class TrainingExecutionResult:
    exit_code: int
    stdout: str
    stderr: str

    @property
    def succeeded(self) -> bool:
        return self.exit_code == 0


class TrainingExecutionService:
    def __init__(
        self,
        executable_path: str = SOM_EXECUTABLE_PATH,
        poll_interval_s: float = DEFAULT_POLL_INTERVAL_S,
    ) -> None:
        self._executable_path = executable_path
        self._poll_interval_s = poll_interval_s

    def run(self, working_dir: str, on_tick: Optional[Callable[[], None]] = None) -> TrainingExecutionResult:
        if not os.path.isfile(self._executable_path):
            raise FileNotFoundError(f"Ejecutable som_ no encontrado: {self._executable_path}")

        # stdout/stderr van a archivos temporales *fuera* de working_dir —
        # nunca a PIPE (deadlock clásico si el buffer del SO se llena antes
        # de drenarlo) y nunca dentro del directorio del entrenamiento
        # (contaminaría la detección de "archivos generados" por som_).
        with tempfile.TemporaryFile(mode="w+", encoding="utf-8") as stdout_f, tempfile.TemporaryFile(
            mode="w+", encoding="utf-8"
        ) as stderr_f:
            process = subprocess.Popen(
                [self._executable_path],
                cwd=working_dir,
                stdout=stdout_f,
                stderr=stderr_f,
                text=True,
            )

            while process.poll() is None:
                if on_tick is not None:
                    on_tick()
                time.sleep(self._poll_interval_s)

            exit_code = process.returncode

            stdout_f.seek(0)
            stderr_f.seek(0)
            stdout = stdout_f.read()
            stderr = stderr_f.read()

        return TrainingExecutionResult(exit_code=exit_code, stdout=stdout, stderr=stderr)
