import re
from typing import List, Dict, Any
from app.core.config import settings


class MaterialChunker:
    """
    Splits material text into deterministic, overlapping chunks for embedding and vector retrieval.
    """

    def __init__(self, chunk_size: int = None, chunk_overlap: int = None):
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP

    def chunk_text(self, text: str) -> List[Dict[str, Any]]:
        """
        Splits plain text into structured chunks.
        Returns a list of dicts: [{'chunk_index': int, 'content': str, 'character_count': int, 'token_count': int}]
        """
        if not text or not text.strip():
            return []

        # Remove null bytes and normalize whitespace
        clean_text = text.replace("\x00", "")
        normalized_text = re.sub(r'\n{3,}', '\n\n', clean_text.strip())

        if len(normalized_text) <= self.chunk_size:
            return [{
                "chunk_index": 0,
                "content": normalized_text,
                "character_count": len(normalized_text),
                "token_count": max(1, len(normalized_text) // 4),
            }]

        chunks = []
        start = 0
        text_length = len(normalized_text)
        chunk_index = 0

        while start < text_length:
            end = start + self.chunk_size

            # If not at the end of text, try to break at paragraph, sentence, or word boundary
            if end < text_length:
                # Look for paragraph break
                break_pos = normalized_text.rfind('\n\n', start + self.chunk_size // 2, end)
                if break_pos == -1:
                    # Look for sentence boundary (.!?)
                    break_pos = max(
                        normalized_text.rfind('. ', start + self.chunk_size // 2, end),
                        normalized_text.rfind('? ', start + self.chunk_size // 2, end),
                        normalized_text.rfind('! ', start + self.chunk_size // 2, end),
                    )
                    if break_pos != -1:
                        break_pos += 1  # Include punctuation mark
                if break_pos == -1:
                    # Look for space
                    break_pos = normalized_text.rfind(' ', start + self.chunk_size // 2, end)

                if break_pos != -1 and break_pos > start:
                    end = break_pos

            chunk_content = normalized_text[start:end].strip()
            if chunk_content:
                chunks.append({
                    "chunk_index": chunk_index,
                    "content": chunk_content,
                    "character_count": len(chunk_content),
                    "token_count": max(1, len(chunk_content) // 4),
                })
                chunk_index += 1

            # Advance start position by chunk_size - overlap
            step = end - start
            if step <= self.chunk_overlap:
                start = end
            else:
                start = end - self.chunk_overlap

        return chunks
