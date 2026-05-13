#!/usr/bin/env python
"""Comprehensive test: simulate multiple device controls and verify usage tracking"""
import os
import sys
sys.path.insert(0, os.getcwd())

from app import app, generate_token
from models import User, DeviceActivityLog
from datetime import datetime
import sqlite3

print("=" * 70)
print("[COMPREHENSIVE TEST: MULTIPLE DEVICE CONTROLS & USAGE TRACKING]")
print("=" * 70)

# Generate token
with app.app_context():
    user = User.query.first()
    if not user:
        print("ERROR: No user found")
        sys.exit(1)
    token = generate_token(user.user_id, user.username)
    print(f"\nUser: {user.username}")
    print(f"Token: {token[:40]}...\n")

# Test multiple device controls
test_devices = [1, 3, 5, 8]
print("Simulating device controls:")
print("-" * 70)

with app.test_client() as client:
    headers = {'Authorization': f'Bearer {token}'}
    
    for device_id in test_devices:
        # Control the device (toggle status)
        response = client.put(
            f'/api/devices/{device_id}',
            json={'status': 'on' if device_id % 2 == 0 else 'off', 'level': 50},
            headers=headers
        )
        
        result = "✓ SUCCESS" if response.status_code == 200 else f"✗ FAILED ({response.status_code})"
        print(f"Device {device_id}: {result}")

print("\n" + "-" * 70)

# Verify all logs were created
db_path = 'instance/smarthome.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

today = datetime.now().strftime('%Y-%m-%d')
cursor.execute(f'''
  SELECT COUNT(*) FROM device_activity_log 
  WHERE timestamp >= '{today}'
''')
total_logs = cursor.fetchone()[0]

print(f"\nActivity logs created today: {total_logs}")

if total_logs >= len(test_devices):
    print("✅ ALL DEVICE CONTROLS LOGGED")
else:
    print(f"⚠️  Expected at least {len(test_devices)} logs, found {total_logs}")

# Get device usage
print("\n" + "-" * 70)
print("Device Usage Calculation:")
print("-" * 70)

with app.test_client() as client:
    headers = {'Authorization': f'Bearer {token}'}
    response = client.get(
        '/api/houses/1/device-usage?period=today',
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.get_json()
        if data.get('success'):
            devices = data.get('devices', [])
            print(f"\nTotal devices in house: {len(devices)}")
            
            # Show test devices
            for dev in devices:
                if dev['device_id'] in test_devices:
                    print(f"\nDevice {dev['device_id']}: {dev['device_name']}")
                    print(f"  Status: {dev['status']}")
                    print(f"  Usage: {dev['usage_display']}")
                    print(f"  Details: {dev['usage_minutes']:.1f}m = {dev['usage_hours']:.2f}h")
        else:
            print("ERROR in response:", data.get('error'))
    else:
        print(f"ERROR: Status {response.status_code}")

# Show all logs created today
print("\n" + "-" * 70)
print("All Activity Logs Today:")
print("-" * 70)

cursor.execute(f'''
  SELECT log_id, device_id, action, old_status, new_status, triggered_by, timestamp
  FROM device_activity_log
  WHERE timestamp >= '{today}'
  ORDER BY timestamp DESC
  LIMIT 10
''')

logs = cursor.fetchall()
if logs:
    for log_id, dev_id, action, old_st, new_st, trig, ts in logs:
        print(f"{ts} | Device {dev_id:2d}: {action:12s} ({old_st}→{new_st}) | {trig}")
else:
    print("No logs found")

conn.close()
print("\n" + "=" * 70)
