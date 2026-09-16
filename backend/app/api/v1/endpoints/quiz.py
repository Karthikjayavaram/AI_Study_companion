from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.assessment import Quiz, Question, QuizAttempt, Assessment
from app.models.project import Project
from app.models.concept import ConceptMastery
from app.models.activity import ActivityEvent
from app.models.user import User
from app.schemas.assessment import QuizRead, QuizAttemptRead, QuizSubmitRequest
from app.schemas.common import APIResponse

router = APIRouter()


@router.get("", response_model=APIResponse[List[QuizRead]])
def list_quizzes(
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

    quizzes = db.query(Quiz).filter(Quiz.project_id == project_id).all()
    return APIResponse(data=[QuizRead.model_validate(q) for q in quizzes])


@router.post("/generate", response_model=APIResponse[QuizRead], status_code=status.HTTP_201_CREATED)
def generate_adaptive_quiz(
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

    # Create quiz shell with sample adaptive questions (MCQ + open-ended)
    quiz = Quiz(
        project_id=project.id,
        user_id=current_user.id,
        title=f"Adaptive Assessment: {project.name}",
        quiz_type="adaptive",
        difficulty="medium",
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    # Add sample foundational MCQ question
    q1 = Question(
        quiz_id=quiz.id,
        question_text="What is the primary role of a loss function during gradient descent optimization?",
        question_type="mcq",
        options=[
            "To measure model error and compute gradients for parameter updates",
            "To normalize input features between 0 and 1",
            "To store persistent user conversation history",
            "To serialize data into JSON format",
        ],
        correct_answer="To measure model error and compute gradients for parameter updates",
        explanation="Loss functions quantify the difference between predictions and ground truth, providing gradients for backpropagation.",
        difficulty="medium",
    )
    # Add sample open-ended question
    q2 = Question(
        quiz_id=quiz.id,
        question_text="Explain the trade-off between bias and variance in machine learning models and how regularization impacts it.",
        question_type="open_ended",
        options=None,
        correct_answer=None,
        explanation="High bias leads to underfitting; high variance leads to overfitting. Regularization introduces a penalty that increases bias slightly to drastically decrease variance.",
        difficulty="hard",
    )
    db.add_all([q1, q2])
    db.commit()
    db.refresh(quiz)

    return APIResponse(data=QuizRead.model_validate(quiz), message="Adaptive quiz generated successfully")


@router.post("/submit", response_model=APIResponse[QuizAttemptRead])
def submit_quiz_attempt(
    submission: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz = db.query(Quiz).filter(Quiz.id == submission.quiz_id, Quiz.user_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=current_user.id,
        status="completed",
        completed_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    total_score = 0.0
    assessments = []
    for answer_in in submission.answers:
        question = db.query(Question).filter(Question.id == answer_in.question_id).first()
        if not question:
            continue

        if question.question_type == "mcq":
            is_correct = (answer_in.user_answer.strip().lower() == (question.correct_answer or "").strip().lower())
            score = 1.0 if is_correct else 0.0
            feedback = (
                "Correct! Strong grasp of the definition."
                if is_correct
                else f"Incorrect. Key concept: {question.explanation}"
            )
            key_concepts = ["Optimization", "Loss Functions"]
            missing_concepts = [] if is_correct else ["Gradient Direction"]
        else:
            # Open-ended evaluation stub (detailed evaluation according to PRD section 9)
            score = 0.85
            is_correct = True
            feedback = (
                "Good conceptual understanding! You correctly identified the bias-variance trade-off. "
                "To improve, explicitly mention L1 vs L2 regularization shrinkage mechanisms."
            )
            key_concepts = ["Bias", "Variance", "Overfitting"]
            missing_concepts = ["L1/L2 Regularization"]

        total_score += score
        ass = Assessment(
            quiz_attempt_id=attempt.id,
            question_id=question.id,
            user_id=current_user.id,
            user_answer=answer_in.user_answer,
            is_correct=is_correct,
            ai_score=score,
            feedback=feedback,
            key_concepts_covered=key_concepts,
            missing_concepts=missing_concepts,
        )
        db.add(ass)
        assessments.append(ass)

    attempt.score = (total_score / len(submission.answers)) if submission.answers else 0.0
    db.commit()
    db.refresh(attempt)

    # Record activity event
    event = ActivityEvent(
        user_id=current_user.id,
        project_id=quiz.project_id,
        event_type="quiz_completed",
        details={"quiz_id": quiz.id, "score": attempt.score, "attempt_id": attempt.id},
    )
    db.add(event)
    db.commit()

    return APIResponse(data=QuizAttemptRead.model_validate(attempt), message="Quiz assessed successfully")
