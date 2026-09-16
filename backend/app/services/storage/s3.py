from typing import BinaryIO
from app.core.config import settings
from app.services.storage.base import StorageService


class S3StorageService(StorageService):
    """
    S3 / MinIO compatible object storage implementation.
    Configured via S3_BUCKET_NAME, S3_REGION, and credentials.
    """
    def __init__(self):
        self.bucket_name = settings.S3_BUCKET_NAME
        # In full implementation, boto3 client initialized here

    def save_file(self, file_obj: BinaryIO, relative_path: str) -> str:
        # Placeholder for boto3 upload_fileobj
        return f"s3://{self.bucket_name}/{relative_path}"

    def get_file_bytes(self, relative_path: str) -> bytes:
        raise NotImplementedError("S3 retrieval requires configured S3 credentials.")

    def delete_file(self, relative_path: str) -> bool:
        return True

    def get_file_url(self, relative_path: str) -> str:
        return f"https://{self.bucket_name}.s3.{settings.S3_REGION}.amazonaws.com/{relative_path}"
