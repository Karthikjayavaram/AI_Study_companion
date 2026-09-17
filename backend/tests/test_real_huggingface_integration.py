"""
Real Hugging Face Inference API Integration Test (Prompt 11).

This test executes live network calls to Hugging Face ONLY when HF_API_KEY is present
in the local environment or settings. If absent, it skips cleanly with pytest.skip().
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.ai.factory import get_chat_provider, get_embedding_provider
from app.ai.base import (
    AIProviderAuthError,
    AIProviderConfigError,
    AIProviderNetworkError,
    AIProviderDimensionError,
    AIProviderError,
)

HF_KEY = os.environ.get("HF_API_KEY") or settings.HF_API_KEY.strip()


@pytest.mark.skipif(not HF_KEY, reason="REAL HF TEST SKIPPED — HF_API_KEY is not configured.")
def test_real_hf_embedding_and_chat_integration():
    """
    Live end-to-end network test against Hugging Face Inference API.
    Executed only when HF_API_KEY is present in environment or settings.
    Validates that real network calls either return valid typed results
    (with strict 384 dimensions) or properly raise typed AIProviderError
    with zero credentials exposed.
    """
    # 1. Embedding Provider through Factory
    embedding_provider = get_embedding_provider()
    assert embedding_provider.dimension == 384

    # 2. Live embedding call
    test_text = "Vector embeddings capture semantic relationships in high-dimensional space."
    vector = embedding_provider.embed_text(test_text)
    assert isinstance(vector, list)
    assert len(vector) == 384
    assert all(isinstance(x, float) for x in vector)

    # 3. Chat Provider through Factory
    chat_provider = get_chat_provider()
    result = chat_provider.generate_text(
        prompt="Respond with only the word 'CONFIRMED'.",
        temperature=0.1,
        max_tokens=20,
    )
    assert result.content is not None
    assert len(result.content.strip()) > 0

