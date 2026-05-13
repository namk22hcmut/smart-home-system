#!/usr/bin/env python3
"""
Initialize database schema - creates all tables from models.
"""

import os
import sys

# Add project root to path so imports like `from app import app` work
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, PROJECT_ROOT)

from app import app, db
from models import *

def init_db():
    """Create all database tables"""
    with app.app_context():
        try:
            print("🔄 Initializing database schema...")
            
            # Create all tables defined in models
            db.create_all()
            
            print("✅ Database schema initialized successfully!")
            
            # Show table list
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            print(f"\n📋 Tables created ({len(tables)} total):")
            for table in sorted(tables):
                print(f"   ✓ {table}")
            
        except Exception as e:
            print(f"❌ Database initialization failed: {e}")
            sys.exit(1)

if __name__ == '__main__':
    init_db()
