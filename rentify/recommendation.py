# # recommendation.py
# import faiss, json, os
# import numpy as np
# from sentence_transformers import SentenceTransformer
# from pymongo import MongoClient
# from bson import ObjectId

# # ---------- Config ----------
# EMBEDDING_MODEL = "all-MiniLM-L6-v2"
# VECTOR_DIM = 384
# FAISS_INDEX_PATH = "faiss.index"
# ID_MAP_PATH = "id_map.json"

# # ---------- Embedding ----------
# model = SentenceTransformer(EMBEDDING_MODEL)

# def generate_embedding(text: str):
#     return model.encode(text, normalize_embeddings=True)

# # ---------- Vector Store ----------
# index = faiss.IndexFlatIP(VECTOR_DIM)
# id_map, reverse_id_map = {}, {}

# def load_index():
#     global index
#     if os.path.exists(FAISS_INDEX_PATH):
#         index = faiss.read_index(FAISS_INDEX_PATH)
#     if os.path.exists(ID_MAP_PATH):
#         with open(ID_MAP_PATH) as f:
#             data = json.load(f)
#             id_map.update(data)
#             reverse_id_map.update({v: int(k) for k, v in data.items()})

# def save_index():
#     faiss.write_index(index, FAISS_INDEX_PATH)
#     with open(ID_MAP_PATH, "w") as f:
#         json.dump(id_map, f)

# def add_item(item_id: str, vector):
#     if item_id in reverse_id_map:
#         return
#     idx = index.ntotal
#     index.add(vector.reshape(1, -1))
#     id_map[str(idx)] = item_id
#     reverse_id_map[item_id] = idx
#     save_index()

# def search_similar_by_item_id(item_id: str, top_k=8):
#     if item_id not in reverse_id_map:
#         return []

#     idx = reverse_id_map[item_id]
#     vector = index.reconstruct(idx)

#     scores, indices = index.search(vector.reshape(1, -1), top_k + 1)
#     results = [
#         id_map.get(str(i)) for i in indices[0]
#         if id_map.get(str(i)) != item_id
#     ]
#     return results[:top_k]

# """
# Additional helpers for cold-start and full item similarity.
# """


# def _ensure_mongo_client(uri="mongodb://localhost:27017"):
#     return MongoClient(uri)


# def sync_from_mongo(uri="mongodb://localhost:27017"):
#     client = _ensure_mongo_client(uri)
#     items = client["orchids-rental2"]["rentals"]

#     for item in items.find({"available": True}):
#         text = f"{item.get('title', '')} {item.get('category', '')} {item.get('description', '')}"
#         vector = generate_embedding(text)
#         add_item(str(item["_id"]), vector)


# def search_similar_items_cold_start(item_id: str, top_k: int = 8, uri="mongodb://localhost:27017"):
#     """
#     Returns a list of similar item IDs.
#     If the item is not yet in the index, it is embedded and added first.
#     """
#     client = _ensure_mongo_client(uri)
#     items = client["orchids-rental2"]["rentals"]

#     item = items.find_one({"_id": ObjectId(item_id)})
#     if not item:
#         return []

#     # If not already in the index, add it first
#     if item_id not in reverse_id_map:
#         text = f"{item.get('title', '')} {item.get('category', '')} {item.get('description', '')}"
#         vector = generate_embedding(text)
#         add_item(item_id, vector)

#     # Now we can safely call the original search
#     return search_similar_by_item_id(item_id, top_k=top_k)

# recommendation.py

import faiss
import json
import os
from sentence_transformers import SentenceTransformer
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

# ---------- Load Env ----------
load_dotenv()
MONGO_URI = os.getenv("MONGODB_URI")

# ---------- Config ----------
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
VECTOR_DIM = 384
FAISS_INDEX_PATH = "faiss.index"
ID_MAP_PATH = "id_map.json"

DB_NAME = "rentify"
COLLECTION_NAME = "products"

# ---------- Embedding ----------
model = SentenceTransformer(EMBEDDING_MODEL)

def generate_embedding(text: str):
    return model.encode(text, normalize_embeddings=True)

# ---------- Vector Store ----------
index = faiss.IndexFlatIP(VECTOR_DIM)
id_map, reverse_id_map = {}, {}

def load_index():
    global index
    if os.path.exists(FAISS_INDEX_PATH):
        index = faiss.read_index(FAISS_INDEX_PATH)

    if os.path.exists(ID_MAP_PATH):
        with open(ID_MAP_PATH) as f:
            data = json.load(f)
            id_map.update(data)
            reverse_id_map.update({v: int(k) for k, v in data.items()})

def save_index():
    faiss.write_index(index, FAISS_INDEX_PATH)
    with open(ID_MAP_PATH, "w") as f:
        json.dump(id_map, f)

def add_item(item_id: str, vector):
    if item_id in reverse_id_map:
        return

    idx = index.ntotal
    index.add(vector.reshape(1, -1))
    id_map[str(idx)] = item_id
    reverse_id_map[item_id] = idx
    save_index()

def search_similar_by_item_id(item_id: str, top_k=8):
    if item_id not in reverse_id_map:
        return []

    idx = reverse_id_map[item_id]
    vector = index.reconstruct(idx)

    scores, indices = index.search(vector.reshape(1, -1), top_k + 1)

    results = []

    for score, idx in zip(scores[0], indices[0]):
        similar_id = id_map.get(str(idx))

        if similar_id == item_id:
            continue

        # Similarity threshold (tune if needed)
        if score > 0.3:
            results.append(similar_id)

    return results


# ---------- Mongo Helpers ----------

def _get_items_collection():
    client = MongoClient(MONGO_URI)
    return client[DB_NAME][COLLECTION_NAME]

def search_similar_items_cold_start(item_id: str, top_k: int = 8):
    """
    Returns a list of similar item IDs.
    If the item is not yet in the index, it is embedded and added first.
    Only considers isApproved = True products.
    """
    items = _get_items_collection()

    item = items.find_one({
        "_id": ObjectId(item_id),
        "isApproved": True
    })

    if not item:
        return []

    # If not already in index, embed & add
    if item_id not in reverse_id_map:
        text = " ".join([
            item.get("title", ""),
            item.get("category", ""),
            item.get("description", "")
        ])
        vector = generate_embedding(text)
        add_item(item_id, vector)

    return search_similar_by_item_id(item_id, top_k=top_k)
