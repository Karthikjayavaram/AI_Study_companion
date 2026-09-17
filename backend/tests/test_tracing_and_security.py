import os
from unittest.mock import patch, MagicMock
import pytest

from app.core.config import settings
from app.core.tracing import (
    is_tracing_enabled,
    init_tracing,
    scrub_trace_metadata,
    trace_ai_call,
)


def test_tracing_disabled_by_default_without_key():
    with patch.object(settings, "LANGCHAIN_TRACING_V2", True), \
         patch.object(settings, "LANGCHAIN_API_KEY", ""):
        assert is_tracing_enabled() is False


def test_tracing_enabled_with_flag_and_key():
    with patch.object(settings, "LANGCHAIN_TRACING_V2", True), \
         patch.object(settings, "LANGCHAIN_API_KEY", "lsv2_test_valid_key_12345"):
        assert is_tracing_enabled() is True


def test_scrub_trace_metadata_redacts_sensitive_keys():
    raw_metadata = {
        "user_id": "u-123",
        "api_key": "secret_hf_token",
        "nested": {
            "password": "my_password",
            "safe_field": "public_data",
            "auth_token": "bearer_xyz",
        },
        "list_items": [
            {"token": "token123", "value": 42},
            {"clean": "safe"},
        ],
    }

    scrubbed = scrub_trace_metadata(raw_metadata)

    assert scrubbed["user_id"] == "u-123"
    assert scrubbed["api_key"] == "[REDACTED]"
    assert scrubbed["nested"]["password"] == "[REDACTED]"
    assert scrubbed["nested"]["safe_field"] == "public_data"
    assert scrubbed["nested"]["auth_token"] == "[REDACTED]"
    assert scrubbed["list_items"][0]["token"] == "[REDACTED]"
    assert scrubbed["list_items"][0]["value"] == 42
    assert scrubbed["list_items"][1]["clean"] == "safe"


def test_trace_ai_call_failure_does_not_break_app():
    """Even if LangSmith raises an error during run creation or posting, application continues."""
    with patch.object(settings, "LANGCHAIN_TRACING_V2", True), \
         patch.object(settings, "LANGCHAIN_API_KEY", "lsv2_test_key"), \
         patch("langsmith.run_trees.RunTree", side_effect=Exception("LangSmith connection failed")):

        app_result = None
        with trace_ai_call("test_call", run_type="llm", inputs={"prompt": "hello"}):
            app_result = "important AI result"

        assert app_result == "important AI result"


def test_frontend_security_audit():
    """Verify that frontend directory has no exposed backend credentials."""
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/src"))
    assert os.path.exists(frontend_dir), f"Frontend src not found at {frontend_dir}"

    forbidden_patterns = [
        "HF_API_KEY",
        "LANGCHAIN_API_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "DATABASE_URL",
    ]

    for root, _, files in os.walk(frontend_dir):
        for f in files:
            if f.endswith((".ts", ".tsx", ".js", ".jsx", ".html", ".css")):
                file_path = os.path.join(root, f)
                with open(file_path, "r", encoding="utf-8", errors="ignore") as fl:
                    content = fl.read()
                    for pattern in forbidden_patterns:
                        assert pattern not in content, (
                            f"Security failure: {pattern} found in frontend file {file_path}"
                        )


def test_langsmith_live_connectivity():
    """Verify live LangSmith connectivity when LANGCHAIN_API_KEY is configured."""
    from app.core.tracing import verify_langsmith_live
    if settings.LANGCHAIN_TRACING_V2 and settings.LANGCHAIN_API_KEY.strip():
        assert verify_langsmith_live() is True

