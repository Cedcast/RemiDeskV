from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Create the SQLAlchemy engine
DATABASE_URL = "sqlite:///./test.db"  # Update with your database URL
gengine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Create a session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=gengine)

# Base class for declarative models
Base = declarative_base()

# Dependency for getting a database session

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()