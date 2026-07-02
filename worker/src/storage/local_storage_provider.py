import os
import shutil

from .i_storage_provider import IStorageProvider


class LocalStorageProvider(IStorageProvider):
    def __init__(self, base_path: str) -> None:
        self._base = base_path

    def _resolve(self, key: str) -> str:
        return os.path.join(self._base, key)

    def download(self, key: str, dest_path: str) -> None:
        src = self._resolve(key)
        if not os.path.isfile(src):
            raise FileNotFoundError(f"Key not found in local storage: {key}")
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        shutil.copy2(src, dest_path)

    def upload(self, key: str, src_path: str) -> None:
        if not os.path.isfile(src_path):
            raise FileNotFoundError(f"Local file not found: {src_path}")
        dest = self._resolve(key)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(src_path, dest)

    def exists(self, key: str) -> bool:
        return os.path.isfile(self._resolve(key))
