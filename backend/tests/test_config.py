from app.core.config import settings


def test_settings_loaded():
    assert settings.APP_NAME == "AI Study Companion"
    assert settings.API_V1_STR == "/api/v1"
    assert isinstance(settings.CORS_ORIGINS, list)
    assert len(settings.CORS_ORIGINS) > 0
