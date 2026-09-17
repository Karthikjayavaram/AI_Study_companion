from app.core.config import settings
from app.services.storage.base import StorageService
from app.services.storage.local import LocalStorageService
from app.services.storage.supabase import SupabaseStorageService

_storage_instance = None


def get_storage_service() -> StorageService:
    global _storage_instance
    if _storage_instance is None:
        if settings.STORAGE_BACKEND == "supabase":
            _storage_instance = SupabaseStorageService()
        else:
            _storage_instance = LocalStorageService()
    return _storage_instance


def reset_storage_service() -> None:
    global _storage_instance
    _storage_instance = None


__all__ = [
    "StorageService",
    "LocalStorageService",
    "SupabaseStorageService",
    "get_storage_service",
    "reset_storage_service",
]
