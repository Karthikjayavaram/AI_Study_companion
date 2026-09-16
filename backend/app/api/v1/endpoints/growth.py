from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.concept import ConceptMasteryRead, ConceptRead, GrowthSummary
from app.schemas.recommendation import RecommendationRead
from app.schemas.common import APIResponse
from app.services.growth_service import GrowthService
from app.models.recommendation import Recommendation
from app.models.project import Project
from app.models.space import Space

router = APIRouter()
growth_service = GrowthService()


@router.get("/mastery", response_model=APIResponse[List[ConceptMasteryRead]])
def get_concept_mastery(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all concept mastery records for the authenticated user in a project.
    Returns mastery scores computed from quiz attempt history.
    """
    masteries = growth_service.get_project_mastery(db, current_user, project_id)
    return APIResponse(data=[ConceptMasteryRead.model_validate(m) for m in masteries])


@router.get("/summary", response_model=APIResponse[GrowthSummary])
def get_growth_summary(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get an aggregate growth summary for the authenticated user in a project.
    Includes overall mastery percentage, concept counts by status, and individual mastery records.
    """
    summary_data = growth_service.get_growth_summary(db, current_user, project_id)
    mastery_reads = [ConceptMasteryRead.model_validate(m) for m in summary_data["masteries"]]

    return APIResponse(
        data=GrowthSummary(
            overall_mastery=summary_data["overall_mastery"],
            total_concepts=summary_data["total_concepts"],
            mastered_count=summary_data["mastered_count"],
            improving_count=summary_data["improving_count"],
            needs_attention_count=summary_data["needs_attention_count"],
            masteries=mastery_reads,
        )
    )


@router.get("/concepts", response_model=APIResponse[List[ConceptRead]])
def get_project_concepts(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all concepts extracted from quizzes in a project.
    """
    concepts = growth_service.get_project_concepts(db, current_user, project_id)
    return APIResponse(data=[ConceptRead.model_validate(c) for c in concepts])


@router.get("/recommendations", response_model=APIResponse[List[RecommendationRead]])
def get_recommendations(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get learning recommendations for a project (forward compatibility).
    """
    # Verify ownership via Space -> Project chain
    project = (
        db.query(Project)
        .join(Space, Project.space_id == Space.id)
        .filter(
            Project.id == project_id,
            Project.user_id == current_user.id,
            Space.user_id == current_user.id,
        )
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
