"""
Comprehensive test suite for Personalized Recommendations & Next Learning Action (Prompt 9).

Tests:
- Authorization: unauthenticated rejected (401), unauthorized user rejected (404), invalid project (404)
- Case A: Lowest mastery concept recommended when concepts < 50% exist (practice_concept)
- Case B: Weakest developing concept recommended when no concepts < 50% exist (review_concept)
- Case C: Mixed review quiz recommended when all concepts are >= 80% (mixed_review)
- Case D: Start learning guidance when project has no concepts (start_learning)
- Deterministic tie-breaking by score -> last_assessed_at -> concept name -> concept id
- Unassessed concepts (no ConceptMastery record) treated as 0% mastery (Needs Practice)
- Database persistence and response schema conformance
- User isolation: User B cannot access User A's recommendations
"""

import os
import sys
from datetime import datetime, timedelta, timezone
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.space import Space
from app.models.project import Project
from app.models.concept import Concept, ConceptMastery
from app.models.recommendation import Recommendation
from app.models.user import User
from app.core.security import get_password_hash, create_access_token


# =========================================================================
# Helpers
# =========================================================================

def _create_scaffold(db, user, name="Rec Test Space"):
    """Create a Space -> Project scaffold."""
    space = Space(
        user_id=user.id,
        name=name,
        description="Space for recommendation testing",
    )
    db.add(space)
    db.flush()

    project = Project(
        space_id=space.id,
        user_id=user.id,
        name=f"{name} Project",
        description="Project for recommendation testing",
    )
    db.add(project)
    db.flush()
    return space, project


# =========================================================================
# Authorization & Security Tests
# =========================================================================

class TestRecommendationAuthorization:
    """Verify security, authentication, and user isolation."""

    def test_unauthenticated_request_rejected(self, client, db, test_user):
        """Unauthenticated requests must be rejected with 401."""
        _, project = _create_scaffold(db, test_user)
        db.commit()

        res = client.get(f"/api/v1/projects/{project.id}/recommendations/next")
        assert res.status_code == 401

    def test_unauthorized_user_cannot_access(self, client, db, test_user, auth_headers):
        """User B cannot access recommendations for User A's project."""
        # Create User B
        user_b = User(
            email="user_b_rec@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="User B Rec",
            is_active=True,
        )
        db.add(user_b)
        db.flush()

        # Project belongs to User B
        _, project_b = _create_scaffold(db, user_b, name="User B Space")
        db.commit()

        # User A attempts to request User B's recommendation
        res = client.get(
            f"/api/v1/projects/{project_b.id}/recommendations/next",
            headers=auth_headers,
        )
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()

    def test_nonexistent_project_returns_404(self, client, db, test_user, auth_headers):
        """Random nonexistent project ID returns 404."""
        res = client.get(
            "/api/v1/projects/00000000-0000-0000-0000-000000000000/recommendations/next",
            headers=auth_headers,
        )
        assert res.status_code == 404


# =========================================================================
# Deterministic Recommendation Logic Tests
# =========================================================================

