#!/usr/bin/env python3
"""
Add auto_off_at field to Schedule table for tracking when device should auto-off.
"""

import os
import sys
import sqlite3

def add_auto_off_tracking():
    """Add auto_off_at column to schedule table"""
    try:
        # Try instance folder first, then root
        db_path = "instance/smarthome.db"
        if not os.path.exists(db_path):
            db_path = "smarthome.db"
        
        print(f"📁 Database: {db_path}")
        
        if not os.path.exists(db_path):
            print(f"❌ Database file not found at {db_path}")
            sys.exit(1)
        
        # Connect to SQLite database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Try to get existing columns in schedule table
        try:
            cursor.execute("PRAGMA table_info(schedule)")
            columns = {row[1] for row in cursor.fetchall()}
            print(f"\n📋 Existing columns: {columns}")
        except Exception as e:
            print(f"   ⚠️ Cannot read columns: {e}")
            columns = set()
        
        # Check if auto_off_at already exists
        if 'auto_off_at' not in columns:
            print("\n🔄 Adding auto_off_at column...")
            try:
                # First check if table exists
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='schedule'")
                if cursor.fetchone():
                    cursor.execute("ALTER TABLE schedule ADD COLUMN auto_off_at DATETIME")
                    conn.commit()
                    print("   ✓ Added auto_off_at column")
                else:
                    print("   ⚠️ Schedule table does not exist")
            except sqlite3.OperationalError as e:
                if "duplicate column" in str(e):
                    print("   ℹ️ Column already exists")
                else:
                    print(f"   ⚠️ Error: {e}")
        else:
            print("✅ auto_off_at column already exists")
        
        conn.close()
        print("\n✅ Database schema update complete!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    add_auto_off_tracking()


