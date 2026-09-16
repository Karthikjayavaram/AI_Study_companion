import io
import logging
from typing import Tuple, Optional
import pypdf

logger = logging.getLogger("ai_study_companion")


class MaterialProcessor:
    """
    Extracts text content from uploaded learning materials (PDFs, text documents).
    Processes documents synchronously during initial ingestion.
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
