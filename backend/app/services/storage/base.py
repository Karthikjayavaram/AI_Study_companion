from abc import ABC, abstractmethod
from typing import BinaryIO, Optional


class StorageService(ABC):
    @abstractmethod
    def save_file(self, file_obj: BinaryIO, relative_path: str) -> str:
        """Saves a binary file stream and returns the stored URI/path."""
        pass

    @abstractmethod
    def get_file_bytes(self, relative_path: str) -> bytes:
        """Retrieves raw bytes of a stored file."""
        pass

    @abstractmethod
    def delete_file(self, relative_path: str) -> bool:
        """Deletes a stored file."""
        pass

    @abstractmethod
    def get_file_url(self, relative_path: str) -> str:
        """Returns accessible download URL or local file path."""
        pass
