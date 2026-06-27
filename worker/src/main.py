import time
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [worker] %(message)s")
logger = logging.getLogger(__name__)


def main():
    logger.info("Worker started — Phase 0")
    while True:
        logger.info("Waiting for jobs...")
        time.sleep(30)


if __name__ == "__main__":
    main()
