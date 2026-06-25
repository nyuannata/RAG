from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from typing import List

from database import get_db
from models import TagCreate, TagResponse

router = APIRouter()

@router.get("/", response_model=List[TagResponse])
def get_tags():
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    tags = list(db.tags.find({}))
    return [
        TagResponse(
            id=str(t["_id"]),
            name=t.get("name", ""),
            color=t.get("color", "#slate"),
            created_at=t.get("created_at", "")
        ) for t in tags
    ]

@router.post("/", response_model=TagResponse)
def create_tag(tag: TagCreate):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    now = datetime.utcnow().isoformat()
    new_tag = {
        "name": tag.name,
        "color": tag.color,
        "created_at": now
    }
    res = db.tags.insert_one(new_tag)
    
    return TagResponse(
        id=str(res.inserted_id),
        name=tag.name,
        color=tag.color,
        created_at=now
    )

@router.delete("/{tag_id}")
def delete_tag(tag_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    db.tags.delete_one({"_id": ObjectId(tag_id)})
    return {"message": "Tag deleted"}
