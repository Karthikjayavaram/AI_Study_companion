from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.assessment import (
    QuestionSanitizedRead,
    QuizAttemptResultResponse,
    QuizAttemptStartResponse,
    QuizGenerateRequest,
    QuizRead,
    QuizSubmitRequest,
)
from app.schemas.common import APIResponse
from app.services.quiz_service import QuizService

router = APIRouter()
quiz_service = QuizService()


# -------------------------------------------------------------------------
# LIST QUIZZES
# -------------------------------------------------------------------------

@router.get("/quiz", response_model=APIResponse[List[QuizRead]])
@router.get("/quizzes", response_model=APIResponse[List[QuizRead]])
@router.get("/projects/{project_id}/quizzes", response_model=APIResponse[List[QuizRead]])
def list_quizzes(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all quizzes belonging to the specified project and authenticated user.
    """
    if not project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="project_id parameter is required.",
        )

    quizzes = quiz_service.get_project_quizzes(db, current_user, project_id)
    quiz_reads = []
    for q in quizzes:
        sanitized_questions = [
            QuestionSanitizedRead(
                id=quest.id,
                quiz_id=quest.quiz_id,
                concept_id=quest.concept_id,
                question_order=quest.question_order,
                question_text=quest.question_text,
                question_type=quest.question_type,
                options=quest.options,
                difficulty=quest.difficulty,
            )
            for quest in sorted(q.questions, key=lambda x: x.question_order)
        ]
        quiz_reads.append(
            QuizRead(
                id=q.id,
                project_id=q.project_id,
                user_id=q.user_id,
                title=q.title,
                description=q.description,
                quiz_type=q.quiz_type,
                difficulty=q.difficulty,
                question_count=len(sanitized_questions),
                status=q.status,
                created_at=q.created_at,
                questions=sanitized_questions,
            )
        )

    return APIResponse(data=quiz_reads)


# -------------------------------------------------------------------------
# GENERATE QUIZ
# -------------------------------------------------------------------------

@router.post("/quiz/generate", response_model=APIResponse[QuizRead], status_code=status.HTTP_201_CREATED)
@router.post("/quizzes/generate", response_model=APIResponse[QuizRead], status_code=status.HTTP_201_CREATED)
@router.post("/projects/{project_id}/quizzes/generate", response_model=APIResponse[QuizRead], status_code=status.HTTP_201_CREATED)
def generate_quiz(
    project_id: Optional[str] = None,
    request: Optional[QuizGenerateRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate an AI-powered multiple-choice quiz strictly grounded in project study materials.
    """
    if not project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="project_id parameter is required.",
        )

    req = request or QuizGenerateRequest()
    quiz = quiz_service.generate_quiz(db, current_user, project_id, req)

    sanitized_questions = [
        QuestionSanitizedRead(
            id=quest.id,
            quiz_id=quest.quiz_id,
            concept_id=quest.concept_id,
            question_order=quest.question_order,
            question_text=quest.question_text,
            question_type=quest.question_type,
            options=quest.options,
            difficulty=quest.difficulty,
        )
        for quest in sorted(quiz.questions, key=lambda x: x.question_order)
    ]

    return APIResponse(
        data=QuizRead(
            id=quiz.id,
            project_id=quiz.project_id,
            user_id=quiz.user_id,
            title=quiz.title,
            description=quiz.description,
            quiz_type=quiz.quiz_type,
            difficulty=quiz.difficulty,
            question_count=len(sanitized_questions),
            status=quiz.status,
            created_at=quiz.created_at,
            questions=sanitized_questions,
        ),
        message="Quiz generated successfully from project materials.",
    )


# -------------------------------------------------------------------------
# GET QUIZ DETAIL
# -------------------------------------------------------------------------

