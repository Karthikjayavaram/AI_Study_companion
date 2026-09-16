import logging
import re
import time
from typing import Any, Dict, List, Optional
import httpx

from app.ai.base import (
    AIProviderAuthError,
    AIProviderConfigError,
    AIProviderDimensionError,
    AIProviderError,
    AIProviderNetworkError,
    ChatProvider,
    EmbeddingProvider,
    LLMResult,
)
from app.core.config import settings

logger = logging.getLogger("ai_study_companion")


def _scrub_secrets(text: str, api_key: Optional[str] = None) -> str:
    """Scrub potential API keys and bearer tokens from error messages."""
    if not text:
        return ""
    scrubbed = text
    if api_key and api_key.strip():
        scrubbed = scrubbed.replace(api_key, "[REDACTED_API_KEY]")
    scrubbed = re.sub(r"Bearer\s+[a-zA-Z0-9_\-\.]{6,}", "Bearer [REDACTED_TOKEN]", scrubbed)
    scrubbed = re.sub(r"hf_[a-zA-Z0-9]{20,}", "[REDACTED_HF_TOKEN]", scrubbed)
    return scrubbed


class HuggingFaceChatProvider(ChatProvider):
    """
    Production Chat Provider using Hugging Face Inference API.
    Calls Hugging Face Inference API (v1 chat completions or model inference endpoint)
    via standard HTTP (httpx). Never exposes credentials in logs or exceptions.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        timeout_seconds: Optional[float] = None,
    ):
        self.api_key = api_key if api_key is not None else settings.HF_API_KEY
        self.model = model or settings.HF_CHAT_MODEL
        self.temperature = temperature if temperature is not None else settings.HF_TEMPERATURE
        self.max_tokens = max_tokens or settings.HF_MAX_TOKENS
        self.timeout_seconds = timeout_seconds or settings.HF_TIMEOUT_SECONDS

    def _ensure_configured(self) -> None:
        """Validate that required Hugging Face API key is present."""
        if not self.api_key or not self.api_key.strip():
            raise AIProviderConfigError(
                "Hugging Face API key (HF_API_KEY) is not configured. "
                "Please set HF_API_KEY in your environment to use the Hugging Face chat provider."
            )
        if not self.model or not self.model.strip():
            raise AIProviderConfigError("Hugging Face chat model (HF_CHAT_MODEL) is not configured.")

    def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> LLMResult:
        self._ensure_configured()

        start_time = time.time()
        temp = temperature if temperature is not None else self.temperature
        tokens = max_tokens or self.max_tokens

        messages = []
        if system_prompt and system_prompt.strip():
            messages.append({"role": "system", "content": system_prompt.strip()})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json",
        }

        # Strategy 1: Serverless v1 chat completions router endpoint on Hugging Face
        v1_url = "https://api-inference.huggingface.co/v1/chat/completions"
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temp,
            "max_tokens": tokens,
        }

        content = ""
        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0
        returned_model = self.model

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                res = client.post(v1_url, headers=headers, json=payload)

                # If v1 endpoint returns 404 or unsupported, fallback to models/{model} endpoint
                if res.status_code == 404:
                    model_url = f"https://api-inference.huggingface.co/models/{self.model}"
                    # Format prompt for model endpoint
                    full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
                    model_payload = {
                        "inputs": full_prompt,
                        "parameters": {
                            "temperature": max(temp, 0.01),
                            "max_new_tokens": tokens,
                            "return_full_text": False,
                        },
                        "options": {"wait_for_model": True},
                    }
                    res = client.post(model_url, headers=headers, json=model_payload)

                if res.status_code == 401 or res.status_code == 403:
                    raise AIProviderAuthError(
                        f"Hugging Face authentication failed (status {res.status_code}). "
                        "Please verify your HF_API_KEY."
                    )
                elif res.status_code >= 400:
                    try:
                        err_body = res.json()
                        err_msg = err_body.get("error", res.text)
                    except Exception:
                        err_msg = res.text
                    err_msg = _scrub_secrets(str(err_msg), self.api_key)
                    raise AIProviderError(f"Hugging Face API error (status {res.status_code}): {err_msg}")

                data = res.json()

        except httpx.TimeoutException as e:
            raise AIProviderNetworkError(
                f"Hugging Face request timed out after {self.timeout_seconds}s."
            ) from e
        except httpx.RequestError as e:
            cleaned_err = _scrub_secrets(str(e), self.api_key)
            raise AIProviderNetworkError(f"Network error connecting to Hugging Face: {cleaned_err}") from e

        latency_ms = int((time.time() - start_time) * 1000)

        # Parse response data
        if isinstance(data, dict):
            if "choices" in data and len(data["choices"]) > 0:
                choice = data["choices"][0]
                msg = choice.get("message", {})
                content = msg.get("content", "")
                if "model" in data:
                    returned_model = data["model"]
                usage = data.get("usage", {})
                prompt_tokens = usage.get("prompt_tokens", 0)
                completion_tokens = usage.get("completion_tokens", 0)
                total_tokens = usage.get("total_tokens", 0)
            elif "generated_text" in data:
                content = data["generated_text"]
            elif "error" in data:
                err_msg = _scrub_secrets(str(data["error"]), self.api_key)
                raise AIProviderError(f"Hugging Face API returned error: {err_msg}")
        elif isinstance(data, list) and len(data) > 0:
            first_item = data[0]
            if isinstance(first_item, dict) and "generated_text" in first_item:
                content = first_item["generated_text"]
            elif isinstance(first_item, str):
                content = first_item

        return LLMResult(
            content=content.strip() if content else "",
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            model=returned_model,
            latency_ms=latency_ms,
        )


class HuggingFaceEmbeddingProvider(EmbeddingProvider):
    """
    Production Embedding Provider using Hugging Face Feature Extraction Inference API.
    Enforces strict vector dimension validation against configured EMBEDDING_DIMENSION.
    Never silently pads or truncates vectors.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        dimension: Optional[int] = None,
        timeout_seconds: Optional[float] = None,
    ):
        self.api_key = api_key if api_key is not None else settings.HF_API_KEY
        self.model = model or settings.HF_EMBEDDING_MODEL
        self._dimension = dimension if dimension is not None else settings.EMBEDDING_DIMENSION
        self.timeout_seconds = timeout_seconds or settings.HF_TIMEOUT_SECONDS

    @property
    def dimension(self) -> int:
        return self._dimension

    def _ensure_configured(self) -> None:
        if not self.api_key or not self.api_key.strip():
            raise AIProviderConfigError(
                "Hugging Face API key (HF_API_KEY) is not configured. "
                "Please set HF_API_KEY in your environment to use the Hugging Face embedding provider."
            )
        if not self.model or not self.model.strip():
            raise AIProviderConfigError("Hugging Face embedding model (HF_EMBEDDING_MODEL) is not configured.")

    def embed_text(self, text: str) -> List[float]:
        results = self.embed_texts([text])
        if not results:
            raise AIProviderError("Embedding provider returned empty response for text.")
        return results[0]

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        self._ensure_configured()

        url = f"https://api-inference.huggingface.co/models/{self.model}"
        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json",
        }
        payload = {
            "inputs": texts,
            "options": {"wait_for_model": True},
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                res = client.post(url, headers=headers, json=payload)

                if res.status_code == 401 or res.status_code == 403:
                    raise AIProviderAuthError(
                        f"Hugging Face embedding authentication failed (status {res.status_code}). "
                        "Please verify your HF_API_KEY."
                    )
                elif res.status_code >= 400:
                    try:
                        err_body = res.json()
                        err_msg = err_body.get("error", res.text)
                    except Exception:
                        err_msg = res.text
                    err_msg = _scrub_secrets(str(err_msg), self.api_key)
                    raise AIProviderError(
                        f"Hugging Face embedding API error (status {res.status_code}): {err_msg}"
                    )

                data = res.json()

        except httpx.TimeoutException as e:
            raise AIProviderNetworkError(
                f"Hugging Face embedding request timed out after {self.timeout_seconds}s."
            ) from e
        except httpx.RequestError as e:
            cleaned_err = _scrub_secrets(str(e), self.api_key)
            raise AIProviderNetworkError(
                f"Network error connecting to Hugging Face embedding API: {cleaned_err}"
            ) from e

        # Normalize and validate raw output
        raw_vectors: List[List[float]] = []

        if isinstance(data, list):
            # Check if it's a single float list [0.1, 0.2, ...] (e.g. for single input text)
            if data and isinstance(data[0], (int, float)):
                raw_vectors = [data]
            elif data and isinstance(data[0], list):
                # Check if elements are floats (2D) or list of token vectors (3D)
                if data[0] and isinstance(data[0][0], (int, float)):
                    # 2D list: [ [0.1, ...], [0.2, ...] ]
                    raw_vectors = data
                elif data[0] and isinstance(data[0][0], list):
                    # 3D list: token embeddings [batch, seq_len, dim] -> mean pool to [batch, dim]
                    for item in data:
                        if not item:
                            raw_vectors.append([0.0] * self.dimension)
                            continue
                        token_count = len(item)
                        vec_len = len(item[0])
                        pooled = [
                            sum(item[t][d] for t in range(token_count)) / token_count
                            for d in range(vec_len)
                        ]
                        raw_vectors.append(pooled)
        elif isinstance(data, dict) and "error" in data:
            err_msg = _scrub_secrets(str(data["error"]), self.api_key)
            raise AIProviderError(f"Hugging Face embedding API returned error: {err_msg}")
        else:
            raise AIProviderError(f"Unexpected response format from Hugging Face embedding API: {type(data)}")

        if len(raw_vectors) != len(texts):
            raise AIProviderError(
                f"Embedding count mismatch: sent {len(texts)} texts, received {len(raw_vectors)} vectors."
            )

        # STRICT DIMENSION VALIDATION: no silent padding, no silent truncation
        validated_vectors: List[List[float]] = []
        for idx, vec in enumerate(raw_vectors):
            actual_dim = len(vec)
            if actual_dim != self.dimension:
                raise AIProviderDimensionError(
                    f"Embedding dimension mismatch on text item {idx}: model '{self.model}' produced "
                    f"{actual_dim} dimensions, but configured EMBEDDING_DIMENSION is {self.dimension}. "
                    "Ensure EMBEDDING_DIMENSION matches the configured model or update the database schema."
                )
            validated_vectors.append([float(x) for x in vec])

        return validated_vectors
