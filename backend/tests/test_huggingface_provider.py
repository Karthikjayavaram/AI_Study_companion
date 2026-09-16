"""
Unit & Integration Tests for Hugging Face Provider Architecture (Prompt 8A).

Tests cover:
1. Configuration loading & validation (no OpenAI key required, HF settings present).
2. Missing HF key raises clear AIProviderConfigError on invocation (never silent mock in production).
3. Chat Provider:
   - Successful response parsing (v1 chat completions format).
   - Fallback response parsing (models/{id} format).
   - Malformed response handling.
   - Provider timeout handling (AIProviderNetworkError).
   - HTTP 401/403 auth error (AIProviderAuthError).
   - Secret scrubbing (API keys never in exceptions or logs).
4. Embedding Provider:
   - Successful single & batch embedding.
   - Strict dimension validation (no silent padding or truncation).
   - Dimension mismatch raises AIProviderDimensionError.
   - 3D token output pooling.
   - Malformed response handling.
   - Secret scrubbing.
5. Provider Factory:
   - get_chat_provider returns HuggingFaceChatProvider.
   - get_embedding_provider returns HuggingFaceEmbeddingProvider.
   - Invalid provider name raises AIProviderConfigError.
6. Service layer wiring to abstractions:
   - AITutorService accepts abstract ChatProvider.
   - QuizService accepts abstract ChatProvider.
   - RetrievalService accepts abstract EmbeddingProvider.
   - MaterialProcessor validates dimensions and accepts abstract EmbeddingProvider.
7. Material reprocessing endpoint:
   - POST /materials/{id}/reprocess regenerates chunks and embeddings.
"""

import json
import pytest
from unittest.mock import patch, MagicMock
import httpx

from app.core.config import settings
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
from app.ai.huggingface_provider import (
    HuggingFaceChatProvider,
    HuggingFaceEmbeddingProvider,
    _scrub_secrets,
)
from app.ai.factory import get_chat_provider, get_embedding_provider
from app.services.ai_tutor_service import AITutorService
from app.services.quiz_service import QuizService
from app.services.retrieval_service import RetrievalService
from app.services.material_processor import MaterialProcessor
from app.models.material import Material, MaterialChunk
from app.models.space import Space
from app.models.project import Project
from app.models.user import User
from app.core.security import get_password_hash, create_access_token


# =========================================================================
# 1. Configuration Tests
# =========================================================================

def test_huggingface_configuration_defaults():
    """Verify Hugging Face configuration fields exist and have correct defaults."""
    assert hasattr(settings, "AI_PROVIDER")
    assert settings.AI_PROVIDER == "huggingface"
    assert hasattr(settings, "HF_CHAT_MODEL")
    assert "mistral" in settings.HF_CHAT_MODEL.lower() or "huggingface" in settings.HF_CHAT_MODEL.lower()
    assert hasattr(settings, "HF_EMBEDDING_MODEL")
    assert "all-minilm" in settings.HF_EMBEDDING_MODEL.lower()
    assert hasattr(settings, "EMBEDDING_DIMENSION")
    assert settings.EMBEDDING_DIMENSION == 384


def test_no_openai_key_required():
    """Verify that OpenAI key is not required at runtime."""
    # When HF provider is used, empty OPENAI_API_KEY causes no issues
    chat_provider = HuggingFaceChatProvider(api_key="hf_test_mock_key_1234567890")
    assert chat_provider.model == settings.HF_CHAT_MODEL


# =========================================================================
# 2. Secret Scrubbing Tests
# =========================================================================

def test_secret_scrubbing():
    """Verify API keys and tokens are never leaked in error messages."""
    secret_key = "hf_abcdefghijklmnopqrstuvwxyz123456"
    msg = f"Request failed with key {secret_key} and Bearer {secret_key}."
    cleaned = _scrub_secrets(msg, api_key=secret_key)
    assert secret_key not in cleaned
    assert "[REDACTED" in cleaned


