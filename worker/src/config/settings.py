import os


class Settings:
    QUEUE_DRIVER: str = os.environ.get("QUEUE_DRIVER", "redis")
    REDIS_HOST: str = os.environ.get("REDIS_HOST", "redis")
    REDIS_PORT: int = int(os.environ.get("REDIS_PORT", "6379"))
    QUEUE_NAME: str = os.environ.get("QUEUE_NAME", "som_jobs")
    TRAINING_QUEUE_NAME: str = os.environ.get("TRAINING_QUEUE_NAME", "training_jobs")
    LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")
    STORAGE_DRIVER: str = os.environ.get("STORAGE_DRIVER", "local")
    STORAGE_LOCAL_PATH: str = os.environ.get("STORAGE_LOCAL_PATH", "/app/storage")
    BACKEND_URL: str = os.environ.get("BACKEND_URL", "http://backend:3000")
    INTERNAL_API_KEY: str = os.environ.get("INTERNAL_API_KEY", "dev-internal-api-key-change-in-production")
    TRAINING_STATUS_POLL_INTERVAL_S: float = float(os.environ.get("TRAINING_STATUS_POLL_INTERVAL_S", "5"))


settings = Settings()
