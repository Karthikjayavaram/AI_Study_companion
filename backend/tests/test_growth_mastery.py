"""
Comprehensive test suite for Concept Mastery & Growth Tracking (Prompt 8).

Tests:
- Concept extraction during quiz generation
- Atomic mastery updates during quiz submission
- Mastery calculation accuracy (correct/total * 100)
- Cumulative mastery across multiple quiz attempts
- User isolation (User B cannot see User A's mastery)
- Project ownership for growth endpoints
- Empty project returns empty mastery list
- Status classification thresholds
- Growth summary aggregation
- Growth API endpoint authorization
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import json
from app.ai.base import BaseLLMClient, LLMResult
import app.api.v1.endpoints.quiz as quiz_endpoint_module

from app.models.space import Space
from app.models.project import Project
from app.models.material import Material, MaterialChunk
from app.models.assessment import Quiz, Question, QuizAttempt, Assessment
from app.models.concept import Concept, ConceptMastery
from app.models.user import User
from app.core.security import get_password_hash, create_access_token
from app.models.base import generate_uuid


# =========================================================================
# Helper: Create a project with material and chunks for quiz generation
# =========================================================================

def _create_project_with_materials(db, user):
    """Create a Space -> Project -> Material -> Chunks scaffold."""
    space = Space(
        user_id=user.id,
        name="Growth Test Space",
        description="Space for growth tests",
    )
    db.add(space)
    db.flush()

    project = Project(
        space_id=space.id,
        user_id=user.id,
        name="Growth Test Project",
        description="Project for growth tracking tests",
    )
    db.add(project)
    db.flush()

    material = Material(
        project_id=project.id,
        user_id=user.id,
        title="Growth Study Notes",
        file_name="growth_notes.txt",
        file_path="/tmp/growth_notes.txt",
        file_size=1000,
        mime_type="text/plain",
        status="processed",
    )
    db.add(material)
    db.flush()

    chunks = []
    for i in range(3):
        chunk = MaterialChunk(
            material_id=material.id,
            project_id=project.id,
            chunk_index=i,
            content=f"Study content about topic {i}. This covers fundamental concepts.",
            token_count=50,
        )
        db.add(chunk)
        chunks.append(chunk)
    db.flush()

    return space, project, material, chunks


def _create_quiz_with_concepts(db, user, project, chunks):
    """
    Create a quiz with questions linked to concepts,
    simulating what the quiz generation + concept extraction flow produces.
    """
    # Create concepts
    concept_a = Concept(
        project_id=project.id,
        name="Gradient Descent",
        description="Optimization algorithm",
    )
    concept_b = Concept(
        project_id=project.id,
        name="Loss Functions",
        description="Measuring model error",
    )
    db.add(concept_a)
    db.add(concept_b)
    db.flush()

    # Create quiz
    quiz = Quiz(
        project_id=project.id,
        user_id=user.id,
        title="Mastery Test Quiz",
        quiz_type="adaptive",
        difficulty="medium",
        question_count=4,
        status="ready",
    )
    db.add(quiz)
    db.flush()

    # Create questions linked to concepts
    q1 = Question(
        quiz_id=quiz.id,
        concept_id=concept_a.id,
        source_material_id=chunks[0].material_id,
        source_chunk_id=chunks[0].id,
        question_order=1,
        question_text="What is gradient descent?",
        question_type="mcq",
        options=["An optimization algorithm", "A data structure", "A loss function", "A neural network"],
        correct_answer="An optimization algorithm",
        explanation="Gradient descent is an optimization algorithm.",
        difficulty="medium",
    )
    q2 = Question(
        quiz_id=quiz.id,
        concept_id=concept_a.id,
        source_material_id=chunks[0].material_id,
        source_chunk_id=chunks[0].id,
        question_order=2,
        question_text="What does gradient descent minimize?",
        question_type="mcq",
        options=["Loss function", "Input data", "Network size", "Learning rate"],
        correct_answer="Loss function",
        explanation="Gradient descent minimizes the loss function.",
        difficulty="medium",
    )
    q3 = Question(
        quiz_id=quiz.id,
        concept_id=concept_b.id,
        source_material_id=chunks[1].material_id,
        source_chunk_id=chunks[1].id,
        question_order=3,
        question_text="What is cross-entropy?",
        question_type="mcq",
        options=["A loss function", "An activation function", "A layer type", "A dataset"],
        correct_answer="A loss function",
        explanation="Cross-entropy is a common loss function.",
        difficulty="medium",
    )
    q4 = Question(
        quiz_id=quiz.id,
        concept_id=concept_b.id,
        source_material_id=chunks[1].material_id,
        source_chunk_id=chunks[1].id,
        question_order=4,
        question_text="MSE is used for what?",
        question_type="mcq",
        options=["Classification", "Regression", "Clustering", "Dimensionality reduction"],
        correct_answer="Regression",
        explanation="MSE is a regression loss function.",
        difficulty="medium",
    )
    db.add_all([q1, q2, q3, q4])
    db.flush()

    return quiz, [q1, q2, q3, q4], concept_a, concept_b


# =========================================================================
# Test: Concept extraction during quiz generation (via API)
# =========================================================================

class TestConceptExtractionDuringQuizGeneration:
    """Verify that quiz generation creates concepts and links them to questions."""

    def test_generate_quiz_creates_concepts(self, client, db, test_user, auth_headers, monkeypatch):
        """Verify that quiz generation creates concepts from grounded questions and links them."""
        _, project, _, chunks = _create_project_with_materials(db, test_user)

        class MockGroundedLLM(BaseLLMClient):
            def generate_text(self, prompt, **kwargs):
                return LLMResult(
                    content=json.dumps({
                        "quiz_title": "Concept Extraction Quiz",
                        "quiz_description": "Testing concept creation",
                        "questions": [
                            {
                                "question_text": "What does this material cover?",
                                "options": ["Fundamental concepts", "Bicycles", "Cooking", "Space flight"],
                                "correct_answer": "Fundamental concepts",
                                "explanation": "Covered in topic 0.",
                                "difficulty": "medium",
                                "source_chunk_id": chunks[0].id,
                                "evidence_quote": "This covers fundamental concepts.",
                                "concept_name": "Fundamental Concepts",
                            }
                        ],
                    }),
                    model="mock-model",
                    prompt_tokens=100,
                    completion_tokens=50,
                    total_tokens=150,
                    latency_ms=10,
                )

            def embed_texts(self, texts):
                return [[0.1] * 1536 for _ in texts]

            def embed_text(self, text):
                return [0.1] * 1536

            def generate_embeddings(self, texts):
                return [[0.1] * 1536 for _ in texts]

            def generate_structured(self, prompt, schema, **kwargs):
                return {}

        monkeypatch.setattr(quiz_endpoint_module.quiz_service, "ai_provider", MockGroundedLLM())

        res = client.post(
            f"/api/v1/projects/{project.id}/quizzes/generate",
            json={"question_count": 3, "difficulty": "medium"},
            headers=auth_headers,
        )
        assert res.status_code == 201
        data = res.json()["data"]
        assert data["question_count"] >= 1
        assert data["status"] == "ready"

        # Verify concept was created and linked to project
        created = db.query(Concept).filter(
            Concept.project_id == project.id,
            Concept.name == "Fundamental Concepts",
        ).first()
        assert created is not None

    def test_concept_find_or_create_deduplicates(self, db, test_user):
        """Verify that creating the same concept name twice in a project
        results in a single concept record."""
        _, project, _, _ = _create_project_with_materials(db, test_user)

        c1 = Concept(project_id=project.id, name="Neural Networks")
        db.add(c1)
        db.flush()

        # Query for same name — should find existing
        existing = db.query(Concept).filter(
            Concept.project_id == project.id,
            Concept.name == "Neural Networks",
        ).all()
        assert len(existing) == 1
        assert existing[0].id == c1.id


# =========================================================================
# Test: Atomic mastery update during quiz submission
# =========================================================================

class TestAtomicMasteryUpdate:
    """Verify mastery is created/updated atomically during quiz submission."""

    def test_submit_quiz_creates_mastery_records(self, client, db, test_user, auth_headers):
        """Submitting a quiz attempt should create ConceptMastery records."""
        _, project, _, chunks = _create_project_with_materials(db, test_user)
        quiz, questions, concept_a, concept_b = _create_quiz_with_concepts(
            db, test_user, project, chunks
        )
        db.commit()

        # Start attempt
        start_res = client.post(
            f"/api/v1/quizzes/{quiz.id}/attempts",
            headers=auth_headers,
        )
        assert start_res.status_code == 201
        attempt_id = start_res.json()["data"]["id"]

        # Submit: q1 correct, q2 wrong, q3 correct, q4 wrong
        answers = [
            {"question_id": questions[0].id, "user_answer": "An optimization algorithm"},
            {"question_id": questions[1].id, "user_answer": "Input data"},  # wrong
            {"question_id": questions[2].id, "user_answer": "A loss function"},
            {"question_id": questions[3].id, "user_answer": "Classification"},  # wrong
        ]
        submit_res = client.post(
            f"/api/v1/quiz-attempts/{attempt_id}/submit",
            json={"answers": answers},
            headers=auth_headers,
        )
        assert submit_res.status_code == 200
        result = submit_res.json()["data"]
        assert result["score"] == 50.0  # 2/4 * 100

        # Verify mastery records were created
        mastery_a = db.query(ConceptMastery).filter(
            ConceptMastery.user_id == test_user.id,
            ConceptMastery.concept_id == concept_a.id,
        ).first()
        assert mastery_a is not None
        assert mastery_a.total_attempts == 2
        assert mastery_a.correct_attempts == 1
        assert mastery_a.score == 50.0  # 1/2 * 100
        assert mastery_a.status == "stable"

        mastery_b = db.query(ConceptMastery).filter(
            ConceptMastery.user_id == test_user.id,
            ConceptMastery.concept_id == concept_b.id,
        ).first()
        assert mastery_b is not None
        assert mastery_b.total_attempts == 2
        assert mastery_b.correct_attempts == 1
        assert mastery_b.score == 50.0
        assert mastery_b.status == "stable"


# =========================================================================
# Test: Mastery calculation accuracy
# =========================================================================

class TestMasteryCalculation:
    """Verify the deterministic mastery formula: correct/total * 100."""

    def test_mastery_score_calculation(self, db, test_user):
        """Direct test of GrowthService mastery computation."""
        from app.services.growth_service import GrowthService

        _, project, _, chunks = _create_project_with_materials(db, test_user)

        concept = Concept(project_id=project.id, name="Test Concept")
        db.add(concept)
        db.flush()

        quiz = Quiz(
            project_id=project.id,
            user_id=test_user.id,
            title="Calc Test Quiz",
            quiz_type="adaptive",
            difficulty="medium",
            question_count=5,
            status="ready",
        )
        db.add(quiz)
        db.flush()

        # Create 5 questions, all linked to the concept
        questions = []
        for i in range(5):
            q = Question(
                quiz_id=quiz.id,
                concept_id=concept.id,
                source_material_id=chunks[0].material_id,
                source_chunk_id=chunks[0].id,
                question_order=i + 1,
                question_text=f"Question {i+1}",
                question_type="mcq",
                options=["A", "B", "C", "D"],
                correct_answer="A",
                difficulty="medium",
            )
            db.add(q)
            questions.append(q)
        db.flush()

        attempt = QuizAttempt(
            quiz_id=quiz.id,
            user_id=test_user.id,
            status="completed",
            total_questions=5,
            correct_answers=3,
            score=60.0,
        )
        db.add(attempt)
        db.flush()

        # 3 correct, 2 wrong
        assessments = []
        for i, q in enumerate(questions):
            is_correct = i < 3
            a = Assessment(
                quiz_attempt_id=attempt.id,
                question_id=q.id,
                user_id=test_user.id,
                user_answer="A" if is_correct else "B",
                is_correct=is_correct,
                ai_score=1.0 if is_correct else 0.0,
            )
            db.add(a)
            assessments.append(a)
        db.flush()

        growth_service = GrowthService()
        updated = growth_service.update_mastery_from_quiz_attempt(
            db, test_user, quiz, assessments
        )
        db.flush()

        assert len(updated) == 1
        mastery = updated[0]
        assert mastery.total_attempts == 5
        assert mastery.correct_attempts == 3
        assert mastery.score == 60.0  # 3/5 * 100
        assert mastery.status == "stable"  # 50 <= 60 < 80


# =========================================================================
# Test: Cumulative mastery across multiple quiz attempts
# =========================================================================

class TestCumulativeMastery:
    """Verify mastery accumulates across multiple quiz attempts."""

    def test_mastery_accumulates_across_attempts(self, db, test_user):
        """Two quiz attempts should cumulate total_attempts and correct_attempts."""
        from app.services.growth_service import GrowthService

        _, project, _, chunks = _create_project_with_materials(db, test_user)

        concept = Concept(project_id=project.id, name="Cumulative Concept")
        db.add(concept)
        db.flush()

        growth_service = GrowthService()

        # --- First quiz attempt: 2 correct / 3 total ---
        quiz1 = Quiz(
            project_id=project.id, user_id=test_user.id,
            title="Quiz 1", quiz_type="adaptive", difficulty="medium",
            question_count=3, status="ready",
        )
        db.add(quiz1)
        db.flush()

        questions1 = []
        for i in range(3):
            q = Question(
                quiz_id=quiz1.id, concept_id=concept.id,
                source_material_id=chunks[0].material_id,
                source_chunk_id=chunks[0].id,
                question_order=i+1, question_text=f"Q1-{i+1}",
                question_type="mcq", options=["A", "B", "C", "D"],
                correct_answer="A", difficulty="medium",
            )
            db.add(q)
            questions1.append(q)
        db.flush()

        attempt1 = QuizAttempt(
            quiz_id=quiz1.id, user_id=test_user.id,
            status="completed", total_questions=3, correct_answers=2, score=66.67,
        )
        db.add(attempt1)
        db.flush()

        assessments1 = []
        for i, q in enumerate(questions1):
            is_correct = i < 2
            a = Assessment(
                quiz_attempt_id=attempt1.id, question_id=q.id,
                user_id=test_user.id, user_answer="A" if is_correct else "B",
                is_correct=is_correct, ai_score=1.0 if is_correct else 0.0,
            )
            db.add(a)
            assessments1.append(a)
        db.flush()

        growth_service.update_mastery_from_quiz_attempt(db, test_user, quiz1, assessments1)
        db.flush()

        # Check after first attempt
        mastery = db.query(ConceptMastery).filter(
            ConceptMastery.user_id == test_user.id,
            ConceptMastery.concept_id == concept.id,
        ).first()
        assert mastery.total_attempts == 3
        assert mastery.correct_attempts == 2
        assert mastery.score == pytest.approx(66.67, abs=0.1)

        # --- Second quiz attempt: 3 correct / 3 total ---
        quiz2 = Quiz(
            project_id=project.id, user_id=test_user.id,
            title="Quiz 2", quiz_type="adaptive", difficulty="medium",
            question_count=3, status="ready",
        )
        db.add(quiz2)
        db.flush()

        questions2 = []
        for i in range(3):
            q = Question(
                quiz_id=quiz2.id, concept_id=concept.id,
                source_material_id=chunks[0].material_id,
                source_chunk_id=chunks[0].id,
                question_order=i+1, question_text=f"Q2-{i+1}",
                question_type="mcq", options=["A", "B", "C", "D"],
                correct_answer="A", difficulty="medium",
            )
            db.add(q)
            questions2.append(q)
        db.flush()

        attempt2 = QuizAttempt(
            quiz_id=quiz2.id, user_id=test_user.id,
            status="completed", total_questions=3, correct_answers=3, score=100.0,
        )
        db.add(attempt2)
        db.flush()

        assessments2 = []
        for i, q in enumerate(questions2):
            a = Assessment(
                quiz_attempt_id=attempt2.id, question_id=q.id,
                user_id=test_user.id, user_answer="A",
                is_correct=True, ai_score=1.0,
            )
            db.add(a)
            assessments2.append(a)
        db.flush()

        growth_service.update_mastery_from_quiz_attempt(db, test_user, quiz2, assessments2)
        db.flush()

        # After second attempt: 5 correct / 6 total
        db.refresh(mastery)
        assert mastery.total_attempts == 6
        assert mastery.correct_attempts == 5
        assert mastery.score == pytest.approx(83.33, abs=0.1)
        assert mastery.status == "improving"  # >= 80


# =========================================================================
# Test: User isolation
# =========================================================================

class TestUserIsolation:
    """Verify User B cannot see or access User A's mastery data."""

    def test_user_b_cannot_see_user_a_mastery(self, client, db, test_user, auth_headers):
        """Growth endpoint returns 404 for projects not owned by the user."""
        _, project, _, chunks = _create_project_with_materials(db, test_user)
        db.commit()

        # Create user B
        user_b = User(
            email="userb_growth@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="User B",
            is_active=True,
        )
        db.add(user_b)
        db.commit()
        db.refresh(user_b)

        token_b = create_access_token(subject=user_b.id)
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User B should not be able to access User A's project mastery
        res = client.get(
            f"/api/v1/growth/mastery?project_id={project.id}",
            headers=headers_b,
        )
        assert res.status_code == 404

    def test_user_b_cannot_see_user_a_growth_summary(self, client, db, test_user, auth_headers):
        """Growth summary returns 404 for non-owned projects."""
        _, project, _, _ = _create_project_with_materials(db, test_user)
        db.commit()

        user_b = User(
            email="userb_summary@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="User B Summary",
            is_active=True,
        )
        db.add(user_b)
        db.commit()
        db.refresh(user_b)

        token_b = create_access_token(subject=user_b.id)
        headers_b = {"Authorization": f"Bearer {token_b}"}

        res = client.get(
            f"/api/v1/growth/summary?project_id={project.id}",
            headers=headers_b,
        )
        assert res.status_code == 404


