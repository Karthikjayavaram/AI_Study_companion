"""
Authorization tests for Projects resource.

Verifies:
- Authenticated users can create projects inside their own Spaces.
- Users CANNOT create a project inside another user's Space (404/unauthorized).
- Listing projects returns only the authenticated user's projects.
- One user cannot view, update, or delete another user's project.
- Updating and deleting owned projects works as expected.
"""

import pytest
from app.core.security import create_access_token, get_password_hash
from app.models.user import User
from app.models.space import Space
from app.models.project import Project


@pytest.fixture
def user_a(db):
    user = User(
        email="usera-proj@test.com",
        hashed_password=get_password_hash("password123"),
        full_name="User A Proj",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def user_b(db):
    user = User(
        email="userb-proj@test.com",
        hashed_password=get_password_hash("password123"),
        full_name="User B Proj",
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
def space_a(db, user_a):
    space = Space(
        user_id=user_a.id,
        name="User A's Space",
        description="Space for User A",
        color_code="#4f46e5",
    )
    db.add(space)
    db.commit()
    db.refresh(space)
    return space


def test_create_project_in_own_space(client, headers_a, space_a, user_a):
    response = client.post(
        "/api/v1/projects",
        json={
            "space_id": space_a.id,
            "name": "Neural Networks 101",
            "description": "Deep Learning Fundamentals",
            "learning_goal": "Understand backpropagation",
        },
        headers=headers_a,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "Neural Networks 101"
    assert data["data"]["space_id"] == space_a.id
    assert data["data"]["user_id"] == user_a.id


def test_cannot_create_project_in_other_user_space(client, headers_b, space_a):
    # space_a belongs to user_a. user_b attempts to create project inside it.
    response = client.post(
        "/api/v1/projects",
        json={
            "space_id": space_a.id,
            "name": "Unauthorized Project",
            "description": "Cross-user attempt",
        },
        headers=headers_b,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Specified Space not found or unauthorized."


def test_list_projects_isolation(client, headers_a, headers_b, space_a, user_a, user_b):
    # Create project for User A
    resp1 = client.post(
        "/api/v1/projects",
        json={"space_id": space_a.id, "name": "User A Project"},
        headers=headers_a,
    )
    assert resp1.status_code == 201

    # User B lists projects
    resp2 = client.get("/api/v1/projects", headers=headers_b)
    assert resp2.status_code == 200
    user2_projects = resp2.json()["data"]
    for p in user2_projects:
        assert p["user_id"] == user_b.id


def test_get_project_authorization(client, headers_a, headers_b, space_a):
    resp1 = client.post(
        "/api/v1/projects",
        json={"space_id": space_a.id, "name": "Private Project"},
        headers=headers_a,
    )
    project_id = resp1.json()["data"]["id"]

    # User B tries to read User A's project
    resp2 = client.get(f"/api/v1/projects/{project_id}", headers=headers_b)
    assert resp2.status_code == 404


def test_update_project_authorization(client, headers_a, headers_b, space_a):
    resp1 = client.post(
        "/api/v1/projects",
        json={"space_id": space_a.id, "name": "Original Name"},
        headers=headers_a,
    )
    project_id = resp1.json()["data"]["id"]

    # User B tries to update User A's project
    resp2 = client.put(
        f"/api/v1/projects/{project_id}",
        json={"name": "Hacked Name"},
        headers=headers_b,
    )
    assert resp2.status_code == 404

    # User A updates own project
    resp3 = client.put(
        f"/api/v1/projects/{project_id}",
        json={"name": "Updated Name"},
        headers=headers_a,
    )
    assert resp3.status_code == 200
    assert resp3.json()["data"]["name"] == "Updated Name"


def test_delete_project_authorization(client, headers_a, headers_b, space_a):
    resp1 = client.post(
        "/api/v1/projects",
        json={"space_id": space_a.id, "name": "To Be Deleted"},
        headers=headers_a,
    )
    project_id = resp1.json()["data"]["id"]

    # User B tries to delete User A's project
    resp2 = client.delete(f"/api/v1/projects/{project_id}", headers=headers_b)
    assert resp2.status_code == 404

    # User A deletes own project
    resp3 = client.delete(f"/api/v1/projects/{project_id}", headers=headers_a)
    assert resp3.status_code == 200

    # Confirm deleted
    resp4 = client.get(f"/api/v1/projects/{project_id}", headers=headers_a)
    assert resp4.status_code == 404
