from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from models.db_models import CanvasData, User, Workspace
import json

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class CreateWorkspaceRequest(BaseModel):
    user_id: str
    name: str

class SaveCanvasRequest(BaseModel):
    workspace_id: int
    data: str # JSON string

@router.post("/workspaces/create")
def create_workspace(request: CreateWorkspaceRequest, db: Session = Depends(get_db)):
    ws = Workspace(user_id=int(request.user_id), name=request.name)
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return {"id": ws.id, "name": ws.name}

@router.get("/workspaces/{user_id}")
def get_workspaces(user_id: int, db: Session = Depends(get_db)):
    workspaces = db.query(Workspace).filter(Workspace.user_id == user_id).all()
    return [{"id": ws.id, "name": ws.name} for ws in workspaces]

@router.delete("/workspaces/{workspace_id}")
def delete_workspace(workspace_id: int, db: Session = Depends(get_db)):
    """Delete a workspace and all its associated canvas data."""
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    # Delete associated canvas data first (FK constraint)
    canvas = db.query(CanvasData).filter(CanvasData.workspace_id == workspace_id).first()
    if canvas:
        db.delete(canvas)
    db.delete(ws)
    db.commit()
    return {"status": "deleted", "workspace_id": workspace_id}

@router.get("/workspaces/{user_id}/full")
def get_workspaces_full(user_id: int, db: Session = Depends(get_db)):
    """
    Returns full workspace data for a user including:
    - Workspace id, name
    - All tldraw pages (with page names)
    - All shapes (text, ai-text, ai-mermaid, diagrams)
    - Canvas snapshot summary
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    workspaces = db.query(Workspace).filter(Workspace.user_id == user_id).all()
    result = {
        "username": user.username,
        "user_id": user.id,
        "bio": user.bio,
        "interests": user.interests,
        "learning_style": user.learning_style,
        "workspaces": []
    }

    for ws in workspaces:
        ws_entry = {"id": ws.id, "name": ws.name, "pages": [], "has_canvas": False, "shape_count": 0}
        canvas = db.query(CanvasData).filter(CanvasData.workspace_id == ws.id).first()
        if canvas and canvas.data:
            ws_entry["has_canvas"] = True
            try:
                snapshot = json.loads(canvas.data)
                store = snapshot.get("store", {})
                pages = []
                shapes_by_page: dict = {}
                for key, record in store.items():
                    if record.get("typeName") == "page":
                        pages.append({"id": record["id"], "name": record.get("name", "Unnamed Page")})
                    elif record.get("typeName") == "shape":
                        pid = record.get("parentId", "unknown")
                        shapes_by_page.setdefault(pid, [])
                        shape_type = record.get("type", "")
                        props = record.get("props", {})
                        text = ""
                        if shape_type == "text":
                            # ProseMirror rich text
                            def _extract(n):
                                if not n: return ""
                                if isinstance(n, str): return n
                                if n.get("text"): return n["text"]
                                return "".join(_extract(c) for c in n.get("content", []))
                            text = _extract(props.get("richText", {}))
                        elif shape_type in ("ai-text", "note"):
                            text = props.get("text", "")
                        elif shape_type == "ai-mermaid":
                            text = "[Mermaid Diagram] " + props.get("code", "")[:80]
                        shapes_by_page[pid].append({
                            "type": shape_type,
                            "text": text[:200] if text else "",
                            "x": record.get("x", 0),
                            "y": record.get("y", 0)
                        })

                total_shapes = sum(len(v) for v in shapes_by_page.values())
                ws_entry["shape_count"] = total_shapes
                for page in pages:
                    page["shapes"] = shapes_by_page.get(page["id"], [])
                ws_entry["pages"] = pages
            except Exception as e:
                ws_entry["parse_error"] = str(e)
        result["workspaces"].append(ws_entry)

    return result

@router.post("/canvas/save")
def save_canvas(request: SaveCanvasRequest, db: Session = Depends(get_db)):
    canvas = db.query(CanvasData).filter(CanvasData.workspace_id == request.workspace_id).first()
    if not canvas:
        canvas = CanvasData(workspace_id=request.workspace_id, data=request.data)
        db.add(canvas)
    else:
        canvas.data = request.data
    
    db.commit()
    return {"status": "success"}

@router.get("/canvas/load/{workspace_id}")
def load_canvas(workspace_id: int, db: Session = Depends(get_db)):
    canvas = db.query(CanvasData).filter(CanvasData.workspace_id == workspace_id).first()
    if not canvas:
        return {"data": None}
    return {"data": canvas.data}
