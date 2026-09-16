import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.material import Material
from app.models.project import Project
from app.models.user import User
from app.models.activity import ActivityEvent
from app.schemas.material import MaterialRead
from app.schemas.common import APIResponse
from app.services.storage import get_storage_service

router = APIRouter()


@router.get("", response_model=APIResponse[List[MaterialRead]])
def list_materials(
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

    materials = (
        db.query(Material)
        .filter(Material.project_id == project_id)
        .order_by(Material.created_at.desc())
        .all()
    )
    return APIResponse(data=[MaterialRead.model_validate(m) for m in materials])


@router.post("/upload", response_model=APIResponse[MaterialRead], status_code=status.HTTP_202_ACCEPTED)
async def upload_material(
    project_id: str = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
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

    storage_service = get_storage_service()
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    relative_path = f"projects/{project_id}/{unique_filename}"

    file_bytes = await file.read()
    file_size = len(file_bytes)

    # Save via storage abstraction
    import io
    saved_path = storage_service.save_file(io.BytesIO(file_bytes), relative_path)

    material = Material(
        project_id=project_id,
        user_id=current_user.id,
        title=title or file.filename or "Uploaded Document",
        file_name=file.filename or unique_filename,
        file_path=saved_path,
        file_size=file_size,
        mime_type=file.content_type or "application/pdf",
        status="queued",
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    # Track activity event
    event = ActivityEvent(
        user_id=current_user.id,
        project_id=project_id,
        event_type="material_uploaded",
        details={"material_id": material.id, "title": material.title},
    )
    db.add(event)
    db.commit()

    return APIResponse(
        data=MaterialRead.model_validate(material),
        message="Document uploaded and queued for processing.",
    )


@router.get("/{material_id}", response_model=APIResponse[MaterialRead])
def get_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    material = (
        db.query(Material)
        .filter(Material.id == material_id, Material.user_id == current_user.id)
        .first()
    )
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    return APIResponse(data=MaterialRead.model_validate(material))
