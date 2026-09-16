from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.common import APIResponse
from app.services.retrieval_service import RetrievalService

router = APIRouter()


class RetrievalSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000, description="Search query string")
    top_k: Optional[int] = Field(5, ge=1, le=50, description="Maximum number of chunks to return")


class RetrievalChunkResult(BaseModel):
    chunk_id: str
    material_id: str
    content: str
    similarity_score: float
    material_title: str
    chunk_index: int


@router.post("/{project_id}/retrieval/search", response_model=APIResponse[List[RetrievalChunkResult]])
def search_project_retrieval(
    project_id: str,
    body: RetrievalSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query string cannot be empty.",
        )

    service = RetrievalService()
    results = service.search_project_chunks(
        db=db,
        user=current_user,
        project_id=project_id,
        query=body.query.strip(),
        top_k=body.top_k or 5,
    )

    return APIResponse(
        data=[RetrievalChunkResult.model_validate(r) for r in results],
        message="Retrieval search completed successfully.",
    )
