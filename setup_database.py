#!/usr/bin/env python3
"""
Database Setup Helper
Smart Home IoT System
Run this from root folder: python setup_database.py
"""

import os
import sys
import subprocess

def print_header(text):
    print(f"\n{'='*80}")
    print(f"  {text}")
    print(f"{'='*80}\n")

def run_script(script_name, description):
    """Run a database script"""
    print(f"🔄 {description}...")
    print(f"   Running: scripts/{script_name}\n")
    
    result = subprocess.run(
        [sys.executable, f"scripts/{script_name}"],
        cwd=os.path.dirname(__file__) or "."
    )
    
    if result.returncode == 0:
        print(f"\n✅ {description} - SUCCESS\n")
        return True
    else:
        print(f"\n❌ {description} - FAILED\n")
        return False

def main():
    print_header("🏠 Smart Home IoT - Database Setup")
    
    print("""
Choose an option:

  1️⃣  Full Setup (init + seed data) - RECOMMENDED for first time
  2️⃣  Initialize Database Only (create tables)
  3️⃣  Add Auto-Off Tracking (schema migration)
  4️⃣  Seed Test Data (add sample data)
  0️⃣  Exit
    """)
    
    choice = input("Enter your choice (0-4): ").strip()
    
    if choice == "1":
        print_header("Full Setup: Initialize + Seed Data")
        
        success = True
        success = run_script("init_db.py", "Initialize Database") and success
        success = run_script("add_auto_off_tracking.py", "Add Auto-Off Tracking") and success
        success = run_script("seed_database.py", "Seed Test Data") and success
        
        if success:
            print_header("✅ Setup Complete!")
            print("""
✨ Your database is ready!

Next steps:
  1. Run backend: python app.py
  2. Login with: bach / password123
  3. Run mobile: cd mobile && npm start
            """)
        else:
            print_header("⚠️ Setup Had Issues")
            print("Check the errors above and try again")
            sys.exit(1)
    
    elif choice == "2":
        print_header("Initialize Database")
        run_script("init_db.py", "Initialize Database")
    
    elif choice == "3":
        print_header("Add Auto-Off Tracking")
        run_script("add_auto_off_tracking.py", "Add Auto-Off Tracking")
    
    elif choice == "4":
        print_header("Seed Test Data")
        run_script("seed_database.py", "Seed Test Data")
    
    elif choice == "0":
        print("\n👋 Goodbye!\n")
        sys.exit(0)
    
    else:
        print("\n❌ Invalid choice. Please try again.\n")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  Cancelled by user\n")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
        sys.exit(1)
