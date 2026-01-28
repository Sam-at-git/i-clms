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

    opts = options.copy() if options else {}

    # First try with requested options
    try:
        return _convert_with_options(file_path, opts)
    except Exception as e:
        error_msg = str(e)
        # If the error is related to OCR/table processing and OCR is enabled, try without OCR
        if opts.get("ocr", True) and ("tolist" in error_msg or "NoneType" in error_msg):
            import sys
            print(json.dumps({"warning": f"OCR conversion failed: {error_msg}, retrying without OCR"}), file=sys.stderr)
            opts["ocr"] = False
            try:
                return _convert_with_options(file_path, opts)
            except Exception as e2:
                return _error_result(f"Conversion failed with and without OCR: {str(e2)}")
        else:
            return _error_result(f"Conversion failed: {error_msg}")


def _convert_with_options(file_path: str, opts: Dict) -> Dict[str, Any]:
    """Internal conversion function with specific options."""
    # NOTE: OCR is currently disabled due to API changes in Docling
    # The FormatOption API now requires pipeline_cls and backend fields
    # which are causing validation errors. We'll convert without OCR for now.

    # Create converter without OCR (which has API issues)
    converter = DocumentConverter()

    # Convert document
    doc = converter.convert(Path(file_path))

    # Export to Markdown with fallback
    markdown = ""
    try:
        markdown = doc.document.export_to_markdown()
    except (AttributeError, TypeError) as e:
        # Fallback: try to get text content
        markdown = str(doc.document) if doc.document else ""

    # Extract tables with error handling
    tables = []
    if opts.get("withTables", True):
        try:
            for table in doc.document.tables:
                try:
                    # Try different ways to get table dimensions
                    rows = 0
                    cols = 0
                    if hasattr(table, 'rows'):
                        rows = len(table.rows) if table.rows else 0
                    elif hasattr(table, 'shape'):
                        rows = table.shape[0] if hasattr(table, 'shape') and table.shape else 0

                    if hasattr(table, 'cols'):
                        cols = len(table.cols) if table.cols else 0
                    elif hasattr(table, 'shape'):
                        cols = table.shape[1] if hasattr(table, 'shape') and len(table.shape) > 1 else 0

                    tables.append({
                        "markdown": table.export_to_markdown() if hasattr(table, 'export_to_markdown') else "",
                        "rows": rows,
                        "cols": cols,
                    })
                except (AttributeError, TypeError) as te:
                    # Skip tables that can't be processed
                    import sys
                    print(f"Warning: Failed to process table: {te}", file=sys.stderr)
                    continue
        except (AttributeError, TypeError) as e:
            import sys
            print(f"Warning: Failed to iterate tables: {e}", file=sys.stderr)

    # Extract images with error handling
    images = []
    if opts.get("withImages", True):
        try:
            for picture in doc.document.pictures:
                try:
                    images.append({
                        "page": picture.page_no if hasattr(picture, 'page_no') else 0,
                        "width": picture.width if hasattr(picture, 'width') else 0,
                        "height": picture.height if hasattr(picture, 'height') else 0,
                    })
                except (AttributeError, TypeError):
                    # Skip pictures that can't be processed
                    continue
        except (AttributeError, TypeError):
            pass

    # Get page count with fallback
    try:
        pages = len(doc.document.pages) if doc.document.pages else 0
    except (AttributeError, TypeError):
        pages = 0

    return {
        "markdown": markdown,
        "tables": tables,
        "pages": pages,
        "images": images,
        "success": True,
    }


def _error_result(error: str) -> Dict[str, Any]:
    """Create an error result."""
    return {
        "markdown": "",
        "tables": [],
        "pages": 0,
        "images": [],
        "success": False,
        "error": error
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
    try:
        if len(sys.argv) < 2:
            print(json.dumps({
                "error": "Usage: docling_wrapper.py <operation> [args]"
            }))
            sys.exit(1)

        operation = sys.argv[1]

        if operation == "--version":
            result = {
                "docling_available": DOCLING_AVAILABLE,
                "version": "1.0.0"
            }
        elif operation == "convert":
            if len(sys.argv) < 3:
                result = {"error": "Usage: docling_wrapper.py convert <file_path> [options_json]"}
            else:
                file_path = sys.argv[2]
                options = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
                result = convert_to_markdown(file_path, options)

        elif operation == "extract":
            if len(sys.argv) < 3:
                result = {"error": "Usage: docling_wrapper.py extract <file_path> [topics_json]"}
            else:
                file_path = sys.argv[2]
                topics = json.loads(sys.argv[3]) if len(sys.argv) > 3 else []
                result = extract_fields(file_path, topics)

        else:
            result = {"error": f"Unknown operation: {operation}"}

        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        import traceback
        # Print error to stderr for debugging
        print(f"Error: {str(e)}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        # Always return valid JSON to stdout
        error_result = {
            "markdown": "",
            "tables": [],
            "pages": 0,
            "images": [],
            "success": False,
            "error": f"{str(e)}\n{traceback.format_exc()}"
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)
