import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models.assessment import Question, Quiz
from app.models.material import Material, MaterialChunk
from app.models.project import Project
from app.models.space import Space
from app.models.user import User
from app.ai.base import BaseLLMClient, LLMResult
import app.api.v1.endpoints.quiz as quiz_endpoint_module


class DeterministicMockLLM(BaseLLMClient):
    """
    Mock LLM that returns exactly the candidate questions configured for the test.
    """
    def __init__(self, questions: list = None, should_fail: bool = False):
        self.questions = questions or []
        self.should_fail = should_fail
        self.last_prompt = ""
        self.last_system_prompt = ""

    def generate_text(self, prompt: str, system_prompt: str = None, temperature: float = 0.2, max_tokens: int = None) -> LLMResult:
        if self.should_fail:
            raise RuntimeError("Upstream Hugging Face Error")
        self.last_prompt = prompt
        self.last_system_prompt = system_prompt or ""

        content = json.dumps({
            "quiz_title": "Grounding Audit Quiz",
            "quiz_description": "Test quiz",
            "questions": self.questions,
        })
        return LLMResult(
            content=content,
            model="mock-hf-test",
            prompt_tokens=100,
            completion_tokens=100,
            total_tokens=200,
            latency_ms=50,
        )

    def generate_structured(self, prompt: str, response_schema: dict, system_prompt: str = None) -> dict:
        return {}

    def generate_embeddings(self, texts: list) -> list:
        return [[0.05] * 384 for _ in texts]


