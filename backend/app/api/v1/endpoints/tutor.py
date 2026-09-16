from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.conversation import Conversation, Message
from app.models.project import Project
from app.models.space import Space
from app.models.user import User
from app.schemas.conversation import (
    ConversationCreate,
    ConversationRead,
    MessageCreate,
    MessageRead,
    TutorQueryRequest,
    TutorResponse,
)
from app.schemas.common import APIResponse
from app.services.ai_tutor_service import AITutorService

router = APIRouter()
tutor_service = AITutorService()


# -------------------------------------------------------------------------
# CONVERSATION CRUD & LISTING
# -------------------------------------------------------------------------

@router.get("/conversations", response_model=APIResponse[List[ConversationRead]])
@router.get("/projects/{project_id}/conversations", response_model=APIResponse[List[ConversationRead]])
def list_conversations(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns only conversations belonging to the authenticated user's project.
    """
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized.",
        )

    convs = (
        db.query(Conversation)
        .filter(
            Conversation.project_id == project_id,
            Conversation.user_id == current_user.id,
        )
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    return APIResponse(data=[ConversationRead.model_validate(c) for c in convs])


@router.post("/conversations", response_model=APIResponse[ConversationRead])
@router.post("/projects/{project_id}/conversations", response_model=APIResponse[ConversationRead])
def create_conversation(
    project_id: str,
    body: Optional[ConversationCreate] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creates a new conversation in a project for the authenticated user.
    """
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized.",
        )

    title = (body.title if body and body.title else "Study Session").strip()
    conv = Conversation(
        project_id=project.id,
        user_id=current_user.id,
        title=title,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    return APIResponse(data=ConversationRead.model_validate(conv))


@router.get("/conversations/{conversation_id}", response_model=APIResponse[ConversationRead])
def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a conversation and its messages if owned by the authenticated user.
    """
    conv = (
        db.query(Conversation)
        .join(Project, Conversation.project_id == Project.id)
        .join(Space, Project.space_id == Space.id)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
            Project.user_id == current_user.id,
            Space.user_id == current_user.id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or unauthorized.",
        )

    return APIResponse(data=ConversationRead.model_validate(conv))


# -------------------------------------------------------------------------
# MESSAGING & TUTOR QUERY ENDPOINTS
# -------------------------------------------------------------------------

@router.post("/conversations/{conversation_id}/messages", response_model=APIResponse[TutorResponse])
def send_tutor_message(
    conversation_id: str,
    message_in: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sends a user message in an existing conversation, triggering project-scoped RAG tutor generation.
    """
    conv = (
        db.query(Conversation)
        .join(Project, Conversation.project_id == Project.id)
        .join(Space, Project.space_id == Space.id)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
            Project.user_id == current_user.id,
            Space.user_id == current_user.id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or unauthorized.",
        )

    res = tutor_service.process_tutor_query(
        db=db,
        user=current_user,
        project_id=conv.project_id,
        question=message_in.content,
        conversation_id=conv.id,
    )
    return APIResponse(data=res)


@router.post("/query", response_model=APIResponse[TutorResponse])
def tutor_query(
    request: TutorQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Main query endpoint for AI Tutor answering.
    """
    res = tutor_service.process_tutor_query(
        db=db,
        user=current_user,
        project_id=request.project_id,
        question=request.question,
        conversation_id=request.conversation_id,
        mode=request.mode,
    )
    return APIResponse(data=res)
