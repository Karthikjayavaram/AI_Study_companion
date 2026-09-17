import mimetypes
from typing import BinaryIO, Optional
import httpx

from app.core.config import settings
from app.core.logging import logger
from app.services.storage.base import StorageService


class SupabaseStorageService(StorageService):
    """
    Supabase Storage implementation using Supabase Storage REST API.
    Configured via SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        service_role_key: Optional[str] = None,
        bucket_name: Optional[str] = None,
        client: Optional[httpx.Client] = None,
    ):
        self.base_url = (base_url or settings.SUPABASE_URL).rstrip("/")
        self.service_role_key = service_role_key or settings.SUPABASE_SERVICE_ROLE_KEY
        self.bucket_name = bucket_name or settings.SUPABASE_STORAGE_BUCKET or "ai-study-companion"
        self._custom_client = client

    @property
    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.service_role_key}",
            "apikey": self.service_role_key,
        }

    def _get_client(self) -> httpx.Client:
        if self._custom_client is not None:
            return self._custom_client
        return httpx.Client(timeout=30.0)

    def _normalize_key(self, relative_path: str) -> str:
        clean = relative_path.replace("\\", "/").strip("/")
        parts = [p for p in clean.split("/") if p and p != "."]
        if any(p == ".." for p in parts):
            raise ValueError(f"Invalid path with traversal segments: {relative_path}")
        return "/".join(parts)

    def save_file(self, file_obj: BinaryIO, relative_path: str) -> str:
        key = self._normalize_key(relative_path)
        content_type, _ = mimetypes.guess_type(key)
        content_type = content_type or "application/octet-stream"

        if hasattr(file_obj, "seek"):
            try:
                file_obj.seek(0)
            except Exception:
                pass
        data = file_obj.read()

        endpoint = f"{self.base_url}/storage/v1/object/{self.bucket_name}/{key}"
        headers = {
            **self._headers,
            "Content-Type": content_type,
            "x-upsert": "true",
        }

        client = self._get_client()
        try:
            res = client.post(endpoint, content=data, headers=headers)
            if res.status_code not in (200, 201):
                logger.error(f"Supabase storage upload failed for {key}: {res.status_code} {res.text}")
                raise RuntimeError(f"Supabase storage upload failed with status {res.status_code}: {res.text}")
            logger.info(f"Uploaded file to Supabase storage: {key} ({len(data)} bytes)")
            return key
        finally:
            if self._custom_client is None:
                client.close()

    def get_file_bytes(self, relative_path: str) -> bytes:
        key = self._normalize_key(relative_path)
        # Use authenticated object endpoint to prevent stale CDN cache
        endpoint = f"{self.base_url}/storage/v1/object/authenticated/{self.bucket_name}/{key}"

        client = self._get_client()
        try:
            res = client.get(endpoint, headers=self._headers)
            if res.status_code == 404:
                raise FileNotFoundError(f"File not found in Supabase storage: {key}")
            if res.status_code == 400:
                try:
                    data = res.json()
                    if data.get("error") == "not_found" or data.get("code") == "NoSuchKey" or data.get("statusCode") == "404":
                        raise FileNotFoundError(f"File not found in Supabase storage: {key}")
                except Exception as parse_err:
                    if isinstance(parse_err, FileNotFoundError):
                        raise
                raise RuntimeError(f"Supabase storage download failed: {res.status_code} {res.text}")
            if res.status_code != 200:
                logger.error(f"Supabase storage download failed for {key}: {res.status_code} {res.text}")
                raise RuntimeError(f"Supabase storage download failed with status {res.status_code}: {res.text}")
            return res.content
        finally:
            if self._custom_client is None:
                client.close()

    def delete_file(self, relative_path: str) -> bool:
        key = self._normalize_key(relative_path)
        endpoint = f"{self.base_url}/storage/v1/object/{self.bucket_name}"

        client = self._get_client()
        try:
            res = client.request(
                "DELETE",
                endpoint,
                headers={**self._headers, "Content-Type": "application/json"},
                json={"prefixes": [key]},
            )
            if res.status_code in (200, 204):
                logger.info(f"Deleted file from Supabase storage: {key}")
                return True
            logger.warning(f"Failed to delete file from Supabase storage: {key} (status {res.status_code})")
            return False
        except Exception as e:
            logger.error(f"Error deleting file from Supabase storage: {key} - {e}")
            return False
        finally:
            if self._custom_client is None:
                client.close()

    def get_file_url(self, relative_path: str, expires_in: int = 3600) -> str:
        key = self._normalize_key(relative_path)
        sign_endpoint = f"{self.base_url}/storage/v1/object/sign/{self.bucket_name}/{key}"

        client = self._get_client()
        try:
            res = client.post(
                sign_endpoint,
                headers={**self._headers, "Content-Type": "application/json"},
                json={"expiresIn": expires_in},
            )
            if res.status_code == 200:
                data = res.json()
                signed_url = data.get("signedURL")
                if signed_url:
                    if signed_url.startswith("http://") or signed_url.startswith("https://"):
                        return signed_url
                    return f"{self.base_url}/storage/v1{signed_url}"
        except Exception as e:
            logger.warning(f"Could not generate signed URL for {key}: {e}")
        finally:
            if self._custom_client is None:
                client.close()

        # Fallback to public URL path
        return f"{self.base_url}/storage/v1/object/public/{self.bucket_name}/{key}"
