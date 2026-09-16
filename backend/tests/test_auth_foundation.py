def test_user_registration(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newlearner@example.com",
            "password": "strongPassword123",
            "full_name": "New Learner",
        },
    )
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["data"]["email"] == "newlearner@example.com"
    assert "id" in res_data["data"]


def test_user_login_success(client, test_user):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "learner@example.com",
            "password": "securepass123",
        },
    )
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert "access_token" in res_data["data"]
    assert res_data["data"]["token_type"] == "bearer"


def test_user_login_invalid_password(client, test_user):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "learner@example.com",
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401


def test_get_current_user_me(client, auth_headers, test_user):
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["data"]["email"] == test_user.email
