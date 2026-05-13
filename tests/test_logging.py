#!/usr/bin/env python3
"""
Test: Control a device and verify activity log is created
"""
import sqlite3
import time
import requests
import subprocess
import os
import signal
from datetime import datetime
import sys

# Fix encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Constants
DB_PATH = 'instance/smarthome.db'
API_URL = 'http://127.0.0.1:8000/api'
DEVICE_ID = 1  # Power Outlet

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def count_today_logs():
    """Count activity logs created today"""
    conn = get_db_connection()
    cursor = conn.cursor()
    today = datetime.now().strftime('%Y-%m-%d')
    cursor.execute(f'''
      SELECT COUNT(*) FROM device_activity_log
      WHERE timestamp >= '{today}'
    ''')
    count = cursor.fetchone()[0]
    conn.close()
    return count

def get_device_status(device_id):
    """Get current device status from DB"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT status, level FROM device WHERE device_id = ?', (device_id,))
    result = cursor.fetchone()
    conn.close()
    return result

def test_device_control():
    """Start backend, control device, verify logs"""
    print("=" * 60)
    print("[TEST] DEVICE ACTIVITY LOGGING")
    print("=" * 60)
    
    # Start backend
    print("\n[INFO] Starting backend...")
    backend_proc = subprocess.Popen(
        ['python', 'app.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=os.getcwd()
    )
    
    # Wait for backend to start
    time.sleep(4)
    
    try:
        # Generate a valid token
        print("[INFO] Generating auth token...")
        import sys
        sys.path.insert(0, os.getcwd())
        from app import app, generate_token
        from models import User
        
        with app.app_context():
            user = User.query.first()
            if not user:
                print("[ERROR] No user in database!")
                return
            token = generate_token(user.user_id, user.username)
            print(f"[INFO] Token generated for user: {user.username}")
        
        headers = {'Authorization': f'Bearer {token}'}
        
        # Wait for API to be ready
        print("[INFO] Waiting for API to be ready...")
        for attempt in range(10):
            try:
                response = requests.get(f'{API_URL}/houses', headers=headers, timeout=2)
                if response.status_code in [200, 401, 403]:
                    print("[INFO] API is ready!")
                    break
            except:
                pass
            if attempt < 9:
                time.sleep(1)
        
        # Get initial log count
        initial_count = count_today_logs()
        print(f"[DATA] Initial log count today: {initial_count}")
        
        # Get current device status
        status, level = get_device_status(DEVICE_ID)
        print(f"[DATA] Device {DEVICE_ID} current: status={status}, level={level}")
        
        # Toggle device status
        new_status = 'off' if status == 'on' else 'on'
        print(f"\n[ACTION] Sending control command: {status} -> {new_status}")
        
        response = requests.put(
            f'{API_URL}/devices/{DEVICE_ID}',
            json={'status': new_status, 'level': 75},
            headers=headers,
            timeout=15
        )
        
        print(f"[RESPONSE] Status code: {response.status_code}")
        if response.status_code == 200:
            print("[SUCCESS] Device control successful")
        else:
            print(f"[ERROR] Device control failed: {response.text}")
            return
        
        # Wait a moment for DB to commit
        time.sleep(1)
        
        # Check if log was created
        final_count = count_today_logs()
        new_logs = final_count - initial_count
        
        print(f"\n[DATA] Final log count today: {final_count}")
        print(f"[DATA] New logs created: {new_logs}")
        
        if new_logs > 0:
            print("\n[SUCCESS] Activity log was created!")
            # Get the new log
            conn = get_db_connection()
            cursor = conn.cursor()
            today = datetime.now().strftime('%Y-%m-%d')
            cursor.execute(f'''
              SELECT action, old_status, new_status, triggered_by, timestamp
              FROM device_activity_log
              WHERE timestamp >= '{today}'
              ORDER BY timestamp DESC LIMIT 1
            ''')
            log = cursor.fetchone()
            conn.close()
            
            if log:
                action, old_st, new_st, trig, ts = log
                print(f"  Action: {action}")
                print(f"  Change: {old_st} -> {new_st}")
                print(f"  Triggered by: {trig}")
                print(f"  Time: {ts}")
        else:
            print("\n[ERROR] No activity log was created!")
        
    finally:
        # Stop backend
        print("\n\n[INFO] Stopping backend...")
        backend_proc.terminate()
        try:
            backend_proc.wait(timeout=3)
        except:
            backend_proc.kill()
        print("[INFO] Backend stopped")

if __name__ == '__main__':
    test_device_control()
