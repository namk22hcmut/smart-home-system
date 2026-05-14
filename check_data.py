#!/usr/bin/env python3
"""
Quick check: verify device activity logs exist
Run: python check_data.py
"""
import sqlite3
from datetime import datetime, timedelta

db_path = 'instance/smarthome.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 60)
print("📊 DEVICE USAGE VERIFICATION")
print("=" * 60)

# Get devices in house 1
print("\n📱 Devices in house 1:")
cursor.execute('''
  SELECT d.device_id, d.device_name, d.status, d.level
  FROM device d
  JOIN room r ON d.room_id = r.room_id
  JOIN floor f ON r.floor_id = f.floor_id
  WHERE f.house_id = 1
  ORDER BY d.device_id
  LIMIT 10
''')
devices = cursor.fetchall()
for dev_id, name, status, level in devices:
    print(f"  [{dev_id:2d}] {name:25s} | Status: {status:3s} | Level: {level:3d}")

# Get activity logs today
print("\n📋 Activity logs TODAY (last 20):")
today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
cursor.execute('''
  SELECT device_id, action, new_status, new_level, triggered_by, timestamp
  FROM device_activity_log
  WHERE timestamp >= ?
  ORDER BY timestamp DESC
  LIMIT 20
''', (today.isoformat(),))

logs = cursor.fetchall()
if logs:
    for dev_id, action, status, level, trig, ts in logs:
        time_str = ts.split(' ')[1] if ' ' in ts else ts  # Extract time from ISO
        print(f"  [{time_str}] Device {dev_id:2d}: {action:20s} -> {status} (lvl:{level}) [{trig}]")
else:
    print("  ❌ No activity logs found today")

# Count total logs
cursor.execute('SELECT COUNT(*) FROM device_activity_log')
total_logs = cursor.fetchone()[0]
print(f"\n📊 Total device activity logs in database: {total_logs}")

# Check if ON/OFF logs exist
cursor.execute('''
  SELECT action, COUNT(*) as count
  FROM device_activity_log
  GROUP BY action
  ORDER BY count DESC
  LIMIT 10
''')
actions = cursor.fetchall()
print("\n📈 Activity types breakdown:")
for action, count in actions:
    print(f"  {action:25s}: {count:5d}")

conn.close()

print("\n" + "=" * 60)
print("✅ Database check complete!")
print("=" * 60)
