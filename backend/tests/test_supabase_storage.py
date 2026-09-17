import io
from unittest.mock import MagicMock, patch
import pytest
import httpx

from app.core.config import settings
from app.services.storage.supabase import SupabaseStorageService
from app.services.storage import get_storage_service, reset_storage_service, LocalStorageService


@pytest.fixture
def mock_httpx_client():
    client = MagicMock(spec=httpx.Client)
    return client


def test_supabase_storage_normalize_key():
    service = SupabaseStorageService(
        base_url="https://test.supabase.co",
        service_role_key="test-key",
        bucket_name="test-bucket",
    )

    assert service._normalize_key("projects/p1/doc.pdf") == "projects/p1/doc.pdf"
    assert service._normalize_key("/projects/p1/doc.pdf") == "projects/p1/doc.pdf"
    assert service._normalize_key(r"projects\p1\doc.pdf") == "projects/p1/doc.pdf"
    assert service._normalize_key("./projects/p1/doc.pdf") == "projects/p1/doc.pdf"

    with pytest.raises(ValueError):
        service._normalize_key("../escape.pdf")


def test_supabase_storage_save_file(mock_httpx_client):
    service = SupabaseStorageService(
        base_url="https://test.supabase.co",
        service_role_key="test-key",
        bucket_name="test-bucket",
        client=mock_httpx_client,
    )

    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.text = '{"Key": "test-bucket/projects/p1/test.pdf"}'
    mock_httpx_client.post.return_value = mock_resp

    content = b"PDF document binary data"
    file_obj = io.BytesIO(content)

    key = service.save_file(file_obj, "projects/p1/test.pdf")

    assert key == "projects/p1/test.pdf"
    mock_httpx_client.post.assert_called_once()
    call_args = mock_httpx_client.post.call_args
    assert call_args[0][0] == "https://test.supabase.co/storage/v1/object/test-bucket/projects/p1/test.pdf"
    assert call_args[1]["content"] == content
    assert call_args[1]["headers"]["x-upsert"] == "true"
    assert call_args[1]["headers"]["apikey"] == "test-key"


def test_supabase_storage_get_file_bytes(mock_httpx_client):
    service = SupabaseStorageService(
        base_url="https://test.supabase.co",
        service_role_key="test-key",
        bucket_name="test-bucket",
        client=mock_httpx_client,
    )

    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.content = b"retrieved file contents"
    mock_httpx_client.get.return_value = mock_resp

    data = service.get_file_bytes("projects/p1/test.pdf")

    assert data == b"retrieved file contents"
    mock_httpx_client.get.assert_called_once_with(
        "https://test.supabase.co/storage/v1/object/authenticated/test-bucket/projects/p1/test.pdf",
        headers={"Authorization": "Bearer test-key", "apikey": "test-key"},
    )


def test_supabase_storage_get_file_bytes_not_found(mock_httpx_client):
    service = SupabaseStorageService(
        base_url="https://test.supabase.co",
        service_role_key="test-key",
        bucket_name="test-bucket",
        client=mock_httpx_client,
    )

    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 404
    mock_httpx_client.get.return_value = mock_resp

    with pytest.raises(FileNotFoundError):
        service.get_file_bytes("projects/p1/missing.pdf")


def test_supabase_storage_delete_file(mock_httpx_client):
    service = SupabaseStorageService(
        base_url="https://test.supabase.co",
        service_role_key="test-key",
        bucket_name="test-bucket",
        client=mock_httpx_client,
    )

    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_httpx_client.request.return_value = mock_resp

    success = service.delete_file("projects/p1/test.pdf")

    assert success is True
    mock_httpx_client.request.assert_called_once_with(
        "DELETE",
        "https://test.supabase.co/storage/v1/object/test-bucket",
        headers={"Authorization": "Bearer test-key", "apikey": "test-key", "Content-Type": "application/json"},
        json={"prefixes": ["projects/p1/test.pdf"]},
    )


def test_supabase_storage_get_file_url_signed(mock_httpx_client):
    service = SupabaseStorageService(
        base_url="https://test.supabase.co",
        service_role_key="test-key",
        bucket_name="test-bucket",
        client=mock_httpx_client,
    )

    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"signedURL": "/object/sign/test-bucket/projects/p1/file.pdf?token=abc"}
    mock_httpx_client.post.return_value = mock_resp

    url = service.get_file_url("projects/p1/file.pdf")

    assert url == "https://test.supabase.co/storage/v1/object/sign/test-bucket/projects/p1/file.pdf?token=abc"


def test_storage_factory_selection():
    reset_storage_service()

    with patch.object(settings, "STORAGE_BACKEND", "supabase"):
        reset_storage_service()
        service = get_storage_service()
        assert isinstance(service, SupabaseStorageService)

    with patch.object(settings, "STORAGE_BACKEND", "local"):
        reset_storage_service()
        service = get_storage_service()
        assert isinstance(service, LocalStorageService)

    reset_storage_service()
