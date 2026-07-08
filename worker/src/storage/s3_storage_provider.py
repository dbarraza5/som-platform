import logging
import os

import boto3
from botocore.exceptions import ClientError

from ..config.settings import settings
from .i_storage_provider import IStorageProvider

logger = logging.getLogger(__name__)


class S3StorageProvider(IStorageProvider):
    def __init__(self) -> None:
        if not settings.AWS_S3_BUCKET:
            raise ValueError("AWS_S3_BUCKET is required when STORAGE_DRIVER=s3")

        kwargs: dict = {"region_name": settings.AWS_REGION}
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

        self._bucket = settings.AWS_S3_BUCKET
        self._client = boto3.client("s3", **kwargs)

    def download(self, key: str, dest_path: str) -> None:
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        logger.debug("[S3] Descargando s3://%s/%s → %s", self._bucket, key, dest_path)
        self._client.download_file(self._bucket, key, dest_path)

    def upload(self, key: str, src_path: str) -> None:
        if not os.path.isfile(src_path):
            raise FileNotFoundError(f"Local file not found: {src_path}")
        logger.debug("[S3] Subiendo %s → s3://%s/%s", src_path, self._bucket, key)
        self._client.upload_file(src_path, self._bucket, key)

    def exists(self, key: str) -> bool:
        try:
            self._client.head_object(Bucket=self._bucket, Key=key)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] in ("404", "NoSuchKey"):
                return False
            raise