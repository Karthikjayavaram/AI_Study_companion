"""
Authentication security and behavior tests.

Covers all 10 required cases plus regression tests for the existing passing suite:
  1.  Register a new user successfully.
  2.  Duplicate email registration is rejected (409/400).
  3.  Password is NOT returned in the registration response.
  4.  Login with correct credentials succeeds.
  5.  Login with incorrect credentials fails (401).
  6.  GET /me works with a valid JWT.
  7.  GET /me fails without any authentication (401).
  8.  GET /me fails with an invalid/garbage JWT (401).
  9.  A protected endpoint (GET /api/v1/spaces) fails without authentication (401).
  10. An expired JWT is rejected (401).
  11. (regression) Login with wrong email is rejected.
  12. (regression) Inactive user cannot log in.
  13. (regression) Valid JWT for a deleted user is rejected (401, not 404).
"""

from datetime import timedelta
import pytest
from app.core.security import create_access_token, get_password_hash
from app.models.user import User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _register(client, email="user@test.com", password="Pass1234!", full_name="Test User"):
    return client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": full_name},
    )


def _login(client, email, password):
    return client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )


# ---------------------------------------------------------------------------
# 1. Successful registration
# ---------------------------------------------------------------------------

def test_register_new_user(client):
    res = _register(client, email="new@example.com")
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert data["data"]["email"] == "new@example.com"
    assert "id" in data["data"]


# ---------------------------------------------------------------------------
# 2. Duplicate email registration is rejected
# ---------------------------------------------------------------------------

def test_register_duplicate_email(client):
    _register(client, email="dup@example.com")
    res = _register(client, email="dup@example.com")
    # Must be a 4xx; the endpoint returns 400
    assert res.status_code == 400
    body = res.json()
    assert body.get("success") is not True or body.get("detail") is not None


# ---------------------------------------------------------------------------
# 3. Password is NOT returned in the registration response
# ---------------------------------------------------------------------------

def test_register_password_not_in_response(client):
    res = _register(client, email="nopass@example.com")
    assert res.status_code == 201
    body_str = res.text
    # Neither the plaintext password nor the bcrypt hash field must appear
    assert "Pass1234!" not in body_str
    assert "hashed_password" not in body_str


# ---------------------------------------------------------------------------
# 4. Login with correct credentials succeeds
# ---------------------------------------------------------------------------

def test_login_success(client, test_user):
    res = _login(client, "learner@example.com", "securepass123")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    token_data = data["data"]
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    # The user object is embedded in the token response
    assert token_data["user"]["email"] == "learner@example.com"


# ---------------------------------------------------------------------------
# 5. Login with incorrect credentials fails
# ---------------------------------------------------------------------------

def test_login_wrong_password(client, test_user):
    res = _login(client, "learner@example.com", "WRONG_PASSWORD")
    assert res.status_code == 401


def test_login_wrong_email(client, test_user):
    res = _login(client, "nobody@example.com", "securepass123")
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# 6. GET /me works with a valid JWT
# ---------------------------------------------------------------------------

def test_me_authenticated(client, auth_headers, test_user):
    res = client.get("/api/v1/auth/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    user_data = data["data"]
    assert user_data["email"] == test_user.email
    assert user_data["id"] == test_user.id
    # Safety: password must never appear in this response
    assert "hashed_password" not in res.text
    assert "password" not in user_data


# ---------------------------------------------------------------------------
# 7. GET /me fails without any authentication
# ---------------------------------------------------------------------------

def test_me_no_token(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# 8. GET /me fails with an invalid/garbage JWT
# ---------------------------------------------------------------------------

def test_me_invalid_token(client):
    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer this.is.not.a.valid.jwt"},
    )
    assert res.status_code == 401


def test_me_malformed_bearer_header(client):
    res = client.get("/api/v1/auth/me", headers={"Authorization": "NotBearer token"})
    # OAuth2PasswordBearer with auto_error=False will not extract this → 401
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# 9. A protected endpoint fails without authentication
# ---------------------------------------------------------------------------

def test_protected_spaces_no_auth(client):
    """GET /api/v1/spaces requires authentication and must return 401."""
    res = client.get("/api/v1/spaces")
    assert res.status_code == 401


def test_protected_spaces_bad_token(client):
    res = client.get(
        "/api/v1/spaces",
        headers={"Authorization": "Bearer garbage.token.here"},
    )
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# 10. An expired JWT is rejected
# ---------------------------------------------------------------------------

def test_expired_token_rejected(client, test_user):
    """
    Create a token that is already expired (negative delta) and confirm the
    backend returns 401, not 200.
    """
    expired_token = create_access_token(
        subject=test_user.id,
        expires_delta=timedelta(seconds=-1),  # already expired
    )
    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# 11 (regression). Inactive user cannot log in
# ---------------------------------------------------------------------------

def test_inactive_user_cannot_login(client, db):
    inactive = User(
        email="inactive@example.com",
        hashed_password=get_password_hash("pass1234"),
        full_name="Inactive",
        is_active=False,
    )
    db.add(inactive)
    db.commit()
    db.refresh(inactive)

    res = _login(client, "inactive@example.com", "pass1234")
    assert res.status_code == 400


# ---------------------------------------------------------------------------
# 12 (regression). Valid token for a deleted user → 401, NOT 404
# ---------------------------------------------------------------------------

def test_deleted_user_token_rejected(client, db):
    """
    If a user is deleted after issuing a token, subsequent requests must be
    rejected with 401 (auth failure), not 404 (resource not found).
    """
    ghost = User(
        email="ghost@example.com",
        hashed_password=get_password_hash("ghost1234"),
        full_name="Ghost User",
        is_active=True,
    )
    db.add(ghost)
    db.commit()
    db.refresh(ghost)

    token = create_access_token(subject=ghost.id)

    # Now delete the user
    db.delete(ghost)
    db.commit()

    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 401
