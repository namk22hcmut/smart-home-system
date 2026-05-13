#!/usr/bin/env python
"""Simple test to verify activity logging works"""

import os
import sys
sys.path.insert(0, os.getcwd())

from app import app, db, generate_token
from models import User, Device, DeviceActivityLog
from datetime import datetime
import sqlite3

print("=" * 60)
print("[TEST] SIMPLE DEVICE LOGGING TEST")
print("=" * 60)

# Get DB connection
db_path = 'instance/smarthome.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get initial count
today = datetime.now().strftime('%Y-%m-%d')
cursor.execute(f'''
  SELECT COUNT(*) FROM device_activity_log 
  WHERE timestamp >= '{today}'
''')
initial_count = cursor.fetchone()[0]
print(f"\n[1] Initial log count today: {initial_count}")

# Get a token from database
with app.app_context():
    user = User.query.first()
    if user:
        token = generate_token(user.user_id, user.username)
        print(f"[2] Token generated for user: {user.username}")
        print(f"    Token: {token[:50]}...")
    else:
        print("[ERROR] No user found in database!")
        sys.exit(1)

# Get current device 1 status
cursor.execute("SELECT device_id, device_name, status, level FROM device WHERE device_id = 1")
dev = cursor.fetchone()
if dev:
    dev_id, name, status, level = dev
    print(f"\n[3] Device {dev_id} ({name}):")
    print(f"    Current status: {status}")
    print(f"    Current level: {level}")
else:
    print("[ERROR] Device 1 not found!")
    sys.exit(1)

# Test the API call directly
print(f"\n[4] Testing PUT /api/devices/1 endpoint:")
with app.app_context():
    # Create a test request context
    from flask import Request
    from werkzeug.test import EnvironBuilder
    
    # Manually call the endpoint
    from app import update_device, request as flask_request
    
    # Use test client instead
    with app.test_client() as client:
        headers = {'Authorization': f'Bearer {token}'}
        new_status = 'off' if status == 'on' else 'on'
        
        print(f"    Sending: status={new_status}, level=75")
        response = client.put(
            '/api/devices/1',
            json={'status': new_status, 'level': 75},
            headers=headers
        )
        
        print(f"    Response status: {response.status_code}")
        print(f"    Response: {response.get_json()}")

# Check final count
cursor.execute(f'''
  SELECT COUNT(*) FROM device_activity_log 
  WHERE timestamp >= '{today}'
''')
final_count = cursor.fetchone()[0]
new_logs = final_count - initial_count

print(f"\n[5] Activity logs:")
print(f"    Initial: {initial_count}")
print(f"    Final: {final_count}")
print(f"    Created: {new_logs}")

if new_logs > 0:
    print(f"\n✅ SUCCESS! Activity log was created!")
    
    # Get the new log details
    cursor.execute(f'''
      SELECT device_id, action, old_status, new_status, triggered_by, timestamp
      FROM device_activity_log
      WHERE timestamp >= '{today}'
      ORDER BY timestamp DESC LIMIT 1
    ''')
    log = cursor.fetchone()
    if log:
        dev_id, action, old_st, new_st, trig, ts = log
        print(f"\n    Device: {dev_id}")
        print(f"    Action: {action}")
        print(f"    Change: {old_st} → {new_st}")
        print(f"    Triggered by: {trig}")
        print(f"    Time: {ts}")
else:
    print(f"\n❌ FAILED! No activity log was created")
    print(f"   The logging code may not be working correctly")

conn.close()
print("\n" + "=" * 60)
