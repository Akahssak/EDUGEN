from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True) # Display name
    email = Column(String, unique=True, index=True, nullable=True)
    google_id = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=True)
    bio = Column(Text, nullable=True) # User bio/background
    interests = Column(Text, nullable=True) # JSON or comma separated
    learning_style = Column(String, default="Intermediate") # Beginner, Intermediate, Advanced
    workspaces = relationship("Workspace", back_populates="user")

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    canvas_data = relationship("CanvasData", back_populates="workspace", uselist=False)
    user = relationship("User", back_populates="workspaces")

class CanvasData(Base):
    __tablename__ = "canvas_data"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), unique=True)
    data = Column(Text) # JSON string of tldraw snapshot
    workspace = relationship("Workspace", back_populates="canvas_data")

class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    page_id = Column(String, index=True) # Tldraw page ID
    filename = Column(String)
    content = Column(Text)
    chunks_count = Column(Integer)
