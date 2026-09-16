"""
Authorization tests for Spaces resource.

Verifies:
- Authenticated users can access and manage their own Spaces.
- One user cannot read, modify, or delete another user's Space.
- All ownership is enforced at the backend (database query level).
- Correct HTTP status codes are returned.
"""

import pytest
from app.core.security import create_access_token, get_password_hash
from app.models.user import User
from app.models.space import Space


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def user_a(db):
    user = User(
        email="usera@spaces-test.com",
        hashed_password=get_password_hash("password123"),
        full_name="User A",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def user_b(db):
    user = User(
        email="userb@spaces-test.com",
        hashed_password=get_password_hash("password123"),
        full_name="User B",
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
    """A Space owned by User A."""
    space = Space(
        user_id=user_a.id,
        name="User A's Study Space",
        description="Private space belonging to User A",
        color_code="#4f46e5",
        icon="book-open",
    )
    db.add(space)
    db.commit()
    db.refresh(space)
    return space


# ---------------------------------------------------------------------------
# Positive: authenticated user manages own Spaces
# ---------------------------------------------------------------------------

def test_create_space_authenticated(client, headers_a):
    res = client.post(
        "/api/v1/spaces",
        json={"name": "My New Space", "description": "Test description"},
        headers=headers_a,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert data["data"]["name"] == "My New Space"


def test_list_spaces_only_returns_own(client, headers_a, headers_b, space_a, db, user_b):
    """User B's space list must NOT include User A's spaces."""
    # Create a space for User B too
    space_b = Space(
        user_id=user_b.id,
        name="User B's Space",
        color_code="#4f46e5",
        icon="book-open",
    )
    db.add(space_b)
    db.commit()

    res_a = client.get("/api/v1/spaces", headers=headers_a)
    assert res_a.status_code == 200
    ids_a = {s["id"] for s in res_a.json()["data"]}

    res_b = client.get("/api/v1/spaces", headers=headers_b)
    assert res_b.status_code == 200
    ids_b = {s["id"] for s in res_b.json()["data"]}

    # No overlap between the two users' space lists
    assert ids_a.isdisjoint(ids_b)
    assert space_a.id in ids_a
    assert space_b.id in ids_b


def test_get_own_space(client, headers_a, space_a):
    res = client.get(f"/api/v1/spaces/{space_a.id}", headers=headers_a)
    assert res.status_code == 200
    assert res.json()["data"]["id"] == space_a.id


def test_update_own_space(client, headers_a, space_a):
    res = client.put(
        f"/api/v1/spaces/{space_a.id}",
        json={"name": "Updated Name"},
        headers=headers_a,
    )
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Updated Name"


def test_delete_own_space(client, headers_a, space_a):
    res = client.delete(f"/api/v1/spaces/{space_a.id}", headers=headers_a)
    assert res.status_code == 204

    # Confirm it's gone
    follow_up = client.get(f"/api/v1/spaces/{space_a.id}", headers=headers_a)
    assert follow_up.status_code == 404


# ---------------------------------------------------------------------------
# Negative: User B cannot access User A's spaces
# ---------------------------------------------------------------------------

def test_cannot_read_other_users_space(client, headers_b, space_a):
    """User B must not be able to read User A's Space."""
    res = client.get(f"/api/v1/spaces/{space_a.id}", headers=headers_b)
    assert res.status_code == 404  # Not 403 — we reveal nothing about existence


def test_cannot_update_other_users_space(client, headers_b, space_a):
    """User B must not be able to update User A's Space."""
    res = client.put(
        f"/api/v1/spaces/{space_a.id}",
        json={"name": "Hijacked Name"},
        headers=headers_b,
    )
    assert res.status_code == 404


def test_cannot_delete_other_users_space(client, headers_b, space_a):
    """User B must not be able to delete User A's Space."""
    res = client.delete(f"/api/v1/spaces/{space_a.id}", headers=headers_b)
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# Negative: Unauthenticated access to Spaces is rejected
# ---------------------------------------------------------------------------

def test_spaces_unauthenticated_list(client):
    res = client.get("/api/v1/spaces")
    assert res.status_code == 401


def test_spaces_unauthenticated_get(client, space_a):
    res = client.get(f"/api/v1/spaces/{space_a.id}")
    assert res.status_code == 401


def test_spaces_unauthenticated_create(client):
    res = client.post("/api/v1/spaces", json={"name": "Illegal Space"})
    assert res.status_code == 401


def test_spaces_unauthenticated_update(client, space_a):
    res = client.put(f"/api/v1/spaces/{space_a.id}", json={"name": "Illegal"})
    assert res.status_code == 401


def test_spaces_unauthenticated_delete(client, space_a):
    res = client.delete(f"/api/v1/spaces/{space_a.id}")
    assert res.status_code == 401
