"""
Docling Wrapper Script

This script wraps the Docling Python library for document conversion.
It can be called from Node.js using python-shell.

Usage:
    python docling_wrapper.py convert <file_path> <options_json>
    python docling_wrapper.py extract <file_path> <topics_json>
    python docling_wrapper.py --version
"""

import sys
import json
import base64
from pathlib import Path
from typing import Dict, List, Any, Optional

# Try to import docling
try:
    from docling.document_converter import DocumentConverter, FormatOption
    from docling.datamodel.base_models import InputFormat
    from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend
    DOCLING_AVAILABLE = True
except ImportError:
    DOCLING_AVAILABLE = False


def convert_to_markdown(file_path: str, options: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Convert document to Markdown format.

    Args:
        file_path: Path to the document file
        options: Conversion options (ocr, withTables, withImages)

    Returns:
        Dict with markdown, tables, pages, images
    """
    if not DOCLING_AVAILABLE:
        return {
            "markdown": "",
            "tables": [],
            "pages": 0,
            "images": [],
            "success": False,
            "error": "docling not installed. Run: pip install docling"
        }

    opts = options or {}

    try:
        # Configure format options
        format_options = {}
        if opts.get("ocr", True):
            format_options[InputFormat.PDF] = FormatOption(
                pipeline_options={"do_ocr": True}
            )

        # Create converter
        converter = DocumentConverter(
            format_options=format_options if format_options else None,
        )

        # Convert document
        doc = converter.convert(Path(file_path))

        # Export to Markdown
        markdown = doc.document.export_to_markdown()

        # Extract tables
        tables = []
        for table in doc.document.tables:
            tables.append({
                "markdown": table.export_to_markdown(),
                "rows": len(table.rows) if table.rows else 0,
                "cols": len(table.cols) if table.cols else 0,
            })

        # Extract images
        images = []
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

    except Exception as e:
        return {
            "markdown": "",
            "tables": [],
            "pages": 0,
            "images": [],
            "success": False,
            "error": str(e)
        }


def extract_fields(file_path: str, topics: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Extract specific fields from document by topic.

    Args:
        file_path: Path to the document file
        topics: List of topics to extract

    Returns:
        Dict with extracted fields
    """
    if not DOCLING_AVAILABLE:
        return {
            "fields": {},
            "success": False,
            "error": "docling not installed. Run: pip install docling"
        }

    topics_list = topics or []

    try:
        converter = DocumentConverter()
        doc = converter.convert(Path(file_path))
        markdown = doc.document.export_to_markdown()

        # Basic field extraction from markdown
        # This is a simplified implementation
        result = {}

        # Extract contract number if topic requested
        if "contract_number" in topics_list or "basic_info" in topics_list:
            import re
            contract_match = re.search(r'合同编号[：:]\s*([A-Z0-9\-]+)', markdown)
            if contract_match:
                result["contractNumber"] = contract_match.group(1)

        # Extract title if topic requested
        if "title" in topics_list or "basic_info" in topics_list:
            import re
            title_match = re.search(r'合同名称[：:]\s*(.+)', markdown)
            if title_match:
                result["title"] = title_match.group(1).strip()

        # Extract amount if topic requested
        if "amount" in topics_list or "financial" in topics_list:
            import re
            amount_match = re.search(r'合同金额[：:]\s*([0-9,.,，]+)', markdown)
            if amount_match:
                result["contractAmount"] = amount_match.group(1).replace(',', '').replace('，', '')

        return {
            "fields": result,
            "success": True,
        }

    except Exception as e:
        return {
            "fields": {},
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: docling_wrapper.py <operation> [args]"
        }))
        sys.exit(1)

    operation = sys.argv[1]

    if operation == "--version":
        print(json.dumps({
            "docling_available": DOCLING_AVAILABLE,
            "version": "1.0.0"
        }))
    elif operation == "convert":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Usage: docling_wrapper.py convert <file_path> [options_json]"}))
            sys.exit(1)

        file_path = sys.argv[2]
        options = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
        result = convert_to_markdown(file_path, options)

    elif operation == "extract":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Usage: docling_wrapper.py extract <file_path> [topics_json]"}))
            sys.exit(1)

        file_path = sys.argv[2]
        topics = json.loads(sys.argv[3]) if len(sys.argv) > 3 else []
        result = extract_fields(file_path, topics)

    else:
        result = {"error": f"Unknown operation: {operation}"}

    print(json.dumps(result, ensure_ascii=False))