class TestRecommendationLogic:
    """Verify deterministic Case A, B, C, D rules."""

    def test_case_d_no_concepts(self, client, db, test_user, auth_headers):
        """Case D: Project with zero concepts recommends exploring materials."""
        _, project = _create_scaffold(db, test_user)
        db.commit()

        res = client.get(
            f"/api/v1/projects/{project.id}/recommendations/next",
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()["data"]

        assert data["recommendation_type"] == "start_learning"
        assert data["priority"] == 4
        assert data["target_concept_id"] is None
        assert "materials" in data["reason"].lower()
        assert data["action_type"] == "materials"
        assert f"/projects/{project.id}/materials" in data["action_url"]

    def test_case_a_needs_practice_concept(self, client, db, test_user, auth_headers):
        """Case A: Lowest mastery concept (< 50%) is selected for practice."""
        _, project = _create_scaffold(db, test_user)

        # Create concepts
        c1 = Concept(project_id=project.id, name="SQL Joins")
        c2 = Concept(project_id=project.id, name="Database Indexing")
        c3 = Concept(project_id=project.id, name="ACID Transactions")
        db.add_all([c1, c2, c3])
        db.flush()

        # c1 has 35% (Needs Practice), c2 has 45% (Needs Practice), c3 has 85% (Strong)
        m1 = ConceptMastery(
            concept_id=c1.id, project_id=project.id, user_id=test_user.id,
            score=35.0, status="requiring_attention", total_attempts=10, correct_attempts=3,
        )
        m2 = ConceptMastery(
            concept_id=c2.id, project_id=project.id, user_id=test_user.id,
            score=45.0, status="requiring_attention", total_attempts=10, correct_attempts=4,
        )
        m3 = ConceptMastery(
            concept_id=c3.id, project_id=project.id, user_id=test_user.id,
            score=85.0, status="improving", total_attempts=10, correct_attempts=8,
        )
        db.add_all([m1, m2, m3])
        db.commit()

        res = client.get(
            f"/api/v1/projects/{project.id}/recommendations/next",
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()["data"]

        assert data["recommendation_type"] == "practice_concept"
        assert data["priority"] == 1
        assert data["target_concept_id"] == c1.id
        assert data["title"] == "Practice SQL Joins"
        assert "35%" in data["reason"]
        assert data["action_type"] == "quiz"
        assert data["action_url"] == f"/projects/{project.id}/quiz"

    def test_case_b_developing_concepts(self, client, db, test_user, auth_headers):
        """Case B: When no concepts are < 50%, weakest developing concept (50-79%) is picked."""
        _, project = _create_scaffold(db, test_user)

        c1 = Concept(project_id=project.id, name="REST API Authentication")
        c2 = Concept(project_id=project.id, name="OAuth2 Flows")
        c3 = Concept(project_id=project.id, name="JWT Tokens")
        db.add_all([c1, c2, c3])
        db.flush()

        # No < 50%. c1 is 64% (Developing), c2 is 75% (Developing), c3 is 90% (Strong)
        m1 = ConceptMastery(
            concept_id=c1.id, project_id=project.id, user_id=test_user.id,
            score=64.0, status="stable", total_attempts=10, correct_attempts=6,
        )
        m2 = ConceptMastery(
            concept_id=c2.id, project_id=project.id, user_id=test_user.id,
            score=75.0, status="stable", total_attempts=10, correct_attempts=7,
        )
        m3 = ConceptMastery(
            concept_id=c3.id, project_id=project.id, user_id=test_user.id,
            score=90.0, status="improving", total_attempts=10, correct_attempts=9,
        )
        db.add_all([m1, m2, m3])
        db.commit()

        res = client.get(
            f"/api/v1/projects/{project.id}/recommendations/next",
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()["data"]

        assert data["recommendation_type"] == "review_concept"
        assert data["priority"] == 2
        assert data["target_concept_id"] == c1.id
        assert data["title"] == "Review REST API Authentication"
        assert "64%" in data["reason"]
        assert data["action_type"] == "quiz"

    def test_case_c_all_concepts_strong(self, client, db, test_user, auth_headers):
        """Case C: When all concepts are >= 80%, recommend mixed review quiz."""
        _, project = _create_scaffold(db, test_user)

        c1 = Concept(project_id=project.id, name="Recursion")
        c2 = Concept(project_id=project.id, name="Dynamic Programming")
        db.add_all([c1, c2])
        db.flush()

        m1 = ConceptMastery(
            concept_id=c1.id, project_id=project.id, user_id=test_user.id,
            score=85.0, status="improving", total_attempts=10, correct_attempts=8,
        )
        m2 = ConceptMastery(
            concept_id=c2.id, project_id=project.id, user_id=test_user.id,
            score=92.0, status="improving", total_attempts=10, correct_attempts=9,
        )
        db.add_all([m1, m2])
        db.commit()

        res = client.get(
            f"/api/v1/projects/{project.id}/recommendations/next",
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()["data"]

        assert data["recommendation_type"] == "mixed_review"
        assert data["priority"] == 3
        assert data["target_concept_id"] is None
        assert data["title"] == "Take a mixed review quiz"
        assert "strong" in data["reason"].lower()
        assert data["action_type"] == "quiz"


# =========================================================================
# Edge Cases & Deterministic Tie-Breaking
# =========================================================================

class TestRecommendationEdgeCases:
    """Verify unassessed concepts, tie-breaking, and database persistence."""

    def test_unassessed_concept_treated_as_zero_mastery(self, client, db, test_user, auth_headers):
        """Concept without a ConceptMastery record should be treated as 0% mastery (Needs Practice)."""
        _, project = _create_scaffold(db, test_user)

        # Concept created but never assessed
        c1 = Concept(project_id=project.id, name="New Unassessed Concept")
        db.add(c1)
        db.commit()

        res = client.get(
            f"/api/v1/projects/{project.id}/recommendations/next",
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()["data"]

        assert data["recommendation_type"] == "practice_concept"
        assert data["priority"] == 1
        assert data["target_concept_id"] == c1.id
        assert data["title"] == "Practice New Unassessed Concept"
        assert "0%" in data["reason"]

    def test_deterministic_tie_breaking_equal_scores_by_last_assessed(self, client, db, test_user, auth_headers):
        """Two concepts with identical score tie-break by older last_assessed_at first."""
        _, project = _create_scaffold(db, test_user)

        c_old = Concept(project_id=project.id, name="Zeta Concept")
        c_recent = Concept(project_id=project.id, name="Alpha Concept")
        db.add_all([c_old, c_recent])
        db.flush()

        now = datetime.now(timezone.utc)
        m_old = ConceptMastery(
            concept_id=c_old.id, project_id=project.id, user_id=test_user.id,
            score=30.0, status="requiring_attention", total_attempts=10, correct_attempts=3,
            last_assessed_at=now - timedelta(days=5),
        )
        m_recent = ConceptMastery(
            concept_id=c_recent.id, project_id=project.id, user_id=test_user.id,
            score=30.0, status="requiring_attention", total_attempts=10, correct_attempts=3,
            last_assessed_at=now - timedelta(days=1),
        )
        db.add_all([m_old, m_recent])
        db.commit()

        res = client.get(
            f"/api/v1/projects/{project.id}/recommendations/next",
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()["data"]

        # Even though "Alpha Concept" is alphabetically first, "Zeta Concept" was assessed earlier (5 days ago vs 1 day ago)
        assert data["target_concept_id"] == c_old.id
        assert data["title"] == "Practice Zeta Concept"

    def test_deterministic_tie_breaking_equal_scores_and_dates_by_name(self, client, db, test_user, auth_headers):
        """Two concepts with identical score and same timestamp tie-break alphabetically by name."""
        _, project = _create_scaffold(db, test_user)

        c_b = Concept(project_id=project.id, name="Beta Concept")
        c_a = Concept(project_id=project.id, name="Alpha Concept")
        db.add_all([c_b, c_a])
        db.flush()

        fixed_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        m_b = ConceptMastery(
            concept_id=c_b.id, project_id=project.id, user_id=test_user.id,
            score=40.0, status="requiring_attention", total_attempts=10, correct_attempts=4,
            last_assessed_at=fixed_time,
        )
        m_a = ConceptMastery(
            concept_id=c_a.id, project_id=project.id, user_id=test_user.id,
            score=40.0, status="requiring_attention", total_attempts=10, correct_attempts=4,
            last_assessed_at=fixed_time,
        )
        db.add_all([m_b, m_a])
        db.commit()

        res = client.get(
            f"/api/v1/projects/{project.id}/recommendations/next",
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()["data"]

        # Alphabetical tie-break: Alpha Concept before Beta Concept
        assert data["target_concept_id"] == c_a.id
        assert data["title"] == "Practice Alpha Concept"

    def test_recommendation_persists_in_database(self, client, db, test_user, auth_headers):
        """Verify the recommendation record is saved and updated in the recommendations table."""
        _, project = _create_scaffold(db, test_user)

        c1 = Concept(project_id=project.id, name="Data Modeling")
        db.add(c1)
        db.commit()

        res = client.get(
            f"/api/v1/projects/{project.id}/recommendations/next",
            headers=auth_headers,
        )
        assert res.status_code == 200
        data = res.json()["data"]

        # Check DB record
        rec = db.query(Recommendation).filter(Recommendation.id == data["id"]).first()
        assert rec is not None
        assert rec.project_id == project.id
        assert rec.user_id == test_user.id
        assert rec.title == data["title"]
        assert rec.content == data["reason"]
        assert rec.target_id == c1.id
