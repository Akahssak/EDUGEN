from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from models.db_models import User

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class LoginRequest(BaseModel):
    username: str

class LoginResponse(BaseModel):
    id: str
    name: str

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    if not request.username.strip():
        raise HTTPException(status_code=400, detail="Username cannot be empty")
        
    user = db.query(User).filter(User.username == request.username).first()
    if not user:
        user = User(username=request.username)
        db.add(user)
        db.commit()
        db.refresh(user)
        
    return {"id": str(user.id), "name": user.username}