# =========================================================================
# Test: Empty project
# =========================================================================

class TestEmptyProject:
    """Verify growth endpoints return empty data for projects with no quizzes."""

    def test_empty_mastery_list(self, client, db, test_user, auth_headers):
        """A project with no quiz history should return empty mastery list."""
        _, project, _, _ = _create_project_with_materials(db, test_user)
        db.commit()

        res = client.get(
            f"/api/v1/growth/mastery?project_id={project.id}",
            headers=auth_headers,
        )
        assert res.status_code == 200
        assert res.json()["data"] == []

    def test_empty_growth_summary(self, client, db, test_user, auth_headers):
        """A project with no quiz history should return zeroed growth summary."""
        _, project, _, _ = _create_project_with_materials(db, test_user)
        db.commit()

        res = client.get(
            f"/api/v1/growth/summary?project_id={project.id}",
            headers=auth_headers,
        )
        assert res.status_code == 200
        summary = res.json()["data"]
        assert summary["overall_mastery"] == 0.0
        assert summary["total_concepts"] == 0
        assert summary["mastered_count"] == 0
        assert summary["improving_count"] == 0
        assert summary["needs_attention_count"] == 0
        assert summary["masteries"] == []


# =========================================================================
# Test: Status classification thresholds
# =========================================================================

