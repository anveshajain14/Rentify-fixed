def add_item(product_id):
    product = products_collection.find_one({"_id": ObjectId(product_id)})

    text = f"{product['title']} {product['category']} {product['description']}"
    embedding = model.encode([text], normalize_embeddings=True)

    index.add(embedding)

    new_position = index.ntotal - 1
    id_map[str(new_position)] = str(product_id)

    save_index()


@app.post("/add-to-index/{product_id}")
def add_to_index(product_id: str):
    add_item(product_id)
    return {"status": "added"}
