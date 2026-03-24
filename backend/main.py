from fastapi import FastAPI, HTTPException, Request, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import logging, traceback, json
from agent import run_chat, add_documents_to_store
from database import engine, Base, SessionLocal
from models.db_models import User, CanvasData, Workspace, KnowledgeBase
from sqlalchemy.orm import Session

# Production Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("edugen-api")

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="EduGen Production API")

# Global Exception Handler (Crucial for Industry Level)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global Error: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Credentials": "true",
        }
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173", 
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175",
        "http://localhost:5176", "http://127.0.0.1:5176"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from routers.auth import router as auth_router
from routers.canvas import router as canvas_router
from routers.analyze import router as analyze_router

app.include_router(auth_router, prefix="/api")
app.include_router(canvas_router, prefix="/api")
app.include_router(analyze_router, prefix="/api")

# Profile Management
class ProfileUpdate(BaseModel):
    user_id: int
    bio: Optional[str] = None
    interests: Optional[str] = None
    learning_style: Optional[str] = None

@app.get("/api/profile/{user_id}")
def get_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "bio": user.bio,
        "interests": user.interests,
        "learning_style": user.learning_style,
        "username": user.username
    }

@app.post("/api/profile/update")
def update_profile(request: ProfileUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if request.bio is not None: user.bio = request.bio
    if request.interests is not None: user.interests = request.interests
    if request.learning_style is not None: user.learning_style = request.learning_style
    
    db.commit()
    return {"status": "success"}

# ── Session concept tracking (in-memory per session) ──────────────────────────
_session_concepts: dict = {}  # session_id -> List[str]

class ChatRequest(BaseModel):
    message: str
    session_id: str
    user_id: int
    page_id: str  # Tldraw Page ID
    context: Optional[str] = ""

@app.post("/chat")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = {
        "user_id": user.id,
        "bio": user.bio or "",
        "interests": user.interests or "",
        "learning_style": user.learning_style or "Intermediate",
        "page_id": request.page_id  # Passed for RAG research
    }

    # Retrieve concept history for this session
    concepts = _session_concepts.get(request.session_id, [])

    logger.info(f"🤖 LLM call | user={user.id} | page={request.page_id} | msg={request.message[:60]}")

    try:
        result = run_chat(
            user_input=request.message,
            user_profile=profile,
            canvas_context=request.context or "",
            concepts_covered=concepts,
        )

        # Persist updated concept list for this session
        _session_concepts[request.session_id] = result.get("concepts_covered", concepts)

        # Auto-update user interests if AI detected something new
        try:
            res_data = json.loads(result.get("response", "{}"))
            update = res_data.get("user_update")
            if update and str(update).strip():
                current = user.interests or ""
                new_val = str(update).strip()
                if new_val not in current:
                    user.interests = (current + " | " + new_val).strip(" | ")
                    db.commit()
        except Exception as pe:
            logger.warning(f"Profile update parse error: {pe}")

        return result
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="AI Service failed")

# ── File Upload & Retrieval ───────────────────────────────────────────────────
@app.get("/api/material/latest/{workspace_id}/{page_id}")
async def get_latest_material(workspace_id: int, page_id: str, db: Session = Depends(get_db)):
    """Retrieves the most recent material uploaded for a specific PAGE."""
    try:
        material = db.query(KnowledgeBase).filter(
            KnowledgeBase.workspace_id == workspace_id,
            KnowledgeBase.page_id == page_id
        ).order_by(KnowledgeBase.id.desc()).first()
        
        if not material:
            return {"status": "none"}
        return {
            "status": "success",
            "filename": material.filename,
            "content": material.content,
            "chunks_indexed": material.chunks_count
        }
    except Exception as e:
        logger.error(f"Error fetching page material: {e}")
        return {"status": "none"}

@app.post("/api/upload")
async def upload_material(
    workspace_id: int = Form(...), 
    page_id: str = Form(...), 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    try:
        content_type = file.content_type or ""
        filename = file.filename or ""
        logger.info(f"📤 Uploading: {filename} for Page: {page_id}")
        raw_bytes = await file.read()
        texts = []
        if filename.lower().endswith(".pdf") or "pdf" in content_type.lower():
            import fitz
            doc = fitz.open(stream=raw_bytes, filetype="pdf")
            for page in doc: texts.append(page.get_text())
            doc.close()
        elif filename.lower().endswith(".docx"):
            import docx, io
            doc = docx.Document(io.BytesIO(raw_bytes))
            for para in doc.paragraphs:
                if para.text.strip(): texts.append(para.text)
        else:
            try: texts.append(raw_bytes.decode("utf-8"))
            except: texts.append(raw_bytes.decode("latin-1", errors="ignore"))

        if not any(t.strip() for t in texts):
            raise ValueError("No text extracted.")

        full_text = "\n\n".join(texts)
        # INDEX USING PAGE_ID INSTEAD OF USER_ID
        chunk_count = add_documents_to_store(page_id, texts, source=filename)
        
        # PERSIST IN DB
        material = KnowledgeBase(
            workspace_id=workspace_id, 
            page_id=page_id, 
            filename=filename, 
            content=full_text, 
            chunks_count=chunk_count
        )
        db.add(material)
        db.commit()

        return {"status": "success", "file": filename, "chunks_indexed": chunk_count, "full_text": full_text}
    except Exception as e:
        logger.error(f"❌ Upload Failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/material/clear/{user_id}")
async def clear_material(user_id: int):
    """Clear all uploaded material for a user."""
    from agent import _vector_stores, VECTOR_STORE_DIR
    import shutil
    _vector_stores.pop(user_id, None)
    store_path = VECTOR_STORE_DIR / str(user_id)
    if store_path.exists():
        shutil.rmtree(store_path)
    return {"status": "cleared"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
