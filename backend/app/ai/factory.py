import logging
from typing import Optional
from app.core.config import settings
from app.ai.base import ChatProvider, EmbeddingProvider, AIProviderConfigError
from app.ai.huggingface_provider import (
    HuggingFaceChatProvider,
    HuggingFaceEmbeddingProvider,
)

logger = logging.getLogger("ai_study_companion")


def get_chat_provider(provider_name: Optional[str] = None) -> ChatProvider:
    """
    Factory function returning the configured ChatProvider.
    Uses Hugging Face Inference API as the primary AI provider.
    """
    name = (provider_name or settings.AI_PROVIDER).lower().strip()
    if name == "huggingface":
        return HuggingFaceChatProvider()
    else:
        raise AIProviderConfigError(
            f"Unsupported AI chat provider '{name}'. "
            "This application uses Hugging Face Inference API ('huggingface')."
        )


def get_embedding_provider(provider_name: Optional[str] = None) -> EmbeddingProvider:
    """
    Factory function returning the configured EmbeddingProvider.
    Uses Hugging Face Feature Extraction Inference API as the primary embedding provider.
    """
    name = (provider_name or settings.AI_PROVIDER).lower().strip()
    if name == "huggingface":
        return HuggingFaceEmbeddingProvider()
    else:
        raise AIProviderConfigError(
            f"Unsupported AI embedding provider '{name}'. "
            "This application uses Hugging Face Feature Extraction ('huggingface')."
        )
