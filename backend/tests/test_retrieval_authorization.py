"""
Authorization, chunking, and vector retrieval integration tests.

Verifies:
- Text materials are automatically chunked and embedded upon creation.
- Reprocessing material removes old chunks and prevents duplicates.
- Retrieval search returns relevant chunks with similarity scores and metadata.
- User B CANNOT search chunks belonging to User A's Project (returns 404).
- Unauthenticated search requests return 401.
"""

import pytest
from app.core.security import create_access_token, get_password_hash
from app.models.user import User
from app.models.space import Space
from app.models.project import Project
from app.models.material import Material, MaterialChunk
from app.services.material_processor import MaterialProcessor


@pytest.fixture
def user_a(db):
    user = User(
        email="usera-rag@test.com",
        hashed_password=get_password_hash("password123"),
        full_name="User A RAG",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def user_b(db):
    user = User(
        email="userb-rag@test.com",
        hashed_password=get_password_hash("password123"),
        full_name="User B RAG",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def headers_a(user_a):
    token = create_access_token(subject=user_a.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def headers_b(user_b):
    token = create_access_token(subject=user_b.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def project_a(db, user_a):
    space = Space(
        user_id=user_a.id,
        name="User A's RAG Space",
        color_code="#4f46e5",
    )
    db.add(space)
    db.commit()
    db.refresh(space)

    project = Project(
        space_id=space.id,
        user_id=user_a.id,
        name="User A's RAG Project",
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def test_material_creation_creates_chunks(client, headers_a, project_a, db):
    text_content = (
        "Supervised learning algorithms build a mathematical model of a set of data "
        "that contains both the inputs and the desired outputs. Machine learning involves "
        "training model parameters using gradient descent and backpropagation."
    )

    res = client.post(
        f"/api/v1/materials/text?project_id={project_a.id}",
        json={"title": "Supervised Learning Notes", "content": text_content},
        headers=headers_a,
    )
    assert res.status_code == 201
    mat_id = res.json()["data"]["id"]

    # Verify chunks created in DB
    chunks = db.query(MaterialChunk).filter(MaterialChunk.material_id == mat_id).all()
    assert len(chunks) > 0
    assert chunks[0].project_id == project_a.id
    assert chunks[0].embedding is not None


def test_reprocessing_material_is_idempotent(client, headers_a, project_a, db):
    res = client.post(
        f"/api/v1/materials/text?project_id={project_a.id}",
        json={"title": "Idempotency Test", "content": "Sample content for idempotency testing."},
        headers=headers_a,
    )
    mat_id = res.json()["data"]["id"]
    material = db.query(Material).filter(Material.id == mat_id).first()

    initial_chunk_count = db.query(MaterialChunk).filter(MaterialChunk.material_id == mat_id).count()
    assert initial_chunk_count > 0

    # Rerun processing pipeline
    MaterialProcessor.process_material_chunks_and_embeddings(db, material)

    reprocessed_chunk_count = db.query(MaterialChunk).filter(MaterialChunk.material_id == mat_id).count()
    assert reprocessed_chunk_count == initial_chunk_count


def test_retrieval_search_success_and_authorization(client, headers_a, headers_b, project_a):
    # User A creates a material
    client.post(
        f"/api/v1/materials/text?project_id={project_a.id}",
        json={
            "title": "Optimization Theory",
            "content": "Gradient descent minimizes cost function by taking steps proportional to negative gradient.",
        },
        headers=headers_a,
    )

    # User A searches Project A -> succeeds
    res_a = client.post(
        f"/api/v1/projects/{project_a.id}/retrieval/search",
        json={"query": "gradient descent cost function", "top_k": 3},
        headers=headers_a,
    )
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["success"] is True
    assert len(data_a["data"]) > 0
    assert data_a["data"][0]["material_title"] == "Optimization Theory"
    assert "content" in data_a["data"][0]

    # User B searches Project A -> rejected (404)
    res_b = client.post(
        f"/api/v1/projects/{project_a.id}/retrieval/search",
        json={"query": "gradient descent", "top_k": 3},
        headers=headers_b,
    )
    assert res_b.status_code == 404
    assert res_b.json()["detail"] == "Project not found or unauthorized."


def test_retrieval_unauthenticated(client, project_a):
    res = client.post(
        f"/api/v1/projects/{project_a.id}/retrieval/search",
        json={"query": "test query"},
    )
    assert res.status_code == 401
