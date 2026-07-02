from abc import ABC, abstractmethod


class IStorageProvider(ABC):
    @abstractmethod
    def download(self, key: str, dest_path: str) -> None:
        """Download the file at storage key to dest_path."""
        ...

    @abstractmethod
    def upload(self, key: str, src_path: str) -> None:
        """Upload the local file at src_path to storage key."""
        ...

    @abstractmethod
    def exists(self, key: str) -> bool:
        """Check whether a file exists at the given storage key."""
        ...
