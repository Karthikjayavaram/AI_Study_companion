import io
import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.material import Material
from app.models.project import Project
from app.models.space import Space
from app.models.user import User
from app.models.activity import ActivityEvent
from app.schemas.material import MaterialRead, MaterialCreateText
from app.schemas.common import APIResponse
from app.services.storage import get_storage_service
from app.services.material_processor import MaterialProcessor

router = APIRouter()


def _verify_project_ownership(project_id: str, user_id: str, db: Session) -> Project:
    """
    Verifies that project exists AND belongs to a Space owned by user_id.
    Strictly enforces Project -> Space -> User ownership.
    """
    project = (
        db.query(Project)
        .join(Space, Project.space_id == Space.id)
        .filter(
            Project.id == project_id,
            Project.user_id == user_id,
            Space.user_id == user_id,
        )
        .first()
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or unauthorized.",
        )
    return project


@router.get("", response_model=APIResponse[List[MaterialRead]])
def list_materials(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_project_ownership(project_id, current_user.id, db)

    materials = (
        db.query(Material)
        .filter(Material.project_id == project_id, Material.user_id == current_user.id)
        .order_by(Material.created_at.desc())
        .all()
    )
    return APIResponse(data=[MaterialRead.model_validate(m) for m in materials])


@router.post("/text", response_model=APIResponse[MaterialRead], status_code=status.HTTP_201_CREATED)
def create_text_material(
    project_id: str,
    material_in: MaterialCreateText,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_project_ownership(project_id, current_user.id, db)

    if not material_in.title.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title cannot be empty.")
    if not material_in.content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Content cannot be empty.")


    text_content = material_in.content.strip()

    material = Material(
        project_id=project_id,
        user_id=current_user.id,
        title=material_in.title.strip(),
        material_type="text",
        extracted_text=text_content,
        file_size=len(text_content.encode("utf-8")),
        mime_type="text/plain",
        status="processing",
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    # Process chunks & embeddings
    MaterialProcessor.process_material_chunks_and_embeddings(db, material)

    # Track activity
    event = ActivityEvent(
        user_id=current_user.id,
        project_id=project_id,
        event_type="material_created",
        details={"material_id": material.id, "title": material.title, "type": "text"},
    )
    db.add(event)
    db.commit()

    return APIResponse(
        data=MaterialRead.model_validate(material),
        message="Text material added and embedded successfully.",
    )


@router.post("/upload", response_model=APIResponse[MaterialRead], status_code=status.HTTP_201_CREATED)
async def upload_material(
    project_id: str = Form(...),
    title: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_project_ownership(project_id, current_user.id, db)

    # Validate file type
    filename = file.filename or "uploaded_file.pdf"
    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext not in [".pdf", ".txt", ".md"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only PDF, TXT, and MD files are currently supported.",
        )

    file_bytes = await file.read()
    file_size = len(file_bytes)

    # Limit file size (15MB)
    MAX_FILE_SIZE = 15 * 1024 * 1024
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 15MB limit.",
        )

    storage_service = get_storage_service()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    relative_path = f"projects/{project_id}/{unique_filename}"
    saved_path = storage_service.save_file(io.BytesIO(file_bytes), relative_path)

    # Extract text content if PDF or TXT
    extracted_text = None
    proc_status = "processing"
    err_msg = None

    if file_ext == ".pdf":
        extracted_text, proc_status, err_msg = MaterialProcessor.extract_text_from_pdf(file_bytes)
    elif file_ext in [".txt", ".md"]:
        try:
            extracted_text = file_bytes.decode("utf-8")
        except Exception:
            extracted_text = file_bytes.decode("latin-1", errors="ignore")

    material = Material(
        project_id=project_id,
        user_id=current_user.id,
        title=(title or "").strip() or filename,
        material_type="document",
        file_name=filename,
        file_path=saved_path,
        file_size=file_size,
        mime_type=file.content_type or "application/pdf",
        extracted_text=extracted_text,
        status=proc_status,
        error_message=err_msg,
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    if material.extracted_text and proc_status != "failed":
        MaterialProcessor.process_material_chunks_and_embeddings(db, material)


    # Track activity
    event = ActivityEvent(
        user_id=current_user.id,
        project_id=project_id,
        event_type="material_uploaded",
        details={"material_id": material.id, "title": material.title, "filename": filename},
    )
    db.add(event)
    db.commit()

    return APIResponse(
        data=MaterialRead.model_validate(material),
        message="Document uploaded and processed successfully.",
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


@router.delete("/{material_id}", response_model=APIResponse[dict])
def delete_material(
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

    # Delete physical stored file if applicable
    if material.file_path:
        try:
            storage_service = get_storage_service()
            storage_service.delete_file(material.file_path)
        except Exception:
            pass

    db.delete(material)
    db.commit()
    return APIResponse(data={"id": material_id}, message="Material deleted successfully")


@router.post("/{material_id}/reprocess", response_model=APIResponse[MaterialRead])
def reprocess_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reprocesses an existing material: regenerates text chunks and dense vector embeddings
    using the active EmbeddingProvider. Replaces old chunks idempotently.
    """
    material = (
        db.query(Material)
        .filter(Material.id == material_id, Material.user_id == current_user.id)
        .first()
    )
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    _verify_project_ownership(material.project_id, current_user.id, db)

    if not material.extracted_text or not material.extracted_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Material has no extracted text to reprocess.",
        )

    try:
        MaterialProcessor.process_material_chunks_and_embeddings(db, material)
    except Exception as e:
        logger.error(f"Reprocessing failed for material {material_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reprocessing failed: {str(e)}",
        )

    db.refresh(material)
    return APIResponse(
        data=MaterialRead.model_validate(material),
        message="Material reprocessed and embeddings regenerated successfully.",
    )