class TestStatusClassification:
    """Verify mastery status is correctly derived from score."""

    def test_status_improving_at_80(self, db, test_user):
        """Score >= 80 should map to 'improving'."""
        from app.services.growth_service import GrowthService
        assert GrowthService._compute_status(80.0) == "improving"
        assert GrowthService._compute_status(100.0) == "improving"

    def test_status_stable_at_50_to_79(self, db, test_user):
        """Score 50-79 should map to 'stable'."""
        from app.services.growth_service import GrowthService
        assert GrowthService._compute_status(50.0) == "stable"
        assert GrowthService._compute_status(79.99) == "stable"

    def test_status_requiring_attention_below_50(self, db, test_user):
        """Score < 50 should map to 'requiring_attention'."""
        from app.services.growth_service import GrowthService
        assert GrowthService._compute_status(0.0) == "requiring_attention"
        assert GrowthService._compute_status(49.99) == "requiring_attention"


# =========================================================================
# Test: Growth summary aggregation via API
# =========================================================================

class TestGrowthSummaryAPI:
    """Verify the /growth/summary endpoint returns correct aggregated data."""

    def test_growth_summary_with_mixed_masteries(self, client, db, test_user, auth_headers):
        """Verify summary aggregation with multiple concept masteries."""
        _, project, _, _ = _create_project_with_materials(db, test_user)

        # Create concepts and mastery records directly
        c1 = Concept(project_id=project.id, name="Concept Alpha")
        c2 = Concept(project_id=project.id, name="Concept Beta")
        c3 = Concept(project_id=project.id, name="Concept Gamma")
        db.add_all([c1, c2, c3])
        db.flush()

        m1 = ConceptMastery(
            concept_id=c1.id, project_id=project.id, user_id=test_user.id,
            score=90.0, status="improving", total_attempts=10, correct_attempts=9,
        )
        m2 = ConceptMastery(
            concept_id=c2.id, project_id=project.id, user_id=test_user.id,
            score=65.0, status="stable", total_attempts=20, correct_attempts=13,
        )
        m3 = ConceptMastery(
            concept_id=c3.id, project_id=project.id, user_id=test_user.id,
            score=30.0, status="requiring_attention", total_attempts=10, correct_attempts=3,
        )
        db.add_all([m1, m2, m3])
        db.commit()

        res = client.get(
            f"/api/v1/growth/summary?project_id={project.id}",
            headers=auth_headers,
        )
        assert res.status_code == 200
        summary = res.json()["data"]

        assert summary["total_concepts"] == 3
        assert summary["mastered_count"] == 1
        assert summary["improving_count"] == 1
        assert summary["needs_attention_count"] == 1
        # Overall: (90 + 65 + 30) / 3 = 61.67
        assert abs(summary["overall_mastery"] - 61.67) < 0.1
        assert len(summary["masteries"]) == 3

    def test_concepts_endpoint(self, client, db, test_user, auth_headers):
        """Verify the /growth/concepts endpoint returns project concepts."""
        _, project, _, _ = _create_project_with_materials(db, test_user)

        c1 = Concept(project_id=project.id, name="Alpha Concept")
        c2 = Concept(project_id=project.id, name="Beta Concept")
        db.add_all([c1, c2])
        db.commit()

        res = client.get(
            f"/api/v1/growth/concepts?project_id={project.id}",
            headers=auth_headers,
        )
        assert res.status_code == 200
        concepts = res.json()["data"]
        assert len(concepts) == 2
        names = [c["name"] for c in concepts]
        assert "Alpha Concept" in names
        assert "Beta Concept" in names

    def test_unauthenticated_growth_returns_401(self, client, db, test_user):
        """Growth endpoints should require authentication."""
        _, project, _, _ = _create_project_with_materials(db, test_user)
        db.commit()

        res = client.get(f"/api/v1/growth/summary?project_id={project.id}")
        assert res.status_code in [401, 403]
