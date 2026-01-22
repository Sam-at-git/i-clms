#!/usr/bin/env python3
"""
Docling Document Parser Wrapper

This script provides a command-line interface to IBM's Docling library
for document conversion and field extraction.

Usage:
    python docling_wrapper.py convert <file_path> <options_json>
    python docling_wrapper.py extract <file_path> <topics_json>
"""

import sys
import json
import base64
from pathlib import Path

# Try to import docling
try:
    from docling.document_converter import DocumentConverter, FormatOption
    from docling.datamodel.base_models import InputFormat
    from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend
    DOCLING_AVAILABLE = True
except ImportError:
    DOCLING_AVAILABLE = False
    DocumentConverter = None


def error_response(message: str) -> dict:
    """Return an error response"""
    return {"error": message, "success": False}


def convert_to_markdown(file_path: str, options: dict = None) -> dict:
    """
    Convert document to Markdown format

    Args:
        file_path: Path to the document file
        options: Conversion options (ocr, withTables, withImages)

    Returns:
        dict with markdown, tables, pages, images, success
    """
    if not DOCLING_AVAILABLE:
        return error_response("docling not installed. Run: pip install docling")

    opts = options or {}

    try:
        # Configure format options
        format_options = {
            InputFormat.PDF: FormatOption(
                pipeline_options={"do_ocr": opts.get("ocr", True)}
            ),
        }

        converter = DocumentConverter(format_options=format_options)

        # Convert document
        doc = converter.convert(Path(file_path))

        # Export to Markdown
        markdown = doc.document.export_to_markdown()

        # Extract tables
        tables = []
        if opts.get("withTables", True):
            for table in doc.document.tables:
                tables.append({
                    "markdown": table.export_to_markdown(),
                    "rows": len(table.rows) if table.rows else 0,
                    "cols": len(table.cols) if table.cols else 0,
                })

        # Extract images
        images = []
        if opts.get("withImages", True):
            for picture in doc.document.pictures:
                images.append({
                    "page": picture.page_no,
                    "width": picture.width,
                    "height": picture.height,
                })

        return {
            "markdown": markdown,
            "tables": tables,
            "pages": len(doc.document.pages),
            "images": images,
            "success": True,
        }

    except FileNotFoundError:
        return error_response(f"File not found: {file_path}")
    except Exception as e:
        return error_response(f"Conversion failed: {str(e)}")


def extract_fields(file_path: str, topics: list) -> dict:
    """
    Extract specific fields from document

    Args:
        file_path: Path to the document file
        topics: List of topics to extract

    Returns:
        dict with extracted fields
    """
    if not DOCLING_AVAILABLE:
        return error_response("docling not installed. Run: pip install docling")

    try:
        converter = DocumentConverter()
        doc = converter.convert(Path(file_path))

        # For now, return the markdown and let the LLM extract fields
        # In a full implementation, this would use Docling's field extraction capabilities
        result = {
            "fields": {
                "markdown": doc.document.export_to_markdown(),
                "topics_requested": topics,
            },
            "success": True,
        }

        return result

    except FileNotFoundError:
        return error_response(f"File not found: {file_path}")
    except Exception as e:
        return error_response(f"Extraction failed: {str(e)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps(error_response("Usage: docling_wrapper.py <operation> [args]")))
        sys.exit(1)

    operation = sys.argv[1]

    if operation == "convert":
        file_path = sys.argv[2] if len(sys.argv) > 2 else ""
        options = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
        result = convert_to_markdown(file_path, options)

    elif operation == "extract":
        file_path = sys.argv[2] if len(sys.argv) > 2 else ""
        topics = json.loads(sys.argv[3]) if len(sys.argv) > 3 else []
        result = extract_fields(file_path, topics)

    else:
        result = error_response(f"Unknown operation: {operation}")

    print(json.dumps(result, ensure_ascii=False))
