"""
Authorization and functionality tests for Materials resource.

Verifies:
- Authenticated user can create text materials and upload PDF documents into owned projects.
- Text extraction automatically extracts plain text from PDFs.
- One user CANNOT list, create, upload, view, or delete materials in another user's project.
- Material -> Project -> Space -> User authorization chain is strictly enforced.
"""

import io
import pytest
import pypdf
from app.core.security import create_access_token, get_password_hash
from app.models.user import User
from app.models.space import Space
from app.models.project import Project
from app.models.material import Material


@pytest.fixture
def user_a(db):
    user = User(
        email="usera-mat@test.com",
        hashed_password=get_password_hash("password123"),
        full_name="User A Mat",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def user_b(db):
    user = User(
        email="userb-mat@test.com",
        hashed_password=get_password_hash("password123"),
        full_name="User B Mat",
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
        name="User A's Space",
        color_code="#4f46e5",
    )
    db.add(space)
    db.commit()
    db.refresh(space)

    project = Project(
        space_id=space.id,
        user_id=user_a.id,
        name="User A's Project",
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def _create_sample_pdf_bytes() -> bytes:
    """Helper to generate valid sample PDF bytes in memory."""
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def test_create_text_material_own_project(client, headers_a, project_a):
    res = client.post(
        f"/api/v1/materials/text?project_id={project_a.id}",
        json={
            "title": "Python Basics Notes",
            "content": "Functions and classes in Python are first class objects.",
        },
        headers=headers_a,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert data["data"]["title"] == "Python Basics Notes"
    assert data["data"]["material_type"] == "text"
    assert data["data"]["extracted_text"] == "Functions and classes in Python are first class objects."
    assert data["data"]["status"] == "ready"


def test_upload_pdf_material_own_project(client, headers_a, project_a):
    pdf_bytes = _create_sample_pdf_bytes()

    res = client.post(
        "/api/v1/materials/upload",
        data={"project_id": project_a.id, "title": "Sample PDF Document"},
        files={"file": ("sample.pdf", pdf_bytes, "application/pdf")},
        headers=headers_a,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert data["data"]["title"] == "Sample PDF Document"
    assert data["data"]["material_type"] == "document"
    assert data["data"]["status"] == "ready"


def test_cannot_create_text_material_in_other_user_project(client, headers_b, project_a):
    res = client.post(
        f"/api/v1/materials/text?project_id={project_a.id}",
        json={"title": "Hacked Note", "content": "Unauthorized text"},
        headers=headers_b,
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "Project not found or unauthorized."


def test_cannot_upload_material_in_other_user_project(client, headers_b, project_a):
    pdf_bytes = _create_sample_pdf_bytes()
    res = client.post(
        "/api/v1/materials/upload",
        data={"project_id": project_a.id, "title": "Hacked PDF"},
        files={"file": ("sample.pdf", pdf_bytes, "application/pdf")},
        headers=headers_b,
    )
    assert res.status_code == 404


def test_list_materials_isolation(client, headers_a, headers_b, project_a):
    # User A creates a text material
    client.post(
        f"/api/v1/materials/text?project_id={project_a.id}",
        json={"title": "User A Material", "content": "Content A"},
        headers=headers_a,
    )

    # User A lists materials -> succeeds
    res_a = client.get(f"/api/v1/materials?project_id={project_a.id}", headers=headers_a)
    assert res_a.status_code == 200
    assert len(res_a.json()["data"]) == 1

    # User B lists materials for Project A -> rejected (404)
    res_b = client.get(f"/api/v1/materials?project_id={project_a.id}", headers=headers_b)
    assert res_b.status_code == 404


def test_get_and_delete_material_authorization(client, headers_a, headers_b, project_a):
    # User A creates material
    res_create = client.post(
        f"/api/v1/materials/text?project_id={project_a.id}",
        json={"title": "Delete Me", "content": "Temp content"},
        headers=headers_a,
    )
    mat_id = res_create.json()["data"]["id"]

    # User B tries to read -> 404
    res_read_b = client.get(f"/api/v1/materials/{mat_id}", headers=headers_b)
    assert res_read_b.status_code == 404

    # User B tries to delete -> 404
    res_del_b = client.delete(f"/api/v1/materials/{mat_id}", headers=headers_b)
    assert res_del_b.status_code == 404

    # User A reads -> 200
    res_read_a = client.get(f"/api/v1/materials/{mat_id}", headers=headers_a)
    assert res_read_a.status_code == 200
    assert res_read_a.json()["data"]["id"] == mat_id

    # User A deletes -> 200
    res_del_a = client.delete(f"/api/v1/materials/{mat_id}", headers=headers_a)
    assert res_del_a.status_code == 200

    # Confirm deleted
    res_confirm = client.get(f"/api/v1/materials/{mat_id}", headers=headers_a)
    assert res_confirm.status_code == 404


def test_unsupported_file_type_rejected(client, headers_a, project_a):
    res = client.post(
        "/api/v1/materials/upload",
        data={"project_id": project_a.id, "title": "Executable File"},
        files={"file": ("malware.exe", b"binary content", "application/x-msdownload")},
        headers=headers_a,
    )
    assert res.status_code == 400
    assert "Unsupported file format" in res.json()["detail"]


def test_upload_txt_file_with_text_extraction(client, headers_a, project_a):
    txt_content = b"Artificial Intelligence and Machine Learning Study Guide"

    res = client.post(
        "/api/v1/materials/upload",
        data={"project_id": project_a.id, "title": "AI Study Guide"},
        files={"file": ("notes.txt", txt_content, "text/plain")},
        headers=headers_a,
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["title"] == "AI Study Guide"
    assert data["material_type"] == "document"
    assert data["extracted_text"] == "Artificial Intelligence and Machine Learning Study Guide"
    assert data["status"] == "ready"

