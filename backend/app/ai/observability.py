from typing import Optional
from sqlalchemy.orm import Session
from app.models.ai_usage import AIUsage
from app.core.logging import logger


def record_ai_telemetry(
    db: Session,
    *,
    user_id: str,
    project_id: Optional[str] = None,
    feature: str,
    model: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    latency_ms: int = 0,
    estimated_cost: float = 0.0,
    success: bool = True,
    error_message: Optional[str] = None,
) -> AIUsage:
    """
    Persists an AI telemetry record in the ai_usages table for observability,
    latency tracking, and cost auditing.
    """
    total_tokens = prompt_tokens + completion_tokens
    record = AIUsage(
        user_id=user_id,
        project_id=project_id,
        feature=feature,
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        latency_ms=latency_ms,
        estimated_cost=estimated_cost,
        success=success,
        error_message=error_message,
    )
    db.add(record)
    try:
        db.commit()
        db.refresh(record)
    except Exception as e:
        logger.error(f"Failed to record AI telemetry: {e}")
        db.rollback()
    return record
