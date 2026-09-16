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


class MaterialRead(BaseModel):
    id: str
    project_id: str
    user_id: str
    title: str
    file_name: str
    file_size: int
    mime_type: str
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
