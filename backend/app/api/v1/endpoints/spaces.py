from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.space import Space
from app.models.user import User
from app.schemas.space import SpaceCreate, SpaceRead
from app.schemas.common import APIResponse

router = APIRouter()


@router.get("", response_model=APIResponse[List[SpaceRead]])
def list_spaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
):
    spaces = (
        db.query(Space)
        .filter(Space.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return APIResponse(data=[SpaceRead.model_validate(s) for s in spaces])


@router.post("", response_model=APIResponse[SpaceRead], status_code=status.HTTP_201_CREATED)
def create_space(
    space_in: SpaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    space = Space(
        user_id=current_user.id,
        name=space_in.name,
        description=space_in.description,
        color_code=space_in.color_code,
        icon=space_in.icon,
    )
    db.add(space)
    db.commit()
    db.refresh(space)
    return APIResponse(data=SpaceRead.model_validate(space), message="Space created successfully")


@router.get("/{space_id}", response_model=APIResponse[SpaceRead])
def get_space(
    space_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    space = (
        db.query(Space)
        .filter(Space.id == space_id, Space.user_id == current_user.id)
        .first()
    )
    if not space:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")
    return APIResponse(data=SpaceRead.model_validate(space))