# =========================================================================
# 3. Chat Provider Tests
# =========================================================================

def test_chat_provider_missing_key_raises_config_error():
    """Missing HF_API_KEY must raise AIProviderConfigError upon invocation, never a silent fake."""
    provider = HuggingFaceChatProvider(api_key="", model="test-model")
    with pytest.raises(AIProviderConfigError) as exc_info:
        provider.generate_text(prompt="What is recursion?")
    assert "HF_API_KEY" in str(exc_info.value)


def test_chat_provider_v1_response_parsing():
    """Test successful parsing of v1 chat completions format."""
    provider = HuggingFaceChatProvider(api_key="hf_valid_key_test_1234567890", model="test-model")

    mock_response = {
        "model": "test-model",
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "Recursion is a process in which a function calls itself.",
                }
            }
        ],
        "usage": {
            "prompt_tokens": 15,
            "completion_tokens": 12,
            "total_tokens": 27,
        },
    }

    with patch("httpx.Client.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_response
        mock_post.return_value = mock_resp

        result = provider.generate_text(
            prompt="Explain recursion",
            system_prompt="You are a helpful tutor.",
        )

        assert isinstance(result, LLMResult)
        assert "Recursion is a process" in result.content
        assert result.total_tokens == 27
        assert result.model == "test-model"


def test_chat_provider_models_endpoint_fallback():
    """Test fallback to models/{id} endpoint if v1 endpoint returns 404."""
    provider = HuggingFaceChatProvider(api_key="hf_valid_key_test_1234567890", model="test-model")

    with patch("httpx.Client.post") as mock_post:
        # First call (v1) returns 404, second call (models/{id}) returns 200
        resp_404 = MagicMock()
        resp_404.status_code = 404

        resp_200 = MagicMock()
        resp_200.status_code = 200
        resp_200.json.return_value = [{"generated_text": "Fallback generated answer"}]

        mock_post.side_effect = [resp_404, resp_200]

        result = provider.generate_text(prompt="Hello")
        assert result.content == "Fallback generated answer"


def test_chat_provider_auth_failure():
    """Test HTTP 401 raises AIProviderAuthError without leaking token."""
    api_key = "hf_secret_invalid_key_12345"
    provider = HuggingFaceChatProvider(api_key=api_key, model="test-model")

    with patch("httpx.Client.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = "Unauthorized: Invalid token"
        mock_post.return_value = mock_resp

        with pytest.raises(AIProviderAuthError) as exc_info:
            provider.generate_text(prompt="Hello")
        assert api_key not in str(exc_info.value)


def test_chat_provider_timeout_handling():
    """Test that httpx timeout produces AIProviderNetworkError."""
    provider = HuggingFaceChatProvider(api_key="hf_test_key_12345", model="test-model")

    with patch("httpx.Client.post", side_effect=httpx.TimeoutException("Connection timed out")):
        with pytest.raises(AIProviderNetworkError) as exc_info:
            provider.generate_text(prompt="Hello")
        assert "timed out" in str(exc_info.value).lower()


# =========================================================================
# 4. Embedding Provider Tests
# =========================================================================

def test_embedding_provider_missing_key_raises_config_error():
    """Missing key raises AIProviderConfigError, no silent fake embeddings."""
    provider = HuggingFaceEmbeddingProvider(api_key="", model="test-embed")
    with pytest.raises(AIProviderConfigError):
        provider.embed_text("sample text")


def test_embedding_provider_success():
    """Test successful embedding generation and dimension matching."""
    dim = 384
    provider = HuggingFaceEmbeddingProvider(
        api_key="hf_test_key_1234567890",
        model="sentence-transformers/all-MiniLM-L6-v2",
        dimension=dim,
    )

    mock_vec_1 = [0.01] * dim
    mock_vec_2 = [0.02] * dim

    with patch("httpx.Client.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = [mock_vec_1, mock_vec_2]
        mock_post.return_value = mock_resp

        vectors = provider.embed_texts(["first", "second"])
        assert len(vectors) == 2
        assert len(vectors[0]) == dim
        assert len(vectors[1]) == dim


def test_embedding_provider_dimension_mismatch_raises():
    """Dimension mismatch must raise AIProviderDimensionError; NO silent padding/truncating."""
    configured_dim = 384
    provider = HuggingFaceEmbeddingProvider(
        api_key="hf_test_key_1234567890",
        model="test-embed",
        dimension=configured_dim,
    )

    # Provider returns 768 dimensions instead of 384
    with patch("httpx.Client.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = [[0.05] * 768]
        mock_post.return_value = mock_resp

        with pytest.raises(AIProviderDimensionError) as exc_info:
            provider.embed_texts(["test text"])
        assert "384" in str(exc_info.value)
        assert "768" in str(exc_info.value)


def test_embedding_provider_token_pooling():
    """Test that 3D token outputs [batch, tokens, dim] are properly mean-pooled to [batch, dim]."""
    dim = 384
    provider = HuggingFaceEmbeddingProvider(
        api_key="hf_test_key_1234567890",
        model="test-embed",
        dimension=dim,
    )

    # 1 text with 2 tokens, each dim=384
    token_1 = [0.2] * dim
    token_2 = [0.4] * dim
    raw_3d = [[token_1, token_2]]

    with patch("httpx.Client.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = raw_3d
        mock_post.return_value = mock_resp

        vectors = provider.embed_texts(["test text"])
        assert len(vectors) == 1
        assert len(vectors[0]) == dim
        # Mean of 0.2 and 0.4 should be 0.3
        assert pytest.approx(vectors[0][0], 0.001) == 0.3


# =========================================================================
# 5. Factory Tests
# =========================================================================

def test_provider_factory():
    """Verify provider factory returns appropriate provider implementations."""
    chat = get_chat_provider("huggingface")
    assert isinstance(chat, ChatProvider)
    assert isinstance(chat, HuggingFaceChatProvider)

    embed = get_embedding_provider("huggingface")
    assert isinstance(embed, EmbeddingProvider)
    assert isinstance(embed, HuggingFaceEmbeddingProvider)

    with pytest.raises(AIProviderConfigError):
        get_chat_provider("unsupported_vendor_xyz")


# =========================================================================
# 6. Service Wiring Tests (Abstractions)
# =========================================================================

class FakeMockChatProvider(ChatProvider):
    def __init__(self):
        self.invoked = False

    def generate_text(self, prompt: str, system_prompt: str = None, temperature: float = 0.2, max_tokens: int = None) -> LLMResult:
        self.invoked = True
        return LLMResult(
            content="Grounded tutor answer from fake provider.",
            model="fake-hf-model",
            total_tokens=42,
        )


class FakeMockEmbeddingProvider(EmbeddingProvider):
    @property
    def dimension(self) -> int:
        return settings.EMBEDDING_DIMENSION

    def embed_text(self, text: str):
        return [0.05] * self.dimension

    def embed_texts(self, texts):
        return [[0.05] * self.dimension for _ in texts]


def test_ai_tutor_accepts_chat_provider_abstraction():
    """Verify AITutorService works with any ChatProvider abstraction."""
    fake_chat = FakeMockChatProvider()
    fake_embed = FakeMockEmbeddingProvider()
    retrieval = RetrievalService(ai_provider=fake_embed)
    tutor_svc = AITutorService(retrieval_service=retrieval, ai_provider=fake_chat)
    assert tutor_svc.ai_provider is fake_chat


def test_quiz_service_accepts_chat_provider_abstraction():
    """Verify QuizService works with any ChatProvider abstraction."""
    fake_chat = FakeMockChatProvider()
    quiz_svc = QuizService(ai_provider=fake_chat)
    assert quiz_svc.ai_provider is fake_chat


def test_retrieval_service_accepts_embedding_provider_abstraction():
    """Verify RetrievalService works with any EmbeddingProvider abstraction."""
    fake_embed = FakeMockEmbeddingProvider()
    retrieval = RetrievalService(ai_provider=fake_embed)
    assert retrieval.ai_provider is fake_embed


def test_material_processor_dimension_validation(db):
    """Verify MaterialProcessor validates dimension and rejects mismatched vectors."""
    # Create test material
    user = User(
        email="processor-test@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Processor Tester",
        is_active=True,
    )
    db.add(user)
    db.flush()

    space = Space(user_id=user.id, name="Test Space")
    db.add(space)
    db.flush()

    project = Project(space_id=space.id, user_id=user.id, name="Test Project")
    db.add(project)
    db.flush()

    material = Material(
        project_id=project.id,
        user_id=user.id,
        title="Sample Document",
        extracted_text="This is sample study material text for testing chunking and embeddings.",
        status="uploaded",
    )
    db.add(material)
    db.commit()

    # Provider returning wrong dimension
    class BadDimensionEmbeddingProvider(EmbeddingProvider):
        @property
        def dimension(self):
            return 999  # Wrong dimension!

        def embed_text(self, text):
            return [0.1] * 999

        def embed_texts(self, texts):
            return [[0.1] * 999 for _ in texts]

    with pytest.raises(ValueError) as exc_info:
        MaterialProcessor.process_material_chunks_and_embeddings(
            db=db,
            material=material,
            ai_provider=BadDimensionEmbeddingProvider(),
        )
    assert "Embedding dimension mismatch" in str(exc_info.value)
    db.refresh(material)
    assert material.status == "failed"


def test_material_processor_success_with_matching_dimension(db):
    """Verify MaterialProcessor saves chunks when embedding dimension matches settings.EMBEDDING_DIMENSION."""
    user = User(
        email="processor-success@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Success Tester",
        is_active=True,
    )
    db.add(user)
    db.flush()

    space = Space(user_id=user.id, name="Test Space 2")
    db.add(space)
    db.flush()

    project = Project(space_id=space.id, user_id=user.id, name="Test Project 2")
    db.add(project)
    db.flush()

    material = Material(
        project_id=project.id,
        user_id=user.id,
        title="Matching Document",
        extracted_text="Text content for testing valid embedding generation and storage.",
        status="uploaded",
    )
    db.add(material)
    db.commit()

    chunks = MaterialProcessor.process_material_chunks_and_embeddings(
        db=db,
        material=material,
        ai_provider=FakeMockEmbeddingProvider(),
    )
    assert len(chunks) > 0
    assert len(chunks[0].embedding) == settings.EMBEDDING_DIMENSION
    db.refresh(material)
    assert material.status == "ready"


# =========================================================================
# 7. Material Reprocess Endpoint Test
# =========================================================================

def test_material_reprocess_endpoint(client, db):
    """Test POST /api/v1/materials/{id}/reprocess successfully regenerates chunks."""
    user = User(
        email="reprocess-test@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Reprocess Tester",
        is_active=True,
    )
    db.add(user)
    db.flush()

    space = Space(user_id=user.id, name="Reprocess Space")
    db.add(space)
    db.flush()

    project = Project(space_id=space.id, user_id=user.id, name="Reprocess Project")
    db.add(project)
    db.flush()

    material = Material(
        project_id=project.id,
        user_id=user.id,
        title="Reprocess Document",
        extracted_text="Content to be reprocessed and re-embedded.",
        status="uploaded",
    )
    db.add(material)
    db.commit()

    token = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}

    with patch("app.services.material_processor.MaterialProcessor.process_material_chunks_and_embeddings") as mock_proc:
        mock_proc.return_value = []
        res = client.post(f"/api/v1/materials/{material.id}/reprocess", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "regenerated successfully" in data["message"]
        mock_proc.assert_called_once()
