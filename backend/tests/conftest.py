import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Set test environment
os.environ["APP_ENV"] = "testing"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["STORAGE_BACKEND"] = "local"

from app.core.config import settings
settings.STORAGE_BACKEND = "local"

from app.services.storage import reset_storage_service
reset_storage_service()

from app.main import app
from app.db.session import Base, get_db
from app.core.security import create_access_token, get_password_hash
from app.models.user import User

# In-memory SQLite test engine
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def init_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db() -> Generator[Session, None, None]:
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db: Session) -> User:
    user = User(
        email="learner@example.com",
        hashed_password=get_password_hash("securepass123"),
        full_name="Test Learner",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict:
    token = create_access_token(subject=test_user.id)
    return {"Authorization": f"Bearer {token}"}


# =========================================================================
# Test AI Provider Setup (Explicitly injected mocks for test suite)
# =========================================================================

from app.ai.base import ChatProvider, EmbeddingProvider, LLMResult
from app.core.config import settings
import app.ai.factory as ai_factory


class TestDefaultChatProvider(ChatProvider):
    def generate_text(
        self,
        prompt: str,
        system_prompt: str = None,
        temperature: float = 0.2,
        max_tokens: int = None,
    ) -> LLMResult:
        return LLMResult(
            content="Grounded tutor response based on provided learning materials.",
            model="test-mock-hf-chat",
            prompt_tokens=30,
            completion_tokens=20,
            total_tokens=50,
            latency_ms=10,
        )


class TestDefaultEmbeddingProvider(EmbeddingProvider):
    @property
    def dimension(self) -> int:
        return settings.EMBEDDING_DIMENSION

    def embed_text(self, text: str):
        return [0.01] * self.dimension

    def embed_texts(self, texts):
        return [[0.01] * self.dimension for _ in texts]


@pytest.fixture(autouse=True)
def setup_test_ai_providers(request, monkeypatch):
    """
    Provides explicit test mock providers for test suite execution without real API keys.
    Does not apply to test_huggingface_provider to allow testing real factory & provider logic.
    """
    if "test_huggingface_provider" in request.node.nodeid:
        return

    default_chat = TestDefaultChatProvider()
    default_embed = TestDefaultEmbeddingProvider()

    # Wire endpoint singletons if present
    try:
        import app.api.v1.endpoints.tutor as tutor_endpoint
        if hasattr(tutor_endpoint, "tutor_service"):
            monkeypatch.setattr(tutor_endpoint.tutor_service, "ai_provider", default_chat)
            if hasattr(tutor_endpoint.tutor_service, "retrieval_service"):
                monkeypatch.setattr(tutor_endpoint.tutor_service.retrieval_service, "ai_provider", default_embed)
    except Exception:
        pass

    try:
        import app.api.v1.endpoints.quiz as quiz_endpoint
        if hasattr(quiz_endpoint, "quiz_service"):
            monkeypatch.setattr(quiz_endpoint.quiz_service, "ai_provider", default_chat)
    except Exception:
        pass

    monkeypatch.setattr(ai_factory, "get_chat_provider", lambda *args, **kwargs: default_chat)
    monkeypatch.setattr(ai_factory, "get_embedding_provider", lambda *args, **kwargs: default_embed)
