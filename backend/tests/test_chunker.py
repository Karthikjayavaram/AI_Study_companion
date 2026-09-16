"""
Unit tests for MaterialChunker service.
"""

import pytest
from app.services.material_chunker import MaterialChunker


def test_chunk_empty_text():
    chunker = MaterialChunker(chunk_size=100, chunk_overlap=20)
    assert chunker.chunk_text("") == []
    assert chunker.chunk_text("   \n\n  ") == []


def test_chunk_short_text():
    chunker = MaterialChunker(chunk_size=100, chunk_overlap=20)
    text = "Short text example for unit testing."
    chunks = chunker.chunk_text(text)
    assert len(chunks) == 1
    assert chunks[0]["chunk_index"] == 0
    assert chunks[0]["content"] == text
    assert chunks[0]["character_count"] == len(text)


def test_chunk_long_text_deterministic_ordering():
    chunker = MaterialChunker(chunk_size=50, chunk_overlap=10)
    text = "Paragraph one with some detailed content.\n\nParagraph two with additional study material details.\n\nParagraph three covering advanced topics."

    chunks1 = chunker.chunk_text(text)
    chunks2 = chunker.chunk_text(text)

    # Verify deterministic output
    assert len(chunks1) > 1
    assert len(chunks1) == len(chunks2)
    for i, c in enumerate(chunks1):
        assert c["chunk_index"] == i
        assert c["content"] == chunks2[i]["content"]
        assert len(c["content"]) > 0
