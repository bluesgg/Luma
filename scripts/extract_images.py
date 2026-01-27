#!/usr/bin/env python3
"""
PDF Image Extraction Script
Uses PyMuPDF (fitz) to extract images from PDF files
Output: JSON array of base64-encoded images with metadata
"""

import sys
import json
import fitz  # PyMuPDF
import base64
from typing import List, Dict, Any


def extract_images_from_pdf(pdf_path: str) -> List[Dict[str, Any]]:
    """
    Extract all images from a PDF file

    Args:
        pdf_path: Path to the PDF file

    Returns:
        List of dictionaries containing image data and metadata
    """
    extracted_images = []

    try:
        # Open PDF
        doc = fitz.open(pdf_path)

        # Iterate through pages
        for page_num in range(len(doc)):
            page = doc[page_num]

            # Get images on the page
            image_list = page.get_images(full=True)

            # Extract each image
            for image_index, img in enumerate(image_list):
                xref = img[0]

                # Get image data
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]

                # Get image bbox (bounding box)
                # Find image rectangle on page
                rects = page.get_image_rects(xref)
                bbox = None
                if rects:
                    rect = rects[0]
                    bbox = {
                        "x": float(rect.x0),
                        "y": float(rect.y0),
                        "width": float(rect.width),
                        "height": float(rect.height)
                    }
                else:
                    # Default bbox if not found
                    bbox = {"x": 0, "y": 0, "width": 0, "height": 0}

                # Encode image to base64
                image_base64 = base64.b64encode(image_bytes).decode('utf-8')

                # Add to results
                extracted_images.append({
                    "pageNumber": page_num + 1,  # 1-indexed
                    "imageIndex": image_index,
                    "format": image_ext,
                    "base64": image_base64,
                    "bbox": bbox
                })

        doc.close()

        return extracted_images

    except Exception as e:
        raise Exception(f"Failed to extract images: {str(e)}")


def main():
    """Main entry point"""
    if len(sys.argv) != 2:
        print("Usage: python extract_images.py <pdf_path>", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]

    try:
        # Extract images
        images = extract_images_from_pdf(pdf_path)

        # Output as JSON
        result = {
            "success": True,
            "totalImages": len(images),
            "images": images
        }

        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        # Output error as JSON
        error_result = {
            "success": False,
            "error": str(e)
        }

        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
