from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.recommendation import NextActionResponse
from app.services.recommendation_service import RecommendationService

router = APIRouter()
recommendation_service = RecommendationService()


@router.get("/{project_id}/recommendations/next", response_model=APIResponse[NextActionResponse])
def get_next_learning_action(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the personalized next learning action for the authenticated user in a project.
    Determined algorithmically from concept mastery, quiz attempts, and learning states.
    """
    recommendation = recommendation_service.get_next_recommendation(
        db=db,
        user=current_user,
        project_id=project_id,
    )
    return APIResponse(data=recommendation)
