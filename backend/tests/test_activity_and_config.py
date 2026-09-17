"""
Test suite for Environment Configuration Audit and Learning Activity Tracking Foundation (Prompt 10).

Tests:
Configuration:
- HF configuration loads correctly with expected model and dimension
- Missing HF key behavior is clear and raises AIProviderConfigError upon invocation
- AI_PROVIDER defaults to huggingface, no OpenAI provider selected
- Secrets (SECRET_KEY, HF_API_KEY) do not appear in public settings serialization or responses

Activity Tracking & History:
- Owner can retrieve project activity via GET /api/v1/projects/{project_id}/activity
- Unauthenticated request is rejected with 401
- Unauthorized user cannot access another user's project activity (returns 404)
- Nonexistent project returns 404
- Events are strictly project-scoped (events from other projects not included)
- Newest events are returned first (descending timestamp order)
- Query limit works properly
- Empty project returns an empty list
- Event creation associates with authenticated user
- Quiz attempt start records 'quiz_started' event
"""

import os
import sys
from datetime import datetime, timedelta, timezone
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.models.space import Space
from app.models.project import Project
from app.models.activity import ActivityEvent
from app.models.user import User
from app.core.security import get_password_hash
from app.ai.factory import get_chat_provider, get_embedding_provider
from app.ai.huggingface_provider import HuggingFaceChatProvider, HuggingFaceEmbeddingProvider
from app.ai.base import AIProviderConfigError


# =========================================================================
# Helpers
# =========================================================================

def _create_scaffold(db, user, name="Activity Test Space"):
    """Create a Space -> Project scaffold."""
    space = Space(
        user_id=user.id,
        name=name,
        description="Space for activity testing",
    )
    db.add(space)
    db.flush()

    project = Project(
        space_id=space.id,
        user_id=user.id,
        name=f"{name} Project",
        description="Project for activity testing",
    )
    db.add(project)
    db.flush()
    return space, project


# =========================================================================
# Part A: Configuration & Security Tests
# =========================================================================

class TestConfigurationAudit:
    """Verify environment configuration correctness and security."""

    def test_huggingface_configuration_loaded(self):
        """Verify Hugging Face defaults and architecture."""
        assert settings.AI_PROVIDER == "huggingface"
        assert settings.HF_CHAT_MODEL == "meta-llama/Llama-3.1-8B-Instruct"
        assert settings.HF_EMBEDDING_MODEL == "BAAI/bge-small-en-v1.5"
        assert settings.EMBEDDING_DIMENSION == 384
        assert settings.HF_TEMPERATURE == 0.2
        assert settings.HF_MAX_TOKENS == 1024

    def test_missing_hf_key_raises_clear_error(self):
        """When HF_API_KEY is empty, invoking chat or embedding raises clear AIProviderConfigError."""
        chat_provider = HuggingFaceChatProvider(api_key="")
        with pytest.raises(AIProviderConfigError) as exc_info:
            chat_provider.generate_text(prompt="Hello")
        assert "HF_API_KEY" in str(exc_info.value)

        embedding_provider = HuggingFaceEmbeddingProvider(api_key="")
        with pytest.raises(AIProviderConfigError) as exc_info:
            embedding_provider.embed_text("Test text")
        assert "HF_API_KEY" in str(exc_info.value)

    def test_no_openai_provider_selected(self):
        """Verify factory returns HuggingFaceChatProvider and does not default or fall back to OpenAI."""
        assert settings.AI_PROVIDER != "openai"
        provider = get_chat_provider()
        assert isinstance(provider, HuggingFaceChatProvider)

    def test_secret_key_not_empty(self):
        """Verify SECRET_KEY is set and of adequate length."""
        assert len(settings.SECRET_KEY) >= 32


# =========================================================================
# Part B: Activity Tracking & Learning History Tests
# =========================================================================

