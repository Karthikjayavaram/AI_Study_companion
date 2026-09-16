from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class MaterialChunkRead(BaseModel):
    id: str
    material_id: str
    project_id: str
    chunk_index: int
    content: str
    page_number: Optional[int] = None
    token_count: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class MaterialCreateText(BaseModel):
    title: str
    content: str


class MaterialRead(BaseModel):
    id: str
    project_id: str
    user_id: str
    title: str
    material_type: str = "document"
    file_name: Optional[str] = None
    file_size: int = 0
    mime_type: str = "application/pdf"
    extracted_text: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
