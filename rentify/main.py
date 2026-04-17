# main.py
from fastapi import FastAPI, UploadFile, File, Query
from pydantic import BaseModel

from bson import ObjectId

import chatbot
import smart_form
import recommendation

app = FastAPI(title="Rentify AI Service")

recommendation.load_index()

# Reuse the Mongo client/DB/collection configured in chatbot.py (read-only)
mongo_client = chatbot.client
mongo_db = chatbot.db
mongo_items = chatbot.items_collection


# ---------- Schemas ----------
class ChatRequest(BaseModel):
    query: str


# ---------- Chatbot / RAG endpoint ----------
@app.post("/chat")
def chat(req: ChatRequest):
    """
    Unified RAG / recommendation endpoint.

    Policy:
    {
      "text": "...",
      "source": "policy"
    }

    Recommendations:
    {
      "text": "3 laptops under ₹500!",
      "items": [...]
    }
    """
    intent = chatbot.detect_intent(req.query)

    if intent == "ITEM":
        filters = chatbot.extract_item_filters(req.query)
        items = chatbot.find_items(filters)
        count = len(items) if isinstance(items, list) else 0
        summary = f"{count} items found." if count else "No matching items."
        return {
            "text": summary,
            "items": items or [],
        }

    # Default: policy / FAQ
    answer = chatbot.answer_from_policy(req.query)
    return {
        "text": answer,
        "source": "policy",
    }


# ---------- Smart Product Listing Form ----------
# @app.post("/smart-analyze")
# async def smart_analyze(
#     main_image: UploadFile = File(...),
#     spec_image: UploadFile = File(...),
# ):
#     """
#     Vision + OCR + LLM helper used by the product listing form.

#     Response:
#     {
#       "object": "laptop",
#       "category": "Electronics",
#       "colors": ["silver", "black"],
#       "brand": "Dell",
#       "description": "16GB RAM, i7, 512GB SSD"
#     }
#     """
#     main_bytes = await main_image.read()
#     spec_bytes = await spec_image.read()

#     result = smart_form.smart_analyze(main_bytes, spec_bytes)

#     # Ensure all keys exist and use None where data is missing
#     return {
#         "object": result.get("object"),
#         "category": result.get("category"),
#         "colors": result.get("colors"),
#         "brand": result.get("brand"),
#         "description": result.get("description"),
#     }

@app.post("/smart-analyze")
async def smart_analyze(
    main_image: UploadFile = File(...),
    spec_image: UploadFile = File(None),  # make optional
):
    """
    Vision + OCR + LLM helper used by the product listing form.

    Response:
    {
      "object": "laptop",
      "category": "Electronics",
      "description": "16GB RAM, i7, 512GB SSD"
    }
    """

    main_bytes = await main_image.read()
    spec_bytes = await spec_image.read() if spec_image else None

    result = smart_form.smart_analyze(main_bytes, spec_bytes)

    return {
        "object": result.get("object_detected"),
        "category": result.get("category"),
        "description": result.get("description"),
    }


# ---------- Similar Items Recommendation ----------
@app.get("/similar")
def similar(
    itemId: str = Query(..., alias="itemId"),
    topK: int = Query(8, ge=1, le=50),
):
    """
    Similar items based on vector similarity over item metadata.

    Response:
    {
      "similarItems": [
        {
          "_id": "456",
          "title": "Sony Speaker",
          "price": "₹280/day",
          "image": "sony.jpg"
        }
      ]
    }
    """
    similar_ids = recommendation.search_similar_items_cold_start(itemId, top_k=topK)
    if not similar_ids:
        return {"similarItems": []}

    object_ids = []
    for sid in similar_ids:
        try:
            object_ids.append(ObjectId(sid))
        except Exception:
            continue

    if not object_ids:
        return {"similarItems": []}

    cursor = mongo_items.find({"_id": {"$in": object_ids}})
    docs = list(cursor)

    items = []
    for doc in docs:
        price_val = (
            doc.get("price")
            or doc.get("pricePerDay")
            or doc.get("rentalPrice")
        )
        image_val = (
            doc.get("image")
            or doc.get("imageUrl")
            or doc.get("thumbnail")
        )

        items.append(
            {
                "_id": str(doc.get("_id")),
                "title": doc.get("title") or doc.get("name") or "",
                "price": str(price_val) if price_val is not None else "",
                "image": image_val or "",
            }
        )

    return {"similarItems": items}