@router.get("/quiz/{quiz_id}", response_model=APIResponse[QuizRead])
@router.get("/quizzes/{quiz_id}", response_model=APIResponse[QuizRead])
def get_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch quiz details with sanitized questions (without leaking answers or explanations).
    """
    quiz = quiz_service.get_quiz_sanitized(db, current_user, quiz_id)
    sanitized_questions = [
        QuestionSanitizedRead(
            id=quest.id,
            quiz_id=quest.quiz_id,
            concept_id=quest.concept_id,
            question_order=quest.question_order,
            question_text=quest.question_text,
            question_type=quest.question_type,
            options=quest.options,
            difficulty=quest.difficulty,
        )
        for quest in sorted(quiz.questions, key=lambda x: x.question_order)
    ]

    return APIResponse(
        data=QuizRead(
            id=quiz.id,
            project_id=quiz.project_id,
            user_id=quiz.user_id,
            title=quiz.title,
            description=quiz.description,
            quiz_type=quiz.quiz_type,
            difficulty=quiz.difficulty,
            question_count=len(sanitized_questions),
            status=quiz.status,
            created_at=quiz.created_at,
            questions=sanitized_questions,
        )
    )


# -------------------------------------------------------------------------
# START QUIZ ATTEMPT
# -------------------------------------------------------------------------

@router.post("/quiz/{quiz_id}/attempts", response_model=APIResponse[QuizAttemptStartResponse], status_code=status.HTTP_201_CREATED)
@router.post("/quizzes/{quiz_id}/attempts", response_model=APIResponse[QuizAttemptStartResponse], status_code=status.HTTP_201_CREATED)
def start_quiz_attempt(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start a new quiz attempt. Returns attempt ID and sanitized questions for taking the quiz.
    """
    attempt_res = quiz_service.start_quiz_attempt(db, current_user, quiz_id)
    return APIResponse(
        data=attempt_res,
        message="Quiz attempt started.",
    )


# -------------------------------------------------------------------------
# SUBMIT QUIZ ATTEMPT
# -------------------------------------------------------------------------

@router.post("/quiz/attempts/{attempt_id}/submit", response_model=APIResponse[QuizAttemptResultResponse])
@router.post("/quiz-attempts/{attempt_id}/submit", response_model=APIResponse[QuizAttemptResultResponse])
def submit_attempt(
    attempt_id: str,
    submission: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit answers for a quiz attempt. Evaluates on the server side and returns
    the score, explanations, and grounded source citations.
    """
    result = quiz_service.submit_quiz_attempt(db, current_user, attempt_id, submission)
    return APIResponse(
        data=result,
        message="Quiz attempt evaluated successfully.",
    )


# Backward compatibility with older payload where quiz_id was passed
@router.post("/submit", response_model=APIResponse[QuizAttemptResultResponse])
def submit_attempt_legacy(
    submission: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Legacy submission endpoint supporting either attempt_id in route or quiz_id in payload.
    """
    attempt_id = submission.get("attempt_id")
    quiz_id = submission.get("quiz_id")

    if not attempt_id and quiz_id:
        # Create an attempt on the fly if only quiz_id was provided
        start_res = quiz_service.start_quiz_attempt(db, current_user, quiz_id)
        attempt_id = start_res.id

    if not attempt_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="attempt_id or quiz_id is required.",
        )

    answers_raw = submission.get("answers", [])
    parsed_req = QuizSubmitRequest.model_validate({"answers": answers_raw})
    result = quiz_service.submit_quiz_attempt(db, current_user, attempt_id, parsed_req)
    return APIResponse(data=result, message="Quiz attempt evaluated successfully.")


# -------------------------------------------------------------------------
# GET QUIZ ATTEMPT RESULT
# -------------------------------------------------------------------------

@router.get("/quiz/attempts/{attempt_id}", response_model=APIResponse[QuizAttemptResultResponse])
@router.get("/quiz-attempts/{attempt_id}", response_model=APIResponse[QuizAttemptResultResponse])
def get_attempt_result(
    attempt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the detailed evaluated results of a completed quiz attempt.
    """
    result = quiz_service.get_quiz_attempt_result(db, current_user, attempt_id)
    return APIResponse(data=result)
