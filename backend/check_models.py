import sys
from pathlib import Path
from sqlalchemy import create_engine

# Add the project root to sys.path
sys.path.append(str(Path(__file__).parent.parent))

from backend.app.db.base import Base
from backend.app.models import *

def check_models():
    # Use sqlite for validation
    engine = create_engine("sqlite:///./test.db")
    try:
        Base.metadata.create_all(bind=engine)
        print("Models are valid and tables can be created.")
    except Exception as e:
        print(f"Error creating tables: {e}")
        sys.exit(1)
    finally:
        if Path("./test.db").exists():
            Path("./test.db").unlink()

if __name__ == "__main__":
    check_models()
