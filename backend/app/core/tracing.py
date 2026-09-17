import logging
import os
from contextlib import contextmanager
from typing import Any, Dict, Generator, List, Optional

from app.core.config import settings

logger = logging.getLogger("ai_study_companion")

SENSITIVE_KEY_SUBSTRINGS = {"key", "secret", "token", "password", "auth", "credential"}


def scrub_trace_metadata(data: Any) -> Any:
    """Recursively scrub any sensitive credential keys from trace metadata dictionaries."""
    if isinstance(data, dict):
        cleaned = {}
        for k, v in data.items():
            if any(sub in k.lower() for sub in SENSITIVE_KEY_SUBSTRINGS):
                cleaned[k] = "[REDACTED]"
            else:
                cleaned[k] = scrub_trace_metadata(v)
        return cleaned
    elif isinstance(data, list):
        return [scrub_trace_metadata(item) for item in data]
    return data


def init_tracing() -> None:
    """Initialize LangChain / LangSmith environment variables if tracing is enabled and configured."""
    if settings.LANGCHAIN_TRACING_V2 and settings.LANGCHAIN_API_KEY.strip():
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_ENDPOINT"] = settings.LANGCHAIN_ENDPOINT
        os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY.strip()
        os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT
        logger.info("LangSmith tracing initialized for project '%s'", settings.LANGCHAIN_PROJECT)
    else:
        # Keep tracing disabled
        if "LANGCHAIN_TRACING_V2" in os.environ and not settings.LANGCHAIN_TRACING_V2:
            os.environ["LANGCHAIN_TRACING_V2"] = "false"


def is_tracing_enabled() -> bool:
    """Returns True only when both configuration flag and valid API key are present."""
    return bool(settings.LANGCHAIN_TRACING_V2 and settings.LANGCHAIN_API_KEY.strip())


_langsmith_client = None


def get_langsmith_client():
    global _langsmith_client
    if not is_tracing_enabled():
        return None
    current_key = settings.LANGCHAIN_API_KEY.strip()
    if _langsmith_client is None or getattr(_langsmith_client, "api_key", None) != current_key:
        try:
            import langsmith
            _langsmith_client = langsmith.Client(
                api_url=settings.LANGCHAIN_ENDPOINT,
                api_key=current_key,
                auto_batch_tracing=False,
                tracing_error_callback=lambda e: None,
            )
        except Exception as e:
            logger.debug("Could not initialize LangSmith client: %s", e)
            _langsmith_client = None
    return _langsmith_client


def reset_langsmith_client() -> None:
    global _langsmith_client
    _langsmith_client = None


@contextmanager
def trace_ai_call(
    name: str,
    run_type: str = "llm",
    inputs: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None,
) -> Generator[Optional[Any], None, None]:
    """
    Non-blocking, resilient tracing context manager.
    Traces AI LLM / embedding invocations via LangSmith when configured.
    CRITICAL: Tracing errors are caught and logged at debug level so they
    CANNOT disrupt the core application or AI workflows.
    """
    if not is_tracing_enabled():
        yield None
        return

    safe_inputs = scrub_trace_metadata(inputs or {})
    safe_tags = tags or ["ai-study-companion"]
    run_tree = None

    try:
        from langsmith.run_trees import RunTree

        client = get_langsmith_client()
        run_tree = RunTree(
            name=name,
            run_type=run_type,
            inputs=safe_inputs,
            tags=safe_tags,
            project_name=settings.LANGCHAIN_PROJECT,
            client=client,
        )
        run_tree.post()
    except Exception as e:
        logger.debug("Failed to initialize LangSmith trace for %s: %s", name, e)
        run_tree = None

    error_occurred = None
    try:
        yield run_tree
    except Exception as exc:
        error_occurred = exc
        if run_tree:
            try:
                run_tree.end(error=str(exc))
                run_tree.patch()
            except Exception as e:
                logger.debug("Failed to record error in LangSmith trace: %s", e)
        raise
    finally:
        if run_tree and not error_occurred:
            try:
                run_tree.end()
                run_tree.patch()
            except Exception as e:
                logger.debug("Failed to close LangSmith trace: %s", e)


def verify_langsmith_live() -> bool:
    """
    Verifies live connectivity to LangSmith by creating and posting a test trace run.
    Compatible with scoped / ingest-only LangSmith API keys.
    Returns True on success, False if unconfigured or API call fails.
    Never raises an exception or leaks credentials.
    """
    if not is_tracing_enabled():
        return False

    try:
        client = get_langsmith_client()
        if not client:
            return False

        # Test trace run emission (works with ingest/scoped API keys)
        from langsmith.run_trees import RunTree
        test_run = RunTree(
            name="langsmith_connectivity_smoke_test",
            run_type="chain",
            inputs={"status": "testing_connectivity"},
            project_name=settings.LANGCHAIN_PROJECT,
            client=client,
        )
        test_run.post()
        test_run.end(outputs={"status": "connected"})
        test_run.patch()
        return True
    except Exception as e:
        logger.debug("LangSmith live verification failed: %s", e)
        return False

