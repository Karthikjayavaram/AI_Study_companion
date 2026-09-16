from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.concept import Concept, ConceptMastery
from app.models.recommendation import Recommendation
from app.models.project import Project
from app.models.user import User
from app.schemas.concept import ConceptMasteryRead
from app.schemas.recommendation import RecommendationRead
from app.schemas.common import APIResponse

router = APIRouter()


@router.get("/mastery", response_model=APIResponse[List[ConceptMasteryRead]])
def get_concept_mastery(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    masteries = (
        db.query(ConceptMastery)
        .filter(ConceptMastery.project_id == project_id)
        .all()
    )
    return APIResponse(data=[ConceptMasteryRead.model_validate(m) for m in masteries])


@router.get("/recommendations", response_model=APIResponse[List[RecommendationRead]])
def get_recommendations(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    recs = (
        db.query(Recommendation)
        .filter(Recommendation.project_id == project_id)
        .order_by(Recommendation.created_at.desc())
        .all()
    )
    return APIResponse(data=[RecommendationRead.model_validate(r) for r in recs])
