from typing import Any, Dict, List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_superuser
from app.models.user import User
from app.models.space import Space
from app.models.project import Project
from app.models.material import Material
from app.models.ai_usage import AIUsage
from app.schemas.ai_usage import AIUsageRead
from app.schemas.common import APIResponse

router = APIRouter()


@router.get("/metrics", response_model=APIResponse[Dict[str, Any]])
def get_admin_metrics(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_superuser),
):
    total_users = db.query(User).count()
    total_spaces = db.query(Space).count()
    total_projects = db.query(Project).count()
    total_materials = db.query(Material).count()
    total_ai_calls = db.query(AIUsage).count()

    return APIResponse(
        data={
            "total_users": total_users,
            "total_spaces": total_spaces,
            "total_projects": total_projects,
            "total_materials": total_materials,
            "total_ai_calls": total_ai_calls,
            "system_health": "operational",
        }
    )


@router.get("/ai-usage", response_model=APIResponse[List[AIUsageRead]])
def get_admin_ai_usage(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_superuser),
    limit: int = 50,
):
    records = db.query(AIUsage).order_by(AIUsage.created_at.desc()).limit(limit).all()
    return APIResponse(data=[AIUsageRead.model_validate(r) for r in records])
