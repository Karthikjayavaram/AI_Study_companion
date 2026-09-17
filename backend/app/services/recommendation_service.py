import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.concept import Concept, ConceptMastery
from app.models.project import Project
from app.models.recommendation import Recommendation
from app.models.space import Space
from app.models.user import User
from app.schemas.recommendation import NextActionResponse

logger = logging.getLogger("ai_study_companion")


class RecommendationService:
    """
    Deterministic recommendation engine based on ConceptMastery and Growth data.
    Provides reproducible, explainable, and fast 'Next Learning Action' guidance
    without calling an LLM or external AI API.

    Mastery Thresholds:
      - 0–49   → Needs Practice (priority 1)
      - 50–79  → Developing (priority 2)
      - 80–100 → Strong (priority 3)

    Cases:
      Case A: Any concept < 50% → Recommend lowest mastery concept (practice_concept)
      Case B: No < 50% but concepts in 50–79% → Recommend weakest developing concept (review_concept)
      Case C: All concepts >= 80% → Consolidation challenge (mixed_review)
      Case D: No concepts in project → Guide to materials (start_learning)
    """

    def _authorize_project(self, db: Session, user: User, project_id: str) -> Project:
        """Verify project exists and belongs to the authenticated user via Space -> Project hierarchy."""
        project = (
            db.query(Project)
            .join(Space, Project.space_id == Space.id)
            .filter(
                Project.id == project_id,
                Project.user_id == user.id,
                Space.user_id == user.id,
            )
            .first()
        )
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or unauthorized.",
            )
        return project

    def get_next_recommendation(
        self,
        db: Session,
        user: User,
        project_id: str,
    ) -> NextActionResponse:
        """
        Generate or retrieve the deterministic next learning action recommendation for the user.
        """
        project = self._authorize_project(db, user, project_id)

        # 1. Fetch all concepts for this project
        concepts: List[Concept] = (
            db.query(Concept)
            .filter(Concept.project_id == project.id)
            .all()
        )

        # Case D — No concepts exist for this project yet
        if not concepts:
            recommendation_type = "start_learning"
            title = "Start exploring project materials"
            reason = "Study your project materials and take a quiz to start building mastery."
            target_concept_id = None
            priority = 4
            action_type = "materials"
            action_url = f"/projects/{project.id}/materials"
            return self._persist_and_format_response(
                db=db,
                project=project,
                user=user,
                recommendation_type=recommendation_type,
                title=title,
                reason=reason,
                target_concept_id=target_concept_id,
                priority=priority,
                action_type=action_type,
                action_url=action_url,
            )

        # 2. Fetch all concept masteries for this user in this project
        masteries: List[ConceptMastery] = (
            db.query(ConceptMastery)
            .filter(
                ConceptMastery.project_id == project.id,
                ConceptMastery.user_id == user.id,
            )
            .all()
        )
        mastery_map: Dict[str, ConceptMastery] = {m.concept_id: m for m in masteries}

        # 3. Build learning state for each concept
        concept_states = []
        for c in concepts:
            m = mastery_map.get(c.id)
            if m:
                score = m.score
                last_assessed = m.last_assessed_at
            else:
                score = 0.0
                last_assessed = None

            concept_states.append({
                "concept": c,
                "score": score,
                "last_assessed_at": last_assessed,
            })

        # Deterministic sort key:
        # 1. score ascending (lowest score first)
        # 2. last_assessed_at ascending (unassessed/None first, or oldest first)
        # 3. concept.name ascending (alphabetical tie-break)
        # 4. concept.id ascending (stable tie-break)
        def sort_key(item):
            assessed_dt = item["last_assessed_at"] or datetime.min.replace(tzinfo=timezone.utc)
            if assessed_dt.tzinfo is None:
                assessed_dt = assessed_dt.replace(tzinfo=timezone.utc)
            return (
                item["score"],
                assessed_dt,
                item["concept"].name.lower(),
                item["concept"].id,
            )

        needs_practice = [item for item in concept_states if item["score"] < 50.0]
        developing = [item for item in concept_states if 50.0 <= item["score"] < 80.0]

        # Case A — Concepts needing practice (< 50%)
        if needs_practice:
            needs_practice.sort(key=sort_key)
            target = needs_practice[0]
            rounded_score = int(round(target["score"]))
            recommendation_type = "practice_concept"
            title = f"Practice {target['concept'].name}"
            reason = f"Your current mastery is {rounded_score}%. A focused quiz can help strengthen this concept."
            target_concept_id = target["concept"].id
            priority = 1
            action_type = "quiz"
            action_url = f"/projects/{project.id}/quiz"

        # Case B — Developing concepts (50%–79%)
        elif developing:
            developing.sort(key=sort_key)
            target = developing[0]
            rounded_score = int(round(target["score"]))
            recommendation_type = "review_concept"
            title = f"Review {target['concept'].name}"
            reason = f"Your mastery is {rounded_score}%. A short quiz can help move this concept toward strong mastery."
            target_concept_id = target["concept"].id
            priority = 2
            action_type = "quiz"
            action_url = f"/projects/{project.id}/quiz"

        # Case C — All concepts strong (>= 80%)
        else:
            recommendation_type = "mixed_review"
            title = "Take a mixed review quiz"
            reason = "Your concepts are currently strong. A mixed quiz can check whether you can apply them together."
            target_concept_id = None
            priority = 3
            action_type = "quiz"
            action_url = f"/projects/{project.id}/quiz"

        return self._persist_and_format_response(
            db=db,
            project=project,
            user=user,
            recommendation_type=recommendation_type,
            title=title,
            reason=reason,
            target_concept_id=target_concept_id,
            priority=priority,
            action_type=action_type,
            action_url=action_url,
        )

    def _persist_and_format_response(
        self,
        db: Session,
        project: Project,
        user: User,
        recommendation_type: str,
        title: str,
        reason: str,
        target_concept_id: Optional[str],
        priority: int,
        action_type: str,
        action_url: str,
    ) -> NextActionResponse:
        """
        Persist or update the recommendation record in the database,
        then return the standardized NextActionResponse.
        """
        rec = (
            db.query(Recommendation)
            .filter(
                Recommendation.project_id == project.id,
                Recommendation.user_id == user.id,
                Recommendation.is_completed == False,
            )
            .order_by(Recommendation.created_at.desc())
            .first()
        )

        if rec:
            rec.title = title
            rec.content = reason
            rec.target_type = recommendation_type
            rec.target_id = target_concept_id
            rec.priority = str(priority)
        else:
            rec = Recommendation(
                project_id=project.id,
                user_id=user.id,
                title=title,
                content=reason,
                target_type=recommendation_type,
                target_id=target_concept_id,
                priority=str(priority),
                is_completed=False,
            )
            db.add(rec)

        db.commit()
        db.refresh(rec)

        return NextActionResponse(
            id=rec.id,
            project_id=project.id,
            user_id=user.id,
            recommendation_type=recommendation_type,
            title=title,
            reason=reason,
            target_concept_id=target_concept_id,
            priority=priority,
            action_type=action_type,
            action_url=action_url,
            created_at=rec.created_at,
        )