@pytest.fixture
def user_primary(db: Session):
    u = User(email="primary-grounding@test.com", hashed_password=get_password_hash("pass123"), full_name="Primary", is_active=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def user_other(db: Session):
    u = User(email="other-grounding@test.com", hashed_password=get_password_hash("pass123"), full_name="Other", is_active=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def headers_primary(user_primary: User):
    token = create_access_token(subject=user_primary.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def headers_other(user_other: User):
    token = create_access_token(subject=user_other.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def setup_multi_chunk_project(db: Session, user_primary: User):
    space = Space(user_id=user_primary.id, name="Algorithms Space")
    db.add(space)
    db.commit()

    project = Project(space_id=space.id, user_id=user_primary.id, name="Advanced DSA")
    db.add(project)
    db.commit()

    material = Material(project_id=project.id, user_id=user_primary.id, title="Algorithm Design Manual", material_type="notes", status="ready")
    db.add(material)
    db.commit()

    # Create 16 chunks: chunks 0-14 introductory, chunk 15 has specific target fact
    chunks = []
    for i in range(16):
        if i == 15:
            content = "Dynamic Programming memoization optimizes recursive algorithms by storing subproblem results in a hash table or array."
            emb = [0.05] * 384  # High similarity (1.0) with mock query vector
        else:
            content = f"Chapter {i} explains introductory algorithmic paradigms and basic asymptotic notation principles."
            emb = [0.04] * 384 if i == 0 else [0.01] * 384
        c = MaterialChunk(
            id=f"algo-chunk-{i}",
            project_id=project.id,
            material_id=material.id,
            chunk_index=i,
            content=content,
            page_number=i + 1,
            embedding=emb,
        )
        chunks.append(c)
    db.add_all(chunks)
    db.commit()

    return project, material, chunks


# -----------------------------------------------------------------------------
# 1. RETRIEVAL TESTS
# -----------------------------------------------------------------------------

def test_quiz_can_retrieve_chunk_beyond_first_twelve(client: TestClient, db: Session, setup_multi_chunk_project, headers_primary: dict, monkeypatch):
    project, material, chunks = setup_multi_chunk_project
    target_chunk = chunks[15]  # Index 15 is well beyond index 12

    mock_llm = DeterministicMockLLM(questions=[
        {
            "question_text": "How does Dynamic Programming memoization optimize recursive algorithms?",
            "options": [
                "By storing subproblem results in a hash table or array",
                "By sorting elements in descending order",
                "By deleting redundant pointer references",
                "By re-indexing binary search trees",
            ],
            "correct_answer": "By storing subproblem results in a hash table or array",
            "explanation": "Memoization stores subproblem solutions to prevent recomputation.",
            "difficulty": "medium",
            "source_chunk_id": target_chunk.id,
            "evidence_quote": "Dynamic Programming memoization optimizes recursive algorithms by storing subproblem results in a hash table or array.",
            "concept_name": "Dynamic Programming",
        }
    ])
    monkeypatch.setattr(quiz_endpoint_module.quiz_service, "ai_provider", mock_llm)

    res = client.post(
        f"/api/v1/projects/{project.id}/quizzes/generate",
        json={"title": "DP Quiz", "question_count": 1},
        headers=headers_primary,
    )
    assert res.status_code == 201, res.text
    quiz_data = res.json()["data"]
    assert quiz_data["question_count"] == 1

    # Verify that the persisted question references chunk 15 (page 16)
    q_db = db.query(Question).filter(Question.quiz_id == quiz_data["id"]).first()
    assert q_db is not None
    assert q_db.source_chunk_id == "algo-chunk-15"


def test_project_isolation_in_retrieval(client: TestClient, db: Session, setup_multi_chunk_project, user_other: User, headers_other: dict, monkeypatch):
    project_a, _, _ = setup_multi_chunk_project

    # User B tries to generate a quiz for User A's project
    mock_llm = DeterministicMockLLM(questions=[])
    monkeypatch.setattr(quiz_endpoint_module.quiz_service, "ai_provider", mock_llm)

    res = client.post(
        f"/api/v1/projects/{project_a.id}/quizzes/generate",
        json={"question_count": 2},
        headers=headers_other,
    )
    assert res.status_code == 404
    assert "not found or unauthorized" in res.json()["detail"].lower()


# -----------------------------------------------------------------------------
# 2. GROUNDING & EVIDENCE QUOTE VALIDATION TESTS
# -----------------------------------------------------------------------------

def test_grounding_valid_evidence_quote_passes(client: TestClient, setup_multi_chunk_project, headers_primary: dict, monkeypatch):
    project, _, chunks = setup_multi_chunk_project
    target_chunk = chunks[0]

    mock_llm = DeterministicMockLLM(questions=[
        {
            "question_text": "What do basic algorithmic principles explain in introductory chapters?",
            "options": [
                "Introductory algorithmic paradigms and basic asymptotic notation principles",
                "Advanced distributed database partitioning schemes",
                "Quantum mechanical state vector calculations",
                "Low level assembly kernel interrupt procedures",
            ],
            "correct_answer": "Introductory algorithmic paradigms and basic asymptotic notation principles",
            "explanation": "Chapter 0 covers asymptotic notation principles.",
            "difficulty": "easy",
            "source_chunk_id": target_chunk.id,
            "evidence_quote": "introductory algorithmic paradigms and basic asymptotic notation principles.",
        }
    ])
    monkeypatch.setattr(quiz_endpoint_module.quiz_service, "ai_provider", mock_llm)

    res = client.post(f"/api/v1/projects/{project.id}/quizzes/generate", json={"question_count": 1}, headers=headers_primary)
    assert res.status_code == 201


def test_grounding_hallucinated_evidence_quote_rejected(client: TestClient, setup_multi_chunk_project, headers_primary: dict, monkeypatch):
    project, _, chunks = setup_multi_chunk_project

    mock_llm = DeterministicMockLLM(questions=[
        {
            "question_text": "What year was the Algorithm Design Manual published?",
            "options": ["1997", "2008", "2020", "2024"],
            "correct_answer": "1997",
            "explanation": "First edition released in 1997.",
            "difficulty": "medium",
            "source_chunk_id": chunks[0].id,
            # Quote does NOT exist in chunk 0!
            "evidence_quote": "The first edition of this book was published in 1997 by Springer Verlag.",
        }
    ])
    monkeypatch.setattr(quiz_endpoint_module.quiz_service, "ai_provider", mock_llm)

    res = client.post(f"/api/v1/projects/{project.id}/quizzes/generate", json={"question_count": 1}, headers=headers_primary)
    # Since only question failed validation, must return HTTP 422
    assert res.status_code == 422
    assert "not enough verified information" in res.json()["detail"].lower()


def test_fake_or_unrelated_source_chunk_id_rejected(client: TestClient, setup_multi_chunk_project, headers_primary: dict, monkeypatch):
    project, _, _ = setup_multi_chunk_project

    mock_llm = DeterministicMockLLM(questions=[
        {
            "question_text": "What is asymptotic notation?",
            "options": ["Mathematical notation for growth", "A programming language", "A network protocol", "A hardware bus"],
            "correct_answer": "Mathematical notation for growth",
            "explanation": "Asymptotic analysis.",
            "difficulty": "easy",
            "source_chunk_id": "totally-fabricated-chunk-id-999",
            "evidence_quote": "introductory algorithmic paradigms",
        }
    ])
    monkeypatch.setattr(quiz_endpoint_module.quiz_service, "ai_provider", mock_llm)

    res = client.post(f"/api/v1/projects/{project.id}/quizzes/generate", json={"question_count": 1}, headers=headers_primary)
    assert res.status_code == 422


# -----------------------------------------------------------------------------
# 3. ANSWER CORRECTNESS & OPTION VALIDATION TESTS
# -----------------------------------------------------------------------------

def test_correct_answer_not_in_options_rejected_never_defaults_to_a(client: TestClient, setup_multi_chunk_project, headers_primary: dict, monkeypatch):
    project, _, chunks = setup_multi_chunk_project

    mock_llm = DeterministicMockLLM(questions=[
        {
            "question_text": "What does memoization store in dynamic programming?",
            "options": [
                "Arbitrary register values",
                "Thread synchronization locks",
                "Garbage collector roots",
                "Compiler symbol tables",
            ],
            # correct_answer is NOT in options! Under the old code, it would silently default to Option A!
            "correct_answer": "Subproblem results in a hash table or array",
            "explanation": "Memoization stores subproblems.",
            "difficulty": "medium",
            "source_chunk_id": chunks[15].id,
            "evidence_quote": "Dynamic Programming memoization optimizes recursive algorithms by storing subproblem results in a hash table or array.",
        }
    ])
    monkeypatch.setattr(quiz_endpoint_module.quiz_service, "ai_provider", mock_llm)

    res = client.post(f"/api/v1/projects/{project.id}/quizzes/generate", json={"question_count": 1}, headers=headers_primary)
    # Must reject the question and return 422 (never default to Option A!)
    assert res.status_code == 422


def test_duplicate_options_rejected(client: TestClient, setup_multi_chunk_project, headers_primary: dict, monkeypatch):
    project, _, chunks = setup_multi_chunk_project

    mock_llm = DeterministicMockLLM(questions=[
        {
            "question_text": "What does memoization optimize?",
            "options": [
                "Recursive algorithms",
                "Recursive algorithms",  # Duplicate option!
                "Hardware clocks",
                "Network routers",
            ],
            "correct_answer": "Recursive algorithms",
            "explanation": "Memoization optimizes recursion.",
            "difficulty": "medium",
            "source_chunk_id": chunks[15].id,
            "evidence_quote": "Dynamic Programming memoization optimizes recursive algorithms by storing subproblem results in a hash table or array.",
        }
    ])
    monkeypatch.setattr(quiz_endpoint_module.quiz_service, "ai_provider", mock_llm)

    res = client.post(f"/api/v1/projects/{project.id}/quizzes/generate", json={"question_count": 1}, headers=headers_primary)
    assert res.status_code == 422


def test_forbidden_meta_distractors_rejected(client: TestClient, setup_multi_chunk_project, headers_primary: dict, monkeypatch):
    project, _, chunks = setup_multi_chunk_project

    mock_llm = DeterministicMockLLM(questions=[
        {
            "question_text": "According to the text, which statement is true regarding memoization?",
            "options": [
                "It relates directly to key concepts in the material",  # Meta distractor!
                "None of the above",                                    # Forbidden pattern!
                "Completely irrelevant to the subject matter",          # Meta distractor!
                "All of these",                                         # Forbidden pattern!
            ],
            "correct_answer": "It relates directly to key concepts in the material",
            "explanation": "Derived from chunk.",
            "difficulty": "medium",
            "source_chunk_id": chunks[15].id,
            "evidence_quote": "Dynamic Programming memoization optimizes recursive algorithms by storing subproblem results in a hash table or array.",
        }
    ])
    monkeypatch.setattr(quiz_endpoint_module.quiz_service, "ai_provider", mock_llm)

    res = client.post(f"/api/v1/projects/{project.id}/quizzes/generate", json={"question_count": 1}, headers=headers_primary)
    assert res.status_code == 422


# -----------------------------------------------------------------------------
# 4. QUESTION QUALITY, DUP DETECTION, AND DYNAMIC QUOTAS
# -----------------------------------------------------------------------------

def test_duplicate_question_in_same_batch_rejected(client: TestClient, setup_multi_chunk_project, headers_primary: dict, monkeypatch):
    project, _, chunks = setup_multi_chunk_project

    # Model attempts to generate 2 identical questions in the same response
    mock_llm = DeterministicMockLLM(questions=[
        {
            "question_text": "How does Dynamic Programming memoization optimize recursive algorithms?",
            "options": [
                "By storing subproblem results in a hash table or array",
                "By sorting elements in descending order",
                "By deleting redundant pointer references",
                "By re-indexing binary search trees",
            ],
            "correct_answer": "By storing subproblem results in a hash table or array",
            "explanation": "Explanation 1",
            "difficulty": "medium",
            "source_chunk_id": chunks[15].id,
            "evidence_quote": "Dynamic Programming memoization optimizes recursive algorithms by storing subproblem results in a hash table or array.",
        },
        {
            # Exact duplicate text!
            "question_text": "How does Dynamic Programming memoization optimize recursive algorithms?",
            "options": [
                "By storing subproblem results in a hash table or array",
                "By increasing CPU frequency",
                "By deleting memory cache",
                "By restarting execution",
            ],
            "correct_answer": "By storing subproblem results in a hash table or array",
            "explanation": "Explanation 2",
            "difficulty": "medium",
            "source_chunk_id": chunks[15].id,
            "evidence_quote": "Dynamic Programming memoization optimizes recursive algorithms by storing subproblem results in a hash table or array.",
        }
    ])
    monkeypatch.setattr(quiz_endpoint_module.quiz_service, "ai_provider", mock_llm)

    res = client.post(f"/api/v1/projects/{project.id}/quizzes/generate", json={"question_count": 2}, headers=headers_primary)
    assert res.status_code == 201
    # Only 1 unique question should have survived validation!
    assert res.json()["data"]["question_count"] == 1


def test_near_duplicate_of_persisted_project_question_rejected(client: TestClient, setup_multi_chunk_project, headers_primary: dict, monkeypatch):
    project, _, chunks = setup_multi_chunk_project

    # Quiz 1: creates the DP question
    mock_llm_1 = DeterministicMockLLM(questions=[
        {
            "question_text": "How does Dynamic Programming memoization optimize recursive algorithms?",
            "options": [
                "By storing subproblem results in a hash table or array",
                "By sorting elements in descending order",
                "By deleting redundant pointer references",
                "By re-indexing binary search trees",
            ],
            "correct_answer": "By storing subproblem results in a hash table or array",
            "explanation": "Memoization stores subproblems.",
            "difficulty": "medium",
            "source_chunk_id": chunks[15].id,
            "evidence_quote": "Dynamic Programming memoization optimizes recursive algorithms by storing subproblem results in a hash table or array.",
        }
    ])
    monkeypatch.setattr(quiz_endpoint_module.quiz_service, "ai_provider", mock_llm_1)
    res1 = client.post(f"/api/v1/projects/{project.id}/quizzes/generate", json={"question_count": 1}, headers=headers_primary)
    assert res1.status_code == 201

    # Quiz 2: LLM tries to generate near-identical question in the same project
    mock_llm_2 = DeterministicMockLLM(questions=[
        {
            # Near duplicate with minor punctuation change
            "question_text": "How does dynamic programming memoization optimize recursive algorithms?!",
            "options": [
                "By storing subproblem results in a hash table or array",
                "By increasing clock rate",
                "By compiling ahead of time",
                "By allocating GPU registers",
            ],
            "correct_answer": "By storing subproblem results in a hash table or array",
            "explanation": "Memoization optimization.",
            "difficulty": "medium",
            "source_chunk_id": chunks[15].id,
            "evidence_quote": "Dynamic Programming memoization optimizes recursive algorithms by storing subproblem results in a hash table or array.",
        }
    ])
    monkeypatch.setattr(quiz_endpoint_module.quiz_service, "ai_provider", mock_llm_2)
    res2 = client.post(f"/api/v1/projects/{project.id}/quizzes/generate", json={"question_count": 1}, headers=headers_primary)
    # Rejected as near-duplicate of existing question; zero valid questions remain -> 422
    assert res2.status_code == 422


def test_dynamic_quota_allows_fewer_questions_when_evidence_limited(client: TestClient, setup_multi_chunk_project, headers_primary: dict, monkeypatch):
    project, _, chunks = setup_multi_chunk_project

    # Student requests 5 questions, but LLM only provides 2 reliable questions
    mock_llm = DeterministicMockLLM(questions=[
        {
            "question_text": "What do basic algorithmic principles explain in introductory chapters?",
            "options": [
                "Introductory algorithmic paradigms and basic asymptotic notation principles",
                "Distributed consensus protocols",
                "Garbage collector algorithms",
                "Machine code translation",
            ],
            "correct_answer": "Introductory algorithmic paradigms and basic asymptotic notation principles",
            "explanation": "Chapter 0 covers asymptotic notation principles.",
            "difficulty": "easy",
            "source_chunk_id": chunks[0].id,
            "evidence_quote": "introductory algorithmic paradigms and basic asymptotic notation principles.",
        },
        {
            "question_text": "How does Dynamic Programming memoization optimize recursive algorithms?",
            "options": [
                "By storing subproblem results in a hash table or array",
                "By sorting elements in descending order",
                "By deleting redundant pointer references",
                "By re-indexing binary search trees",
            ],
            "correct_answer": "By storing subproblem results in a hash table or array",
            "explanation": "Memoization stores subproblems.",
            "difficulty": "medium",
            "source_chunk_id": chunks[15].id,
            "evidence_quote": "Dynamic Programming memoization optimizes recursive algorithms by storing subproblem results in a hash table or array.",
        }
    ])
    monkeypatch.setattr(quiz_endpoint_module.quiz_service, "ai_provider", mock_llm)

    res = client.post(f"/api/v1/projects/{project.id}/quizzes/generate", json={"question_count": 5}, headers=headers_primary)
    assert res.status_code == 201
    # System returns the 2 validated questions without fabricating 3 fake questions to satisfy the 5 count!
    assert res.json()["data"]["question_count"] == 2
    assert len(res.json()["data"]["questions"]) == 2


def test_hf_failure_returns_clean_502_error(client: TestClient, setup_multi_chunk_project, headers_primary: dict, monkeypatch):
    project, _, _ = setup_multi_chunk_project

    mock_llm = DeterministicMockLLM(should_fail=True)
    monkeypatch.setattr(quiz_endpoint_module.quiz_service, "ai_provider", mock_llm)

    res = client.post(f"/api/v1/projects/{project.id}/quizzes/generate", json={"question_count": 2}, headers=headers_primary)
    assert res.status_code == 502
    assert "temporarily unavailable" in res.json()["detail"].lower()


def test_source_citation_and_page_number_populated_in_results(client: TestClient, setup_multi_chunk_project, headers_primary: dict, monkeypatch):
    project, _, chunks = setup_multi_chunk_project
    target_chunk = chunks[15]  # page_number is 16

    mock_llm = DeterministicMockLLM(questions=[
        {
            "question_text": "How does Dynamic Programming memoization optimize recursive algorithms?",
            "options": [
                "By storing subproblem results in a hash table or array",
                "By sorting elements in descending order",
                "By deleting redundant pointer references",
                "By re-indexing binary search trees",
            ],
            "correct_answer": "By storing subproblem results in a hash table or array",
            "explanation": "Memoization stores subproblems.",
            "difficulty": "medium",
            "source_chunk_id": target_chunk.id,
            "evidence_quote": "Dynamic Programming memoization optimizes recursive algorithms by storing subproblem results in a hash table or array.",
        }
    ])
    monkeypatch.setattr(quiz_endpoint_module.quiz_service, "ai_provider", mock_llm)

    gen_res = client.post(f"/api/v1/projects/{project.id}/quizzes/generate", json={"question_count": 1}, headers=headers_primary)
    quiz_id = gen_res.json()["data"]["id"]
    q_id = gen_res.json()["data"]["questions"][0]["id"]

    start_res = client.post(f"/api/v1/quizzes/{quiz_id}/attempts", headers=headers_primary)
    attempt_id = start_res.json()["data"]["id"]

    submit_res = client.post(
        f"/api/v1/quiz-attempts/{attempt_id}/submit",
        json={"answers": [{"question_id": q_id, "user_answer": "By storing subproblem results in a hash table or array"}]},
        headers=headers_primary,
    )
    assert submit_res.status_code == 200
    res_item = submit_res.json()["data"]["results"][0]

    # Verify source_page_number is 16 and citation format is clean
    assert res_item["source_page_number"] == 16
    assert "Algorithm Design Manual — Page 16" in res_item["source_citation"]
    assert res_item["is_correct"] is True
