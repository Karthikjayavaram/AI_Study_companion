import os
import shutil
from typing import BinaryIO
from app.core.config import settings
from app.services.storage.base import StorageService


class LocalStorageService(StorageService):
    def __init__(self, base_dir: str = None):
        self.base_dir = os.path.abspath(base_dir or settings.LOCAL_STORAGE_DIR)
        os.makedirs(self.base_dir, exist_ok=True)

    def _resolve_path(self, relative_path: str) -> str:
        # Prevent directory traversal
        clean_rel = os.path.normpath(relative_path).lstrip(os.sep)
        return os.path.join(self.base_dir, clean_rel)

    def save_file(self, file_obj: BinaryIO, relative_path: str) -> str:
        dest_path = self._resolve_path(relative_path)
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        with open(dest_path, "wb") as f:
            shutil.copyfileobj(file_obj, f)
        return dest_path

    def get_file_bytes(self, relative_path: str) -> bytes:
        dest_path = self._resolve_path(relative_path)
        if not os.path.exists(dest_path):
            raise FileNotFoundError(f"File at {relative_path} not found.")
        with open(dest_path, "rb") as f:
            return f.read()

    def delete_file(self, relative_path: str) -> bool:
        dest_path = self._resolve_path(relative_path)
        if os.path.exists(dest_path):
            os.remove(dest_path)
            return True
        return False

    def get_file_url(self, relative_path: str) -> str:
        return f"/api/v1/materials/download/{relative_path.replace(os.sep, '/')}"
