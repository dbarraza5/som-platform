import logging
import signal
import sys

from .config.settings import settings
from .queue.factory import create_queue_consumer
from .services.dispatcher import dispatch_message
from .services.training_recovery_service import recover_interrupted_trainings

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
    stream=sys.stdout,
    force=True,
)
logger = logging.getLogger(__name__)


def main() -> None:
    logger.info("[WORKER] Iniciando...")
    logger.info(
        "[WORKER] Configuración cargada. QUEUE_DRIVER=%s  QUEUE_NAME=%s  TRAINING_QUEUE_NAME=%s",
        settings.QUEUE_DRIVER,
        settings.QUEUE_NAME,
        settings.TRAINING_QUEUE_NAME,
    )

    consumer = create_queue_consumer()

    def shutdown(signum, frame):
        logger.info("[WORKER] Señal de parada recibida. Cerrando...")
        consumer.close()
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    logger.info("[WORKER] Conectando a %s...", settings.QUEUE_DRIVER.upper())
    consumer.connect()
    logger.info("[WORKER] Conectado correctamente.")

    recover_interrupted_trainings()

    queues = [settings.QUEUE_NAME, settings.TRAINING_QUEUE_NAME]
    logger.info("[WORKER] Esperando trabajos en colas %s...", queues)

    consumer.consume(queues, dispatch_message)


if __name__ == "__main__":
    main()
