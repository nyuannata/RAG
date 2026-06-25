from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from typing import List, Dict, Any

from database import get_db
from models import ProjectCreate, ProjectResponse, FolderCreate, FolderResponse

router = APIRouter()

@router.get("", response_model=List[Dict[str, Any]])
def get_projects_with_folders():
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    projects = list(db.projects.find({}))
    folders = list(db.folders.find({}))
    
    result = []
    for p in projects:
        proj_folders = [
            FolderResponse(
                id=str(f["_id"]),
                project_id=str(f["project_id"]),
                name=f.get("name", ""),
                created_at=f.get("created_at", "")
            ).dict() 
            for f in folders if str(f.get("project_id")) == str(p["_id"])
        ]
        result.append({
            "id": str(p["_id"]),
            "name": p.get("name", ""),
            "created_at": p.get("created_at", ""),
            "folders": proj_folders
        })
    return result

@router.post("", response_model=ProjectResponse)
def create_project(project: ProjectCreate):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    now = datetime.utcnow().isoformat()
    new_project = {
        "name": project.name,
        "created_at": now
    }
    res = db.projects.insert_one(new_project)
    
    return ProjectResponse(
        id=str(res.inserted_id),
        name=project.name,
        created_at=now
    )

@router.delete("/{project_id}")
def delete_project(project_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    db.projects.delete_one({"_id": ObjectId(project_id)})
    db.folders.delete_many({"project_id": ObjectId(project_id)})
    return {"message": "Project deleted"}

@router.post("/{project_id}/folders", response_model=FolderResponse)
def create_folder(project_id: str, folder: FolderCreate):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    now = datetime.utcnow().isoformat()
    new_folder = {
        "name": folder.name,
        "project_id": ObjectId(project_id),
        "created_at": now
    }
    res = db.folders.insert_one(new_folder)
    
    return FolderResponse(
        id=str(res.inserted_id),
        project_id=project_id,
        name=folder.name,
        created_at=now
    )

@router.delete("/folders/{folder_id}")
def delete_folder(folder_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    db.folders.delete_one({"_id": ObjectId(folder_id)})
    # Could also unset folder_id from documents and sessions here, but let's keep it simple
    return {"message": "Folder deleted"}