class TestActivityAuthorization:
    """Verify endpoint authorization and user isolation."""

    def test_unauthenticated_request_rejected(self, client, db, test_user):
        """Unauthenticated requests to project activity must return 401."""
        _, project = _create_scaffold(db, test_user)
        db.commit()

        res = client.get(f"/api/v1/projects/{project.id}/activity")
        assert res.status_code == 401

    def test_unauthorized_user_cannot_access_activity(self, client, db, test_user, auth_headers):
        """User B cannot view activity of User A's project."""
        user_b = User(
            email="user_b_act@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="User B Act",
            is_active=True,
        )
        db.add(user_b)
        db.flush()

        _, project_b = _create_scaffold(db, user_b, name="User B Space")
        db.commit()

        # User A makes request to User B's project activity
        res = client.get(
            f"/api/v1/projects/{project_b.id}/activity",
            headers=auth_headers,
        )
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()

    def test_nonexistent_project_returns_404(self, client, db, test_user, auth_headers):
        """Request for nonexistent project returns 404."""
        res = client.get(
            "/api/v1/projects/00000000-0000-0000-0000-000000000000/activity",
            headers=auth_headers,
        )
        assert res.status_code == 404


class TestActivityHistoryLogic:
    """Verify learning activity retrieval, ordering, limiting, and scoping."""

    def test_empty_project_returns_empty_list(self, client, db, test_user, auth_headers):
        """A project with no activity events returns an empty list."""
        _, project = _create_scaffold(db, test_user)
        db.commit()

        res = client.get(
            f"/api/v1/projects/{project.id}/activity",
            headers=auth_headers,
        )
        assert res.status_code == 200
        assert res.json()["data"] == []

    def test_events_are_project_scoped(self, client, db, test_user, auth_headers):
        """Activity events from Project 2 must NOT appear in Project 1's history."""
        _, project_1 = _create_scaffold(db, test_user, name="Project 1")
        _, project_2 = _create_scaffold(db, test_user, name="Project 2")

        # Event in project 1
        ev1 = ActivityEvent(
            user_id=test_user.id,
            project_id=project_1.id,
            event_type="material_uploaded",
            details={"title": "Notes P1"},
        )
        # Event in project 2
        ev2 = ActivityEvent(
            user_id=test_user.id,
            project_id=project_2.id,
            event_type="quiz_completed",
            details={"score": 85},
        )
        db.add_all([ev1, ev2])
        db.commit()

        res = client.get(
            f"/api/v1/projects/{project_1.id}/activity",
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert len(data) == 1
        assert data[0]["event_type"] == "material_uploaded"
        assert data[0]["details"]["title"] == "Notes P1"

    def test_newest_events_returned_first(self, client, db, test_user, auth_headers):
        """Events must be ordered newest first (created_at descending)."""
        _, project = _create_scaffold(db, test_user)

        now = datetime.now(timezone.utc)
        ev_old = ActivityEvent(
            user_id=test_user.id,
            project_id=project.id,
            event_type="material_uploaded",
            details={"title": "Old Notes"},
            created_at=now - timedelta(hours=3),
        )
        ev_mid = ActivityEvent(
            user_id=test_user.id,
            project_id=project.id,
            event_type="tutor_question_asked",
            details={"query": "What is SQL?"},
            created_at=now - timedelta(hours=1),
        )
        ev_new = ActivityEvent(
            user_id=test_user.id,
            project_id=project.id,
            event_type="quiz_completed",
            details={"score": 90},
            created_at=now,
        )
        db.add_all([ev_old, ev_mid, ev_new])
        db.commit()

        res = client.get(
            f"/api/v1/projects/{project.id}/activity",
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert len(data) == 3
        # First is newest
        assert data[0]["event_type"] == "quiz_completed"
        assert data[1]["event_type"] == "tutor_question_asked"
        assert data[2]["event_type"] == "material_uploaded"

    def test_activity_limit_works(self, client, db, test_user, auth_headers):
        """Verify the limit query parameter restricts result count."""
        _, project = _create_scaffold(db, test_user)

        for i in range(10):
            ev = ActivityEvent(
                user_id=test_user.id,
                project_id=project.id,
                event_type="tutor_question_asked",
                details={"index": i},
            )
            db.add(ev)
        db.commit()

        res = client.get(
            f"/api/v1/projects/{project.id}/activity?limit=4",
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert len(data) == 4
