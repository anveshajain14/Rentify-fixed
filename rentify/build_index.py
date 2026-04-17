# build_index.py

import recommendation
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
MONGO_URI = os.getenv("MONGODB_URI")

DB_NAME = "rentify"
COLLECTION_NAME = "products"

def build_index():
    client = MongoClient(MONGO_URI)
    items = client[DB_NAME][COLLECTION_NAME]

    count = 0

    for item in items.find({"isApproved": True}):
        text = " ".join([
            item.get("title", ""),
            item.get("category", ""),
            item.get("description", "")
        ])

        vector = recommendation.generate_embedding(text)
        recommendation.add_item(str(item["_id"]), vector)
        count += 1

    print(f"Indexed {count} approved products.")

if __name__ == "__main__":
    build_index()
