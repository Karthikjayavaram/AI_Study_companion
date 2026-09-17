from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.project import Project
from app.models.space import Space
from app.models.user import User
from app.models.activity import ActivityEvent
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.schemas.activity import ActivityEventRead
from app.schemas.common import APIResponse

router = APIRouter()


@router.get("", response_model=APIResponse[List[ProjectRead]])
def list_projects(
    space_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
):
    query = db.query(Project).filter(Project.user_id == current_user.id)
    if space_id:
        query = query.filter(Project.space_id == space_id)
    projects = query.offset(skip).limit(limit).all()
    return APIResponse(data=[ProjectRead.model_validate(p) for p in projects])


@router.post("", response_model=APIResponse[ProjectRead], status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify space ownership
    space = (
        db.query(Space)
        .filter(Space.id == project_in.space_id, Space.user_id == current_user.id)
        .first()
    )
    if not space:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specified Space not found or unauthorized.",
        )

    project = Project(
        space_id=project_in.space_id,
        user_id=current_user.id,
        name=project_in.name,
        description=project_in.description,
        learning_goal=project_in.learning_goal,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Record activity event
    event = ActivityEvent(
        user_id=current_user.id,
        project_id=project.id,
        event_type="project_created",
        details={"project_name": project.name, "space_id": space.id},
    )
    db.add(event)
    db.commit()

    return APIResponse(data=ProjectRead.model_validate(project), message="Project created successfully")


@router.get("/{project_id}", response_model=APIResponse[ProjectRead])
def get_project(
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
    return APIResponse(data=ProjectRead.model_validate(project))


@router.put("/{project_id}", response_model=APIResponse[ProjectRead])
def update_project(
    project_id: str,
    project_in: ProjectUpdate,
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

    update_data = project_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return APIResponse(data=ProjectRead.model_validate(project), message="Project updated successfully")


@router.delete("/{project_id}", response_model=APIResponse[dict])
def delete_project(
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

    db.delete(project)
    db.commit()
    return APIResponse(data={"id": project_id}, message="Project deleted successfully")


@router.get("/{project_id}/activity", response_model=APIResponse[List[ActivityEventRead]])
def get_project_activity(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 20,
):
    """
    Get recent learning activity events for a specific project.
    Enforces project ownership via the User -> Space -> Project hierarchy.
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

    safe_limit = max(1, min(limit, 100))
    events = (
        db.query(ActivityEvent)
        .filter(
            ActivityEvent.project_id == project.id,
            ActivityEvent.user_id == current_user.id,
        )
        .order_by(ActivityEvent.created_at.desc())
        .limit(safe_limit)
        .all()
    )
    return APIResponse(data=[ActivityEventRead.model_validate(e) for e in events])


