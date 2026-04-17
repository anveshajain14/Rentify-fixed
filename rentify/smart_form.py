# # smart_form.py
# from ultralytics import YOLO
# import cv2
# import numpy as np

# import chatbot  # reuse configured Gemini + helpers
# import pytesseract

# pytesseract.pytesseract.tesseract_cmd = (
#     r"C:\Program Files\Tesseract-OCR\tesseract.exe"
# )


# model = YOLO("yolov8n.pt")

# def read_imagefile(file_bytes) -> np.ndarray:
#     npimg = np.frombuffer(file_bytes, np.uint8)
#     return cv2.imdecode(npimg, cv2.IMREAD_COLOR)

# def detect_objects(image_bytes):
#     img = read_imagefile(image_bytes)
#     results = model(img)

#     detections = []
#     for result in results:
#         for box, score, cls in zip(
#             result.boxes.xyxy.cpu().numpy(),
#             result.boxes.conf.cpu().numpy(),
#             result.boxes.cls.cpu().numpy()
#         ):
#             detections.append({
#                 "label": model.names[int(cls)],
#                 "confidence": float(score),
#                 "bbox": box.tolist()
#             })
#     return detections

# def extract_text(image_bytes):
#     img = read_imagefile(image_bytes)
#     gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
#     return pytesseract.image_to_string(gray)


# def smart_analyze(main_image_bytes, spec_image_bytes):
#     """
#     Combined vision + OCR + LLM helper used by /smart-analyze.
#     Returns a dict matching the required response schema.
#     """
#     # 1) Object detection
#     detections = detect_objects(main_image_bytes)
#     best_label = None
#     if detections:
#         best = max(detections, key=lambda d: d.get("confidence", 0.0))
#         best_label = best.get("label")

#     # 2) OCR on spec image
#     spec_text = extract_text(spec_image_bytes) if spec_image_bytes else ""
#     spec_text_clean = spec_text.strip() or None

#     # 3) Infer high-level attributes with Gemini, but favour nulls over guesses
#     category = brand = None
#     colors = None

#     try:
#         prompt = f"""
# You are helping fill a product listing form.
# Use ONLY the provided info to infer fields.
# If a field is not clearly inferable, set it to null.

# Return STRICT JSON with keys:
#   "category" (string or null),
#   "brand" (string or null),
#   "colors" (array of strings or null).

# Detected object label: {best_label!r}

# Extracted spec text:
# \"\"\"{spec_text[:2000] if spec_text else ""}\"\"\"
#         """
#         llm_raw = chatbot.model.generate_content(prompt).text
#         parsed = chatbot.safe_json_parse(llm_raw) or {}
#         category = parsed.get("category")
#         brand = parsed.get("brand")
#         colors_val = parsed.get("colors")
#         if isinstance(colors_val, list):
#             colors = colors_val
#         elif colors_val in (None, "null"):
#             colors = None
#     except Exception:
#         # If Gemini fails, we still return the other grounded fields.
#         pass

#     return {
#         "object": best_label,
#         "category": category,
#         "colors": colors,
#         "brand": brand,
#         "description": spec_text_clean,
#     }

# smart_form.py

import io
import json
import cv2
import numpy as np
import pytesseract
from ultralytics import YOLO
from PIL import Image
import chatbot  # using generate_llm_response + safe_json_parse

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

# ---------------------------
# Load YOLOv8 Model
# ---------------------------
model = YOLO("yolov8n.pt")

# ---------------------------
# Helper: Read Image
# ---------------------------
def read_imagefile(file_bytes):
    image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

# ---------------------------
# OCR Extraction
# ---------------------------
def extract_text_from_image(image_bytes):
    img = read_imagefile(image_bytes)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    text = pytesseract.image_to_string(gray)
    return text.strip()

# ---------------------------
# YOLO Object Detection
# ---------------------------
def detect_object(image_bytes):
    img = read_imagefile(image_bytes)
    results = model(img)

    best_label = None
    best_conf = 0.0

    for r in results:
        for box in r.boxes:
            conf = float(box.conf[0])
            cls = int(box.cls[0])
            label = model.names[cls]

            if conf > best_conf:
                best_conf = conf
                best_label = label

    return best_label, best_conf

# ---------------------------
# LLM Category Classification
# ---------------------------
def classify_category(object_label, ocr_text):
    prompt = f"""
You are classifying a rental product.

Classify the product into ONE of the following categories:

Electronics
Furniture
Clothing
Vehicles
Appliances
Jewelry
Other

Return ONLY valid JSON:
{{
  "category": "one category from list"
}}

Object detected: {object_label}
OCR text: {ocr_text[:1000]}
"""

    try:
        response = chatbot.generate_llm_response(prompt)
        parsed = chatbot.safe_json_parse(response) or {}
        return parsed.get("category")
    except Exception:
        return None

# ---------------------------
# Main Smart Analyze Function
# ---------------------------
def smart_analyze(main_image_bytes, description_image_bytes=None):
    result = {
        "object_detected": None,
        "category": None,
        "description": None
    }

    # 1️⃣ Detect Object using YOLO
    object_label, confidence = detect_object(main_image_bytes)
    result["object_detected"] = object_label

    # 2️⃣ Classify Category using LLM
    if object_label:
        ocr_text_for_context = ""
        if description_image_bytes:
            ocr_text_for_context = extract_text_from_image(description_image_bytes)

        category = classify_category(object_label, ocr_text_for_context)
        result["category"] = category

    # 3️⃣ OCR for Description Photo (as before)
    if description_image_bytes:
        description_text = extract_text_from_image(description_image_bytes)
        result["description"] = description_text

    return result
