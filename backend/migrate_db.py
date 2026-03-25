from dotenv import load_dotenv
load_dotenv()

from database import engine
from sqlalchemy import text

print("Migrating database...")
with engine.execution_options(isolation_level="AUTOCOMMIT").connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR(200);"))
        print("Added hashed_password column.")
    except Exception as e:
        print("hashed_password column might already exist.")
        
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN google_id VARCHAR(100);"))
        print("Added google_id column.")
    except Exception as e:
        print("google_id column might already exist.")
        
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN bio VARCHAR;"))
        print("Added bio column.")
    except Exception as e:
        pass
        
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN interests VARCHAR;"))
        print("Added interests column.")
    except Exception as e:
        pass
        
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(100);"))
        print("Added email column.")
    except Exception as e:
        print("email column might already exist.")
        
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN learning_style VARCHAR DEFAULT 'Visual';"))
        print("Added learning_style column.")
    except Exception as e:
        pass
        
    conn.commit()
    print("Migration complete!")
    print("Migration complete!")
