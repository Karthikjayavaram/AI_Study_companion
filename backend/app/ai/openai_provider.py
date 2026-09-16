import time
from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.core.logging import logger
from app.ai.base import BaseLLMClient, LLMResult

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


class OpenAIProvider(BaseLLMClient):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.default_model = settings.OPENAI_DEFAULT_MODEL
        self.embedding_model = settings.OPENAI_EMBEDDING_MODEL
        self.client = OpenAI(api_key=self.api_key) if HAS_OPENAI and self.api_key else None

    def is_configured(self) -> bool:
        return self.client is not None

    def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
    ) -> LLMResult:
        if not self.is_configured():
            logger.warning("OpenAI API key not configured; returning mock response.")
            return LLMResult(
                content="[AI Tutor Stub]: Please configure OPENAI_API_KEY to enable live model responses.",
                model="mock-gpt",
                latency_ms=10,
            )

        start_time = time.time()
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = self.client.chat.completions.create(
            model=self.default_model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        latency = int((time.time() - start_time) * 1000)
        usage = response.usage

        return LLMResult(
            content=response.choices[0].message.content or "",
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            total_tokens=usage.total_tokens if usage else 0,
            model=response.model,
            latency_ms=latency,
        )

    def generate_structured(
        self,
        prompt: str,
        response_schema: Dict[str, Any],
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not self.is_configured():
            return {"mock": True, "message": "API key required for live structured outputs"}

        # In full phase, uses client.beta.chat.completions.parse or json_object response_format
        return {"result": "ready"}

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        if not self.is_configured() or not texts:
            # Return dummy 1536-dim vector for testing/prototyping
            return [[0.0] * 1536 for _ in texts]

        res = self.client.embeddings.create(input=texts, model=self.embedding_model)
        return [item.embedding for item in res.data]
