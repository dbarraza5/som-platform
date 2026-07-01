from ..config.settings import settings
from .i_storage_provider import IStorageProvider
from .local_storage_provider import LocalStorageProvider
from .s3_storage_provider import S3StorageProvider

_provider: IStorageProvider | None = None


def get_storage_provider() -> IStorageProvider:
    global _provider
    if _provider is None:
        if settings.STORAGE_DRIVER == "local":
            _provider = LocalStorageProvider(base_path=settings.STORAGE_LOCAL_PATH)
        elif settings.STORAGE_DRIVER == "s3":
            _provider = S3StorageProvider()
        else:
            raise ValueError(f"Unknown STORAGE_DRIVER: {settings.STORAGE_DRIVER!r}")
    return _provider
