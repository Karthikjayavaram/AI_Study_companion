from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.activity import ActivityEvent
from app.models.project import Project
from app.models.user import User
from app.schemas.activity import ActivityEventRead
from app.schemas.common import APIResponse

router = APIRouter()


@router.get("/activity", response_model=APIResponse[List[ActivityEventRead]])
def list_activity_events(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50,
):
    query = db.query(ActivityEvent).filter(ActivityEvent.user_id == current_user.id)
    if project_id:
        query = query.filter(ActivityEvent.project_id == project_id)
    events = query.order_by(ActivityEvent.created_at.desc()).limit(limit).all()
    return APIResponse(data=[ActivityEventRead.model_validate(e) for e in events])
