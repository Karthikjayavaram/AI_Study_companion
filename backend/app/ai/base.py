from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


# =========================================================================
# Custom Exceptions for AI Provider Layer (Secrets scrubbed by design)
# =========================================================================

class AIProviderError(Exception):
    """Base exception for all AI provider errors."""
    pass


class AIProviderConfigError(AIProviderError):
    """Raised when an AI provider is missing required configuration (e.g., API key, model)."""
    pass


class AIProviderAuthError(AIProviderError):
    """Raised when AI provider authentication fails (e.g., invalid token)."""
    pass


class AIProviderNetworkError(AIProviderError):
    """Raised when an upstream network or timeout error occurs."""
    pass


class AIProviderDimensionError(AIProviderError):
    """Raised when embedding output dimension does not match configured dimension."""
    pass


# =========================================================================
# Result Data Structures
# =========================================================================

class LLMResult(BaseModel):
    content: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    model: str = ""
    latency_ms: int = 0


# =========================================================================
# Core Provider Abstractions
# =========================================================================

class ChatProvider(ABC):
    """
    Abstract interface for chat generation providers (e.g. Hugging Face Inference API).
    Decoupled from embedding generation.
    """

    @abstractmethod
    def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
    ) -> LLMResult:
        """Generates text from the chat model given prompt and optional system instructions."""
        pass

    def generate_structured(
        self,
        prompt: str,
        response_schema: Dict[str, Any],
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generates structured JSON output conforming to response_schema."""
        return {}


class EmbeddingProvider(ABC):
    """
    Abstract interface for dense vector embedding generation.
    Decoupled from chat generation.
    """

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Returns the configured/expected embedding dimension (e.g., 384)."""
        pass

    @abstractmethod
    def embed_text(self, text: str) -> List[float]:
        """Generates a dense embedding vector for a single string."""
        pass

    @abstractmethod
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generates dense embedding vectors for a batch of strings."""
        pass

    # Helper alias for backward compatibility
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Backward-compatible alias for embed_texts."""
        return self.embed_texts(texts)


# =========================================================================
# Backward-Compatible Unified Base Client
# =========================================================================

class BaseLLMClient(ChatProvider, EmbeddingProvider, ABC):
    """
    Unified base interface combining ChatProvider and EmbeddingProvider.
    Maintained for backwards-compatibility with existing tests and mock classes.
    """

    @property
    def dimension(self) -> int:
        return 1536

    def embed_text(self, text: str) -> List[float]:
        results = self.embed_texts([text])
        return results[0] if results else [0.0] * self.dimension

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return self.generate_embeddings(texts)

    @abstractmethod
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generates dense vector embeddings for retrieval."""
        pass
