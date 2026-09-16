from app.core.config import settings
from app.services.storage.base import StorageService
from app.services.storage.local import LocalStorageService
from app.services.storage.s3 import S3StorageService

_storage_instance = None


def get_storage_service() -> StorageService:
    global _storage_instance
    if _storage_instance is None:
        if settings.STORAGE_BACKEND == "s3":
            _storage_instance = S3StorageService()
        else:
            _storage_instance = LocalStorageService()
    return _storage_instance


__all__ = ["StorageService", "LocalStorageService", "S3StorageService", "get_storage_service"]
