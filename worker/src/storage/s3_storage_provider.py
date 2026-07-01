from .i_storage_provider import IStorageProvider


class S3StorageProvider(IStorageProvider):
    def download(self, key: str, dest_path: str) -> None:
        raise NotImplementedError(
            "S3StorageProvider is not yet implemented. Set STORAGE_DRIVER=local for local development."
        )

    def exists(self, key: str) -> bool:
        raise NotImplementedError(
            "S3StorageProvider is not yet implemented. Set STORAGE_DRIVER=local for local development."
        )
