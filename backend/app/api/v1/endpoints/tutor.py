from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.conversation import Conversation, Message
from app.models.project import Project
from app.models.user import User
from app.models.activity import ActivityEvent
from app.schemas.conversation import Citation, ConversationRead, MessageRead, TutorQueryRequest, TutorResponse
from app.schemas.common import APIResponse

router = APIRouter()


@router.get("/conversations", response_model=APIResponse[List[ConversationRead]])
def list_conversations(
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

    convs = (
        db.query(Conversation)
        .filter(Conversation.project_id == project_id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    return APIResponse(data=[ConversationRead.model_validate(c) for c in convs])


@router.post("/query", response_model=APIResponse[TutorResponse])
def tutor_query(
    request: TutorQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = (
        db.query(Project)
        .filter(Project.id == request.project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Retrieve or create conversation
    if request.conversation_id:
        conversation = (
            db.query(Conversation)
            .filter(Conversation.id == request.conversation_id, Conversation.project_id == project.id)
            .first()
        )
        if not conversation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    else:
        conversation = Conversation(
            project_id=project.id,
            user_id=current_user.id,
            title=request.question[:40] + ("..." if len(request.question) > 40 else ""),
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Save user message
    user_msg = Message(
        conversation_id=conversation.id,
        sender="user",
        content=request.question,
    )
    db.add(user_msg)
    db.commit()

    # Stub grounding response with realistic PRD citation format
    # In next phase, this will be wired to vector retrieval & LLM completion
    has_materials = len(project.materials) > 0
    if has_materials:
        sample_doc = project.materials[0].title
        citations = [
            Citation(
                source_title=sample_doc,
                page_number=1,
                snippet="Key concept definition extracted from source learning material.",
            )
        ]
        tutor_text = (
            f"Based on your study material '{sample_doc}', here is the explanation for '{request.question}':\n\n"
            "This concept forms a core building block in your current study path. Let's break down the main principles..."
        )
        has_evidence = True
    else:
        citations = []
        tutor_text = (
            "I could not find relevant evidence in your uploaded project materials to answer this with certainty. "
            "Please upload relevant study materials or lecture notes to enable grounded tutoring."
        )
        has_evidence = False

    # Save assistant response
    assistant_msg = Message(
        conversation_id=conversation.id,
        sender="assistant",
        content=tutor_text,
        citations=[c.model_dump() for c in citations] if citations else None,
    )
    db.add(assistant_msg)

    # Track activity
    event = ActivityEvent(
        user_id=current_user.id,
        project_id=project.id,
        event_type="tutor_interacted",
        details={"question": request.question, "conversation_id": conversation.id},
    )
    db.add(event)
    db.commit()

    return APIResponse(
        data=TutorResponse(
            conversation_id=conversation.id,
            message=tutor_text,
            has_sufficient_evidence=has_evidence,
            citations=citations,
            suggested_followups=[
                "Can you provide a simple code example?",
                "How does this relate to my current project goal?",
                "Test my understanding on this concept",
            ],
        )
    )
