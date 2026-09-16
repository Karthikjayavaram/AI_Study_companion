import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.activity import ActivityEvent
from app.models.assessment import Assessment, Question, Quiz, QuizAttempt
from app.models.concept import Concept, ConceptMastery
from app.models.project import Project
from app.models.space import Space
from app.models.user import User

logger = logging.getLogger("ai_study_companion")


class GrowthService:
    """
    Service for concept mastery computation, growth tracking,
    and project-level mastery aggregation.

    Mastery is deterministic: score = (correct_attempts / total_attempts) * 100
    Status thresholds:
        >= 80  → "improving" (mastered)
        >= 50  → "stable"
        <  50  → "requiring_attention"
    """

    def _authorize_project(self, db: Session, user: User, project_id: str) -> Project:
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

    @staticmethod
    def _compute_status(score: float) -> str:
        """Derive mastery status from percentage score."""
        if score >= 80.0:
            return "improving"
        elif score >= 50.0:
            return "stable"
        else:
            return "requiring_attention"

    def update_mastery_from_quiz_attempt(
        self,
        db: Session,
        user: User,
        quiz: Quiz,
        assessments: List[Assessment],
    ) -> List[ConceptMastery]:
        """
        Update concept mastery records based on quiz attempt assessments.
        This method must be called WITHIN the same transaction as quiz submission.

        Groups assessments by concept_id (via question), then upserts ConceptMastery
        records with incremented counters and recomputed scores.

        Returns the list of updated ConceptMastery records.
        """
        # Group assessments by concept_id
        concept_stats: Dict[str, Dict] = {}  # concept_id -> {total, correct}

        for assessment in assessments:
            question = db.get(Question, assessment.question_id)
            if not question or not question.concept_id:
                continue

            cid = question.concept_id
            if cid not in concept_stats:
                concept_stats[cid] = {"total": 0, "correct": 0}

            concept_stats[cid]["total"] += 1
            if assessment.is_correct:
                concept_stats[cid]["correct"] += 1

        if not concept_stats:
            return []

        updated_masteries = []
        now = datetime.now(timezone.utc)

        for concept_id, stats in concept_stats.items():
            # Upsert: find existing or create new
            mastery = (
                db.query(ConceptMastery)
                .filter(
                    ConceptMastery.user_id == user.id,
                    ConceptMastery.concept_id == concept_id,
                )
                .first()
            )

            if mastery is None:
                # Verify the concept belongs to the quiz's project
                concept = db.get(Concept, concept_id)
                if not concept or concept.project_id != quiz.project_id:
                    continue

                mastery = ConceptMastery(
                    concept_id=concept_id,
                    project_id=quiz.project_id,
                    user_id=user.id,
                    total_attempts=0,
                    correct_attempts=0,
                    score=0.0,
                    status="requiring_attention",
                )
                db.add(mastery)

            # Increment counters
            mastery.total_attempts += stats["total"]
            mastery.correct_attempts += stats["correct"]

            # Recompute score
            if mastery.total_attempts > 0:
                mastery.score = round(
                    (mastery.correct_attempts / mastery.total_attempts) * 100.0, 2
                )
            else:
                mastery.score = 0.0

            mastery.status = self._compute_status(mastery.score)
            mastery.last_assessed_at = now
            updated_masteries.append(mastery)

        # Record activity event for mastery update
        try:
            event = ActivityEvent(
                user_id=user.id,
                project_id=quiz.project_id,
                event_type="mastery_updated",
                details={
                    "quiz_id": quiz.id,
                    "concepts_updated": len(updated_masteries),
                    "concept_ids": list(concept_stats.keys()),
                },
            )
            db.add(event)
        except Exception as e:
            logger.warning(f"Failed to record mastery update activity: {e}")

        return updated_masteries

    def get_project_mastery(
        self,
        db: Session,
        user: User,
        project_id: str,
    ) -> List[ConceptMastery]:
        """
        Get all concept mastery records for the authenticated user in a project.
        Eagerly loads the related Concept for display.
        """
        project = self._authorize_project(db, user, project_id)

        masteries = (
            db.query(ConceptMastery)
            .options(joinedload(ConceptMastery.concept))
            .filter(
                ConceptMastery.project_id == project.id,
                ConceptMastery.user_id == user.id,
            )
            .order_by(ConceptMastery.score.desc())
            .all()
        )
        return masteries

    def get_growth_summary(
        self,
        db: Session,
        user: User,
        project_id: str,
    ) -> dict:
        """
        Compute an aggregate growth summary for the user in a project.
        Returns overall mastery, concept counts by status, and individual mastery records.
        """
        masteries = self.get_project_mastery(db, user, project_id)

        total_concepts = len(masteries)
        mastered_count = sum(1 for m in masteries if m.score >= 80.0)
        improving_count = sum(1 for m in masteries if 50.0 <= m.score < 80.0)
        needs_attention_count = sum(1 for m in masteries if m.score < 50.0)

        overall_mastery = 0.0
        if total_concepts > 0:
            overall_mastery = round(
                sum(m.score for m in masteries) / total_concepts, 2
            )

        return {
            "overall_mastery": overall_mastery,
            "total_concepts": total_concepts,
            "mastered_count": mastered_count,
            "improving_count": improving_count,
            "needs_attention_count": needs_attention_count,
            "masteries": masteries,
        }

    def get_project_concepts(
        self,
        db: Session,
        user: User,
        project_id: str,
    ) -> List[Concept]:
        """
        Get all concepts for a project owned by the user.
        """
        project = self._authorize_project(db, user, project_id)

        concepts = (
            db.query(Concept)
            .filter(Concept.project_id == project.id)
            .order_by(Concept.name)
            .all()
        )
        return concepts
