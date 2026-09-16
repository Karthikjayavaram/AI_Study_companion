import io
import logging
from typing import Tuple, Optional, List
import pypdf
from sqlalchemy.orm import Session
from app.models.material import Material, MaterialChunk
from app.services.material_chunker import MaterialChunker
from app.ai.openai_provider import OpenAIProvider

logger = logging.getLogger("ai_study_companion")


class MaterialProcessor:
    """
    Extracts text content from uploaded learning materials (PDFs, text documents),
    chunks the text, generates vector embeddings, and persists MaterialChunks into PostgreSQL / pgvector.
    """

    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> Tuple[Optional[str], str, Optional[str]]:
        """
        Extracts plain text from PDF bytes.
        Returns: (extracted_text, status, error_message)
        """
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text_pages = []
            for page_idx, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text_pages.append(f"--- Page {page_idx + 1} ---\n{page_text.strip()}")

            full_text = "\n\n".join(text_pages).strip()

            if not full_text:
                return None, "ready", "No extractable text found in PDF (might contain scanned images)."

            return full_text, "ready", None
        except Exception as e:
            logger.error(f"Failed to extract text from PDF: {e}", exc_info=True)
            return None, "failed", f"PDF text extraction error: {str(e)}"

    @staticmethod
    def process_material_chunks_and_embeddings(
        db: Session,
        material: Material,
        ai_provider: Optional[OpenAIProvider] = None,
    ) -> List[MaterialChunk]:
        """
        Chunks the material's extracted_text, computes vector embeddings,
        deletes any pre-existing chunks for idempotency, and persists new MaterialChunk records.
        """
        if not material.extracted_text or not material.extracted_text.strip():
            material.status = "ready"
            db.commit()
            return []

        ai_client = ai_provider or OpenAIProvider()
        chunker = MaterialChunker()

        # Step 1: Chunk text
        chunks_data = chunker.chunk_text(material.extracted_text)
        if not chunks_data:
            material.status = "ready"
            db.commit()
            return []

        # Step 2: Generate embeddings
        texts = [c["content"] for c in chunks_data]
        try:
            embeddings = ai_client.generate_embeddings(texts)
        except Exception as e:
            logger.error(f"Embedding generation failed for material {material.id}: {e}", exc_info=True)
            material.status = "failed"
            material.error_message = f"Embedding generation failed: {str(e)}"
            db.commit()
            raise RuntimeError(f"Embedding generation failed: {e}") from e

        # Step 3: Remove old chunks for idempotency / reprocessing
        db.query(MaterialChunk).filter(MaterialChunk.material_id == material.id).delete()

        # Step 4: Save new chunks
        new_chunks = []
        for i, cdata in enumerate(chunks_data):
            chunk_embedding = embeddings[i] if i < len(embeddings) else [0.0] * 1536
            chunk = MaterialChunk(
                material_id=material.id,
                project_id=material.project_id,
                chunk_index=cdata["chunk_index"],
                content=cdata["content"],
                token_count=cdata["token_count"],
                embedding=chunk_embedding,
            )
            db.add(chunk)
            new_chunks.append(chunk)

        material.status = "ready"
        material.error_message = None
        db.commit()

        return new_chunks
