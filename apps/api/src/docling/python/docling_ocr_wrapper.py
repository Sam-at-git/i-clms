"""
RapidOCR-based PDF to Markdown converter.

This script uses RapidOCR (PaddleOCR) for excellent Chinese text recognition.
RapidOCR is faster and more accurate than EasyOCR for Chinese text.
"""

import sys
import json
import traceback
from pathlib import Path
from typing import Dict, List, Any, Optional

# Try to import required libraries
try:
    from rapidocr_onnxruntime import RapidOCR
    import fitz  # PyMuPDF
    RAPIDOCR_AVAILABLE = True
except ImportError as e:
    RAPIDOCR_AVAILABLE = False
    IMPORT_ERROR = str(e)


def convert_with_ocr(
    file_path: str,
    options: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Convert PDF to Markdown using RapidOCR for Chinese text recognition.

    Args:
        file_path: Path to the PDF file
        options: Conversion options

    Returns:
        Dict with markdown, pages, success status
    """
    if not RAPIDOCR_AVAILABLE:
        return {
            "markdown": "",
            "tables": [],
            "pages": 0,
            "images": [],
            "success": False,
            "error": f"RapidOCR not available: {IMPORT_ERROR}"
        }

    opts = options or {}

    try:
        # Initialize RapidOCR
        ocr = RapidOCR()

        # Open PDF
        pdf = fitz.open(file_path)
        page_count = len(pdf)

        print(f"[RapidOCR] Processing {page_count} pages...", file=sys.stderr)

        all_text = []
        min_confidence = opts.get("minConfidence", 0.3)

        for page_num in range(page_count):
            page = pdf[page_num]

            # Get page as image
            pix = page.get_pixmap()
            img_bytes = pix.tobytes("png")

            # Run OCR on this page
            try:
                # RapidOCR returns (detections, timing_info)
                # detections format: [[bbox, text, confidence], ...]
                result = ocr(img_bytes)

                if not result or not isinstance(result, tuple) or len(result) == 0:
                    continue

                detections = result[0]

                if not detections or not isinstance(detections, list):
                    continue

                # Sort by y-position (top to bottom)
                # bbox is [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
                sorted_result = sorted(detections, key=lambda x: x[0][0][1])

                # Collect all text with confidence above threshold
                page_lines = []
                current_y = None
                current_line = []

                for item in sorted_result:
                    bbox = item[0]      # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
                    text = item[1]      # Recognized text
                    confidence = item[2]  # Confidence score

                    if confidence >= min_confidence and text.strip():
                        y_pos = bbox[0][1]  # Top-left y coordinate

                        # Check if we're on a new line (y position differs significantly)
                        if current_y is not None and abs(y_pos - current_y) > 15:
                            if current_line:
                                page_lines.append(" ".join(current_line))
                            current_line = []
                            current_y = y_pos
                        elif current_y is None:
                            current_y = y_pos

                        current_line.append(text.strip())

                # Add remaining line
                if current_line:
                    page_lines.append(" ".join(current_line))

                # Add page content if we found anything
                if page_lines:
                    all_text.append(f"\n## Page {page_num + 1}\n\n")
                    all_text.extend(page_lines)
                    all_text.append("\n\n")

            except Exception as e:
                print(f"[RapidOCR] Warning: Failed to process page {page_num + 1}: {e}", file=sys.stderr)
                continue

        pdf.close()

        # Combine all text
        markdown = "\n".join(all_text)

        # Also extract embedded text as fallback/complement
        try:
            embedded_text = ""
            pdf = fitz.open(file_path)
            for page_num in range(min(page_count, 3)):  # Check first 3 pages
                page = pdf[page_num]
                text = page.get_text()
                if text.strip() and len(text.strip()) > 50:
                    embedded_text += f"\n\n## Page {page_num + 1} (Embedded):\n{text}\n"

            pdf.close()

            # If OCR got very little text but embedded has more, use embedded
            if len(markdown.strip()) < 200 and len(embedded_text.strip()) > 200:
                markdown = embedded_text + "\n\n" + markdown
                print(f"[RapidOCR] Combined with embedded text for better coverage", file=sys.stderr)

        except Exception:
            pass  # Ignore embedded text extraction errors

        return {
            "markdown": markdown,
            "tables": [],
            "pages": page_count,
            "images": [],
            "success": True,
            "method": "rapidocr"
        }

    except Exception as e:
        import traceback
        return {
            "markdown": "",
            "tables": [],
            "pages": 0,
            "images": [],
            "success": False,
            "error": f"RapidOCR conversion failed: {str(e)}\n{traceback.format_exc()}"
        }


def extract_text_blocks(file_path: str) -> Dict[str, Any]:
    """
    Extract text blocks from PDF using PyMuPDF for comparison.

    This extracts the embedded text layer if available.
    """
    try:
        import fitz

        pdf = fitz.open(file_path)
        page_count = len(pdf)

        all_text = []

        for page_num in range(page_count):
            page = pdf[page_num]
            text = page.get_text()

            if text.strip():
                all_text.append(f"## Page {page_num + 1}\n\n{text}\n\n")

        pdf.close()

        return {
            "markdown": "\n".join(all_text),
            "pages": page_count,
            "success": True,
            "method": "pymupdf_embedded"
        }

    except Exception as e:
        return {
            "markdown": "",
            "pages": 0,
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python docling_ocr_wrapper.py <pdf_file>"}))
        sys.exit(1)

    file_path = sys.argv[1]

    # Try RapidOCR first
    result = convert_with_ocr(file_path, {"minConfidence": 0.3})

    # If RapidOCR fails or returns very little text, try embedded text extraction
    if not result.get("success") or len(result.get("markdown", "")) < 100:
        print("[RapidOCR] Result insufficient, trying embedded text extraction...", file=sys.stderr)
        embedded_result = extract_text_blocks(file_path)

        if len(embedded_result.get("markdown", "")) > len(result.get("markdown", "")):
            result = embedded_result
            result["fallback"] = "Used embedded text"

    print(json.dumps(result, ensure_ascii=False, indent=2))
