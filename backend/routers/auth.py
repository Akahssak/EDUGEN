from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
import sqlalchemy.exc
from pydantic import BaseModel, EmailStr
from database import SessionLocal
from models.db_models import User
import os
from google.oauth2 import id_token
from google.auth.transport import requests
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional

# Security configurations
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "edugen-super-secret-key-12345")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Models ---

class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = None

class UserCreate(UserBase):
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    token: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

# --- Helpers ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(db: Session = Depends(get_db), token: str = Body(None)):
    # Note: In a real app, use OAuth2PasswordBearer. For this simple flow, we'll check headers or body.
    # Actually, let's use the standard FastAPI security utility for better practice.
    pass

from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

async def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user

# --- Endpoints ---

import re

@router.post("/auth/register", response_model=TokenResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if not re.match(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$", user_in.password):
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character.")

    # Check if user exists
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    new_user = User(
        email=user_in.email,
        username=user_in.username or user_in.email.split('@')[0],
        hashed_password=get_password_hash(user_in.password)
    )
    db.add(new_user)
    try:
        db.commit()
        db.refresh(new_user)
    except sqlalchemy.exc.IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username or email already exists. If you already have an account, please log in.")

    
    # Create token
    access_token = create_access_token(data={"sub": str(new_user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": str(new_user.id), "name": new_user.username, "email": new_user.email}
    }

@router.post("/auth/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": str(user.id), "name": user.username, "email": user.email}
    }

@router.post("/auth/google", response_model=TokenResponse)
async def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        # Verify the ID token
        idinfo = id_token.verify_oauth2_token(
            request.token, 
            requests.Request(), 
            os.getenv("GOOGLE_CLIENT_ID")
        )

        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', email.split('@')[0])

        # Find or create user
        user = db.query(User).filter(User.google_id == google_id).first()
        if not user:
            # Check by email to link
            user = db.query(User).filter(User.email == email).first()
            if user:
                user.google_id = google_id
            else:
                user = User(
                    username=name,
                    email=email,
                    google_id=google_id
                )
                db.add(user)
            
            db.commit()
            db.refresh(user)

        access_token = create_access_token(data={"sub": str(user.id)})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {"id": str(user.id), "name": user.username, "email": user.email}
        }

    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
