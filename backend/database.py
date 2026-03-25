from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

import os

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./edugen.db")

# Render/Neon may give postgres:// but SQLAlchemy requires postgresql://
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# ── pgvector connection string (for langchain-postgres) ──────────────────────
# langchain-postgres requires psycopg3 format: postgresql+psycopg://...
def get_pgvector_connection_string():
    """Get connection string in psycopg3 format for langchain-postgres PGVector."""
    url = SQLALCHEMY_DATABASE_URL
    if url.startswith("sqlite"):
        return None  # pgvector not available with SQLite
    # Convert postgresql:// to postgresql+psycopg:// for psycopg3 driver
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    # Remove channel_binding param (not supported by psycopg3 connect)
    if "&channel_binding=" in url:
        url = url.split("&channel_binding=")[0]
    if "?channel_binding=" in url:
        url = url.split("?channel_binding=")[0]
    return url

# ── Enable pgvector extension on startup ─────────────────────────────────────
def enable_pgvector():
    """Enable the pgvector extension if using PostgreSQL."""
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                conn.commit()
                print("✅ pgvector extension enabled")
        except Exception as e:
            print(f"⚠️ Could not enable pgvector: {e}")
