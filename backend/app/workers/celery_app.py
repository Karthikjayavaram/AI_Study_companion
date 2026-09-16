from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "ai_study_companion_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)


@celery_app.task(name="tasks.process_document")
def process_document_task(material_id: str):
    """
    Background workflow placeholder for document parsing, OCR, chunking,
    and vector embedding creation.
    """
    return {"status": "queued", "material_id": material_id}


@celery_app.task(name="tasks.evaluate_quiz_attempt")
def evaluate_quiz_attempt_task(attempt_id: str):
    """
    Background workflow placeholder for evaluating open-ended answers,
    updating concept mastery, and generating recommendations.
    """
    return {"status": "queued", "attempt_id": attempt_id}
